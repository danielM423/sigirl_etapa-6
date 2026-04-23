import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, Bell, CheckCircle2, ChevronDown, Plus, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { createAlerta, deleteAlerta, getAlertas, updateAlerta } from '../services/api';

const inputCls = 'w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

// Sugerencias por prioridad
const SOLUCIONES = {
  alta: [
    'Notificar al supervisor inmediatamente',
    'Aislar el reactivo o equipo afectado',
    'Activar protocolo de emergencia del laboratorio',
    'Documentar la incidencia con hora y responsable',
    'Suspender operaciones relacionadas hasta evaluación',
  ],
  media: [
    'Revisar el proceso o área afectada',
    'Coordinar con el área responsable de la incidencia',
    'Programar mantenimiento o revisión técnica',
    'Actualizar registros de inventario afectados',
    'Informar al equipo en la próxima reunión',
  ],
  baja: [
    'Registrar en bitácora de seguimiento',
    'Monitorear en las próximas semanas',
    'Informar al equipo en reunión regular',
    'Verificar que no escale a prioridad media',
    'Archivar como incidencia menor resuelta',
  ],
};

const Alertas = () => {
  const [alertas, setAlertas]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [showModal, setShowModal]       = useState(false);
  const [formAlerta, setFormAlerta]     = useState({ titulo: '', descripcion: '', remitente: 'SIGIRL', prioridad: 'media' });

  // Modal resolver
  const [resolverModal, setResolverModal] = useState(null); // alerta obj
  const [solucionesCheck, setSolucionesCheck] = useState([]);
  const [accionesTomadas, setAccionesTomadas] = useState('');

  // Modal eliminar
  const [deleteConfirm, setDeleteConfirm] = useState(null); // alerta obj

  useEffect(() => {
    getAlertas()
      .then(({ data }) => setAlertas(data.results ?? data ?? []))
      .catch(() => toast.error('No se pudieron cargar las alertas'))
      .finally(() => setLoading(false));
  }, []);

  const filteredAlertas = useMemo(() =>
    alertas.filter((a) => priorityFilter === 'todas' || a.prioridad === priorityFilter),
  [alertas, priorityFilter]);

  const handleCreate = async () => {
    if (!formAlerta.titulo.trim()) { toast.error('El título es obligatorio'); return; }
    try {
      const { data } = await createAlerta({ ...formAlerta, estado: 'nueva' });
      setAlertas((prev) => [data, ...prev]);
      setFormAlerta({ titulo: '', descripcion: '', remitente: 'SIGIRL', prioridad: 'media' });
      setShowModal(false);
      toast.success('Alerta creada');
    } catch { toast.error('No se pudo crear la alerta'); }
  };

  const abrirResolver = (alerta) => {
    setResolverModal(alerta);
    setSolucionesCheck([]);
    setAccionesTomadas('');
  };

  const confirmarResolver = async () => {
    if (!resolverModal) return;
    try {
      const { data } = await updateAlerta(resolverModal.id, { resuelta: true });
      setAlertas((prev) => prev.map((item) => item.id === resolverModal.id ? data : item));
      toast.success('Alerta marcada como resuelta');
      setResolverModal(null);
    } catch { toast.error('No se pudo resolver la alerta'); }
  };

  const confirmarEliminar = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteAlerta(deleteConfirm.id);
      setAlertas((prev) => prev.filter((item) => item.id !== deleteConfirm.id));
      toast.success('Alerta eliminada');
    } catch { toast.error('No se pudo eliminar la alerta'); }
    finally { setDeleteConfirm(null); }
  };

  const toggleSolucion = (s) =>
    setSolucionesCheck((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-3 h-3 rounded-full mx-auto mb-3 bg-emerald-500 animate-pulse" /><p className="text-stone-500 font-mono text-sm">CARGANDO ALERTAS...</p></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-[#1FA971] animate-pulse" /><span className="text-[9px] font-mono font-bold text-[#1FA971] uppercase tracking-widest">SIGIRL · CENTRO DE ALERTAS</span></div>
            <h1 className="text-2xl font-bold font-mono text-stone-700">Alertas y seguimiento</h1>
            <p className="text-xs font-mono text-stone-500 mt-1">Supervisión de incidencias del sistema</p>
          </div>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm"><Plus className="w-3.5 h-3.5" /> Nueva alerta</button>
        </div>

        {/* Filtro */}
        <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="relative w-56">
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={`${selectCls} pr-8`}>
              <option value="todas">Todas las prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="px-5 py-3 border-b border-[#E0E0E0] bg-[#E8F5F0]"><span className="text-xs font-mono font-bold text-[#157A55] uppercase tracking-wider">LISTADO DE ALERTAS</span></div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  {['ALERTA','REMITENTE','PRIORIDAD','ESTADO','ACCIONES'].map((h) => (
                    <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAlertas.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-stone-500 font-mono text-sm">No hay alertas para este filtro</td></tr>
                ) : filteredAlertas.map((alerta) => (
                  <tr key={alerta.id} className="hover:bg-[#E8F5F0]/40 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-sm font-mono font-semibold text-stone-700">{alerta.titulo}</p>
                      <p className="text-[10px] font-mono text-stone-500 mt-0.5">{alerta.descripcion || alerta.mensaje} {alerta.remitente && <span className="text-stone-400">Solicitado por: {alerta.remitente}</span>}</p>
                    </td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-500">{alerta.remitente || 'SIGIRL'}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${alerta.prioridad === 'alta' ? 'bg-rose-100 text-rose-700 border-rose-200' : alerta.prioridad === 'media' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{alerta.prioridad}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${alerta.estado === 'resuelta' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{alerta.estado}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirResolver(alerta)}
                          disabled={alerta.estado === 'resuelta'}
                          className="px-3 py-1.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >Resolver</button>
                        <button onClick={() => setDeleteConfirm(alerta)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── MODAL NUEVA ALERTA ─────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl animate-[fadeInScale_0.18s_ease]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] bg-[#E8F5F0]">
                <div><h2 className="text-sm font-mono font-bold text-[#157A55] uppercase tracking-wider">NUEVA ALERTA</h2><p className="text-[10px] font-mono text-stone-500 mt-0.5">Registrar incidencia o seguimiento</p></div>
                <button onClick={() => setShowModal(false)} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Título</label><input value={formAlerta.titulo} onChange={(e) => setFormAlerta({ ...formAlerta, titulo: e.target.value })} className={inputCls} placeholder="Ej. Reactivo crítico autorizado" /></div>
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Descripción</label><textarea rows={4} value={formAlerta.descripcion} onChange={(e) => setFormAlerta({ ...formAlerta, descripcion: e.target.value })} className={`${inputCls} resize-none`} placeholder="Detalle de la alerta..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Remitente</label><input value={formAlerta.remitente} onChange={(e) => setFormAlerta({ ...formAlerta, remitente: e.target.value })} className={inputCls} /></div>
                  <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Prioridad</label>
                    <select value={formAlerta.prioridad} onChange={(e) => setFormAlerta({ ...formAlerta, prioridad: e.target.value })} className={selectCls}>
                      <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-stone-200 text-stone-600 hover:border-stone-400 transition-colors">Cancelar</button>
                <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">Crear alerta</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL RESOLVER ALERTA ──────────────────────────────────── */}
        {resolverModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl animate-[fadeInScale_0.18s_ease]">
              {/* Header según prioridad */}
              <div className={`flex items-center justify-between px-6 py-5 border-b border-[#E0E0E0] ${resolverModal.prioridad === 'alta' ? 'bg-rose-50' : resolverModal.prioridad === 'media' ? 'bg-amber-50' : 'bg-[#E8F5F0]'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${resolverModal.prioridad === 'alta' ? 'bg-rose-100 border border-rose-200' : resolverModal.prioridad === 'media' ? 'bg-amber-100 border border-amber-200' : 'bg-emerald-100 border border-emerald-200'}`}>
                    {resolverModal.prioridad === 'alta' ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : resolverModal.prioridad === 'media' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <Bell className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <h2 className={`text-sm font-mono font-bold uppercase tracking-wider ${resolverModal.prioridad === 'alta' ? 'text-rose-600' : resolverModal.prioridad === 'media' ? 'text-amber-600' : 'text-[#157A55]'}`}>Resolver alerta</h2>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${resolverModal.prioridad === 'alta' ? 'bg-rose-100 text-rose-700 border-rose-200' : resolverModal.prioridad === 'media' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>Prioridad {resolverModal.prioridad}</span>
                  </div>
                </div>
                <button onClick={() => setResolverModal(null)} className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>

              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Info alerta */}
                <div className="rounded-lg border border-[#E0E0E0] bg-stone-50 p-4 space-y-1">
                  <p className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">Alerta</p>
                  <p className="text-sm font-mono font-bold text-stone-700">{resolverModal.titulo}</p>
                  {(resolverModal.descripcion || resolverModal.mensaje) && <p className="text-[10px] font-mono text-stone-500 mt-0.5">{resolverModal.descripcion || resolverModal.mensaje}</p>}
                </div>

                {/* Soluciones sugeridas */}
                <div>
                  <p className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-2">Soluciones sugeridas — marca las que aplicaste</p>
                  <div className="space-y-2">
                    {(SOLUCIONES[resolverModal.prioridad] || SOLUCIONES.media).map((s) => (
                      <label key={s} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${solucionesCheck.includes(s) ? 'bg-[#E8F5F0] border-[#1FA971]/40' : 'bg-white border-[#E0E0E0] hover:bg-stone-50'}`}>
                        <input type="checkbox" checked={solucionesCheck.includes(s)} onChange={() => toggleSolucion(s)} className="mt-0.5 accent-[#1FA971] w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-mono text-stone-700 leading-relaxed">{s}</span>
                        {solucionesCheck.includes(s) && <CheckCircle2 className="w-3.5 h-3.5 text-[#1FA971] ml-auto flex-shrink-0 mt-0.5" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Acciones adicionales */}
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Acciones adicionales tomadas <span className="normal-case text-stone-400">(opcional)</span></label>
                  <textarea
                    rows={3}
                    value={accionesTomadas}
                    onChange={(e) => setAccionesTomadas(e.target.value)}
                    placeholder="Describe cualquier acción adicional que tomaste..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-xs font-mono text-stone-700 placeholder-stone-300 focus:outline-none focus:border-[#1FA971] focus:ring-1 focus:ring-[#1FA971]/30 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={() => setResolverModal(null)} className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors">Cancelar</button>
                <button onClick={confirmarResolver} className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como resuelta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL ELIMINAR ALERTA ──────────────────────────────────── */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl animate-[fadeInScale_0.18s_ease]">
              <div className="px-6 py-5 border-b border-[#E0E0E0] bg-rose-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-mono font-bold text-rose-600 uppercase tracking-wider">Eliminar alerta</h2>
                    <p className="text-[10px] font-mono text-rose-400 mt-0.5 truncate max-w-[260px]">{deleteConfirm.titulo}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs font-mono text-stone-600 leading-relaxed">Esta acción <span className="font-bold text-rose-500">no se puede deshacer</span>. La alerta será eliminada permanentemente del sistema.</p>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors">Cancelar</button>
                <button onClick={confirmarEliminar} className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors shadow-sm flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Alertas;
