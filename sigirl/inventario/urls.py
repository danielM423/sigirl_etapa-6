from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
	AlertaViewSet,
	CategoriaViewSet,
	MovimientoViewSet,
	PedidoViewSet,
	ProductoViewSet,
	UserManagementViewSet,
	download_inventory_excel,
	download_inventory_pdf,
	download_inventory_template_excel,
)
from .views_auditoria import AuditoriaViewSet

router = DefaultRouter()
router.register(r'productos', ProductoViewSet)
router.register(r'categorias', CategoriaViewSet)
router.register(r'movimientos', MovimientoViewSet)
router.register(r'pedidos', PedidoViewSet)
router.register(r'alertas', AlertaViewSet)
router.register(r'auditoria', AuditoriaViewSet)
router.register(r'usuarios', UserManagementViewSet, basename='usuarios')

urlpatterns = [
	path('reportes/inventario-excel/', download_inventory_excel, name='reporte_inventario_excel'),
	path('reportes/plantilla-inventario/', download_inventory_template_excel, name='plantilla_inventario_excel'),
	path('reportes/inventario-pdf/', download_inventory_pdf, name='reporte_inventario_pdf'),
] + router.urls