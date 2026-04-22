// Vista de pedidos — Tema Laboratorio Oscuro
import { useState, useEffect, useMemo, useContext } from 'react';
import { toast } from 'react-toastify';
import { Search, ChevronDown, Plus, Eye, CheckCircle2, XCircle, ShoppingCart, Clock, AlertCircle, Download } from 'lucide-react';
import Layout from '../components/Layout';
import RejectPedidoModal from '../components/RejectPedidoModal';
import { UserContext } from '../context/UserContext';
import { exportToExcel } from '../utils/reportExport';
import { getPedidos, createPedido, updatePedido, getProductos } from '../services/api';

const inputCls = 'w-full bg-stone-50 border border-[#E0E0E0] rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

const ESTADO_STYLES = {
  pendiente:  'bg-amber-100  text-amber-400  border-amber-200',
  aprobado:   'bg-[#E8F5F0] text-[#1FA971] border-[#1FA971]/25',
  entregado:  'bg-blue-100   text-blue-400   border-blue-200',
  rechazado:  'bg-rose-100   text-rose-400   border-rose-200',
};
const PRIORIDAD_STYLES = {
  alta:  'bg-rose-100  text-rose-400  border-rose-200',
  media: 'bg-amber-100 text-amber-400 border-amber-200',
  baja:  'bg-stone-100 text-stone-500 border-stone-200',
};

const EstadoBadge = ({ estado }) => {
  const dots = { pendiente: 'bg-amber-400', aprobado: 'bg-emerald-400 animate-pulse', entregado: 'bg-blue-400', rechazado: 'bg-rose-400' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${ESTADO_STYLES[estado] || 'bg-stone-100 text-stone-500 border-stone-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[estado] || 'bg-stone-400'}`} />
      {estado}
    </span>
  );
};

const StatCard = ({ label, value, icon, color = 'emerald' }) => {
  const colors = { emerald: 'border-[#1FA971]/25 text-[#1FA971] bg-[#E8F5F0]', amber: 'border-amber-200 text-amber-400 bg-amber-500/10', rose: 'border-rose-200 text-rose-400 bg-rose-500/10', blue: 'border-blue-200 text-blue-400 bg-blue-500/10' };
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

const LabSection = ({ title, children }) => (
  <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
    <div className="px-5 py-3 border-b border-[#E0E0E0]">
      <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Pedidos = () => {
  const { user, role } = useContext(UserContext);
  const normalizedRole = role === 'jefe_superior' ? 'jefe' : role;
  const canManage = normalizedRole === 'admin' || normalizedRole === 'jefe';
  const currentUsername = (user?.username || localStorage.getItem('username') || 'usuario').toLowerCase();

  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [formPedido, setFormPedido] = useState({ productoId: '', cantidad: '', prioridad: 'media', observaciones: '' });
  const [pedidoToReject, setPedidoToReject] = useState(null);

  const normalizePedido = (p) => ({
    ...p,
    producto: p.producto_nombre || p.producto || '',
    solicitante: p.solicitante || p.usuario_username || '',
    codigo: p.codigo || `PED-${String(p.id).padStart(3,'0')}`,
  });

  useEffect(() => {
    Promise.all([
      getPedidos().catch(() => ({ data: [] })),
      getProductos().catch(() => ({ data: [] })),
    ]).then(([pedidosRes, productosRes]) => {
      const pData = pedidosRes.data?.results ?? pedidosRes.data ?? [];
      const prData = productosRes.data?.results ?? productosRes.data ?? [];
      setPedidos(pData.map(normalizePedido));
      setProductos(prData);
    }).finally(() => setLoading(false));
  }, []);

  const visiblePedidos = useMemo(() => {
    if (canManage) return pedidos;
    return pedidos.filter((p) => {
      const candidates = [p.solicitante, p.creadoPor, p.usuario_username].filter(Boolean).map((v) => String(v).toLowerCase());
      return candidates.includes(currentUsername);
    });
  }, [pedidos, canManage, currentUsername]);

  const filteredPedidos = visiblePedidos.filter((p) => {
    const t = searchTerm.toLowerCase();
    return ((p.producto||'').toLowerCase().includes(t) || (p.solicitante||'').toLowerCase().includes(t) || (p.codigo||'').toLowerCase().includes(t))
      && (filterStatus === 'todos' || p.estado === filterStatus)
      && (filterPriority === 'todas' || p.prioridad === filterPriority);
  });

  const stats = {
    total: visiblePedidos.length,
    pendientes: visiblePedidos.filter((p) => p.estado === 'pendiente').length,
    aprobados: visiblePedidos.filter((p) => p.estado === 'aprobado').length,
    rechazados: visiblePedidos.filter((p) => p.estado === 'rechazado').length,
  };

  const handleGuardarPedido = async () => {
    if (!formPedido.productoId || !formPedido.cantidad) { toast.error('Completa todos los campos'); return; }
    try {
      const { data } = await createPedido({ producto: Number(formPedido.productoId), cantidad: parseInt(formPedido.cantidad), prioridad: formPedido.prioridad, observaciones: formPedido.observaciones });
      setPedidos((prev) => [normalizePedido(data), ...prev]);
      setFormPedido({ productoId: '', cantidad: '', prioridad: 'media', observaciones: '' });
      setShowModal(false);
      toast.success('Pedido creado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al crear el pedido'); }
  };

  const handleAprobarPedido = async (id) => {
    if (!canManage) { toast.error('Sin permisos.'); return; }
    try {
      const { data } = await updatePedido(id, { estado: 'aprobado' });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(data) : p));
      toast.success('Pedido aprobado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al aprobar'); }
  };

  const handleRechazarPedido = async (id) => {
    if (!canManage) { toast.error('Sin permisos.'); return; }
    const motivo = String(pedidoToReject?.motivo || '').trim();
    if (!motivo) { toast.error('Debes indicar un motivo de rechazo'); return; }
    try {
      const { data } = await updatePedido(id, { estado: 'rechazado', motivo_rechazo: motivo });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(data) : p));
      setPedidoToReject(null);
      toast.info('Pedido rechazado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al rechazar'); }
  };

  const handleExportar = () => {
    if (!canManage) { toast.info('Solo administración puede exportar.'); return; }
    exportToExcel(filteredPedidos.map((p) => ({ Codigo: p.codigo, Producto: p.producto, Cantidad: p.cantidad, Solicitante: p.solicitante, Estado: p.estado, Prioridad: p.prioridad, 'Fecha solicitud': p.fecha_solicitud })), `pedidos-sigirl-${new Date().toISOString().slice(0,10)}.xlsx`, 'Pedidos');
    toast.success('Exportado a Excel');
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-3 h-3 rounded-full mx-auto mb-3 bg-emerald-400 animate-pulse shadow-[0_0_6px_#1FA971]" /><p className="text-stone-500 font-mono text-sm">CARGANDO PEDIDOS...</p></div></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#22c55e]" />
              <span className="text-[9px] font-mono font-bold text-[#1FA971] uppercase tracking-widest">SIGIRL · MÓDULO PEDIDOS</span>
            </div>
            <h1 className="text-2xl font-bold font-mono text-stone-800">Gestión de Pedidos</h1>
            <p className="text-xs font-mono text-stone-500 mt-1">Seguimiento y aprobación de solicitudes</p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <button onClick={handleExportar} className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold bg-white border border-[#E0E0E0] text-stone-500 hover:border-[#1FA971]/35 hover:text-stone-700 transition-colors">
                <Download className="w-3.5 h-3.5" /> Exportar
              </button>
            )}
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Nuevo pedido
            </button>
          </div>
        </div>

        {!canManage && (
          <div className="bg-blue-500/10 border border-blue-200 rounded-lg px-4 py-3 text-xs font-mono text-blue-400">
            Solo se muestran tus pedidos. Puedes crear nuevas solicitudes.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total"      value={stats.total}      icon={<ShoppingCart className="w-4 h-4" />} color="blue" />
          <StatCard label="Pendientes" value={stats.pendientes} icon={<Clock className="w-4 h-4" />}        color="amber" />
          <StatCard label="Aprobados"  value={stats.aprobados}  icon={<CheckCircle2 className="w-4 h-4" />} color="emerald" />
          <StatCard label="Rechazados" value={stats.rechazados} icon={<AlertCircle className="w-4 h-4" />}  color="rose" />
        </div>

        <div className="bg-white border border-[#E0E0E0] rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input type="text" placeholder="Buscar por producto, solicitante o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9`} />
            </div>
            <div className="relative w-full md:w-44">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="entregado">Entregado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
            </div>
            <div className="relative w-full md:w-44">
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="todas">Todas las prioridades</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <LabSection title={`SOLICITUDES · ${filteredPedidos.length} resultado${filteredPedidos.length !== 1 ? 's' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0E0E0]">
                  {['CÓDIGO','PRODUCTO','CANTIDAD','SOLICITANTE','PRIORIDAD','ESTADO','ACCIONES'].map((h) => (
                    <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left last:text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {filteredPedidos.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center"><ShoppingCart className="w-8 h-8 text-stone-600 mx-auto mb-2" /><p className="text-stone-400 font-mono text-sm">No se encontraron pedidos</p></td></tr>
                ) : filteredPedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-[#E8F5F0]/60 transition-colors">
                    <td className="py-3 pr-4 text-xs font-mono text-[#1FA971] font-bold">{p.codigo}</td>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-mono font-semibold text-stone-700">{p.producto}</p>
                      {p.departamento && <p className="text-[10px] font-mono text-stone-400 mt-0.5">{p.departamento}</p>}
                    </td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-600">{p.cantidad}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-500">{p.solicitante}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${PRIORIDAD_STYLES[p.prioridad] || 'bg-stone-100 text-stone-500 border-stone-200'}`}>{p.prioridad}</span>
                    </td>
                    <td className="py-3 pr-4"><EstadoBadge estado={p.estado} /></td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toast.info(<div className="text-sm font-mono"><p className="font-bold mb-2 text-[#1FA971]">DETALLE PEDIDO</p><div className="space-y-1 text-stone-600"><p>Código: {p.codigo}</p><p>Producto: {p.producto}</p><p>Cantidad: {p.cantidad}</p><p>Solicitante: {p.solicitante}</p><p>Prioridad: {p.prioridad}</p><p>Estado: {p.estado}</p>{p.observaciones && <p>Obs: {p.observaciones}</p>}{p.motivo_rechazo && <p>Rechazo: {p.motivo_rechazo}</p>}</div></div>, { autoClose: 8000 })}
                          className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Ver"
                        ><Eye className="w-3.5 h-3.5" /></button>
                        {canManage && p.estado === 'pendiente' && (
                          <>
                            <button onClick={() => handleAprobarPedido(p.id)} className="p-1.5 text-[#1FA971] hover:bg-[#E8F5F0] rounded transition-colors" title="Aprobar"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setPedidoToReject({ id: p.id, codigo: p.codigo, producto: p.producto, solicitante: p.solicitante, motivo: '' })} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded transition-colors" title="Rechazar"><XCircle className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-[#E0E0E0]">
            <p className="text-[10px] font-mono text-stone-400">Mostrando {filteredPedidos.length} de {visiblePedidos.length} pedidos</p>
          </div>
        </LabSection>

      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-2xl shadow-stone-300/60">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
              <div>
                <h2 className="text-sm font-mono font-bold text-[#1FA971] uppercase tracking-wider">NUEVO PEDIDO</h2>
                <p className="text-[10px] font-mono text-stone-500 mt-0.5">Crear una nueva solicitud de reactivo</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><XCircle className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Producto</label>
                <select value={formPedido.productoId} onChange={(e) => setFormPedido({...formPedido, productoId: e.target.value})} className={selectCls}>
                  <option value="">Seleccionar producto...</option>
                  {productos.map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cantidad</label>
                  <input type="number" min="1" value={formPedido.cantidad} onChange={(e) => setFormPedido({...formPedido, cantidad: e.target.value})} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Prioridad</label>
                  <select value={formPedido.prioridad} onChange={(e) => setFormPedido({...formPedido, prioridad: e.target.value})} className={selectCls}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Observaciones</label>
                <textarea rows={3} value={formPedido.observaciones} onChange={(e) => setFormPedido({...formPedido, observaciones: e.target.value})} className={`${inputCls} resize-none`} placeholder="Opcional..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">Cancelar</button>
              <button onClick={handleGuardarPedido} className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">Crear pedido</button>
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
        onConfirm={() => pedidoToReject && handleRechazarPedido(pedidoToReject.id)}
      />
    </Layout>
  );
};

export default Pedidos;
