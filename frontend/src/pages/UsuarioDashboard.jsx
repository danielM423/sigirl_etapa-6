// Panel del usuario estándar - Estilo Laboratorio Oscuro
import { useState, useEffect, useContext, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Plus, Eye, Clock, CheckCircle2, XCircle, Search, ChevronDown,
  FileText, ShieldAlert, FlaskConical, X
} from 'lucide-react';
import Layout from '../components/Layout';
import { UserContext } from '../context/UserContext';
import { REACTIVOS_CRITICOS, evaluateReactivoAccess } from '../utils/sigirlStorage';
import { getProductos, getPedidos, createPedido, createAlerta } from '../services/api';

const normalizePedido = (p) => ({ ...p, producto: p.producto_nombre || p.producto });

// ─── Design helpers ──────────────────────────────────────────────
const inputCls = 'w-full bg-stone-50 border border-[#E0E0E0] rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer pr-8`;

const ESTADO_STYLES = {
  pendiente: 'bg-amber-100  text-amber-400  border border-amber-200',
  aprobado:  'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25',
  rechazado: 'bg-rose-100   text-rose-400   border border-rose-200',
};

const EstadoBadge = ({ estado }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${ESTADO_STYLES[estado]||'bg-stone-100 text-stone-500 border border-stone-200'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${estado==='aprobado'?'bg-emerald-400 animate-pulse':estado==='rechazado'?'bg-rose-400':'bg-amber-400'}`} />
    {estado==='pendiente'?'Pendiente':estado==='aprobado'?'Aprobado':'Rechazado'}
  </span>
);

const StatCard = ({ label, value, icon, color='emerald' }) => {
  const colorMap = {
    emerald:'border-[#1FA971]/25 text-[#1FA971] bg-[#E8F5F0]',
    amber:  'border-amber-200  text-amber-400  bg-amber-500/10',
    rose:   'border-rose-200   text-rose-400   bg-rose-500/10',
    blue:   'border-blue-200   text-blue-400   bg-blue-500/10',
  };
  const [border,textCol,bg] = colorMap[color].split(' ');
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

const UsuarioDashboard = () => {
  const { user } = useContext(UserContext);
  const [pedidos, setPedidos]                   = useState([]);
  const [productosDisponibles, setProductos]    = useState([]);
  const [showModal, setShowModal]               = useState(false);
  const [searchTerm, setSearchTerm]             = useState('');
  const [filterStatus, setFilterStatus]         = useState('todos');

  const [formPedido, setFormPedido] = useState({ productoId:'', producto:'', cantidad:'', prioridad:'media', observaciones:'' });
  const [cuestionario, setCuestionario] = useState({ capacitacion:'', epp:'', protocolos:'', supervision:'si' });

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [prodRes, pedRes] = await Promise.all([getProductos(), getPedidos()]);
        setProductos(prodRes.data.results ?? prodRes.data);
        setPedidos((pedRes.data.results ?? pedRes.data).map(normalizePedido));
      } catch (err) { console.error('Error al cargar datos:', err); }
    };
    hydrate();
  }, [user]);

  const reactivoSeleccionado = useMemo(
    () => REACTIVOS_CRITICOS.find(r => r.nombre === formPedido.producto) || null,
    [formPedido.producto]
  );

  const resultadoEvaluacion = useMemo(() => {
    if (!reactivoSeleccionado) return null;
    return evaluateReactivoAccess(formPedido.producto, cuestionario);
  }, [reactivoSeleccionado, formPedido.producto, cuestionario]);

  const resetFormPedido = () => {
    setFormPedido({ productoId:'', producto:'', cantidad:'', prioridad:'media', observaciones:'' });
    setCuestionario({ capacitacion:'', epp:'', protocolos:'', supervision:'si' });
  };

  const handleGuardarPedido = async () => {
    if (!formPedido.productoId || !formPedido.cantidad) { toast.error('Completa todos los campos'); return; }
    if (Number(formPedido.cantidad) <= 0) { toast.error('La cantidad debe ser mayor que cero'); return; }
    if (reactivoSeleccionado && Object.values(cuestionario).some(v => !v)) {
      toast.error('Completa el cuestionario de seguridad antes de enviar'); return;
    }

    const evaluacion = reactivoSeleccionado
      ? evaluateReactivoAccess(formPedido.producto, cuestionario)
      : { reactivoCritico: false };

    const payload = {
      producto: formPedido.productoId,
      cantidad: parseInt(formPedido.cantidad, 10),
      prioridad: formPedido.prioridad,
      departamento: 'Laboratorio General',
      observaciones: [formPedido.observaciones, evaluacion.reactivoCritico ? `Evaluación: ${evaluacion.puntaje}/${evaluacion.puntajeMinimo}. ${evaluacion.detalle}` : null].filter(Boolean).join(' | '),
      evaluacion_seguridad: evaluacion.reactivoCritico ? evaluacion : null,
    };

    try {
      const { data } = await createPedido(payload);
      setPedidos(prev => [normalizePedido(data), ...prev]);

      if (evaluacion.reactivoCritico) {
        createAlerta({
          tipo: 'reactivo',
          titulo: evaluacion.aprobado ? `Solicitud restringida: ${formPedido.producto}` : `Alerta capacidad insuficiente: ${formPedido.producto}`,
          descripcion: `${user?.username||'Usuario'} solicitó ${formPedido.producto} con puntaje ${evaluacion.puntaje}/${evaluacion.puntajeMinimo}.`,
          remitente: user?.username || 'Usuario',
          prioridad: evaluacion.aprobado ? 'media' : 'alta',
        }).catch(() => {});
      }

      resetFormPedido();
      setShowModal(false);
      toast.success(evaluacion.reactivoCritico
        ? evaluacion.aprobado
          ? 'Pedido enviado. El reactivo restringido queda pendiente de autorización.'
          : 'Pedido registrado con alerta automática por puntaje insuficiente.'
        : 'Pedido creado. Un administrador revisará tu solicitud.');
    } catch (err) {
      toast.error(err.response?.data?.error || Object.values(err.response?.data||{}).flat().join(' ') || 'Error al crear pedido');
    }
  };

  const filteredPedidos = useMemo(() => pedidos.filter(p => {
    const t = searchTerm.toLowerCase();
    return (p.producto.toLowerCase().includes(t) || p.codigo?.toLowerCase().includes(t))
      && (filterStatus==='todos' || p.estado===filterStatus);
  }), [pedidos, searchTerm, filterStatus]);

  const stats = useMemo(() => ({
    total:     pedidos.length,
    pendientes:pedidos.filter(p=>p.estado==='pendiente').length,
    aprobados: pedidos.filter(p=>p.estado==='aprobado').length,
    rechazados:pedidos.filter(p=>p.estado==='rechazado').length,
  }), [pedidos]);

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-4 w-4 text-[#1FA971]" />
            <span className="text-[10px] font-mono font-bold text-[#1FA971] uppercase tracking-wider">PANEL DE USUARIO</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e] animate-pulse" />
          </div>
          <h1 className="text-xl font-bold font-mono text-stone-700">Mis Solicitudes</h1>
          <p className="text-[10px] font-mono text-stone-500 mt-1">Consulta tus pedidos y registra nuevas solicitudes de reactivos</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Pedidos"  value={stats.total}      icon={<FileText className="w-4 h-4" />} color="blue" />
          <StatCard label="Pendientes"     value={stats.pendientes} icon={<Clock className="w-4 h-4" />}    color="amber" />
          <StatCard label="Aprobados"      value={stats.aprobados}  icon={<CheckCircle2 className="w-4 h-4" />} color="emerald" />
          <StatCard label="Rechazados"     value={stats.rechazados} icon={<XCircle className="w-4 h-4" />}  color="rose" />
        </div>

        {/* Reactivos críticos */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E0E0E0]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">REACTIVOS CON ACCESO RESTRINGIDO</span>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-mono text-stone-500 mb-4">Solo personal capacitado o autorizado puede solicitar estos reactivos.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REACTIVOS_CRITICOS.map(r => (
                <div key={r.nombre} className="bg-stone-50 border border-amber-500/20 rounded-lg p-4 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold font-mono text-stone-700 text-sm">{r.nombre}</h3>
                      <p className="text-[10px] font-mono text-stone-500 mt-0.5">{r.descripcion}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-400 border border-amber-200 uppercase whitespace-nowrap">{r.nivel}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-stone-500 mb-3">
                    <span className="px-2 py-0.5 rounded bg-stone-50 border border-[#E0E0E0]">Puntaje mínimo: {r.puntajeMinimo}</span>
                    <span className="px-2 py-0.5 rounded bg-stone-50 border border-[#E0E0E0]">Cupos: {r.cupoMaximo}</span>
                  </div>
                  <button
                    onClick={() => {
                      const prod = productosDisponibles.find(p => p.nombre === r.nombre);
                      setShowModal(true);
                      setFormPedido(prev => ({ ...prev, producto: r.nombre, productoId: prod?.id||'', prioridad:'alta' }));
                    }}
                    className="px-4 py-2 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-200 hover:bg-amber-500/25 transition-colors"
                  >
                    Solicitar con evaluación
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de pedidos */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E0E0E0]">
            <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">MIS PEDIDOS</span>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold text-white bg-[#1FA971] hover:bg-emerald-400 transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" /> NUEVO PEDIDO
            </button>
          </div>

          <div className="p-5">
            {/* Filtros */}
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

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E0E0E0]">
                    {['CÓDIGO','PRODUCTO','CANTIDAD','PRIORIDAD','FECHA','ESTADO','VER'].map(h=>(
                      <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  {filteredPedidos.length===0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <FlaskConical className="w-8 h-8 text-stone-600" />
                          <p className="text-stone-400 font-mono text-sm">Sin pedidos. Crea tu primera solicitud.</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPedidos.map(p => (
                    <tr key={p.id} className="hover:bg-[#E8F5F0]/60 transition-colors">
                      <td className="py-3 text-[11px] font-mono font-bold text-stone-600">{p.codigo}</td>
                      <td className="py-3">
                        <p className="text-[11px] font-mono text-stone-600">{p.producto}</p>
                        {p.evaluacion_seguridad?.reactivoCritico && (
                          <span className="text-[9px] font-mono text-amber-400">⚠ Requiere autorización</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded font-bold font-mono text-xs bg-blue-100 text-blue-400">{p.cantidad}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${p.prioridad==='alta'?'bg-rose-100 text-rose-400 border border-rose-200':p.prioridad==='media'?'bg-amber-100 text-amber-400 border border-amber-200':'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25'}`}>{p.prioridad}</span>
                      </td>
                      <td className="py-3 text-[11px] font-mono text-stone-500">{p.fecha_solicitud||'—'}</td>
                      <td className="py-3"><EstadoBadge estado={p.estado} /></td>
                      <td className="py-3">
                        <button
                          onClick={() => toast.info(
                            <div className="text-sm font-mono">
                              <p className="font-bold mb-2 text-[#1FA971]">DETALLE PEDIDO</p>
                              <div className="space-y-1">
                                {[`Producto: ${p.producto}`,`Cantidad: ${p.cantidad}`,`Estado: ${p.estado}`,p.observaciones?`Observaciones: ${p.observaciones}`:null].filter(Boolean).map((l,i)=><p key={i} className="text-stone-600">{l}</p>)}
                              </div>
                            </div>, { autoClose: 8000 }
                          )}
                          className="p-1.5 text-stone-500 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── MODAL NUEVO PEDIDO ─────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-[#E0E0E0] rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
                <div>
                  <h2 className="text-sm font-mono font-bold text-[#1FA971] uppercase tracking-wider">NUEVA SOLICITUD</h2>
                  <p className="text-[10px] font-mono text-stone-500 mt-0.5">Selecciona el reactivo y completa los datos</p>
                </div>
                <button onClick={()=>{ setShowModal(false); resetFormPedido(); }} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><X className="w-4 h-4" /></button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Producto</label>
                  <select
                    value={formPedido.productoId}
                    onChange={e => {
                      const id = Number(e.target.value);
                      const prod = productosDisponibles.find(p => p.id === id);
                      setFormPedido({ ...formPedido, productoId: id, producto: prod?.nombre||'' });
                    }}
                    className={selectCls}
                  >
                    <option value="">Selecciona un producto</option>
                    {productosDisponibles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>

                {/* Cuestionario reactivo crítico */}
                {reactivoSeleccionado && (
                  <div className="rounded-lg border border-amber-200 bg-amber-500/5 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold font-mono text-amber-400 text-sm">Reactivo restringido: {reactivoSeleccionado.nombre}</p>
                        <p className="text-[10px] font-mono text-stone-500 mt-1">Responde el cuestionario para validar tu acceso antes de enviar a autorización.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key:'capacitacion', label:'¿Tienes capacitación vigente?' },
                        { key:'epp',          label:'¿Usarás EPP completo?' },
                        { key:'protocolos',   label:'¿Conoces los protocolos de derrame?' },
                        { key:'supervision',  label:'¿Tendrás supervisión durante el uso?', defaultSi: true },
                      ].map(q => (
                        <div key={q.key}>
                          <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">{q.label}</label>
                          <select value={cuestionario[q.key]} onChange={e=>setCuestionario({...cuestionario,[q.key]:e.target.value})} className={selectCls}>
                            {!q.defaultSi && <option value="">Selecciona</option>}
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    {resultadoEvaluacion && (
                      <div className={`rounded p-3 text-[11px] font-mono font-bold border ${resultadoEvaluacion.aprobado?'bg-[#E8F5F0] text-[#1FA971] border-[#1FA971]/25':'bg-rose-500/10 text-rose-400 border-rose-200'}`}>
                        Puntaje: {resultadoEvaluacion.puntaje}/{resultadoEvaluacion.puntajeMinimo} — {resultadoEvaluacion.detalle}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cantidad</label>
                    <input type="number" min="1" value={formPedido.cantidad} onChange={e=>setFormPedido({...formPedido,cantidad:e.target.value})} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Prioridad</label>
                    <select value={formPedido.prioridad} onChange={e=>setFormPedido({...formPedido,prioridad:e.target.value})} className={selectCls}>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Observaciones</label>
                  <textarea
                    value={formPedido.observaciones}
                    onChange={e=>setFormPedido({...formPedido,observaciones:e.target.value})}
                    className={`${inputCls} resize-none`}
                    rows="3"
                    placeholder="Detalles adicionales (opcional)"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={()=>{ setShowModal(false); resetFormPedido(); }} className="px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">Cancelar</button>
                <button onClick={handleGuardarPedido} className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">Crear Pedido</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default UsuarioDashboard;
