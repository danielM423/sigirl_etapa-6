// Panel del usuario estándar.
// Desde aquí puede consultar productos y solicitar pedidos.
import { useState, useEffect, useContext, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Plus, Eye, Clock, CheckCircle2, XCircle, Search, ChevronDown, FileText, ShieldAlert, FlaskConical } from 'lucide-react';
import Layout from '../components/Layout';
import { UserContext } from '../context/AuthContext';
import { REACTIVOS_CRITICOS, evaluateReactivoAccess } from '../utils/sigirlStorage';
import { getProductos, getPedidos, createPedido, createAlerta } from '../services/api';

const normalizePedido = (p) => ({
  ...p,
  producto: p.producto_nombre || p.producto,
});

const UsuarioDashboard = () => {
  const { user } = useContext(UserContext);
  const [pedidos, setPedidos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [formPedido, setFormPedido] = useState({
    productoId: '',
    producto: '',
    cantidad: '',
    prioridad: 'media',
    observaciones: ''
  });
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [cuestionario, setCuestionario] = useState({
    capacitacion: '',
    epp: '',
    protocolos: '',
    supervision: 'si'
  });

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [prodRes, pedRes] = await Promise.all([getProductos(), getPedidos()]);
        setProductosDisponibles((prodRes.data.results ?? prodRes.data));
        setPedidos((pedRes.data.results ?? pedRes.data).map(normalizePedido));
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    };
    hydrate();
  }, [user]);

  const reactivoSeleccionado = useMemo(
    () => REACTIVOS_CRITICOS.find((item) => item.nombre === formPedido.producto) || null,
    [formPedido.producto]
  );

  const resultadoEvaluacion = useMemo(() => {
    if (!reactivoSeleccionado) return null;
    return evaluateReactivoAccess(formPedido.producto, cuestionario);
  }, [reactivoSeleccionado, formPedido.producto, cuestionario]);

  const resetFormPedido = () => {
    setFormPedido({
      productoId: '',
      producto: '',
      cantidad: '',
      prioridad: 'media',
      observaciones: ''
    });
    setCuestionario({
      capacitacion: '',
      epp: '',
      protocolos: '',
      supervision: 'si'
    });
  };

  const handleGuardarPedido = async () => {
    if (!formPedido.productoId || !formPedido.cantidad) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (Number(formPedido.cantidad) <= 0) {
      toast.error('La cantidad debe ser mayor que cero');
      return;
    }

    if (reactivoSeleccionado) {
      const preguntasSinResolver = Object.values(cuestionario).some((valor) => !valor);
      if (preguntasSinResolver) {
        toast.error('Completa el cuestionario de seguridad antes de solicitar este reactivo.');
        return;
      }
    }

    const evaluacion = reactivoSeleccionado
      ? evaluateReactivoAccess(formPedido.producto, cuestionario)
      : { reactivoCritico: false };

    const payload = {
      producto: formPedido.productoId,
      cantidad: parseInt(formPedido.cantidad, 10),
      prioridad: formPedido.prioridad,
      departamento: 'Laboratorio General',
      observaciones: [
        formPedido.observaciones,
        evaluacion.reactivoCritico
          ? `Evaluación de seguridad: ${evaluacion.puntaje}/${evaluacion.puntajeMinimo}. ${evaluacion.detalle}`
          : null,
      ].filter(Boolean).join(' | '),
      evaluacion_seguridad: evaluacion.reactivoCritico ? evaluacion : null,
    };

    try {
      const { data } = await createPedido(payload);
      setPedidos((prev) => [normalizePedido(data), ...prev]);

      if (evaluacion.reactivoCritico) {
        createAlerta({
          tipo: 'reactivo',
          titulo: evaluacion.aprobado
            ? `Solicitud restringida pendiente de autorización: ${formPedido.producto}`
            : `Alerta por capacidad insuficiente: ${formPedido.producto}`,
          descripcion: `${user?.username || 'Usuario'} solicitó ${formPedido.producto} con puntaje ${evaluacion.puntaje}/${evaluacion.puntajeMinimo}.`,
          remitente: user?.username || 'Usuario',
          prioridad: evaluacion.aprobado ? 'media' : 'alta',
        }).catch(() => {});
      }

      resetFormPedido();
      setShowModal(false);
      toast.success(
        evaluacion.reactivoCritico
          ? evaluacion.aprobado
            ? 'Pedido enviado. El reactivo restringido quedó pendiente de autorización.'
            : 'Pedido registrado con alerta automática por puntaje insuficiente.'
          : 'Pedido creado exitosamente. Un administrador revisará tu solicitud.'
      );
    } catch (err) {
      toast.error(err.response?.data?.error || Object.values(err.response?.data || {}).flat().join(' ') || 'Error al crear pedido');
    }
  };
  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = pedido.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'todos' || pedido.estado === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    aprobados: pedidos.filter(p => p.estado === 'aprobado').length,
    rechazados: pedidos.filter(p => p.estado === 'rechazado').length
  };

  const getEstadoBadge = (estado) => {
    const styles = {
      pendiente: 'bg-blue-100 text-blue-700 border border-blue-300',
      aprobado: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      rechazado: 'bg-rose-100 text-rose-700 border border-rose-300'
    };

    const icons = {
      pendiente: '⏳',
      aprobado: '✅',
      rechazado: '❌'
    };

    const labels = {
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

  return (
    <Layout>
      <div>
        <div className="mb-10 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_35px_rgba(34,197,94,0.10)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-[34px] font-bold text-slate-800">Panel de usuario PRO</h1>
              <p className="text-slate-500 text-base">Consulta tus solicitudes, revisa reactivos restringidos y registra nuevos requerimientos del laboratorio.</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {stats.total} solicitudes
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {stats.pendientes} pendientes
                </span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  {stats.rechazados} rechazadas
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
                <FileText className="w-6 h-6 text-white" />
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
                <p className="text-sm font-semibold text-white/90">Rechazados</p>
                <p className="text-4xl font-bold mt-2">{stats.rechazados}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/15">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Listado de reactivos críticos */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-rose-50 text-amber-600 shadow-sm">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Reactivos con acceso restringido</h2>
              <p className="text-sm text-slate-500">Solo personal capacitado o autorizado por admin/jefe puede solicitarlos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REACTIVOS_CRITICOS.map((reactivo) => (
              <div key={reactivo.nombre} className="rounded-2xl border border-amber-200 bg-white/70 backdrop-blur-sm p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800">{reactivo.nombre}</h3>
                    <p className="text-xs text-slate-500 mt-1">{reactivo.descripcion}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300 uppercase">
                    {reactivo.nivel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-3">
                  <span className="px-2 py-1 rounded-full bg-slate-100">Puntaje mínimo: {reactivo.puntajeMinimo}</span>
                  <span className="px-2 py-1 rounded-full bg-slate-100">Cupos: {reactivo.cupoMaximo}</span>
                </div>
                <button
                  onClick={() => {
                    const prod = productosDisponibles.find((p) => p.nombre === reactivo.nombre);
                    setShowModal(true);
                    setFormPedido((prev) => ({ ...prev, producto: reactivo.nombre, productoId: prod?.id || '', prioridad: 'alta' }));
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-md"
                >
                  Solicitar con evaluación
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-emerald-100 shadow-[0_10px_30px_rgba(34,197,94,0.08)] p-5 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar pedido..."
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

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white rounded-xl transition-all font-semibold shadow-md shadow-emerald-500/20 text-sm whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Pedido</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f6fff2] border-b border-emerald-100">
                <tr>
                  <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-cyan-700">Código</th>
                  <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-cyan-700">Producto</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-cyan-700">Cantidad</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-cyan-700">Prioridad</th>
                  <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-cyan-700">Solicitud</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-cyan-700">Estado</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-cyan-700">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {filteredPedidos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-200/30 to-blue-200/20 flex items-center justify-center text-3xl">
                          📋
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">No hay pedidos</p>
                          <p className="text-xs text-slate-500 mt-1">Crea tu primer pedido para solicitar reactivos</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPedidos.map((pedido) => (
                    <tr key={pedido.id} className="group hover:bg-cyan-500/5 transition-all duration-200 border-b border-cyan-500/10 hover:border-cyan-500/30 last:border-b-0">
                      <td className="py-5 px-5">
                        <p className="font-bold text-slate-900 text-sm">{pedido.codigo}</p>
                      </td>
                      <td className="py-5 px-5">
                        <p className="font-semibold text-slate-700 text-sm">{pedido.producto}</p>
                        {pedido.evaluacion_seguridad?.reactivoCritico && (
                          <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                            Requiere autorización
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
                      <td className="py-5 px-5 text-sm text-slate-600">{pedido.fecha_solicitud}</td>
                      <td className="py-5 px-5 text-center">{getEstadoBadge(pedido.estado)}</td>
                      <td className="py-5 px-5 text-center">
                        <button
                          title="Ver detalles"
                          onClick={() => toast.info(
                            <div className="text-sm">
                              <p className="font-semibold mb-2">Detalle del pedido</p>
                              <div className="space-y-1">
                                {[
                                  `Producto: ${pedido.producto}`,
                                  `Cantidad: ${pedido.cantidad}`,
                                  `Estado: ${pedido.estado}`,
                                  pedido.evaluacion_seguridad?.reactivoCritico ? `Puntaje seguridad: ${pedido.evaluacion_seguridad.puntaje}/${pedido.evaluacion_seguridad.puntajeMinimo}` : null,
                                  pedido.observaciones ? `Observaciones: ${pedido.observaciones}` : null,
                                ].filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}
                              </div>
                            </div>,
                            { autoClose: 8000, closeOnClick: false }
                          )}
                          className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors hover:text-cyan-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para crear pedido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-cyan-500/20 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300 border border-white/20">
            <div className="p-6 md:p-8 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg text-white shadow-lg shadow-cyan-500/40">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Nuevo Pedido
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">Solicita los reactivos que necesitas</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2.5 uppercase tracking-wide">Producto</label>
                <select
                  value={formPedido.productoId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const prod = productosDisponibles.find((p) => p.id === id);
                    setFormPedido({ ...formPedido, productoId: id, producto: prod?.nombre || '' });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all bg-slate-50 hover:bg-white"
                >
                  <option value="">Selecciona un producto</option>
                  {productosDisponibles.map((producto) => (
                    <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                  ))}
                </select>
              </div>

              {reactivoSeleccionado && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-800">Reactivo restringido: {reactivoSeleccionado.nombre}</p>
                      <p className="text-sm text-amber-700 mt-1">Responde el cuestionario para validar tu capacidad antes de enviarlo a autorización.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">¿Tienes capacitación vigente?</label>
                      <select value={cuestionario.capacitacion} onChange={(e) => setCuestionario({ ...cuestionario, capacitacion: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-white">
                        <option value="">Selecciona</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">¿Usarás EPP completo?</label>
                      <select value={cuestionario.epp} onChange={(e) => setCuestionario({ ...cuestionario, epp: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-white">
                        <option value="">Selecciona</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">¿Conoces protocolos de derrame y ficha de seguridad?</label>
                      <select value={cuestionario.protocolos} onChange={(e) => setCuestionario({ ...cuestionario, protocolos: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-white">
                        <option value="">Selecciona</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">¿Tendrás supervisión durante el uso?</label>
                      <select value={cuestionario.supervision} onChange={(e) => setCuestionario({ ...cuestionario, supervision: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-white">
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>

                  {resultadoEvaluacion && (
                    <div className={`rounded-xl p-3 text-sm font-semibold border ${resultadoEvaluacion.aprobado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Puntaje actual: {resultadoEvaluacion.puntaje}/{resultadoEvaluacion.puntajeMinimo}. {resultadoEvaluacion.detalle}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2.5 uppercase tracking-wide">Cantidad</label>
                  <input
                    type="number"
                    value={formPedido.cantidad}
                    onChange={(e) => setFormPedido({ ...formPedido, cantidad: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all bg-slate-50 hover:bg-white"
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2.5 uppercase tracking-wide">Prioridad</label>
                  <select
                    value={formPedido.prioridad}
                    onChange={(e) => setFormPedido({ ...formPedido, prioridad: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all bg-slate-50 hover:bg-white"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2.5 uppercase tracking-wide">Observaciones</label>
                <textarea
                  value={formPedido.observaciones}
                  onChange={(e) => setFormPedido({ ...formPedido, observaciones: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all bg-slate-50 hover:bg-white resize-none"
                  placeholder="Detalles adicionales (opcional)"
                  rows="3"
                />
              </div>
            </div>
            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetFormPedido();
                }}
                className="px-6 py-3 text-slate-700 hover:bg-slate-200 rounded-lg transition-all font-semibold text-sm hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarPedido}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all font-semibold shadow-md hover:shadow-lg text-sm"
              >
                Crear Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UsuarioDashboard;
