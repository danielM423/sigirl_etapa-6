from datetime import date

from django.contrib.auth.models import User
from rest_framework import permissions, status, viewsets, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Alerta, Categoria, Producto, Movimiento, Pedido, UserProfile
from .serializers import (
    AlertaSerializer,
    CategoriaSerializer,
    ProductoSerializer,
    MovimientoSerializer,
    PedidoSerializer,
    UserManagementSerializer,
)


class IsStaffOrSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))


class IsInventoryManagerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff or request.user.is_superuser


# =====================
# TOKEN (PUBLIC)
# =====================
class PublicTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    # Sobrescribe el login JWT para devolver también el rol del usuario.
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            username = request.data.get("username")
            try:
                user = User.objects.get(username=username)
                if user.is_superuser:
                    role = "jefe"
                elif user.is_staff:
                    role = "admin"
                else:
                    role = "usuario"

                response.data["role"] = role
                response.data["username"] = user.username
            except User.DoesNotExist:
                pass

        return response


class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


# =====================
# PRODUCTO (VIEWSET)
# =====================
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsInventoryManagerOrReadOnly]


# =====================
# CATEGORIA
# =====================
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]


# =====================
# MOVIMIENTO
# =====================
class MovimientoViewSet(viewsets.ModelViewSet):
    queryset = Movimiento.objects.all()
    serializer_class = MovimientoSerializer
    permission_classes = [IsAuthenticated]


# =====================
# PEDIDO
# =====================
class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related('producto', 'usuario')
        if user.is_staff or user.is_superuser:
            return queryset
        return queryset.filter(usuario=user)

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        serializer.save(
            usuario=user,
            solicitante=user.get_full_name().strip() or user.username,
            creado_por=user.username,
            departamento=getattr(profile, 'department', '') or '',
        )

    def update(self, request, *args, **kwargs):
        pedido = self.get_object()
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'No tienes permiso para actualizar pedidos.'}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.copy()
        estado = str(payload.get('estado', pedido.estado)).lower()
        estado_anterior = pedido.estado

        if estado == 'rechazado' and not str(payload.get('motivo_rechazo', pedido.motivo_rechazo or '')).strip():
            return Response({'motivo_rechazo': ['Debes indicar un motivo de rechazo.']}, status=status.HTTP_400_BAD_REQUEST)

        if estado == 'aprobado' and estado_anterior != 'aprobado':
            producto = pedido.producto
            if producto.cantidad >= pedido.cantidad:
                producto.cantidad -= pedido.cantidad
                producto.save()
            else:
                return Response({'error': 'No hay suficiente stock'}, status=status.HTTP_400_BAD_REQUEST)

        payload['estado'] = estado
        if estado in ('aprobado', 'rechazado'):
            payload['fecha_respuesta'] = date.today()

        serializer = self.get_serializer(pedido, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


# =====================
# REGISTER
# =====================
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    # Crea un usuario nuevo y asigna permisos según el rol solicitado.
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    first_name = request.data.get("first_name", "")
    last_name = request.data.get("last_name", "")
    requested_role = request.data.get("role", "usuario")

    if not username or not password:
        return Response({"error": "Faltan datos"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "El usuario ya existe"}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )

    if requested_role == "admin":
        user.is_staff = True
    elif requested_role in ["jefe", "jefe_superior"]:
        user.is_staff = True
        user.is_superuser = True

    user.save()

    role = "jefe" if user.is_superuser else "admin" if user.is_staff else "usuario"

    return Response({
        "mensaje": "Usuario creado correctamente",
        "role": role,
        "username": user.username,
    }, status=201)


# =====================
# AUTH - Get Current User
# =====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    role = "jefe" if user.is_superuser else "admin" if user.is_staff else "usuario"
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": role,
    })


# =====================
# AUTH - Manage Profile
# =====================
def _serialize_profile_response(user, profile):
    role = 'jefe' if user.is_superuser else 'admin' if user.is_staff else 'usuario'
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': role,
        'profile': {
            'institution': profile.institution,
            'department': profile.department,
            'phone': profile.phone,
            'cargo': profile.cargo,
            'bio': profile.bio,
            'avatar': profile.avatar,
        }
    }


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_profile(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'GET':
        return Response(_serialize_profile_response(user, profile))

    if request.method == 'DELETE':
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = request.data
    username = str(data.get('username', user.username)).strip()
    email = str(data.get('email', user.email)).strip()

    if username and username != user.username and User.objects.exclude(pk=user.pk).filter(username=username).exists():
        return Response({'username': ['Ya existe un usuario con ese nombre.']}, status=status.HTTP_400_BAD_REQUEST)
    if email and email != user.email and User.objects.exclude(pk=user.pk).filter(email=email).exists():
        return Response({'email': ['Ya existe un usuario con ese correo.']}, status=status.HTTP_400_BAD_REQUEST)

    user.username = username or user.username
    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.email = email
    user.save()

    profile_data = data.get('profile', {}) if isinstance(data.get('profile', {}), dict) else {}
    profile.institution = profile_data.get('institution', data.get('institution', profile.institution))
    profile.department = profile_data.get('department', data.get('department', profile.department))
    profile.phone = profile_data.get('phone', data.get('phone', profile.phone))
    profile.cargo = profile_data.get('cargo', data.get('cargo', profile.cargo))
    profile.bio = profile_data.get('bio', data.get('bio', profile.bio))
    profile.avatar = profile_data.get('avatar', data.get('avatar', profile.avatar))
    profile.save()

    return Response(_serialize_profile_response(user, profile))


# =====================
# ALERTA (VIEWSET)
# =====================
class AlertaViewSet(viewsets.ModelViewSet):
    queryset = Alerta.objects.all().order_by('-fecha')
    serializer_class = AlertaSerializer
    permission_classes = [IsAuthenticated]


# =====================
# USER MANAGEMENT (VIEWSET)
# =====================
class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserManagementSerializer
    permission_classes = [IsStaffOrSuperuser]

    def create(self, request, *args, **kwargs):
        data = request.data
        username = str(data.get('username') or data.get('nombre_input') or '').strip()
        email = str(data.get('email') or '').strip()
        password = str(data.get('password') or '').strip()

        if not username:
            return Response({'username': ['El nombre de usuario es obligatorio.']}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'password': ['La contraseña es obligatoria.']}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'username': ['Ya existe un usuario con ese nombre.']}, status=status.HTTP_400_BAD_REQUEST)
        if email and User.objects.filter(email=email).exists():
            return Response({'email': ['Ya existe un usuario con ese correo.']}, status=status.HTTP_400_BAD_REQUEST)

        user = User(username=username, email=email)
        nombre = str(data.get('nombre_completo') or data.get('full_name') or username).strip()
        parts = nombre.split(' ', 1)
        user.first_name = parts[0]
        user.last_name = parts[1] if len(parts) > 1 else ''

        rol = data.get('rol_input') or data.get('rol') or 'usuario'
        if rol == 'jefe':
            user.is_staff = True
            user.is_superuser = True
        elif rol == 'admin':
            user.is_staff = True
            user.is_superuser = False
        else:
            user.is_staff = False
            user.is_superuser = False

        user.set_password(password)
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.department = str(data.get('departamento_input') or data.get('department') or '').strip()
        profile.save()

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data

        username = str(data.get('username') or '').strip()
        if username and username != user.username:
            if User.objects.exclude(pk=user.pk).filter(username=username).exists():
                return Response({'username': ['Ya existe un usuario con ese nombre.']}, status=status.HTTP_400_BAD_REQUEST)
            user.username = username

        nombre = str(data.get('nombre_input') or data.get('nombre_completo') or '').strip()
        if nombre:
            parts = nombre.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''

        email = str(data.get('email') or '').strip()
        if email:
            if email != user.email and User.objects.exclude(pk=user.pk).filter(email=email).exists():
                return Response({'email': ['Ya existe un usuario con ese correo.']}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email

        rol = data.get('rol_input') or data.get('rol') or ''
        if rol == 'jefe':
            user.is_staff = True
            user.is_superuser = True
        elif rol == 'admin':
            user.is_staff = True
            user.is_superuser = False
        elif rol == 'usuario':
            user.is_staff = False
            user.is_superuser = False

        password = data.get('password', '')
        if password:
            user.set_password(password)

        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.department = str(data.get('departamento_input') or data.get('department') or '').strip()
        profile.save()

        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({"error": "No puedes eliminar tu propia cuenta"}, status=400)
        user.delete()
        return Response(status=204)
