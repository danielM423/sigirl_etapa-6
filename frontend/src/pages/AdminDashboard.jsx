// Panel principal del administrador.
// Permite gestionar inventario, pedidos, alertas y reportes.
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, Plus, Edit2, Trash2, Package, AlertCircle, TrendingUp, XCircle, CheckCircle2, Eye } from 'lucide-react';
import Layout from '../components/Layout';
import ReportPanel from '../components/ReportPanel';
import { exportToExcel, exportToPdf } from '../utils/reportExport';
import {
  getProductos, createProducto, updateProducto, deleteProducto,
  getPedidos, updatePedido,
  getAlertas, createAlerta, updateAlerta,
} from '../services/api';

// ============================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================
// Convierte los datos de la API al formato que espera el frontend
// La API puede devolver categoria_nombre o categoria, esta función unifica
const normalizeProducto = (p) => ({
  ...p,
  categoria: p.categoria_nombre || String(p.categoria || ''),
  umbral_minimo: p.umbral_minimo ?? p.minimo ?? 0,
});

// Normaliza el nombre del producto en los pedidos
const normalizePedido = (p) => ({
  ...p,
  producto: p.producto_nombre || p.producto,
});

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const AdminDashboard = () => {
  // ============================================================
  // ESTADOS PRINCIPALES
  // ============================================================
  const [searchParams, setSearchParams] = useSearchParams();     // Lee/escribe parámetros URL (?tab=pedidos)
  const [productos, setProductos] = useState([]);               // Lista de productos del inventario
  const [pedidos, setPedidos] = useState([]);                   // Lista de pedidos
  const [loading, setLoading] = useState(true);                 // Indica si los datos están cargando
  const [alertas, setAlertas] = useState([]);                   // Lista de alertas del sistema
  
  // Pestaña activa: 'inventario', 'pedidos' o 'alertas' (por defecto 'inventario')
  const activeTab = ['pedidos', 'alertas'].includes(searchParams.get('tab')) 
    ? searchParams.get('tab') 
    : 'inventario';

  // ============================================================
  // ESTADOS DE BÚSQUEDA Y FILTROS
  // ============================================================
  const [searchTerm, setSearchTerm] = useState('');              // Búsqueda en pedidos
  const [inventorySearchTerm, setInventorySearchTerm] = useState(''); // Búsqueda en inventario
  const [inventoryCategory, setInventoryCategory] = useState('todas'); // Filtro por categoría en inventario
  const [alertPriorityFilter, setAlertPriorityFilter] = useState('todas'); // Filtro por prioridad de alertas
  const [filterStatus, setFilterStatus] = useState('todos');     // Filtro por estado de pedidos
  const [dateFrom, setDateFrom] = useState('');                  // Filtro fecha inicio para pedidos
  const [dateTo, setDateTo] = useState('');                      // Filtro fecha fin para pedidos

  // ============================================================
  // ESTADOS PARA MODAL Y FORMULARIOS
  // ============================================================
  const [selectedProduct, setSelectedProduct] = useState(null);  // Producto que se está editando
  const [showModalInventario, setShowModalInventario] = useState(false); // Controla visibilidad del modal
  const [formProducto, setFormProducto] = useState({             // Datos del formulario de producto
    nombre: '',
    categoria: 'Solventes',
    ubicacion: '',
    cantidad: '',
    umbral_minimo: ''
  });

  // ============================================================
  // FUNCIÓN: Cambiar pestaña activa
  // ============================================================
  const changeTab = (tab) => {
    setSearchParams({ tab });  // Actualiza la URL para mantener el estado
  };

  // ============================================================
  // EFECTO: Carga inicial de datos
  // ============================================================
  useEffect(() => {
    const hydrate = async () => {
      try {
        // Carga productos, pedidos y alertas en paralelo (más eficiente)
        const [prodRes, pedRes, alertRes] = await Promise.all([
          getProductos(),
          getPedidos(),
          getAlertas(),
        ]);
        // Normaliza y guarda los datos en los estados
        setProductos((prodRes.data.results ?? prodRes.data).map(normalizeProducto));
        setPedidos((pedRes.data.results ?? pedRes.data).map(normalizePedido));
        setAlertas(alertRes.data.results ?? alertRes.data);
      } catch (err) {
        toast.error('Error al cargar datos del servidor');
        console.error(err);
      } finally {
        setLoading(false);  // Termina el estado de carga
      }
    };
    hydrate();
  }, []);  // El array vacío significa que solo se ejecuta al montar el componente

  // ============================================================
  // MANEJO DE PEDIDOS
  // ============================================================
  
  // Rechazar un pedido: solicita motivo y actualiza en API
  const handleRechazarPedido = async (id) => {
    const motivo = prompt('¿Cuál es el motivo del rechazo?');
    if (motivo === null) return;
    if (!motivo.trim()) {
      toast.error('Debes indicar un motivo de rechazo');
      return;
    }
    try {
      const { data } = await updatePedido(id, { estado: 'rechazado', motivo_rechazo: motivo });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(data) : p));
      toast.success('Pedido rechazado exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al rechazar pedido');
    }
  };

  // Aprobar un pedido: si es reactivo crítico, genera alerta automática
  const handleAprobarPedido = async (id) => {
    try {
      const pedido = pedidos.find((p) => p.id === id);
      const { data } = await updatePedido(id, { estado: 'aprobado' });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(data) : p));

      // Si el pedido contiene un reactivo crítico, crear alerta automática
      if (pedido?.evaluacion_seguridad?.reactivoCritico) {
        createAlerta({
          tipo: 'autorizacion',
          titulo: `Reactivo autorizado: ${pedido.producto}`,
          descripcion: `El administrador autorizó la solicitud de ${pedido.solicitante}.`,
          remitente: 'Administrador',
          prioridad: 'media',
        }).then(({ data: alerta }) => setAlertas((prev) => [alerta, ...prev])).catch(() => {});
      }

      toast.success('Pedido aprobado exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al aprobar pedido');
    }
  };

  // ============================================================
  // MANEJO DE PRODUCTOS (CRUD)
  // ============================================================
  
  // Reinicia el formulario de producto a sus valores por defecto
  const resetFormProducto = () => {
    setFormProducto({
      nombre: '',
      categoria: 'Solventes',
      ubicacion: '',
      cantidad: '',
      umbral_minimo: ''
    });
    setSelectedProduct(null);
  };

  // Abre el modal para crear un nuevo producto
  const handleNuevoProducto = () => {
    resetFormProducto();
    setShowModalInventario(true);
  };

  // Abre el modal para editar un producto existente
  const handleEditarProducto = (producto) => {
    setSelectedProduct(producto);
    setFormProducto({
      nombre: producto.nombre,
      categoria: producto.categoria,
      ubicacion: producto.ubicacion,
      cantidad: String(producto.cantidad),
      umbral_minimo: String(producto.umbral_minimo)
    });
    setShowModalInventario(true);
  };

  // Guarda producto (crea o actualiza según si hay selectedProduct)
  const handleGuardarProducto = async () => {
    // Validaciones
    if (!formProducto.nombre.trim() || !formProducto.ubicacion.trim()) {
      toast.error('Completa el nombre y la ubicación del producto');
      return;
    }
    if (formProducto.cantidad === '' || formProducto.umbral_minimo === '') {
      toast.error('Completa la cantidad y el umbral mínimo');
      return;
    }
    if (Number(formProducto.cantidad) < 0 || Number(formProducto.umbral_minimo) < 0) {
      toast.error('Las cantidades no pueden ser negativas');
      return;
    }

    const payload = {
      nombre: formProducto.nombre.trim(),
      categoria_texto: formProducto.categoria,
      ubicacion: formProducto.ubicacion.trim(),
      cantidad: Number(formProducto.cantidad),
      umbral_minimo: Number(formProducto.umbral_minimo),
      tipo: 'reactivo',
    };

    try {
      if (selectedProduct) {
        // Actualizar producto existente
        const { data } = await updateProducto(selectedProduct.id, payload);
        setProductos((prev) => prev.map((p) => p.id === selectedProduct.id ? normalizeProducto(data) : p));
        toast.success('Producto actualizado exitosamente');
      } else {
        // Crear nuevo producto
        const { data } = await createProducto(payload);
        setProductos((prev) => [normalizeProducto(data), ...prev]);
        toast.success('Producto creado exitosamente');
      }
      setShowModalInventario(false);
      resetFormProducto();
    } catch (err) {
      const msg = err.response?.data;
      const detail = typeof msg === 'object' ? Object.values(msg).flat().join(' ') : (msg || 'Error al guardar producto');
      toast.error(detail);
    }
  };

  // Eliminar un producto del inventario
  const handleEliminarProducto = async (id) => {
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    if (!window.confirm(`¿Eliminar ${producto.nombre} del inventario?`)) return;

    try {
      await deleteProducto(id);
      setProductos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Producto eliminado exitosamente');
    } catch (err) {
      toast.error('Error al eliminar el producto');
    }
  };

  // ============================================================
  // MANEJO DE ALERTAS
  // ============================================================
  
  // Marcar una alerta como resuelta
  const handleResolverAlerta = async (id) => {
    try {
      const { data } = await updateAlerta(id, { resuelta: true });
      setAlertas((prev) => prev.map((a) => a.id === id ? data : a));
      toast.success('Alerta marcada como resuelta');
    } catch (err) {
      toast.error('Error al resolver la alerta');
    }
  };

  // ============================================================
  // FUNCIONES DE VISUALIZACIÓN Y UTILIDADES
  // ============================================================
  
  // Muestra un modal con los detalles completos de un pedido
  const handleVerPedido = (pedido) => {
    const detalle = [
      `Código: ${pedido.codigo}`,
      `Solicitante: ${pedido.solicitante}`,
      `Producto: ${pedido.producto}`,
      `Cantidad: ${pedido.cantidad}`,
      `Departamento: ${pedido.departamento}`,
      `Prioridad: ${pedido.prioridad}`,
      `Estado: ${pedido.estado}`,
      pedido.evaluacion_seguridad?.reactivoCritico ? `Puntaje seguridad: ${pedido.evaluacion_seguridad.puntaje}/${pedido.evaluacion_seguridad.puntajeMinimo}` : null,
      pedido.observaciones ? `Observaciones: ${pedido.observaciones}` : null,
      pedido.motivo_rechazo ? `Motivo de rechazo: ${pedido.motivo_rechazo}` : null,
    ].filter(Boolean);

    toast.info(
      <div className="text-sm">
        <p className="font-semibold mb-2">Detalle del pedido</p>
        <div className="space-y-1">{detalle.map((line, index) => <p key={index}>{line}</p>)}</div>
      </div>,
      { autoClose: 8000, closeOnClick: false }
    );
  };

  // Devuelve un componente badge con el estilo según el estado
  const getEstadoBadge = (estado) => {
    const styles = {
      ok: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      bajo_stock: 'bg-amber-100 text-amber-700 border border-amber-300',
      agotado: 'bg-rose-100 text-rose-700 border border-rose-300',
      pendiente: 'bg-blue-100 text-blue-700 border border-blue-300',
      aprobado: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      rechazado: 'bg-rose-100 text-rose-700 border border-rose-300'
    };

    const icons = {
      ok: '✅',
      bajo_stock: '⚠️',
      agotado: '❌',
      pendiente: '⏳',
      aprobado: '✅',
      rechazado: '❌'
    };

    const labels = {
      ok: 'OK',
      bajo_stock: 'Bajo Stock',
      agotado: 'Agotado',
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${styles[estado]}`}>
        {icons[estado]}
        {labels[estado]}
      </span>
    );
  };

  // ============================================================
  // FILTROS PARA CADA SECCIÓN
  // ============================================================
  
  // Filtro de pedidos: búsqueda, estado, fechas
  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = pedido.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.solicitante.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'todos' || pedido.estado === filterStatus;
    const matchesFrom = !dateFrom || (pedido.fecha_solicitud || '') >= dateFrom;
    const matchesTo = !dateTo || (pedido.fecha_solicitud || '') <= dateTo;
    return matchesSearch && matchesFilter && matchesFrom && matchesTo;
  });

  // Obtiene categorías únicas para el filtro de inventario
  const categoriasDisponibles = ['todas', ...new Set(productos.map((producto) => producto.categoria).filter(Boolean))];

  // Filtro de productos: búsqueda y categoría
  const filteredProductos = productos.filter((producto) => {
    const text = inventorySearchTerm.toLowerCase();
    const matchesSearch =
      producto.nombre.toLowerCase().includes(text) ||
      producto.categoria.toLowerCase().includes(text) ||
      producto.ubicacion.toLowerCase().includes(text);
    const matchesCategory = inventoryCategory === 'todas' || producto.categoria === inventoryCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtro de alertas: por prioridad
  const filteredAlertas = alertas.filter((alerta) => alertPriorityFilter === 'todas' || alerta.prioridad === alertPriorityFilter);

  // ============================================================
  // ESTADÍSTICAS PARA REPORTES
  // ============================================================
  
  const statsPedidos = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    aprobados: pedidos.filter(p => p.estado === 'aprobado').length,
    rechazados: pedidos.filter(p => p.estado === 'rechazado').length
  };

  const statsAlertas = {
    total: alertas.length,
    nuevas: alertas.filter((alerta) => alerta.estado === 'nueva').length,
    altas: alertas.filter((alerta) => alerta.prioridad === 'alta').length,
  };

  // Datos para gráficos según la pestaña activa
  const reportPrimaryData = activeTab === 'inventario'
    ? [
        { name: 'OK', value: productos.filter((p) => p.estado === 'ok').length },
        { name: 'Bajo stock', value: productos.filter((p) => p.estado === 'bajo_stock').length },
        { name: 'Agotados', value: productos.filter((p) => p.estado === 'agotado').length },
      ]
    : activeTab === 'pedidos'
      ? [
          { name: 'Pendientes', value: statsPedidos.pendientes },
          { name: 'Aprobados', value: statsPedidos.aprobados },
          { name: 'Rechazados', value: statsPedidos.rechazados },
        ]
      : [
          { name: 'Nuevas', value: statsAlertas.nuevas },
          { name: 'Resueltas', value: alertas.filter((item) => item.estado === 'resuelta').length },
          { name: 'Prioridad alta', value: statsAlertas.altas },
        ];

  const reportSecondaryData = activeTab === 'inventario'
    ? Object.entries(filteredProductos.reduce((acc, item) => {
        acc[item.categoria] = (acc[item.categoria] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value }))
    : activeTab === 'pedidos'
      ? Object.entries(filteredPedidos.reduce((acc, item) => {
          acc[item.prioridad] = (acc[item.prioridad] || 0) + 1;
          return acc;
        }, {})).map(([name, value]) => ({ name, value }))
      : Object.entries(filteredAlertas.reduce((acc, item) => {
          acc[item.prioridad] = (acc[item.prioridad] || 0) + 1;
          return acc;
        }, {})).map(([name, value]) => ({ name, value }));

  // Actividad reciente (últimos pedidos y alertas)
  const activityItems = [
    ...pedidos.slice(0, 5).map((pedido) => ({
      id: `pedido-${pedido.id}`,
      title: `${pedido.codigo} · ${pedido.estado}`,
      detail: `${pedido.solicitante} solicitó ${pedido.producto} (${pedido.cantidad})`,
      date: pedido.fecha_respuesta || pedido.fecha_solicitud,
    })),
    ...alertas.slice(0, 3).map((alerta) => ({
      id: `alerta-${alerta.id}`,
      title: alerta.titulo,
      detail: alerta.descripcion,
      date: alerta.fecha,
    })),
  ].slice(0, 7);

  // ============================================================
  // EXPORTACIÓN DE REPORTES
  // ============================================================
  
  // Exporta los datos actuales a Excel
  const handleExportExcel = () => {
    if (activeTab === 'inventario') {
      exportToExcel(
        filteredProductos.map((item) => ({
          producto: item.nombre,
          categoria: item.categoria,
          cantidad: item.cantidad,
          umbral_minimo: item.umbral_minimo,
          ubicacion: item.ubicacion,
          estado: item.estado,
          recomendacion: item.estado === 'agotado' ? 'Reposición inmediata' : item.estado === 'bajo_stock' ? 'Planificar compra' : 'Stock estable',
        })),
        'inventario-sigirl.xlsx'
      );
    } else if (activeTab === 'pedidos') {
      exportToExcel(
        filteredPedidos.map((item) => ({
          codigo: item.codigo,
          solicitante: item.solicitante,
          producto: item.producto,
          cantidad: item.cantidad,
          prioridad: item.prioridad,
          estado: item.estado,
          fecha_solicitud: item.fecha_solicitud,
          fecha_respuesta: item.fecha_respuesta || 'Pendiente',
        })),
        'pedidos-sigirl.xlsx'
      );
    } else {
      exportToExcel(
        filteredAlertas.map((item) => ({
          alerta: item.titulo,
          remitente: item.remitente,
          prioridad: item.prioridad,
          estado: item.estado,
          descripcion: item.descripcion,
        })),
        'alertas-sigirl.xlsx'
      );
    }
    toast.success('Reporte exportado a Excel');
  };

  // Exporta los datos actuales a PDF
  const handleExportPdf = () => {
    const isInventory = activeTab === 'inventario';
    const isPedidos = activeTab === 'pedidos';

    exportToPdf({
      title: isInventory ? 'Reporte de Inventario SIGIRL' : isPedidos ? 'Reporte de Pedidos SIGIRL' : 'Reporte de Alertas SIGIRL',
      headers: isInventory
        ? ['Producto', 'Categoría', 'Cantidad', 'Ubicación', 'Estado']
        : isPedidos
          ? ['Código', 'Solicitante', 'Producto', 'Cantidad', 'Estado']
          : ['Alerta', 'Remitente', 'Prioridad', 'Estado'],
      rows: isInventory
        ? filteredProductos.map((item) => [item.nombre, item.categoria, item.cantidad, item.ubicacion, item.estado])
        : isPedidos
          ? filteredPedidos.map((item) => [item.codigo, item.solicitante, item.producto, item.cantidad, item.estado])
          : filteredAlertas.map((item) => [item.titulo, item.remitente, item.prioridad, item.estado]),
      fileName: isInventory ? 'inventario-sigirl.pdf' : isPedidos ? 'pedidos-sigirl.pdf' : 'alertas-sigirl.pdf',
    });
    toast.success('Reporte exportado a PDF');
  };

  // ============================================================
  // RENDERIZADO CONDICIONAL (PANTALLA DE CARGA)
  // ============================================================
  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-slate-600 font-semibold">Cargando panel administrativo...</div>
      </Layout>
    );
  }

  // ============================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================
  return (
    <Layout>
      <div>
        {/* ==================================================== */}
        {/* HEADER DEL PANEL ADMINISTRATIVO */}
        {/* ==================================================== */}
        <div className="mb-10 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_35px_rgba(34,197,94,0.10)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-[34px] font-bold text-slate-800">Panel administrativo PRO</h1>
              <p className="text-slate-500 text-base">Gestiona inventario, pedidos y alertas desde un solo lugar con una vista ejecutiva más limpia.</p>

              {/* Badges de resumen */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {productos.length} productos
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  {pedidos.filter((item) => item.estado === 'pendiente').length} pedidos pendientes
                </span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  {alertas.filter((item) => item.estado === 'nueva').length} alertas nuevas
                </span>
              </div>
            </div>

            {/* Botones de navegación entre pestañas */}
            <div className="flex flex-wrap justify-center gap-3 rounded-[24px] border border-emerald-100 bg-[#f8fff7] p-2.5">
              <button
                onClick={() => changeTab('inventario')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  activeTab === 'inventario'
                    ? 'bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-emerald-100 text-slate-700 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                Inventario
              </button>
              <button
                onClick={() => changeTab('pedidos')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  activeTab === 'pedidos'
                    ? 'bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-emerald-100 text-slate-700 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                Pedidos
              </button>
              <button
                onClick={() => changeTab('alertas')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  activeTab === 'alertas'
                    ? 'bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-emerald-100 text-slate-700 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                Alertas
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* PANEL DE REPORTES (Gráficos y actividad reciente) */}
        {/* ==================================================== */}
        <ReportPanel
          title={activeTab === 'inventario' ? 'Reporte de inventario y stock' : activeTab === 'pedidos' ? 'Reporte de pedidos y prioridades' : 'Reporte de alertas y seguimiento'}
          subtitle={activeTab === 'inventario' ? 'Resumen visual del estado de productos y categorías.' : activeTab === 'pedidos' ? 'Seguimiento de aprobaciones, rechazos y actividad reciente.' : 'Control de incidencias por prioridad, estado y atención pendiente.'}
          primaryData={reportPrimaryData}
          secondaryData={reportSecondaryData}
          activity={activityItems}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
        />

        {/* ==================================================== */}
        {/* SECCIÓN: INVENTARIO */}
        {/* ==================================================== */}
        {activeTab === 'inventario' && (
          <div>
            {/* Tarjetas de estadísticas - Inventario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
              <div className="rounded-[20px] bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Productos Totales</p>
                    <p className="text-4xl font-bold mt-2">{productos.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-red-500 to-rose-500 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Reactivos Críticos</p>
                    <p className="text-4xl font-bold mt-2">{productos.filter(p => p.estado === 'agotado').length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-amber-400 to-orange-500 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Alertas Activas</p>
                    <p className="text-4xl font-bold mt-2">{alertas.filter((item) => item.estado === 'nueva').length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-lime-500 to-green-600 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Nivel de Inventario</p>
                    <p className="text-4xl font-bold mt-2">{productos.length ? Math.max(10, Math.round((productos.filter((p) => p.estado === 'ok').length / productos.length) * 100)) : 0}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de búsqueda y filtros de inventario */}
            <div className="mb-5 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto, categoría o ubicación..."
                      value={inventorySearchTerm}
                      onChange={(e) => setInventorySearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#f8fff7] border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all"
                    />
                  </div>
                  <div className="relative w-full md:w-52">
                    <select
                      value={inventoryCategory}
                      onChange={(e) => setInventoryCategory(e.target.value)}
                      className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                    >
                      {categoriasDisponibles.map((categoria) => (
                        <option key={categoria} value={categoria}>
                          {categoria === 'todas' ? 'Todas las categorías' : categoria}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {filteredProductos.length} visibles
                  </span>
                  <button
                    onClick={handleNuevoProducto}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo producto
                  </button>
                </div>
              </div>
            </div>

            {/* Tabla de inventario */}
            <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f6fff2] border-b border-emerald-100">
                    <tr>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Producto</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Categoría</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Cantidad</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Ubicación</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Estado</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10">
                    {filteredProductos.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-14 text-center text-slate-500 font-medium">
                          No hay productos que coincidan con los filtros aplicados.
                        </td>
                      </tr>
                    ) : filteredProductos.map((producto) => (
                      <tr key={producto.id} className="group hover:bg-emerald-500/5 transition-all duration-200">
                        <td className="py-5 px-5">
                          <p className="font-bold text-slate-900 text-sm">{producto.nombre}</p>
                        </td>
                        <td className="py-5 px-5">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-300">
                            {producto.categoria}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${producto.cantidad <= producto.umbral_minimo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {producto.cantidad}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-slate-700 text-sm">{producto.ubicacion}</td>
                        <td className="py-5 px-5 text-center">{getEstadoBadge(producto.estado)}</td>
                        <td className="py-5 px-5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditarProducto(producto)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar producto"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEliminarProducto(producto.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SECCIÓN: PEDIDOS */}
        {/* ==================================================== */}
        {activeTab === 'pedidos' && (
          <div>
            {/* Tarjetas de estadísticas - Pedidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
              <div className="rounded-[20px] bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Total Pedidos</p>
                    <p className="text-4xl font-bold mt-2">{statsPedidos.total}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-red-500 to-rose-500 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Pendientes</p>
                    <p className="text-4xl font-bold mt-2">{statsPedidos.pendientes}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-amber-400 to-orange-500 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Aprobados</p>
                    <p className="text-4xl font-bold mt-2">{statsPedidos.aprobados}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-lime-500 to-green-600 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Rechazados</p>
                    <p className="text-4xl font-bold mt-2">{statsPedidos.rechazados}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de búsqueda y filtros de pedidos */}
            <div className="bg-white rounded-[24px] border border-emerald-100 shadow-[0_10px_30px_rgba(34,197,94,0.08)] p-5 md:p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar pedido o solicitante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#f8fff7] border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all"
                    />
                  </div>
                </div>
                <div className="relative w-full sm:w-48">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 text-sm"
                />
              </div>
            </div>

            {/* Tabla de pedidos */}
            <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f6fff2] border-b border-emerald-100">
                    <tr>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Código</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Solicitante</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Producto</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Cant.</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Prioridad</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Estado</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-purple-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/10">
                    {filteredPedidos.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200/30 to-indigo-200/20 flex items-center justify-center text-3xl">
                              📋
                            </div>
                            <p className="font-semibold text-slate-700 text-sm">No hay pedidos para mostrar</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPedidos.map((pedido) => (
                        <tr key={pedido.id} className="group hover:bg-purple-500/5 transition-all duration-200">
                          <td className="py-5 px-5">
                            <p className="font-bold text-slate-900 text-sm">{pedido.codigo}</p>
                          </td>
                          <td className="py-5 px-5">
                            <p className="font-semibold text-slate-700 text-sm">{pedido.solicitante}</p>
                          </td>
                          <td className="py-5 px-5">
                            <p className="text-slate-600 text-sm">{pedido.producto}</p>
                            {pedido.evaluacion_seguridad?.reactivoCritico && (
                              <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                Autorización especial
                              </span>
                            )}
                          </td>
                          <td className="py-5 px-5 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm bg-blue-100 text-blue-700">
                              {pedido.cantidad}
                            </span>
                          </td>
                          <td className="py-5 px-5 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${pedido.prioridad === 'alta' ? 'bg-rose-100 text-rose-700 border-rose-300' : pedido.prioridad === 'media' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                              {pedido.prioridad}
                            </span>
                          </td>
                          <td className="py-5 px-5 text-center">{getEstadoBadge(pedido.estado)}</td>
                          <td className="py-5 px-5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleVerPedido(pedido)}
                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {pedido.estado === 'pendiente' && (
                                <>
                                  <button
                                    onClick={() => handleAprobarPedido(pedido.id)}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors hover:text-emerald-700"
                                    title="Aprobar"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRechazarPedido(pedido.id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors hover:text-rose-700"
                                    title="Rechazar"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SECCIÓN: ALERTAS */}
        {/* ==================================================== */}
        {activeTab === 'alertas' && (
          <div>
            {/* Tarjetas de estadísticas - Alertas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl border border-rose-200 bg-white/80 p-5 shadow-sm">
                <p className="text-sm font-semibold text-rose-600 uppercase">Total alertas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{statsAlertas.total}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/80 p-5 shadow-sm">
                <p className="text-sm font-semibold text-amber-600 uppercase">Nuevas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{statsAlertas.nuevas}</p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-white/80 p-5 shadow-sm">
                <p className="text-sm font-semibold text-indigo-600 uppercase">Prioridad alta</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{statsAlertas.altas}</p>
              </div>
            </div>

            {/* Filtro de prioridad para alertas */}
            <div className="mb-5 rounded-[24px] border border-rose-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Centro de alertas</p>
                  <p className="text-xs text-slate-500">Filtra incidencias y atiende primero las de mayor impacto.</p>
                </div>
                <div className="relative w-full md:w-52">
                  <select
                    value={alertPriorityFilter}
                    onChange={(e) => setAlertPriorityFilter(e.target.value)}
                    className="appearance-none bg-[#fff7f7] border border-rose-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer text-sm w-full transition-all"
                  >
                    <option value="todas">Todas las prioridades</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Tabla de alertas */}
            <div className="rounded-2xl border border-white/20 bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-rose-50 border-b border-rose-100">
                    <tr>
                      <th className="text-left py-4 px-5 text-xs font-bold uppercase tracking-wider text-rose-700">Alerta</th>
                      <th className="text-left py-4 px-5 text-xs font-bold uppercase tracking-wider text-rose-700">Origen</th>
                      <th className="text-center py-4 px-5 text-xs font-bold uppercase tracking-wider text-rose-700">Prioridad</th>
                      <th className="text-center py-4 px-5 text-xs font-bold uppercase tracking-wider text-rose-700">Estado</th>
                      <th className="text-center py-4 px-5 text-xs font-bold uppercase tracking-wider text-rose-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {filteredAlertas.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-10 text-center text-slate-500">No hay alertas registradas con ese filtro.</td>
                      </tr>
                    ) : filteredAlertas.map((alerta) => (
                      <tr key={alerta.id} className="hover:bg-rose-50/50 transition-colors">
                        <td className="py-4 px-5">
                          <p className="font-semibold text-slate-800 text-sm">{alerta.titulo}</p>
                          <p className="text-xs text-slate-500 mt-1">{alerta.descripcion}</p>
                        </td>
                        <td className="py-4 px-5 text-sm text-slate-600">{alerta.remitente}</td>
                        <td className="py-4 px-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${alerta.prioridad === 'alta' ? 'bg-rose-100 text-rose-700' : alerta.prioridad === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {alerta.prioridad}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${alerta.estado === 'resuelta' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {alerta.estado}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => handleResolverAlerta(alerta.id)}
                            disabled={alerta.estado === 'resuelta'}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-semibold disabled:opacity-50"
                          >
                            Resolver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL PARA CREAR/EDITAR PRODUCTO */}
        {/* ==================================================== */}
        {showModalInventario && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-[28px] sigirl-form-surface overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-gradient-to-r from-[#f6fff2] to-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedProduct ? 'Editar producto' : 'Nuevo producto'}
                  </h2>
                  <p className="text-sm text-slate-500">Completa la información del inventario</p>
                </div>
                <button
                  onClick={() => {
                    setShowModalInventario(false);
                    resetFormProducto();
                  }}
                  className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Cerrar"
                >
                  <XCircle className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Campos del formulario */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formProducto.nombre}
                    onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Nombre del producto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Categoría</label>
                  <select
                    value={formProducto.categoria}
                    onChange={(e) => setFormProducto({ ...formProducto, categoria: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="Solventes">Solventes</option>
                    <option value="Ácidos">Ácidos</option>
                    <option value="Bases">Bases</option>
                    <option value="EPP">EPP</option>
                    <option value="Materiales">Materiales</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Ubicación</label>
                  <input
                    type="text"
                    value={formProducto.ubicacion}
                    onChange={(e) => setFormProducto({ ...formProducto, ubicacion: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Ej. Almacén A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cantidad</label>
                  <input
                    type="number"
                    min="0"
                    value={formProducto.cantidad}
                    onChange={(e) => setFormProducto({ ...formProducto, cantidad: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Umbral mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formProducto.umbral_minimo}
                    onChange={(e) => setFormProducto({ ...formProducto, umbral_minimo: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Botones del modal */}
              <div className="sigirl-form-footer px-6 py-4 border-t border-emerald-100 bg-[#f8fff7]">
                <button
                  onClick={() => {
                    setShowModalInventario(false);
                    resetFormProducto();
                  }}
                  className="sigirl-btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarProducto}
                  className="sigirl-btn-primary"
                >
                  {selectedProduct ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;