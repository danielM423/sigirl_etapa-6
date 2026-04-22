// Panel del Jefe Superior - Estilo Laboratorio Oscuro + API Real
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Users, TrendingUp, BarChart3, Search, ChevronDown, Eye, Download,
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Package, AlertCircle,
  FlaskConical, Shield, UserCheck, ClipboardList, ShieldCheck, RefreshCw,
  Clock, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import Layout from '../components/Layout';
import RejectPedidoModal from '../components/RejectPedidoModal';
import { getProductos, getPedidos, updatePedido, getUsuarios, updateUsuario, deleteUsuario, getAuditoria } from '../services/api';
import { exportToExcel } from '../utils/reportExport';

// ─── Design helpers ──────────────────────────────────────────────
const inputCls = 'w-full bg-stone-50 border border-[#E0E0E0] rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer pr-8`;

const ESTADO_STYLES = {
  aprobado:  'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25',
  pendiente: 'bg-amber-100  text-amber-400  border border-amber-200',
  rechazado: 'bg-rose-100   text-rose-400   border border-rose-200',
  ok:        'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25',
  bajo_stock:'bg-amber-100  text-amber-400  border border-amber-200',
  agotado:   'bg-rose-100   text-rose-400   border border-rose-200',
};

const EstadoBadge = ({ estado }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${ESTADO_STYLES[estado] || 'bg-stone-100 text-stone-500 border border-stone-200'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${estado==='aprobado'||estado==='ok'?'bg-emerald-400 animate-pulse':estado==='rechazado'||estado==='agotado'?'bg-rose-400':'bg-amber-400'}`} />
    {estado}
  </span>
);

const StatCard = ({ label, value, icon, color = 'emerald' }) => {
  const colorMap = {
    emerald: 'border-[#1FA971]/25 text-[#1FA971] bg-[#E8F5F0]',
    amber:   'border-amber-200  text-amber-400  bg-amber-500/10',
    rose:    'border-rose-200   text-rose-400   bg-rose-500/10',
    blue:    'border-blue-200   text-blue-400   bg-blue-500/10',
    purple:  'border-purple-500/30 text-purple-400 bg-purple-500/10',
  };
  const [border, textCol, bg] = colorMap[color].split(' ');
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg p-4 hover:border-[#1FA971]/35 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">{label}</span>
          <p className={`text-3xl font-bold font-mono mt-1 ${textCol}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-md border ${border} ${bg}`}>{icon}</div>
      </div>
    </div>
  );
};

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-md p-3 shadow-xl">
      <p className="font-mono font-bold text-[#1FA971] mb-1 text-[10px]">{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-stone-500">{e.name}:</span>
          <span className="font-bold text-[#1FA971]">{e.value}</span>
        </div>
      ))}
    </div>
  );
};

const CHART_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

const JefeSuperiorDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [pedidos, setPedidos]   = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [searchTerm, setSearchTerm]         = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterStatus, setFilterStatus]     = useState('todos');

  // ─── Selección masiva ─────────────────────────────────────
  const [selectedPedidos, setSelectedPedidos] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // ─── Modal evaluación de seguridad ──────────────────────
  const [evalModal, setEvalModal] = useState(null); // { pedido }
  const [evalForm, setEvalForm] = useState({ nivel_riesgo: 'bajo', epp: '', observacion: '' });

  // ─── Bitácora ────────────────────────────────────────────
  const [auditoria, setAuditoria] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModulo, setAuditModulo] = useState('');

  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    ['estadisticas','pedidos','usuarios','inventario','bitacora'].includes(initialTab) ? initialTab : 'estadisticas'
  );

  const changeTab = (tab) => { setActiveTab(tab); setSearchParams({ tab }); };

  // ─── Load real API data ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [pedRes, prodRes, usrRes] = await Promise.all([
          getPedidos(),
          getProductos(),
          getUsuarios().catch(() => ({ data: [] })),
        ]);
        setPedidos((pedRes.data.results ?? pedRes.data).map(p => ({ ...p, producto: p.producto_nombre || p.producto })));
        setProductos((prodRes.data.results ?? prodRes.data).map(p => ({ ...p, categoria: p.categoria_nombre || String(p.categoria || '') })));
        const rawUsuarios = usrRes.data.results ?? usrRes.data;
        setUsuarios(rawUsuarios);
      } catch (err) {
        toast.error('Error al cargar datos del servidor');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ─── Cargar bitácora cuando se activa ──────────────────────────
  useEffect(() => {
    if (activeTab !== 'bitacora') return;
    setAuditLoading(true);
    const params = {};
    if (auditSearch) params.search = auditSearch;
    if (auditModulo) params.modulo = auditModulo;
    getAuditoria(params)
      .then(res => setAuditoria(res.data.results ?? res.data))
      .catch(() => toast.error('Error al cargar bitácora'))
      .finally(() => setAuditLoading(false));
  }, [activeTab, auditSearch, auditModulo]);

  // ─── Pedido handlers ──────────────────────────────────────────
  const [pedidoToReject, setPedidoToReject] = useState(null);

  // Selección masiva
  const allPendientesIds = useMemo(() => filteredPedidos?.filter(p=>p.estado==='pendiente').map(p=>p.id) ?? [], []);
  const toggleSelect = (id) => setSelectedPedidos(prev => { const s = new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; });
  const toggleSelectAll = () => {
    const pendIds = (filteredPedidos||[]).filter(p=>p.estado==='pendiente').map(p=>p.id);
    setSelectedPedidos(prev => pendIds.every(id=>prev.has(id)) ? new Set() : new Set(pendIds));
  };
  const handleBulkAction = async (estado) => {
    if (!selectedPedidos.size) { toast.error('Selecciona al menos un pedido'); return; }
    setBulkLoading(true);
    try {
      const updates = await Promise.all([...selectedPedidos].map(id => updatePedido(id, { estado })));
      setPedidos(prev => prev.map(p => {
        const upd = updates.find(r => r.data.id === p.id);
        return upd ? { ...p, ...upd.data, producto: upd.data.producto_nombre || upd.data.producto } : p;
      }));
      setSelectedPedidos(new Set());
      toast.success(`${updates.length} pedido(s) ${estado === 'aprobado' ? 'aprobados' : 'rechazados'}`);
    } catch { toast.error('Error en acción masiva'); }
    finally { setBulkLoading(false); }
  };

  // Evaluación de seguridad
  const openEvalModal = (pedido) => {
    const existing = pedido.evaluacion_seguridad || {};
    setEvalForm({ nivel_riesgo: existing.nivel_riesgo||'bajo', epp: existing.epp||'', observacion: existing.observacion||'' });
    setEvalModal({ pedido });
  };
  const handleGuardarEval = async () => {
    if (!evalModal) return;
    try {
      const { data } = await updatePedido(evalModal.pedido.id, { evaluacion_seguridad: evalForm });
      setPedidos(prev => prev.map(p => p.id === evalModal.pedido.id ? { ...p, evaluacion_seguridad: data.evaluacion_seguridad } : p));
      toast.success('Evaluación guardada');
      setEvalModal(null);
    } catch { toast.error('Error al guardar evaluación'); }
  };

  const handleCambiarEstadoPedido = async (pedido, estado) => {
    const motivoRechazo = estado === 'rechazado' ? String(pedidoToReject?.motivo || '').trim() : '';
    if (estado === 'rechazado' && !motivoRechazo) { toast.error('Debes indicar un motivo'); return; }
    try {
      const { data } = await updatePedido(pedido.id, {
        estado,
        ...(estado === 'rechazado' ? { motivo_rechazo: motivoRechazo } : {}),
      });
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, ...data, producto: data.producto_nombre || data.producto } : p));
      if (estado === 'rechazado') setPedidoToReject(null);
      toast.success(estado === 'aprobado' ? 'Pedido aprobado' : 'Pedido rechazado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar pedido');
    }
  };

  const handleVerPedido = (pedido) => {
    const lines = [
      `Código: ${pedido.codigo}`, `Solicitante: ${pedido.solicitante}`,
      `Producto: ${pedido.producto}`, `Cantidad: ${pedido.cantidad}`,
      `Estado: ${pedido.estado}`, `Prioridad: ${pedido.prioridad}`,
      pedido.observaciones ? `Observaciones: ${pedido.observaciones}` : null,
      pedido.motivo_rechazo ? `Motivo rechazo: ${pedido.motivo_rechazo}` : null,
    ].filter(Boolean);
    toast.info(<div className="text-sm font-mono"><p className="font-bold mb-2 text-[#1FA971]">DETALLE PEDIDO</p><div className="space-y-1">{lines.map((l,i)=><p key={i} className="text-stone-600">{l}</p>)}</div></div>, { autoClose: 8000 });
  };

  const handleExportarPedidos = () => {
    exportToExcel(filteredPedidos.map(p=>({ codigo:p.codigo, solicitante:p.solicitante, producto:p.producto, cantidad:p.cantidad, estado:p.estado, prioridad:p.prioridad, fecha:p.fecha_solicitud })), 'pedidos-jefe.xlsx');
    toast.success('Pedidos exportados');
  };

  // ─── Usuario handlers ─────────────────────────────────────────
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario]   = useState(null);
  const [formUsuario, setFormUsuario] = useState({ nombre: '', email: '', departamento: '', rol: 'usuario' });

  const resetUsuarioForm = () => { setFormUsuario({ nombre:'', email:'', departamento:'', rol:'usuario' }); setSelectedUsuario(null); };

  const handleEditarUsuario = (u) => {
    setSelectedUsuario(u);
    setFormUsuario({ nombre: u.username || u.nombre || '', email: u.email || '', departamento: u.department || u.departamento || '', rol: u.rol || 'usuario' });
    setShowUsuarioModal(true);
  };

  const handleGuardarUsuario = async () => {
    if (!formUsuario.nombre.trim() || !formUsuario.email.trim()) { toast.error('Completa nombre y email'); return; }
    if (!formUsuario.email.includes('@')) { toast.error('Email inválido'); return; }
    try {
      if (selectedUsuario) {
        const { data } = await updateUsuario(selectedUsuario.id, { username: formUsuario.nombre, email: formUsuario.email, nombre_input: formUsuario.nombre, departamento_input: formUsuario.departamento, rol_input: formUsuario.rol });
        setUsuarios(prev => prev.map(u => u.id === selectedUsuario.id ? { ...u, ...data } : u));
        toast.success('Usuario actualizado');
      }
      setShowUsuarioModal(false); resetUsuarioForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleEliminarUsuario = async (id) => {
    const u = usuarios.find(x => x.id === id);
    if (!u || !window.confirm(`¿Eliminar a ${u.username || u.nombre}?`)) return;
    try {
      await deleteUsuario(id);
      setUsuarios(prev => prev.filter(x => x.id !== id));
      toast.success('Usuario eliminado');
    } catch { toast.error('Error al eliminar usuario'); }
  };

  const handleVerUsuario = (u) => {
    const lines = [`Usuario: ${u.username||u.nombre}`, `Email: ${u.email}`, `Departamento: ${u.department||u.departamento||'—'}`, `Rol: ${u.rol||'usuario'}`];
    toast.info(<div className="text-sm font-mono"><p className="font-bold mb-2 text-[#1FA971]">DETALLE USUARIO</p><div className="space-y-1">{lines.map((l,i)=><p key={i} className="text-stone-600">{l}</p>)}</div></div>, { autoClose: 6000 });
  };

  // ─── Computed stats ────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalPedidos: pedidos.length,
    aprobados: pedidos.filter(p=>p.estado==='aprobado').length,
    rechazados: pedidos.filter(p=>p.estado==='rechazado').length,
    pendientes: pedidos.filter(p=>p.estado==='pendiente').length,
    totalUsuarios: usuarios.length,
    tasaAprobacion: pedidos.length ? ((pedidos.filter(p=>p.estado==='aprobado').length/pedidos.length)*100).toFixed(1) : '0.0',
  }), [pedidos, usuarios]);

  const barData = useMemo(() => [
    { name: 'Aprobados',  value: stats.aprobados,  fill: '#22c55e' },
    { name: 'Pendientes', value: stats.pendientes, fill: '#f59e0b' },
    { name: 'Rechazados', value: stats.rechazados, fill: '#ef4444' },
  ], [stats]);

  const donutData = useMemo(() => barData.filter(d=>d.value>0), [barData]);

  const stockChartData = useMemo(() =>
    productos.slice(0,8).map(p=>({ name: p.nombre.length>12?p.nombre.slice(0,12)+'…':p.nombre, stock: Number(p.cantidad||0), minimo: Number(p.umbral_minimo||0) })),
    [productos]
  );

  const filteredPedidos = useMemo(() => pedidos.filter(p => {
    const t = searchTerm.toLowerCase();
    return (p.producto.toLowerCase().includes(t) || p.codigo?.toLowerCase().includes(t) || p.solicitante?.toLowerCase().includes(t))
      && (filterStatus === 'todos' || p.estado === filterStatus);
  }), [pedidos, searchTerm, filterStatus]);

  const filteredUsuarios = useMemo(() => usuarios.filter(u => {
    const t = userSearchTerm.toLowerCase();
    return (u.username||u.nombre||'').toLowerCase().includes(t) || (u.email||'').toLowerCase().includes(t) || (u.department||u.departamento||'').toLowerCase().includes(t);
  }), [usuarios, userSearchTerm]);

  const TABS = [
    { key:'estadisticas', label:'ESTADÍSTICAS', icon:<BarChart3 className="w-3.5 h-3.5" /> },
    { key:'pedidos',      label:'PEDIDOS',      icon:<FlaskConical className="w-3.5 h-3.5" /> },
    { key:'usuarios',     label:'USUARIOS',     icon:<Users className="w-3.5 h-3.5" /> },
    { key:'inventario',   label:'INVENTARIO',   icon:<Package className="w-3.5 h-3.5" /> },
    { key:'bitacora',     label:'BITÁCORA',     icon:<ClipboardList className="w-3.5 h-3.5" /> },
  ];

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_6px_#1FA971] animate-pulse mx-auto mb-3" />
          <p className="text-stone-500 font-mono text-sm">CARGANDO DATOS...</p>
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
                <span className="text-[10px] font-mono font-bold text-[#1FA971] uppercase tracking-wider">PANEL JEFE SUPERIOR</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e] animate-pulse" />
              </div>
              <h1 className="text-xl font-bold font-mono text-stone-700">Dashboard Ejecutivo</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25">{stats.totalPedidos} pedidos</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-200">{stats.totalUsuarios} usuarios</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-200">{stats.pendientes} pendientes</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TABS.map(t => (
                <button key={t.key} onClick={()=>changeTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold transition-all ${
                    activeTab===t.key
                      ? 'bg-emerald-500/15 border border-emerald-500/50 text-[#1FA971] shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                      : 'bg-stone-50 border border-[#E0E0E0] text-stone-500 hover:text-stone-600 hover:border-slate-500'
                  }`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── ESTADÍSTICAS ─────────────────────────────────────── */}
        {activeTab === 'estadisticas' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Pedidos"    value={stats.totalPedidos}   icon={<FlaskConical className="w-4 h-4" />} color="blue" />
              <StatCard label="Aprobados"        value={stats.aprobados}      icon={<CheckCircle2 className="w-4 h-4" />} color="emerald" />
              <StatCard label="Rechazados"       value={stats.rechazados}     icon={<XCircle className="w-4 h-4" />} color="rose" />
              <StatCard label="Tasa Aprobación"  value={`${stats.tasaAprobacion}%`} icon={<TrendingUp className="w-4 h-4" />} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Bar chart pedidos por estado */}
              <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E0E0E0]">
                  <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">PEDIDOS POR ESTADO</span>
                </div>
                <div className="p-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'#64748b', fontSize:10, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill:'#F0F4F2' }} />
                      {barData.map((d,i) => <Bar key={d.name} dataKey="value" data={[d]} fill={d.fill} radius={[4,4,0,0]} maxBarSize={50} />)}
                      <Bar dataKey="value" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut chart tasa aprobación */}
              <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E0E0E0]">
                  <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">DISTRIBUCIÓN DE ESTADOS</span>
                </div>
                <div className="p-5 flex items-center justify-center gap-6 h-64">
                  <div className="relative w-44 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3} stroke="none">
                          {donutData.map((d,i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold font-mono text-[#1FA971]">{stats.tasaAprobacion}%</p>
                        <p className="text-[8px] text-stone-500 font-mono uppercase">Aprobación</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {barData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span className="text-[10px] font-mono text-stone-500">{d.name}:</span>
                        <span className="text-[10px] font-mono font-bold text-stone-600">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stock vs umbral */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E0E0E0]">
                <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">STOCK vs UMBRAL MÍNIMO</span>
              </div>
              <div className="p-5 h-64">
                {stockChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:9, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'#64748b', fontSize:9, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill:'#F0F4F2' }} />
                      <Bar dataKey="stock"  name="Stock actual" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={30} />
                      <Bar dataKey="minimo" name="Umbral mínimo" fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-400 font-mono text-sm">Sin datos de inventario</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PEDIDOS ──────────────────────────────────────────── */}
        {activeTab === 'pedidos' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total"      value={stats.totalPedidos}  icon={<FlaskConical className="w-4 h-4" />} color="blue" />
              <StatCard label="Pendientes" value={stats.pendientes}    icon={<AlertCircle className="w-4 h-4" />} color="amber" />
              <StatCard label="Aprobados"  value={stats.aprobados}     icon={<CheckCircle2 className="w-4 h-4" />} color="emerald" />
              <StatCard label="Rechazados" value={stats.rechazados}    icon={<XCircle className="w-4 h-4" />} color="rose" />
            </div>

            <LabSection
              title="TODOS LOS PEDIDOS"
              action={<><Download className="w-3 h-3" /> EXPORTAR</>}
              onAction={handleExportarPedidos}
            >
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input type="text" placeholder="Buscar pedido..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={`${inputCls} pl-9`} />
                </div>
                <div className="relative w-full md:w-44">
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={selectCls}>
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                </div>
              </div>

              {/* Acciones masivas */}
              {selectedPedidos.size > 0 && (
                <div className="flex items-center gap-3 mb-3 p-3 bg-[#E8F5F0]/60 border border-emerald-500/20 rounded-lg">
                  <span className="text-[11px] font-mono text-[#1FA971]">{selectedPedidos.size} seleccionado(s)</span>
                  <button
                    onClick={() => handleBulkAction('aprobado')}
                    disabled={bulkLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold text-[#1FA971] bg-[#E8F5F0] border border-[#1FA971]/25 hover:bg-[#E8F5F0] transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Aprobar todos
                  </button>
                  <button
                    onClick={() => { if (selectedPedidos.size) setPedidoToReject({ id: [...selectedPedidos][0], codigo: 'BULK', producto: `${selectedPedidos.size} pedidos`, solicitante: '', motivo: '', _bulk: true }); }}
                    disabled={bulkLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3" /> Rechazar todos
                  </button>
                  <button onClick={() => setSelectedPedidos(new Set())} className="ml-auto text-[10px] font-mono text-stone-500 hover:text-stone-600">Deseleccionar</button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E0E0E0]">
                      <th className="pb-3 w-8">
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={filteredPedidos.filter(p=>p.estado==='pendiente').length>0 && filteredPedidos.filter(p=>p.estado==='pendiente').every(p=>selectedPedidos.has(p.id))}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      {['CÓDIGO','SOLICITANTE','PRODUCTO','CANT.','PRIORIDAD','ESTADO','ACCIONES'].map(h=>(
                        <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {filteredPedidos.length===0 ? (
                      <tr><td colSpan={8} className="py-10 text-center text-stone-400 font-mono text-sm">Sin pedidos</td></tr>
                    ) : filteredPedidos.map(p => (
                      <tr key={p.id} className={`hover:bg-[#E8F5F0]/60 transition-colors ${selectedPedidos.has(p.id)?'bg-[#E8F5F0]/60':''}`}>
                        <td className="py-3">
                          {p.estado==='pendiente' && (
                            <input type="checkbox" className="accent-emerald-500" checked={selectedPedidos.has(p.id)} onChange={()=>toggleSelect(p.id)} />
                          )}
                        </td>
                        <td className="py-3 text-[11px] font-mono font-bold text-stone-600">{p.codigo}</td>
                        <td className="py-3 text-[11px] font-mono text-stone-600">{p.solicitante}</td>
                        <td className="py-3 text-[11px] font-mono text-stone-600">{p.producto}</td>
                        <td className="py-3 text-[11px] font-mono text-stone-500">{p.cantidad}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${p.prioridad==='alta'?'bg-rose-100 text-rose-400 border border-rose-200':p.prioridad==='media'?'bg-amber-100 text-amber-400 border border-amber-200':'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25'}`}>{p.prioridad}</span>
                        </td>
                        <td className="py-3"><EstadoBadge estado={p.estado} /></td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={()=>handleVerPedido(p)} className="p-1.5 text-stone-500 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors" title="Ver"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={()=>openEvalModal(p)} className={`p-1.5 rounded transition-colors ${p.evaluacion_seguridad ? 'text-[#1FA971] bg-[#E8F5F0]' : 'text-stone-500 hover:text-[#1FA971] hover:bg-[#E8F5F0]'}`} title="Evaluación seguridad"><ShieldCheck className="w-3.5 h-3.5" /></button>
                            {p.estado==='pendiente' && <>
                              <button onClick={()=>handleCambiarEstadoPedido(p,'aprobado')} className="p-1.5 text-stone-500 hover:text-[#1FA971] hover:bg-[#E8F5F0] rounded transition-colors" title="Aprobar"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                              <button onClick={()=>setPedidoToReject({ ...p, motivo: '' })} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" title="Rechazar"><XCircle className="w-3.5 h-3.5" /></button>
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

        {/* ── USUARIOS ─────────────────────────────────────────── */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Usuarios"  value={stats.totalUsuarios}  icon={<Users className="w-4 h-4" />} color="blue" />
              <StatCard label="Administradores" value={usuarios.filter(u=>u.is_staff&&!u.is_superuser).length} icon={<Shield className="w-4 h-4" />} color="purple" />
              <StatCard label="Activos"         value={usuarios.filter(u=>u.is_active!==false).length} icon={<UserCheck className="w-4 h-4" />} color="emerald" />
            </div>

            <LabSection title="GESTIÓN DE USUARIOS">
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input type="text" placeholder="Buscar usuario..." value={userSearchTerm} onChange={e=>setUserSearchTerm(e.target.value)} className={`${inputCls} pl-9`} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E0E0E0]">
                      {['USUARIO','EMAIL','DEPARTAMENTO','ROL','ACCIONES'].map(h=>(
                        <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {filteredUsuarios.length===0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-stone-400 font-mono text-sm">Sin usuarios</td></tr>
                    ) : filteredUsuarios.map(u => (
                      <tr key={u.id} className="hover:bg-[#E8F5F0]/60 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#E8F5F0] border border-[#1FA971]/25 flex items-center justify-center text-[10px] font-mono font-bold text-[#1FA971]">
                              {(u.username||u.nombre||'?').slice(0,2).toUpperCase()}
                            </div>
                            <span className="text-sm font-mono text-stone-700">{u.username||u.nombre}</span>
                          </div>
                        </td>
                        <td className="py-3 text-[11px] font-mono text-stone-500">{u.email||'—'}</td>
                        <td className="py-3 text-[11px] font-mono text-stone-500">{u.department||u.departamento||'—'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${u.is_superuser?'bg-purple-100 text-purple-400 border border-purple-500/30':u.is_staff?'bg-blue-100 text-blue-400 border border-blue-200':'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25'}`}>
                            {u.is_superuser?'Jefe':u.is_staff?'Admin':'Usuario'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={()=>handleVerUsuario(u)} className="p-1.5 text-stone-500 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors" title="Ver"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={()=>handleEditarUsuario(u)} className="p-1.5 text-stone-500 hover:text-[#1FA971] hover:bg-[#E8F5F0] rounded transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={()=>handleEliminarUsuario(u.id)} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
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

        {/* ── INVENTARIO (read-only) ────────────────────────────── */}
        {activeTab === 'inventario' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Productos"  value={productos.length}                                                  icon={<Package className="w-4 h-4" />} color="blue" />
              <StatCard label="Bajo Stock"       value={productos.filter(p=>p.estado==='bajo_stock').length}               icon={<AlertCircle className="w-4 h-4" />} color="amber" />
              <StatCard label="Agotados"         value={productos.filter(p=>p.estado==='agotado').length}                  icon={<XCircle className="w-4 h-4" />} color="rose" />
            </div>

            <LabSection title="INVENTARIO DE REACTIVOS (Vista de supervisor)">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E0E0E0]">
                      {['PRODUCTO','CATEGORÍA','CANT.','UMBRAL','UBICACIÓN','ESTADO'].map(h=>(
                        <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {productos.length===0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-stone-400 font-mono text-sm">Sin productos</td></tr>
                    ) : productos.map(p => (
                      <tr key={p.id} className="hover:bg-[#E8F5F0]/60 transition-colors">
                        <td className="py-3 text-sm font-mono font-semibold text-stone-700">{p.nombre}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">{p.categoria}</span></td>
                        <td className="py-3"><span className={`inline-flex items-center justify-center w-8 h-8 rounded font-bold font-mono text-sm ${p.cantidad<=p.umbral_minimo?'bg-amber-100 text-amber-400':'bg-[#E8F5F0] text-[#1FA971]'}`}>{p.cantidad}</span></td>
                        <td className="py-3 text-[11px] font-mono text-stone-500">{p.umbral_minimo}</td>
                        <td className="py-3 text-[11px] font-mono text-stone-500">{p.ubicacion}</td>
                        <td className="py-3"><EstadoBadge estado={p.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LabSection>
          </div>
        )}

        {/* ── BITÁCORA ─────────────────────────────────────────── */}
        {activeTab === 'bitacora' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Registros totales" value={auditoria.length}                                      icon={<Activity className="w-4 h-4" />} color="blue" />
              <StatCard label="Acciones hoy"      value={auditoria.filter(a=>a.fecha?.startsWith(new Date().toISOString().slice(0,10))).length} icon={<Clock className="w-4 h-4" />} color="amber" />
              <StatCard label="Módulos activos"   value={[...new Set(auditoria.map(a=>a.modulo).filter(Boolean))].length} icon={<RefreshCw className="w-4 h-4" />} color="emerald" />
            </div>

            <LabSection
              title="BITÁCORA DE AUDITORÍA"
              action={<><Download className="w-3 h-3" /> EXPORTAR</>}
              onAction={() => exportToExcel(auditoria.map(a=>({ usuario:a.usuario, accion:a.accion, modulo:a.modulo, descripcion:a.descripcion, fecha:a.fecha })), 'bitacora.xlsx') && toast.success('Exportado')}
            >
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input type="text" placeholder="Buscar usuario, acción..." value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} className={`${inputCls} pl-9`} />
                </div>
                <div className="relative w-full md:w-44">
                  <select value={auditModulo} onChange={e=>setAuditModulo(e.target.value)} className={selectCls}>
                    <option value="">Todos los módulos</option>
                    {[...new Set(auditoria.map(a=>a.modulo).filter(Boolean))].map(m=>(
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                </div>
              </div>

              {auditLoading ? (
                <div className="py-10 text-center text-stone-500 font-mono text-sm">Cargando bitácora...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E0E0E0]">
                        {['USUARIO','ACCIÓN','MÓDULO','DESCRIPCIÓN','FECHA'].map(h=>(
                          <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0]">
                      {auditoria.length===0 ? (
                        <tr><td colSpan={5} className="py-10 text-center text-stone-400 font-mono text-sm">Sin registros de auditoría</td></tr>
                      ) : auditoria.map((a, i) => (
                        <tr key={a.id||i} className="hover:bg-[#E8F5F0]/60 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[9px] font-mono font-bold text-blue-400">
                                {String(a.usuario||'?').slice(0,2).toUpperCase()}
                              </div>
                              <span className="text-[11px] font-mono text-stone-600">{a.usuario||'Sistema'}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              a.accion==='crear'||a.accion==='create' ? 'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25' :
                              a.accion==='eliminar'||a.accion==='delete' ? 'bg-rose-100 text-rose-400 border border-rose-200' :
                              'bg-amber-100 text-amber-400 border border-amber-200'
                            }`}>{a.accion||'—'}</span>
                          </td>
                          <td className="py-3"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">{a.modulo||'—'}</span></td>
                          <td className="py-3 text-[11px] font-mono text-stone-500 max-w-xs truncate">{a.descripcion||'—'}</td>
                          <td className="py-3 text-[10px] font-mono text-stone-500">{a.fecha ? new Date(a.fecha).toLocaleString('es-CO') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </LabSection>
          </div>
        )}

        {/* ── MODAL USUARIO ──────────────────────────────────────── */}        {showUsuarioModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
                <div>
                  <h2 className="text-sm font-mono font-bold text-[#1FA971] uppercase tracking-wider">EDITAR USUARIO</h2>
                  <p className="text-[10px] font-mono text-stone-500 mt-0.5">Modifica los datos del usuario</p>
                </div>
                <button onClick={()=>{ setShowUsuarioModal(false); resetUsuarioForm(); }} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Usuario</label>
                  <input type="text" value={formUsuario.nombre} onChange={e=>setFormUsuario({...formUsuario,nombre:e.target.value})} className={inputCls} placeholder="nombre_usuario" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={formUsuario.email} onChange={e=>setFormUsuario({...formUsuario,email:e.target.value})} className={inputCls} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Departamento</label>
                  <input type="text" value={formUsuario.departamento} onChange={e=>setFormUsuario({...formUsuario,departamento:e.target.value})} className={inputCls} placeholder="Laboratorio General" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Rol</label>
                  <select value={formUsuario.rol} onChange={e=>setFormUsuario({...formUsuario,rol:e.target.value})} className={selectCls}>
                    <option value="usuario">Usuario</option>
                    <option value="admin">Admin</option>
                    <option value="jefe">Jefe</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={()=>{ setShowUsuarioModal(false); resetUsuarioForm(); }} className="px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">Cancelar</button>
                <button onClick={handleGuardarUsuario} className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">Guardar</button>
              </div>
            </div>
          </div>
        )}

        <RejectPedidoModal
          open={Boolean(pedidoToReject)}
          pedido={pedidoToReject}
          motivo={pedidoToReject?.motivo || ''}
          onChangeMotivo={(motivo) => setPedidoToReject((prev) => prev ? { ...prev, motivo } : prev)}
          onClose={() => setPedidoToReject(null)}
          onConfirm={() => {
            if (!pedidoToReject) return;
            if (pedidoToReject._bulk) {
              // acción masiva
              const motivo = pedidoToReject.motivo?.trim();
              if (!motivo) { toast.error('Debes indicar un motivo'); return; }
              setBulkLoading(true);
              Promise.all([...selectedPedidos].map(id => updatePedido(id, { estado: 'rechazado', motivo_rechazo: motivo })))
                .then(updates => {
                  setPedidos(prev => prev.map(p => {
                    const upd = updates.find(r => r.data.id === p.id);
                    return upd ? { ...p, ...upd.data, producto: upd.data.producto_nombre || upd.data.producto } : p;
                  }));
                  setSelectedPedidos(new Set());
                  toast.success(`${updates.length} pedido(s) rechazados`);
                })
                .catch(() => toast.error('Error al rechazar'))
                .finally(() => { setBulkLoading(false); setPedidoToReject(null); });
            } else {
              handleCambiarEstadoPedido(pedidoToReject, 'rechazado');
            }
          }}
        />

        {/* ── MODAL EVALUACIÓN DE SEGURIDAD ──────────────────────── */}
        {evalModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
                <div>
                  <h2 className="text-sm font-mono font-bold text-[#1FA971] uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> EVALUACIÓN DE SEGURIDAD
                  </h2>
                  <p className="text-[10px] font-mono text-stone-500 mt-0.5">Pedido: {evalModal.pedido.codigo} — {evalModal.pedido.producto}</p>
                </div>
                <button onClick={()=>setEvalModal(null)} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nivel de riesgo</label>
                  <select value={evalForm.nivel_riesgo} onChange={e=>setEvalForm({...evalForm,nivel_riesgo:e.target.value})} className={selectCls}>
                    <option value="bajo">🟢 Bajo</option>
                    <option value="medio">🟠 Medio</option>
                    <option value="alto">🔴 Alto</option>
                    <option value="critico">⛔ Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">EPP requerido</label>
                  <input type="text" placeholder="Guantes, bata, gafas..." value={evalForm.epp} onChange={e=>setEvalForm({...evalForm,epp:e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Observaciones de seguridad</label>
                  <textarea rows={3} value={evalForm.observacion} onChange={e=>setEvalForm({...evalForm,observacion:e.target.value})} className={`${inputCls} resize-none`} placeholder="Restricciones, condiciones especiales..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={()=>setEvalModal(null)} className="px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">Cancelar</button>
                <button onClick={handleGuardarEval} className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">Guardar evaluación</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default JefeSuperiorDashboard;
