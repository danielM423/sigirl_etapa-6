from datetime import date

from django.contrib.auth import get_user_model

User = get_user_model()
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import HistorialCambio
from .models import Alerta, Categoria, Movimiento, Pedido, Producto, UserProfile
from .serializers import (
    AlertaSerializer,
    CategoriaSerializer,
    CurrentUserProfileSerializer,
    MovimientoSerializer,
    PedidoSerializer,
    ProductoSerializer,
    UserManagementSerializer,
)
from .auditoria_utils import registrar_auditoria
from rest_framework import generics
from .models import HistorialCambio
from .serializers import HistorialCambioSerializer

class HistorialCambioListView(generics.ListAPIView):
    serializer_class = HistorialCambioSerializer

    def get_queryset(self):
        modelo = self.request.query_params.get('modelo')
        objeto_id = self.request.query_params.get('objeto_id')
        return HistorialCambio.objects.filter(modelo=modelo, objeto_id=objeto_id)

def serialize_authenticated_user(user):
    UserProfile.objects.get_or_create(user=user)
    return CurrentUserProfileSerializer(user).data


class PublicTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            username = request.data.get('username')
            try:
                user = User.objects.get(username=username)
                response.data.update(serialize_authenticated_user(user))
            except User.DoesNotExist:
                pass

        return response


class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []


class IsStaffForWrites(BasePermission):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)
    



def registrar_cambio(modelo, objeto_id, campo, valor_anterior, valor_nuevo, usuario):
    if valor_anterior != valor_nuevo:
        HistorialCambio.objects.create(
            modelo=modelo,
            objeto_id=objeto_id,
            campo=campo,
            valor_anterior=valor_anterior,
            valor_nuevo=valor_nuevo,
            usuario=usuario
        )
def perform_update(self, serializer):
    instance = self.get_object()
    data = serializer.validated_data
    campos_a_trazar = ['cantidad', 'estado', 'nombre', 'minimo']  # los campos que quieras
    for campo in campos_a_trazar:
        valor_anterior = getattr(instance, campo)
        valor_nuevo = data.get(campo, valor_anterior)
        registrar_cambio('producto', instance.id, campo, valor_anterior, valor_nuevo, self.request.user)
    producto = serializer.save()
    # ...auditoría...

class ProductoViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        producto = serializer.save()
        registrar_auditoria(
            usuario=self.request.user,
            accion='crear',
            modulo='inventario',
            descripcion=f"Creó producto: {producto.nombre} (ID: {producto.id})"
        )

    def perform_update(self, serializer):
        producto = serializer.save()
        registrar_auditoria(
            usuario=self.request.user,
            accion='editar',
            modulo='inventario',
            descripcion=f"Editó producto: {producto.nombre} (ID: {producto.id})"
        )

    def perform_destroy(self, instance):
        nombre = instance.nombre
        id_ = instance.id
        instance.delete()
        registrar_auditoria(
            usuario=self.request.user,
            accion='eliminar',
            modulo='inventario',
            descripcion=f"Eliminó producto: {nombre} (ID: {id_})"
        )

    queryset = Producto.objects.select_related('categoria').all().order_by('nombre')
    serializer_class = ProductoSerializer
    permission_classes = [IsStaffForWrites]


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all().order_by('nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [IsStaffForWrites]

class MovimientoViewSet(viewsets.ModelViewSet):
    queryset = Movimiento.objects.select_related('producto').all()
    serializer_class = MovimientoSerializer
    permission_classes = [IsStaffForWrites]


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.select_related('producto', 'usuario').all()
    serializer_class = PedidoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(usuario=user)


    def perform_create(self, serializer):
        pedido = serializer.save(
            usuario=self.request.user,
            solicitante=serializer.validated_data.get('solicitante') or self.request.user.username,
            creado_por=serializer.validated_data.get('creado_por') or self.request.user.username,
        )
        registrar_auditoria(
            usuario=self.request.user,
            accion='crear',
            modulo='pedidos',
            descripcion=f"Creó pedido: {pedido.codigo or pedido.id} para producto {pedido.producto.nombre} (cantidad: {pedido.cantidad})"
        )

    def update(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'No autorizado para modificar pedidos.'}, status=status.HTTP_403_FORBIDDEN)

        partial = kwargs.pop('partial', False)
        pedido = self.get_object()
        serializer = self.get_serializer(pedido, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        nuevo_estado = serializer.validated_data.get('estado', pedido.estado)
        producto = serializer.validated_data.get('producto', pedido.producto)
        cantidad = serializer.validated_data.get('cantidad', pedido.cantidad)

        if nuevo_estado == 'aprobado' and pedido.estado != 'aprobado':
            if producto.cantidad < cantidad:
                return Response({'error': 'No hay suficiente stock'}, status=status.HTTP_400_BAD_REQUEST)

            producto.cantidad -= cantidad
            producto.save(update_fields=['cantidad', 'ultima_actualizacion'])

            Movimiento.objects.create(
                producto=producto,
                tipo='salida',
                cantidad=cantidad,
                observacion=f"Consumo asociado al pedido {pedido.codigo or pedido.id} por {pedido.solicitante or pedido.usuario.username}",
            )

        pedido_anterior = pedido.estado
        pedido_actualizado = serializer.save()

        if nuevo_estado in ['aprobado', 'rechazado'] and not pedido_actualizado.fecha_respuesta:
            pedido_actualizado.fecha_respuesta = date.today()
            pedido_actualizado.save(update_fields=['fecha_respuesta'])

        # Auditoría de cambio de estado
        if pedido_anterior != nuevo_estado:
            accion = 'aprobar' if nuevo_estado == 'aprobado' else 'rechazar' if nuevo_estado == 'rechazado' else 'editar'
            registrar_auditoria(
                usuario=request.user,
                accion=accion,
                modulo='pedidos',
                descripcion=f"{accion.capitalize()} pedido: {pedido_actualizado.codigo or pedido_actualizado.id} (estado: {pedido_anterior} → {nuevo_estado})"
            )
        else:
            registrar_auditoria(
                usuario=request.user,
                accion='editar',
                modulo='pedidos',
                descripcion=f"Editó pedido: {pedido_actualizado.codigo or pedido_actualizado.id}"
            )

        return Response(self.get_serializer(pedido_actualizado).data)


class AlertaViewSet(viewsets.ModelViewSet):
    queryset = Alerta.objects.all()
    serializer_class = AlertaSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'No autorizado para modificar alertas.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'No autorizado para eliminar alertas.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class UserManagementViewSet(viewsets.ModelViewSet):
    serializer_class = UserManagementSerializer
    permission_classes = [IsStaffForWrites]

    def get_queryset(self):
        return User.objects.prefetch_related('profile', 'pedidos').order_by('username')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response({'error': 'No puedes eliminar tu propio usuario.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = (request.data.get('username') or '').strip()
    email = (request.data.get('email') or '').strip()
    password = request.data.get('password')
    first_name = (request.data.get('first_name') or '').strip()
    last_name = (request.data.get('last_name') or '').strip()
    requested_role = request.data.get('role', 'usuario')
    institution = (request.data.get('institution') or '').strip()
    department = (request.data.get('department') or '').strip()
    phone = (request.data.get('phone') or '').strip()
    cargo = (request.data.get('cargo') or '').strip()

    if not username or not password:
        return Response({'error': 'Faltan datos'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'El usuario ya existe'}, status=400)

    if email and User.objects.filter(email__iexact=email).exists():
        return Response({'error': 'El correo ya existe'}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )

    if requested_role == 'admin':
        user.is_staff = True
    elif requested_role in ['jefe', 'jefe_superior']:
        user.is_staff = True
        user.is_superuser = True

    user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.institution = institution
    profile.department = department
    profile.phone = phone
    profile.cargo = cargo
    profile.save()

    refresh = RefreshToken.for_user(user)

    # Auditoría de creación de usuario
    registrar_auditoria(
        usuario=user,
        accion='crear',
        modulo='usuarios',
        descripcion=f"Creó usuario: {user.username} ({user.get_full_name()})"
    )
    return Response(
        {
            'mensaje': 'Usuario creado correctamente',
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            **serialize_authenticated_user(user),
        },
        status=201,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    return Response(serialize_authenticated_user(request.user))


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_profile(request):
    user = request.user

    if request.method == 'GET':
        return Response(serialize_authenticated_user(user))

    if request.method == 'PATCH':
        serializer = CurrentUserProfileSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        user.refresh_from_db()
        return Response(serialize_authenticated_user(user))

    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)