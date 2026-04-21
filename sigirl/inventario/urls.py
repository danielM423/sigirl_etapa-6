from rest_framework.routers import DefaultRouter

from .views import AlertaViewSet, CategoriaViewSet, MovimientoViewSet, PedidoViewSet, ProductoViewSet, UserManagementViewSet
from .views_auditoria import AuditoriaViewSet

router = DefaultRouter()
router.register(r'productos', ProductoViewSet)
router.register(r'categorias', CategoriaViewSet)
router.register(r'movimientos', MovimientoViewSet)
router.register(r'pedidos', PedidoViewSet)
router.register(r'alertas', AlertaViewSet)
router.register(r'auditoria', AuditoriaViewSet)
router.register(r'usuarios', UserManagementViewSet, basename='usuarios')

urlpatterns = router.urls