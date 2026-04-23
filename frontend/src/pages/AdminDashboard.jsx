// Panel principal del administrador - Estilo Laboratorio Oscuro
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import {
  Search, ChevronDown, Plus, Edit2, Trash2, Package, AlertCircle,
  TrendingUp, XCircle, CheckCircle2, Eye, FlaskConical, Download,
  Bell, Shield
} from 'lucide-react';
import Layout from '../components/Layout';
import ReportPanel from '../components/ReportPanel';
import RejectPedidoModal from '../components/RejectPedidoModal';
import { exportToExcel, exportToPdf } from '../utils/reportExport';
import {
  getProductos, createProducto, updateProducto, deleteProducto,
  getPedidos, updatePedido,
  getAlertas, createAlerta, updateAlerta, deleteAlerta,
} from '../services/api';

const normalizeProducto = (p) => ({
  ...p,
  categoria: p.categoria_nombre || String(p.categoria || ''),
  umbral_minimo: p.umbral_minimo ?? p.minimo ?? 0,
});

const normalizePedido = (p) => ({
  ...p,
  producto: p.producto_nombre || p.producto,
});

// ─── Badge helpers ────────────────────────────────────────────────
const ESTADO_STYLES = {
  ok:         'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25',
  bajo_stock: 'bg-amber-100  text-amber-400  border border-amber-200',
  agotado:    'bg-rose-100   text-rose-400   border border-rose-200',
  pendiente:  'bg-amber-100  text-amber-400  border border-amber-200',
  aprobado:   'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25',
  rechazado:  'bg-rose-100   text-rose-400   border border-rose-200',
};
const ESTADO_LABELS = {
  ok: 'OK', bajo_stock: 'Bajo stock', agotado: 'Agotado',
  pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado',
};
const EstadoBadge = ({ estado }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${ESTADO_STYLES[estado] || 'bg-stone-100 text-stone-500 border border-stone-200'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${estado === 'aprobado' || estado === 'ok' ? 'bg-emerald-400 animate-pulse' : estado === 'rechazado' || estado === 'agotado' ? 'bg-rose-400' : 'bg-amber-400'}`} />
    {ESTADO_LABELS[estado] || estado}
  </span>
);

// ─── Input/Select dark helpers ────────────────────────────────────
const inputCls = 'w-full bg-stone-50 border border-[#E0E0E0] rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

// ─── Stat card ────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color = 'emerald' }) => {
  const colors = {
    emerald: 'border-[#1FA971]/25 text-[#1FA971] bg-[#E8F5F0]',
    amber:   'border-amber-200  text-amber-400  bg-amber-500/10',
    rose:    'border-rose-200   text-rose-400   bg-rose-500/10',
    blue:    'border-blue-200   text-blue-400   bg-blue-500/10',
  };
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg p-4 hover:border-[#1FA971]/35 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">{label}</span>
          <p className={`text-3xl font-bold font-mono mt-1 ${colors[color].split(' ')[1]}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-md border ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────
const LabSection = ({ title, children, action, onAction }) => (
  <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#E0E0E0]">
      <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">{title}</span>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold text-[#1FA971] bg-[#E8F5F0] border border-[#1FA971]/25 hover:bg-[#E8F5F0] transition-colors">
          {action}
        </button>
      )}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState([]);

  const activeTab = ['pedidos', 'alertas'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'inventario';

  const [searchTerm, setSearchTerm] = useState('');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('todas');
  const [alertPriorityFilter, setAlertPriorityFilter] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModalInventario, setShowModalInventario] = useState(false);
  const [formProducto, setFormProducto] = useState({ nombre: '', categoria: 'Solventes', ubicacion: '', cantidad: '', umbral_minimo: '' });

  const [showModalAlerta, setShowModalAlerta] = useState(false);
  const [formAlerta, setFormAlerta] = useState({ titulo: '', descripcion: '', prioridad: 'media', remitente: 'Admin' });
  const [pedidoToReject, setPedidoToReject] = useState(null);
  const [pedidoModal, setPedidoModal] = useState(null);

  const changeTab = (tab) => setSearchParams({ tab });

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [prodRes, pedRes, alertRes] = await Promise.all([getProductos(), getPedidos(), getAlertas()]);
        setProductos((prodRes.data.results ?? prodRes.data).map(normalizeProducto));
        setPedidos((pedRes.data.results ?? pedRes.data).map(normalizePedido));
        setAlertas(alertRes.data.results ?? alertRes.data);
      } catch (err) {
        toast.error('Error al cargar datos del servidor');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  const handleRechazarPedido = async (id) => {
    const motivo = String(pedidoToReject?.motivo || '').trim();
    if (!motivo.trim()) { toast.error('Debes indicar un motivo de rechazo'); return; }
    try {
      const { data } = await updatePedido(id, { estado: 'rechazado', motivo_rechazo: motivo });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(data) : p));
      setPedidoToReject(null);
      toast.success('Pedido rechazado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al rechazar pedido'); }
  };

  const handleAprobarPedido = async (id) => {
    try {
      const pedido = pedidos.find((p) => p.id === id);
      const { data } = await updatePedido(id, { estado: 'aprobado' });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(data) : p));
      if (pedido?.evaluacion_seguridad?.reactivoCritico) {
        createAlerta({ tipo: 'autorizacion', titulo: `Reactivo autorizado: ${pedido.producto}`, descripcion: `Admin autorizó solicitud de ${pedido.solicitante}.`, remitente: 'Administrador', prioridad: 'media' })
          .then(({ data: a }) => setAlertas((prev) => [a, ...prev])).catch(() => {});
      }
      toast.success('Pedido aprobado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al aprobar pedido'); }
  };

  const resetFormProducto = () => {
    setFormProducto({ nombre: '', categoria: 'Solventes', ubicacion: '', cantidad: '', umbral_minimo: '' });
    setSelectedProduct(null);
  };

  const handleNuevoProducto = () => { resetFormProducto(); setShowModalInventario(true); };

  const handleEditarProducto = (p) => {
    setSelectedProduct(p);
    setFormProducto({ nombre: p.nombre, categoria: p.categoria, ubicacion: p.ubicacion, cantidad: String(p.cantidad), umbral_minimo: String(p.umbral_minimo) });
    setShowModalInventario(true);
  };

  const handleGuardarProducto = async () => {
    if (!formProducto.nombre.trim() || !formProducto.ubicacion.trim()) { toast.error('Completa nombre y ubicación'); return; }
    if (formProducto.cantidad === '' || formProducto.umbral_minimo === '') { toast.error('Completa cantidad y umbral mínimo'); return; }
    if (Number(formProducto.cantidad) < 0 || Number(formProducto.umbral_minimo) < 0) { toast.error('Las cantidades no pueden ser negativas'); return; }
    const payload = { nombre: formProducto.nombre.trim(), categoria_texto: formProducto.categoria, ubicacion: formProducto.ubicacion.trim(), cantidad: Number(formProducto.cantidad), umbral_minimo: Number(formProducto.umbral_minimo), tipo: 'reactivo' };
    try {
      if (selectedProduct) {
        const { data } = await updateProducto(selectedProduct.id, payload);
        setProductos((prev) => prev.map((p) => p.id === selectedProduct.id ? normalizeProducto(data) : p));
        toast.success('Producto actualizado');
      } else {
        const { data } = await createProducto(payload);
        setProductos((prev) => [normalizeProducto(data), ...prev]);
        toast.success('Producto creado');
      }
      setShowModalInventario(false); resetFormProducto();
    } catch (err) {
      const msg = err.response?.data;
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : (msg || 'Error al guardar'));
    }
  };

  const handleEliminarProducto = async (id) => {
    const p = productos.find((x) => x.id === id);
    if (!p || !window.confirm(`¿Eliminar ${p.nombre}?`)) return;
    try { await deleteProducto(id); setProductos((prev) => prev.filter((x) => x.id !== id)); toast.success('Producto eliminado'); }
    catch { toast.error('Error al eliminar el producto'); }
  };

  const handleResolverAlerta = async (id) => {
    try {
      const { data } = await updateAlerta(id, { resuelta: true });
      setAlertas((prev) => prev.map((a) => a.id === id ? data : a));
      toast.success('Alerta resuelta');
    } catch { toast.error('Error al resolver la alerta'); }
  };

  const handleCrearAlerta = async () => {
    if (!formAlerta.titulo.trim()) { toast.error('El título es requerido'); return; }
    try {
      const { data } = await createAlerta({ ...formAlerta, estado: 'nueva' });
      setAlertas((prev) => [...prev, data]);
      setFormAlerta({ titulo: '', descripcion: '', prioridad: 'media', remitente: 'Admin' });
      setShowModalAlerta(false);
      toast.success('Alerta creada');
    } catch { toast.error('Error al crear la alerta'); }
  };

  const handleEliminarAlerta = async (id) => {
    if (!window.confirm('¿Eliminar esta alerta?')) return;
    try {
      await deleteAlerta(id);
      setAlertas((prev) => prev.filter((a) => a.id !== id));
      toast.success('Alerta eliminada');
    } catch { toast.error('Error al eliminar la alerta'); }
  };

  const handleVerPedido = (pedido) => {
    setPedidoModal(pedido);
  };

  // Filtros
  const filteredPedidos = pedidos.filter((p) => {
    const t = searchTerm.toLowerCase();
    return (p.producto.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t) || p.solicitante.toLowerCase().includes(t))
      && (filterStatus === 'todos' || p.estado === filterStatus)
      && (!dateFrom || (p.fecha_solicitud || '') >= dateFrom)
      && (!dateTo || (p.fecha_solicitud || '') <= dateTo);
  });

  const categoriasDisponibles = ['todas', ...new Set(productos.map((p) => p.categoria).filter(Boolean))];

  const filteredProductos = productos.filter((p) => {
    const t = inventorySearchTerm.toLowerCase();
    return (p.nombre.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t) || p.ubicacion.toLowerCase().includes(t))
      && (inventoryCategory === 'todas' || p.categoria === inventoryCategory);
  });

  const filteredAlertas = alertas.filter((a) => alertPriorityFilter === 'todas' || a.prioridad === alertPriorityFilter);

  const statsPedidos = { total: pedidos.length, pendientes: pedidos.filter(p=>p.estado==='pendiente').length, aprobados: pedidos.filter(p=>p.estado==='aprobado').length, rechazados: pedidos.filter(p=>p.estado==='rechazado').length };
  const statsAlertas = { total: alertas.length, nuevas: alertas.filter(a=>a.estado==='nueva').length, altas: alertas.filter(a=>a.prioridad==='alta').length };

  const reportPrimaryData = activeTab === 'inventario'
    ? [{ name:'OK', value:productos.filter(p=>p.estado==='ok').length },{ name:'Bajo stock', value:productos.filter(p=>p.estado==='bajo_stock').length },{ name:'Agotados', value:productos.filter(p=>p.estado==='agotado').length }]
    : activeTab === 'pedidos'
    ? [{ name:'Pendientes', value:statsPedidos.pendientes },{ name:'Aprobados', value:statsPedidos.aprobados },{ name:'Rechazados', value:statsPedidos.rechazados }]
    : [{ name:'Nuevas', value:statsAlertas.nuevas },{ name:'Resueltas', value:alertas.filter(a=>a.estado==='resuelta').length },{ name:'Alta prioridad', value:statsAlertas.altas }];

  const reportSecondaryData = activeTab === 'inventario'
    ? Object.entries(filteredProductos.reduce((acc,p)=>{ acc[p.categoria]=(acc[p.categoria]||0)+1; return acc; },{})).map(([name,value])=>({name,value}))
    : activeTab === 'pedidos'
    ? Object.entries(filteredPedidos.reduce((acc,p)=>{ acc[p.prioridad]=(acc[p.prioridad]||0)+1; return acc; },{})).map(([name,value])=>({name,value}))
    : Object.entries(filteredAlertas.reduce((acc,a)=>{ acc[a.prioridad]=(acc[a.prioridad]||0)+1; return acc; },{})).map(([name,value])=>({name,value}));

  const activityItems = [
    ...pedidos.slice(0, 5).map((p) => {
      const badgeMap = {
        aprobado:  { badge: 'Aprobado',  badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        rechazado: { badge: 'Rechazado', badgeCls: 'bg-rose-100 text-rose-700 border-rose-200' },
        pendiente: { badge: 'Pendiente', badgeCls: 'bg-amber-100 text-amber-700 border-amber-200' },
      };
      return {
        id: `pedido-${p.id}`,
        title: `${p.codigo} · ${p.producto}`,
        detail: `${p.solicitante} solicitó ${p.cantidad} u. de ${p.producto}`,
        date: p.fecha_respuesta || p.fecha_solicitud,
        ...(badgeMap[p.estado] || { badge: p.estado, badgeCls: 'bg-stone-100 text-stone-500 border-stone-200' }),
      };
    }),
    ...alertas.slice(0, 3).map((a) => {
      const prioMap = {
        alta:  { badge: '⬆ Alta',  badgeCls: 'bg-rose-100 text-rose-700 border-rose-200' },
        media: { badge: '→ Media', badgeCls: 'bg-amber-100 text-amber-700 border-amber-200' },
        baja:  { badge: '⬇ Baja',  badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      };
      return {
        id: `alerta-${a.id}`,
        title: a.titulo,
        detail: `${a.descripcion || a.mensaje || 'Sin descripción'} · Por: ${a.remitente || 'SIGIRL'}`,
        date: a.fecha,
        ...(prioMap[a.prioridad] || {}),
      };
    }),
  ].slice(0, 7);

  const handleExportExcel = () => {
    if (activeTab === 'inventario') {
      exportToExcel(filteredProductos.map(i=>({ producto:i.nombre, categoria:i.categoria, cantidad:i.cantidad, umbral_minimo:i.umbral_minimo, ubicacion:i.ubicacion, estado:i.estado })), 'inventario-sigirl.xlsx');
    } else if (activeTab === 'pedidos') {
      exportToExcel(filteredPedidos.map(i=>({ codigo:i.codigo, solicitante:i.solicitante, producto:i.producto, cantidad:i.cantidad, prioridad:i.prioridad, estado:i.estado, fecha_solicitud:i.fecha_solicitud })), 'pedidos-sigirl.xlsx');
    } else {
      exportToExcel(filteredAlertas.map(i=>({ alerta:i.titulo, remitente:i.remitente, prioridad:i.prioridad, estado:i.estado, descripcion:i.descripcion })), 'alertas-sigirl.xlsx');
    }
    toast.success('Reporte exportado a Excel');
  };

  const handleExportPdf = () => {
    const isInv = activeTab === 'inventario', isPed = activeTab === 'pedidos';
    exportToPdf({
      title: isInv ? 'Reporte de Inventario SIGIRL' : isPed ? 'Reporte de Pedidos SIGIRL' : 'Reporte de Alertas SIGIRL',
      headers: isInv ? ['Producto','Categoría','Cantidad','Ubicación','Estado'] : isPed ? ['Código','Solicitante','Producto','Cantidad','Estado'] : ['Alerta','Remitente','Prioridad','Estado'],
      rows: isInv ? filteredProductos.map(i=>[i.nombre,i.categoria,i.cantidad,i.ubicacion,i.estado]) : isPed ? filteredPedidos.map(i=>[i.codigo,i.solicitante,i.producto,i.cantidad,i.estado]) : filteredAlertas.map(i=>[i.titulo,i.remitente,i.prioridad,i.estado]),
      fileName: isInv ? 'inventario-sigirl.pdf' : isPed ? 'pedidos-sigirl.pdf' : 'alertas-sigirl.pdf',
    });
    toast.success('Reporte exportado a PDF');
  };

  // ─── Tabs config ─────────────────────────────────────────────────
  const TABS = [
    { key: 'inventario', label: 'INVENTARIO', icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'pedidos',    label: 'PEDIDOS',    icon: <FlaskConical className="w-3.5 h-3.5" /> },
    { key: 'alertas',   label: 'ALERTAS',    icon: <Bell className="w-3.5 h-3.5" /> },
  ];

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="led-green mx-auto mb-3 w-3 h-3 rounded-full animate-pulse bg-emerald-400 shadow-[0_0_6px_#1FA971]" />
          <p className="text-stone-500 font-mono text-sm">CARGANDO SISTEMA...</p>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-[#1FA971]" />
                <span className="text-[10px] font-mono font-bold text-[#1FA971] uppercase tracking-wider">PANEL ADMINISTRATIVO</span>
                <span className="led-green w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e] animate-pulse" />
              </div>
              <h1 className="text-xl font-bold font-mono text-stone-700">Control de Sistema</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25">{productos.length} productos</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-200">{statsPedidos.pendientes} pendientes</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-200">{statsAlertas.nuevas} alertas</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => changeTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold transition-all ${
                    activeTab === t.key
                      ? 'bg-emerald-500/15 border border-emerald-500/50 text-[#1FA971] shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                      : 'bg-stone-50 border border-[#E0E0E0] text-stone-500 hover:text-stone-600 hover:border-slate-500'
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Panel */}
        <ReportPanel
          title={activeTab==='inventario'?'Reporte de inventario y stock':activeTab==='pedidos'?'Reporte de pedidos y prioridades':'Reporte de alertas y seguimiento'}
          subtitle={activeTab==='inventario'?'Resumen visual del estado de productos':activeTab==='pedidos'?'Seguimiento de aprobaciones y rechazos':'Control de incidencias por prioridad'}
          primaryData={reportPrimaryData}
          secondaryData={reportSecondaryData}
          activity={activityItems}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
        />

        {/* ── INVENTARIO ───────────────────────────────────────────── */}
        {activeTab === 'inventario' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Total Productos"  value={productos.length}                                              icon={<Package className="w-4 h-4" />} color="blue" />
              <StatCard label="Reactivos Críticos" value={productos.filter(p=>p.estado==='agotado').length}           icon={<AlertCircle className="w-4 h-4" />} color="rose" />
              <StatCard label="Alertas Activas"   value={alertas.filter(a=>a.estado==='nueva').length}                icon={<AlertCircle className="w-4 h-4" />} color="amber" />
              <StatCard label="Nivel Inventario"  value={`${productos.length?Math.max(10,Math.round((productos.filter(p=>p.estado==='ok').length/productos.length)*100)):0}%`} icon={<TrendingUp className="w-4 h-4" />} color="emerald" />
            </div>

            <LabSection
              title="INVENTARIO DE REACTIVOS"
              action={<><Plus className="w-3 h-3" /> NUEVO</>}
              onAction={handleNuevoProducto}
            >
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input type="text" placeholder="Buscar producto..." value={inventorySearchTerm} onChange={(e)=>setInventorySearchTerm(e.target.value)} className={`${inputCls} pl-9`} />
                </div>
                <div className="relative w-full md:w-48">
                  <select value={inventoryCategory} onChange={(e)=>setInventoryCategory(e.target.value)} className={`${selectCls} pr-8`}>
                    {categoriasDisponibles.map(c=><option key={c} value={c}>{c==='todas'?'Todas las categorías':c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                </div>
                <span className="px-3 py-2 rounded text-[10px] font-mono self-center text-[#1FA971] bg-[#E8F5F0] border border-[#1FA971]/25">{filteredProductos.length} visibles</span>
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E0E0E0]">
                      {['PRODUCTO','CATEGORÍA','CANT.','UBICACIÓN','ESTADO','ACCIONES'].map(h=>(
                        <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {filteredProductos.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-stone-400 font-mono text-sm">Sin resultados</td></tr>
                    ) : filteredProductos.map((p) => (
                      <tr key={p.id} className="hover:bg-[#E8F5F0]/60 transition-colors">
                        <td className="py-3 text-sm font-mono font-semibold text-stone-700">{p.nombre}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">{p.categoria}</span></td>
                        <td className="py-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded font-bold font-mono text-sm ${p.cantidad<=p.umbral_minimo?'bg-amber-100 text-amber-400':'bg-[#E8F5F0] text-[#1FA971]'}`}>{p.cantidad}</span>
                        </td>
                        <td className="py-3 text-sm font-mono text-stone-500">{p.ubicacion}</td>
                        <td className="py-3"><EstadoBadge estado={p.estado} /></td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={()=>handleEditarProducto(p)} className="p-1.5 text-stone-500 hover:text-[#1FA971] hover:bg-[#E8F5F0] rounded transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={()=>handleEliminarProducto(p.id)} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LabSection>
          </div>
        )}

        {/* ── PEDIDOS ──────────────────────────────────────────────── */}
        {activeTab === 'pedidos' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Total Pedidos"  value={statsPedidos.total}     icon={<Package className="w-4 h-4" />}       color="blue" />
              <StatCard label="Pendientes"     value={statsPedidos.pendientes} icon={<AlertCircle className="w-4 h-4" />}  color="amber" />
              <StatCard label="Aprobados"      value={statsPedidos.aprobados}  icon={<CheckCircle2 className="w-4 h-4" />} color="emerald" />
              <StatCard label="Rechazados"     value={statsPedidos.rechazados} icon={<XCircle className="w-4 h-4" />}      color="rose" />
            </div>

            <LabSection title="GESTIÓN DE PEDIDOS">
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input type="text" placeholder="Buscar pedido o solicitante..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className={`${inputCls} pl-9`} />
                </div>
                <div className="relative w-full md:w-44">
                  <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className={`${selectCls} pr-8`}>
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                </div>
                <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className={`${inputCls} w-full md:w-36`} />
                <input type="date" value={dateTo}   onChange={(e)=>setDateTo(e.target.value)}   className={`${inputCls} w-full md:w-36`} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E0E0E0]">
                      {['CÓDIGO','SOLICITANTE','PRODUCTO','CANT.','PRIORIDAD','ESTADO','ACCIONES'].map(h=>(
                        <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {filteredPedidos.length===0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-stone-400 font-mono text-sm">Sin pedidos</td></tr>
                    ) : filteredPedidos.map((p) => (
                      <tr key={p.id} className="hover:bg-[#E8F5F0]/60 transition-colors">
                        <td className="py-3 text-[11px] font-mono font-bold text-stone-600">{p.codigo}</td>
                        <td className="py-3 text-[11px] font-mono text-stone-600">{p.solicitante}</td>
                        <td className="py-3">
                          <p className="text-[11px] font-mono text-stone-600">{p.producto}</p>
                          {p.evaluacion_seguridad?.reactivoCritico && <span className="text-[9px] font-mono text-amber-400">⚠ Autorización especial</span>}
                        </td>
                        <td className="py-3 text-[11px] font-mono text-stone-500">{p.cantidad}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${p.prioridad==='alta'?'bg-rose-100 text-rose-400 border border-rose-200':p.prioridad==='media'?'bg-amber-100 text-amber-400 border border-amber-200':'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25'}`}>{p.prioridad}</span>
                        </td>
                        <td className="py-3"><EstadoBadge estado={p.estado} /></td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={()=>handleVerPedido(p)} className="p-1.5 text-stone-500 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors" title="Ver"><Eye className="w-3.5 h-3.5" /></button>
                            {p.estado==='pendiente' && <>
                              <button onClick={()=>handleAprobarPedido(p.id)} className="p-1.5 text-stone-500 hover:text-[#1FA971] hover:bg-[#E8F5F0] rounded transition-colors" title="Aprobar"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                              <button onClick={()=>setPedidoToReject({ id: p.id, codigo: p.codigo, producto: p.producto, solicitante: p.solicitante, motivo: '' })} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" title="Rechazar"><XCircle className="w-3.5 h-3.5" /></button>
                            </>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LabSection>
          </div>
        )}

        {/* ── ALERTAS ──────────────────────────────────────────────── */}
        {activeTab === 'alertas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Total Alertas"    value={statsAlertas.total}   icon={<Bell className="w-4 h-4" />}     color="rose" />
              <StatCard label="Nuevas"           value={statsAlertas.nuevas}  icon={<AlertCircle className="w-4 h-4" />} color="amber" />
              <StatCard label="Prioridad Alta"   value={statsAlertas.altas}   icon={<Shield className="w-4 h-4" />}   color="rose" />
            </div>

            <LabSection title="CENTRO DE ALERTAS" action="+ Nueva alerta" onAction={() => setShowModalAlerta(true)}>
              <div className="flex justify-end mb-4">
                <div className="relative w-48">
                  <select value={alertPriorityFilter} onChange={(e)=>setAlertPriorityFilter(e.target.value)} className={`${selectCls} pr-8`}>
                    <option value="todas">Todas</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E0E0E0]">
                      {['ALERTA','ORIGEN','PRIORIDAD','ESTADO','ACCIONES'].map(h=>(
                        <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {filteredAlertas.length===0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-stone-400 font-mono text-sm">Sin alertas</td></tr>
                    ) : filteredAlertas.map((a) => (
                      <tr key={a.id} className="hover:bg-rose-500/5 transition-colors">
                        <td className="py-3">
                          <p className="text-sm font-mono font-semibold text-stone-700">{a.titulo}</p>
                          <p className="text-[10px] font-mono text-stone-500 mt-0.5">{a.descripcion}</p>
                        </td>
                        <td className="py-3 text-[11px] font-mono text-stone-500">{a.remitente}</td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${a.prioridad==='alta'?'bg-rose-100 text-rose-400 border border-rose-200':a.prioridad==='media'?'bg-amber-100 text-amber-400 border border-amber-200':'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25'}`}>{a.prioridad}</span></td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${a.estado==='resuelta'?'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25':'bg-blue-100 text-blue-400 border border-blue-200'}`}>{a.estado}</span></td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={()=>handleResolverAlerta(a.id)} disabled={a.estado==='resuelta'} className="px-3 py-1.5 rounded text-[10px] font-mono font-bold bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25 hover:bg-[#E8F5F0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                              Resolver
                            </button>
                            <button onClick={()=>handleEliminarAlerta(a.id)} className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-200 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LabSection>
          </div>
        )}

        {/* ── MODAL PRODUCTO ───────────────────────────────────────── */}
        {showModalInventario && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-2xl shadow-stone-300/60">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
                <div>
                  <h2 className="text-sm font-mono font-bold text-[#1FA971] uppercase tracking-wider">{selectedProduct?'EDITAR PRODUCTO':'NUEVO PRODUCTO'}</h2>
                  <p className="text-[10px] font-mono text-stone-500 mt-0.5">Complete la información del inventario</p>
                </div>
                <button onClick={()=>{ setShowModalInventario(false); resetFormProducto(); }} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>

              {/* Form */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nombre</label>
                  <input type="text" value={formProducto.nombre} onChange={(e)=>setFormProducto({...formProducto,nombre:e.target.value})} className={inputCls} placeholder="Nombre del producto" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Categoría</label>
                  <select value={formProducto.categoria} onChange={(e)=>setFormProducto({...formProducto,categoria:e.target.value})} className={selectCls}>
                    {['Solventes','Ácidos','Bases','EPP','Materiales'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Ubicación</label>
                  <input type="text" value={formProducto.ubicacion} onChange={(e)=>setFormProducto({...formProducto,ubicacion:e.target.value})} className={inputCls} placeholder="Ej. Almacén A" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cantidad</label>
                  <input type="number" min="0" value={formProducto.cantidad} onChange={(e)=>setFormProducto({...formProducto,cantidad:e.target.value})} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Umbral mínimo</label>
                  <input type="number" min="0" value={formProducto.umbral_minimo} onChange={(e)=>setFormProducto({...formProducto,umbral_minimo:e.target.value})} className={inputCls} placeholder="0" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={()=>{ setShowModalInventario(false); resetFormProducto(); }} className="px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">Cancelar</button>
                <button onClick={handleGuardarProducto} className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">
                  {selectedProduct?'Guardar cambios':'Crear producto'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CREAR ALERTA ────────────────────────────────── */}
        {showModalAlerta && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-2xl shadow-stone-300/60">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
                <div>
                  <h2 className="text-sm font-mono font-bold text-rose-400 uppercase tracking-wider">NUEVA ALERTA</h2>

              <RejectPedidoModal
                open={Boolean(pedidoToReject)}
                pedido={pedidoToReject}
                motivo={pedidoToReject?.motivo || ''}
                onChangeMotivo={(motivo) => setPedidoToReject((prev) => prev ? { ...prev, motivo } : prev)}
                onClose={() => setPedidoToReject(null)}
                onConfirm={() => pedidoToReject && handleRechazarPedido(pedidoToReject.id)}
              />
                  <p className="text-[10px] font-mono text-stone-500 mt-0.5">Registrar una nueva incidencia</p>
                </div>
                <button onClick={()=>setShowModalAlerta(false)} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Título</label>
                  <input type="text" value={formAlerta.titulo} onChange={(e)=>setFormAlerta({...formAlerta,titulo:e.target.value})} className={inputCls} placeholder="Título de la alerta" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Descripción</label>
                  <textarea rows={3} value={formAlerta.descripcion} onChange={(e)=>setFormAlerta({...formAlerta,descripcion:e.target.value})} className={`${inputCls} resize-none`} placeholder="Descripción de la incidencia" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Prioridad</label>
                    <select value={formAlerta.prioridad} onChange={(e)=>setFormAlerta({...formAlerta,prioridad:e.target.value})} className={selectCls}>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Remitente</label>
                    <input type="text" value={formAlerta.remitente} onChange={(e)=>setFormAlerta({...formAlerta,remitente:e.target.value})} className={inputCls} placeholder="Admin" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={()=>setShowModalAlerta(false)} className="px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">Cancelar</button>
                <button onClick={handleCrearAlerta} className="px-4 py-2 rounded text-xs font-mono font-bold bg-rose-500 text-white hover:bg-rose-400 transition-colors">Crear alerta</button>
              </div>
            </div>
          </div>
        )}

      </div>

        {/* ── MODAL DETALLE PEDIDO ──────────────────────────────── */}
        {pedidoModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] bg-[#E8F5F0]">
                <div>
                  <h2 className="text-sm font-mono font-bold text-[#157A55] uppercase tracking-wider">DETALLE DEL PEDIDO</h2>
                  <p className="text-[10px] font-mono text-stone-500 mt-0.5">{pedidoModal.codigo}</p>
                </div>
                <button onClick={() => setPedidoModal(null)} className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { label: 'Código', value: pedidoModal.codigo },
                  { label: 'Solicitante', value: pedidoModal.solicitante },
                  { label: 'Producto', value: pedidoModal.producto },
                  { label: 'Cantidad', value: pedidoModal.cantidad },
                  { label: 'Departamento', value: pedidoModal.departamento },
                  { label: 'Prioridad', value: pedidoModal.prioridad },
                  { label: 'Estado', value: pedidoModal.estado },
                  { label: 'Fecha solicitud', value: pedidoModal.fecha_solicitud },
                  pedidoModal.observaciones && { label: 'Observaciones', value: pedidoModal.observaciones },
                  pedidoModal.motivo_rechazo && { label: 'Motivo rechazo', value: pedidoModal.motivo_rechazo },
                  pedidoModal.evaluacion_seguridad?.reactivoCritico && {
                    label: 'Puntaje seguridad',
                    value: `${pedidoModal.evaluacion_seguridad.puntaje}/${pedidoModal.evaluacion_seguridad.puntajeMinimo} — ${pedidoModal.evaluacion_seguridad.aprobado ? 'Aprobado' : 'Insuficiente'}`,
                  },
                ].filter(Boolean).map((row) => (
                  <div key={row.label} className="flex items-start gap-3 bg-stone-50 border border-[#E0E0E0] rounded-lg px-4 py-2.5">
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-sm font-mono text-stone-700 break-all">{row.value ?? '—'}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={() => setPedidoModal(null)} className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors">Cerrar</button>
              </div>
            </div>
          </div>
        )}

    </Layout>
  );
};

export default AdminDashboard;
