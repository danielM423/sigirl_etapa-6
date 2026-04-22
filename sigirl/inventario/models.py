from datetime import date

from django.contrib.auth.models import User
from django.db import models

# 📁 Categoría de productos
class Categoria(models.Model):
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


# 🧪 Producto (reactivo, insumo o equipo)
class Producto(models.Model):
    TIPOS = [
        ('reactivo', 'Reactivo'),
        ('insumo', 'Insumo'),
        ('equipo', 'Equipo'),
    ]

    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=20, choices=TIPOS)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    minimo = models.IntegerField()
    ubicacion = models.CharField(max_length=100, blank=True, null=True)
    fecha_vencimiento = models.DateField(blank=True, null=True)
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    # 🔔 ALERTA: bajo stock
    def bajo_stock(self):
        return self.cantidad <= self.minimo

    # ⏳ ALERTA: por vencer (7 días)
    def por_vencer(self):
        if self.fecha_vencimiento:
            return (self.fecha_vencimiento - date.today()).days <= 7
        return False

    @property
    def estado(self):
        if self.cantidad <= 0:
            return 'agotado'
        elif self.cantidad <= self.minimo:
            return 'bajo_stock'
        return 'ok'


# 📊 Movimientos (entrada/salida)
class Movimiento(models.Model):
    TIPOS = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
    ]

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=10, choices=TIPOS)
    cantidad = models.IntegerField()
    fecha = models.DateTimeField(auto_now_add=True)
    observacion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.tipo} - {self.producto.nombre}"
    
    from django.contrib.auth.models import User

class Pedido(models.Model):
    PRIORIDADES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
    ]

    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pedidos')
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='pedidos')
    codigo = models.CharField(max_length=30, unique=True, blank=True, null=True)
    cantidad = models.IntegerField(default=1)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    prioridad = models.CharField(max_length=10, choices=PRIORIDADES, default='media')
    solicitante = models.CharField(max_length=150, blank=True)
    departamento = models.CharField(max_length=150, blank=True)
    fecha_solicitud = models.DateField(default=date.today)
    fecha_respuesta = models.DateField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    motivo_rechazo = models.TextField(blank=True, null=True)
    evaluacion_seguridad = models.JSONField(blank=True, null=True)
    creado_por = models.CharField(max_length=150, blank=True, null=True)

    class Meta:
        ordering = ['-fecha_solicitud', '-id']

    def save(self, *args, **kwargs):
        if not self.codigo:
            base_id = self.pk or (Pedido.objects.order_by('-id').values_list('id', flat=True).first() or 0) + 1
            self.codigo = f'PED-{base_id:04d}'
        if not self.solicitante:
            self.solicitante = self.usuario.get_full_name().strip() or self.usuario.username
        if not self.creado_por:
            self.creado_por = self.usuario.username
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.usuario} - {self.producto} ({self.estado})"


# 📋 Historial de cambios
class HistorialCambio(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    modelo = models.CharField(max_length=100, blank=True, default='')
    campo = models.CharField(max_length=100, blank=True, default='')
    valor_anterior = models.TextField(blank=True, default='')
    valor_nuevo = models.TextField(blank=True, default='')
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario} - {self.modelo} - {self.campo}"


# 🚨 Alertas del sistema
class Alerta(models.Model):
    TIPOS = [
        ('bajo_stock', 'Bajo stock'),
        ('vencimiento', 'Por vencer'),
        ('otro', 'Otro'),
    ]
    PRIORIDADES = [
        ('alta', 'Alta'),
        ('media', 'Media'),
        ('baja', 'Baja'),
    ]

    tipo = models.CharField(max_length=50, choices=TIPOS, default='otro')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, null=True, blank=True)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    descripcion = models.TextField(blank=True)
    remitente = models.CharField(max_length=100, blank=True)
    prioridad = models.CharField(max_length=20, choices=PRIORIDADES, default='media')
    resuelta = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    @property
    def estado(self):
        return 'resuelta' if self.resuelta else 'activa'

    def __str__(self):
        return self.titulo


# 👤 Perfil extendido del usuario
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    institution = models.CharField(max_length=200, blank=True, default='')
    department = models.CharField(max_length=200, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    cargo = models.CharField(max_length=100, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    avatar = models.TextField(blank=True, default='')

    def __str__(self):
        return f"Perfil de {self.user.username}"


# 🔍 Auditoría de acciones
class Auditoria(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    accion = models.CharField(max_length=100, default='')
    modulo = models.CharField(max_length=100, default='')
    descripcion = models.TextField(blank=True, default='')
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario} - {self.accion} - {self.modulo}"
