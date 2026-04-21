from datetime import date
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True)
    department = models.CharField(max_length=120, blank=True)
    institution = models.CharField(max_length=150, blank=True)
    cargo = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Perfil de {self.user.username}"

@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        UserProfile.objects.get_or_create(user=instance)

class Producto(models.Model):
    TIPOS = [
        ('reactivo', 'Reactivo'),
        ('insumo', 'Insumo'),
        ('equipo', 'Equipo'),
    ]

    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=20, choices=TIPOS, default='reactivo')
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, related_name='productos')
    cantidad = models.IntegerField(default=0)
    minimo = models.IntegerField(default=0)
    ubicacion = models.CharField(max_length=100, blank=True, null=True)
    fecha_vencimiento = models.DateField(blank=True, null=True)
    ultima_actualizacion = models.DateField(auto_now=True)

    def __str__(self):
        return self.nombre

    def bajo_stock(self):
        return self.cantidad <= self.minimo

    def por_vencer(self):
        if self.fecha_vencimiento:
            return (self.fecha_vencimiento - date.today()).days <= 7
        return False

    @property
    def estado(self):
        if self.cantidad <= 0:
            return 'agotado'
        if self.cantidad <= self.minimo:
            return 'bajo_stock'
        return 'ok'

class Movimiento(models.Model):
    TIPOS = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
    ]

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=TIPOS)
    cantidad = models.IntegerField()
    fecha = models.DateTimeField(auto_now_add=True)
    observacion = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.tipo} - {self.producto.nombre}"

class Pedido(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    PRIORIDADES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pedidos')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='pedidos')
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
        if self.usuario_id:
            nombre_base = self.usuario.get_full_name().strip() or self.usuario.username
            if not self.solicitante:
                self.solicitante = nombre_base
            if not self.creado_por:
                self.creado_por = self.usuario.username

        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new and not self.codigo:
            self.codigo = f"PED-{self.fecha_solicitud.year}-{self.pk:04d}"
            super().save(update_fields=['codigo'])

    def __str__(self):
        return f"{self.solicitante or self.usuario.username} - {self.producto.nombre} ({self.estado})"

class Auditoria(models.Model):
    ACCIONES = [
        ('crear', 'Crear'),
        ('editar', 'Editar'),
        ('eliminar', 'Eliminar'),
        ('aprobar', 'Aprobar'),
        ('rechazar', 'Rechazar'),
    ]
    MODULOS = [
        ('inventario', 'Inventario'),
        ('pedidos', 'Pedidos'),
        ('usuarios', 'Usuarios'),
        ('alertas', 'Alertas'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='auditorias')
    accion = models.CharField(max_length=20, choices=ACCIONES)
    modulo = models.CharField(max_length=20, choices=MODULOS)
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha', '-id']

    def __str__(self):
        return f"{self.usuario} - {self.accion} - {self.modulo}"

class HistorialCambio(models.Model):
    MODELO_CHOICES = [
        ('producto', 'Producto'),
        ('pedido', 'Pedido'),
    ]

    modelo = models.CharField(max_length=20, choices=MODELO_CHOICES)
    objeto_id = models.PositiveIntegerField()
    campo = models.CharField(max_length=100)
    valor_anterior = models.TextField(null=True, blank=True)
    valor_nuevo = models.TextField(null=True, blank=True)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.modelo} {self.objeto_id} - {self.campo}"


class Alerta(models.Model):
    TIPOS = [
        ('bajo_stock', 'Bajo Stock'),
        ('vencimiento', 'Vencimiento Próximo'),
        ('agotado', 'Agotado'),
        ('reactivo', 'Reactivo Crítico'),
        ('autorizacion', 'Autorización'),
        ('otro', 'Otro'),
    ]
    PRIORIDADES = [
        ('alta', 'Alta'),
        ('media', 'Media'),
        ('baja', 'Baja'),
    ]

    tipo = models.CharField(max_length=20, choices=TIPOS, default='otro')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='alertas', null=True, blank=True)
    titulo = models.CharField(max_length=200, blank=True, default='')
    mensaje = models.TextField(blank=True, default='')
    descripcion = models.TextField(blank=True, default='')
    remitente = models.CharField(max_length=150, blank=True, default='Sistema')
    prioridad = models.CharField(max_length=10, choices=PRIORIDADES, default='media')
    resuelta = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    @property
    def estado(self):
        return 'resuelta' if self.resuelta else 'nueva'

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.tipo} - {(self.titulo or self.mensaje)[:50]}"