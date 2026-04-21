// Vista operativa de pedidos.
// Gestiona solicitudes, estados y registro de nuevos requerimientos.
import { useState, useEffect, useMemo, useContext } from 'react';
import { toast } from 'react-toastify';
import { Search, ChevronDown, Plus, User, Eye, CheckCircle2, XCircle, ShoppingCart, Clock, AlertCircle, Download } from 'lucide-react';
import Layout from '../components/Layout';
import { UserContext } from '../context/AuthContext';
import { exportToExcel } from '../utils/reportExport';
import { getPedidos, createPedido, updatePedido, getProductos } from '../services/api';

const Pedidos = () => {
  const { user, role } = useContext(UserContext);
  const normalizedRole = role === 'jefe_superior' ? 'jefe' : role;
  const canManagePedidos = normalizedRole === 'admin' || normalizedRole === 'jefe';
  const currentUsername = (user?.username || localStorage.getItem('username') || 'usuario').toLowerCase();

  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  
  // Formulario para nuevo pedido
  const [formPedido, setFormPedido] = useState({
    productoId: '',
    cantidad: '',
    prioridad: 'media',
    observaciones: ''
  });

  const normalizePedido = (p) => ({
    ...p,
    producto: p.producto_nombre || p.producto || '',
    solicitante: p.solicitante || p.usuario_username || '',
    codigo: p.codigo || `PED-${String(p.id).padStart(3, '0')}`,
  });

  useEffect(() => {
    Promise.all([
      getPedidos().catch(() => ({ data: [] })),
      getProductos().catch(() => ({ data: [] })),
    ]).then(([pedidosRes, productosRes]) => {
      setPedidos((pedidosRes.data || []).map(normalizePedido));
      setProductos(productosRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const getEstadoBadge = (estado) => {
    const styles = {
      pendiente: 'bg-amber-100 text-amber-700 border border-amber-300',
      aprobado: 'bg-blue-100 text-blue-700 border border-blue-300',
      entregado: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      rechazado: 'bg-rose-100 text-rose-700 border border-rose-300'
    };

    const icons = {
      pendiente: '⏳',
      aprobado: '✅',
      entregado: '📦',
      rechazado: '❌'
    };

    const labels = {
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      entregado: 'Entregado',
      rechazado: 'Rechazado'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${styles[estado]}`}>
        {icons[estado]}
        {labels[estado]}
      </span>
    );
  };

  const getPrioridadBadge = (prioridad) => {
    const styles = {
      alta: 'bg-rose-100 text-rose-700 border border-rose-300',
      media: 'bg-amber-100 text-amber-700 border border-amber-300',
      baja: 'bg-slate-100 text-slate-700 border border-slate-300'
    };

    const icons = {
      alta: '🔴',
      media: '🟡',
      baja: '🟢'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold ${styles[prioridad]}`}>
        {icons[prioridad]}
        {prioridad.charAt(0).toUpperCase() + prioridad.slice(1)}
      </span>
    );
  };

  const visiblePedidos = useMemo(() => {
    if (canManagePedidos) return pedidos;

    return pedidos.filter((pedido) => {
      const candidates = [pedido.solicitante, pedido.creadoPor, pedido.usuario_username]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return candidates.includes(currentUsername);
    });
  }, [pedidos, canManagePedidos, currentUsername]);

  const filteredPedidos = visiblePedidos.filter((pedido) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (pedido.producto || '').toLowerCase().includes(search)
      || (pedido.solicitante || '').toLowerCase().includes(search)
      || (pedido.codigo || '').toLowerCase().includes(search);
    const matchesFilter = filterStatus === 'todos' || pedido.estado === filterStatus;
    const matchesPriority = filterPriority === 'todas' || pedido.prioridad === filterPriority;
    return matchesSearch && matchesFilter && matchesPriority;
  });

  const showDetalleToast = (title, lines) => {
    toast.info(
      <div className="text-sm">
        <p className="font-semibold mb-2">{title}</p>
        <div className="space-y-1">
          {lines.filter(Boolean).map((line, index) => (
            <p key={`${title}-${index}`}>{line}</p>
          ))}
        </div>
      </div>,
      { autoClose: 7000, closeOnClick: false }
    );
  };

  // 🎯 FUNCIONES PARA MANEJAR PEDIDOS
  const handleGuardarPedido = async () => {
    if (!formPedido.productoId || !formPedido.cantidad) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      const res = await createPedido({
        producto: Number(formPedido.productoId),
        cantidad: parseInt(formPedido.cantidad),
        prioridad: formPedido.prioridad,
        observaciones: formPedido.observaciones,
      });
      setPedidos((prev) => [normalizePedido(res.data), ...prev]);
      setFormPedido({ productoId: '', cantidad: '', prioridad: 'media', observaciones: '' });
      setShowModal(false);
      toast.success('Pedido creado exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear el pedido');
    }
  };

  const handleAprobarPedido = async (id) => {
    if (!canManagePedidos) {
      toast.error('Tu rol no puede aprobar pedidos.');
      return;
    }
    try {
      const res = await updatePedido(id, { estado: 'aprobado' });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(res.data) : p));
      toast.success('Pedido aprobado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al aprobar el pedido');
    }
  };

  const handleRechazarPedido = async (id) => {
    if (!canManagePedidos) {
      toast.error('Tu rol no puede rechazar pedidos.');
      return;
    }
    const motivo = prompt('¿Cuál es el motivo del rechazo?');
    if (motivo === null) return;
    try {
      const res = await updatePedido(id, { estado: 'rechazado', motivo_rechazo: motivo });
      setPedidos((prev) => prev.map((p) => p.id === id ? normalizePedido(res.data) : p));
      toast.error('Pedido rechazado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al rechazar el pedido');
    }
  };

  const handleExportarPedidos = () => {
    if (!canManagePedidos) {
      toast.info('Solo administración y jefatura pueden exportar todos los pedidos.');
      return;
    }

    const rows = filteredPedidos.map((pedido) => ({
      Codigo: pedido.codigo,
      Producto: pedido.producto,
      Cantidad: pedido.cantidad,
      Solicitante: pedido.solicitante,
      Departamento: pedido.departamento,
      Estado: pedido.estado,
      Prioridad: pedido.prioridad,
      'Fecha solicitud': pedido.fecha_solicitud,
      'Fecha entrega': pedido.fecha_entrega || '',
      Observaciones: pedido.observaciones || '',
    }));

    exportToExcel(rows, `pedidos-sigirl-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Pedidos');
    toast.success('Pedidos exportados correctamente.');
  };

  const stats = {
    total: visiblePedidos.length,
    pendientes: visiblePedidos.filter(p => p.estado === 'pendiente').length,
    aprobados: visiblePedidos.filter(p => p.estado === 'aprobado').length,
    entregados: visiblePedidos.filter(p => p.estado === 'entregado').length
  };

  return (
    <Layout>
      <div>
          {!canManagePedidos && (
            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              En tu cuenta solo se muestran tus propios pedidos y solo puedes crear solicitudes nuevas para ti.
            </div>
          )}

          <div className="mb-10 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_35px_rgba(34,197,94,0.10)] backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-[34px] font-bold text-slate-800">Pedidos generales PRO</h1>
                <p className="text-slate-500 text-base">Consulta y administra las solicitudes de materiales y reactivos con una vista más moderna y clara.</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {stats.total} pedidos
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    {stats.pendientes} pendientes
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {stats.aprobados} aprobados
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            <div className="rounded-[20px] bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">Total Pedidos</p>
                  <p className="text-4xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/15">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            <div className="rounded-[20px] bg-gradient-to-r from-red-500 to-rose-500 text-white p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">Pendientes</p>
                  <p className="text-4xl font-bold mt-2">{stats.pendientes}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/15">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            <div className="rounded-[20px] bg-gradient-to-r from-amber-400 to-orange-500 text-white p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">Aprobados</p>
                  <p className="text-4xl font-bold mt-2">{stats.aprobados}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/15">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            <div className="rounded-[20px] bg-gradient-to-r from-lime-500 to-green-600 text-white p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">Entregados</p>
                  <p className="text-4xl font-bold mt-2">{stats.entregados}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/15">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-emerald-100 shadow-[0_10px_30px_rgba(34,197,94,0.08)] p-5 md:p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar código, producto o solicitante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#f8fff7] border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all"
                  />
                </div>
                
                <div className="relative w-full sm:w-44">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="aprobado">Aprobados</option>
                    <option value="entregado">Entregados</option>
                    <option value="rechazado">Rechazados</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative w-full sm:w-40">
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                  >
                    <option value="todas">Todas las prioridades</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {canManagePedidos && (
                  <button 
                    onClick={handleExportarPedidos}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-emerald-100 text-slate-700 rounded-xl transition-all font-semibold shadow-sm text-sm whitespace-nowrap hover:bg-emerald-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>
                )}
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white rounded-xl transition-all font-semibold shadow-md shadow-emerald-500/20 text-sm whitespace-nowrap"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nuevo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pedidos Table */}
          <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f6fff2] border-b border-emerald-100">
                  <tr>
                    <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Código</th>
                    <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Producto</th>
                    <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Cant.</th>
                    <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Solicitante</th>
                    <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Prioridad</th>
                    <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Estado</th>
                    <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Fechas</th>
                    <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-teal-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-500/10">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-slate-500">
                        <div className="flex justify-center items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce"></div>
                          <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPedidos.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-200/30 to-cyan-200/20 flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">No se encontraron pedidos</p>
                            <p className="text-xs text-slate-500 mt-1">Intenta ajustar los filtros de búsqueda</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPedidos.map((pedido) => (
                      <tr key={pedido.id} className="group hover:bg-teal-500/5 transition-all duration-200 border-b border-teal-500/10 hover:border-teal-500/30 last:border-b-0">
                        <td className="py-5 px-5">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md">
                            {pedido.codigo}
                          </span>
                        </td>
                        <td className="py-5 px-5">
                          <p className="font-bold text-slate-900 text-sm">{pedido.producto}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{pedido.departamento}</p>
                        </td>
                        <td className="py-5 px-5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-violet-100 text-violet-700 rounded-lg font-bold text-sm">
                            {pedido.cantidad}
                          </span>
                        </td>
                        <td className="py-5 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-violet-600" />
                            </div>
                            <span className="text-sm text-slate-700 font-medium">{pedido.solicitante}</span>
                          </div>
                        </td>
                        <td className="py-5 px-5 text-center">{getPrioridadBadge(pedido.prioridad)}</td>
                        <td className="py-5 px-5 text-center">{getEstadoBadge(pedido.estado)}</td>
                        <td className="py-5 px-5 text-center">
                          <div className="flex flex-col items-center gap-2 text-xs">
                            <div className="flex flex-col items-center">
                              <span className="text-slate-500 font-medium">Solicitud</span>
                              <span className="font-bold text-slate-700 text-xs">{pedido.fecha_solicitud}</span>
                            </div>
                            {pedido.fecha_entrega && (
                              <div className="flex flex-col items-center border-t border-slate-200 pt-1 mt-1 w-full">
                                <span className="text-slate-500 font-medium">Entrega</span>
                                <span className="font-bold text-emerald-600 text-xs">{pedido.fecha_entrega}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => showDetalleToast('Detalle del pedido', [
                                `Código: ${pedido.codigo}`,
                                `Producto: ${pedido.producto}`,
                                `Cantidad: ${pedido.cantidad}`,
                                `Solicitante: ${pedido.solicitante}`,
                                `Prioridad: ${pedido.prioridad}`,
                                `Estado: ${pedido.estado}`,
                                `Observaciones: ${pedido.observaciones || 'Sin observaciones'}`,
                              ])}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hover:text-slate-900"
                              title="Ver detalles">
                              <Eye className="w-4 h-4" />
                            </button>
                            {canManagePedidos && pedido.estado === 'pendiente' && (
                              <>
                                <button 
                                  onClick={() => handleAprobarPedido(pedido.id)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors hover:text-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30" 
                                  title="Aprobar">
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleRechazarPedido(pedido.id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors hover:text-rose-700 hover:shadow-lg hover:shadow-rose-500/30" 
                                  title="Rechazar">
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

      {/* Modal Nuevo Pedido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="sigirl-form-surface rounded-[28px] max-w-2xl w-full animate-in zoom-in duration-300">
            <div className="p-6 md:p-8 border-b border-teal-500/20 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg text-white shadow-lg shadow-teal-500/40">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Nuevo Pedido</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">Complete el formulario para crear una nueva solicitud</p>
                </div>
              </div>
            </div>
            <div className="p-7 md:p-10 space-y-6">
              <div>
                <label className="sigirl-form-label">Producto</label>
                <select 
                  value={formPedido.productoId}
                  onChange={(e) => setFormPedido({...formPedido, productoId: e.target.value})}
                  className="sigirl-form-control">
                  <option value="">Seleccionar producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.cantidad})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="sigirl-form-label">Cantidad</label>
                  <input 
                    type="number" 
                    value={formPedido.cantidad}
                    onChange={(e) => setFormPedido({...formPedido, cantidad: e.target.value})}
                    className="sigirl-form-control" 
                    placeholder="0" 
                    min="1" 
                  />
                </div>
                <div>
                  <label className="sigirl-form-label">Prioridad</label>
                  <select 
                    value={formPedido.prioridad}
                    onChange={(e) => setFormPedido({...formPedido, prioridad: e.target.value})}
                    className="sigirl-form-control">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="sigirl-form-label">Observaciones</label>
                <textarea 
                  value={formPedido.observaciones}
                  onChange={(e) => setFormPedido({...formPedido, observaciones: e.target.value})}
                  className="sigirl-form-control sigirl-form-textarea text-sm" 
                  placeholder="Detalles adicionales...">
                </textarea>
              </div>
            </div>
            <div className="p-6 md:p-8 border-t border-teal-500/20 bg-gradient-to-r from-teal-50/30 to-cyan-50/30 backdrop-blur-sm rounded-b-[28px] flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="sigirl-btn-secondary text-sm w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGuardarPedido}
                className="sigirl-btn-primary text-sm w-full sm:w-auto"
              >
                Crear pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Pedidos;