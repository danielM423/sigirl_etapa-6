import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, Plus, Trash2, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { createAlerta, deleteAlerta, getAlertas, updateAlerta } from '../services/api';

const inputCls = 'w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

const Alertas = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [formAlerta, setFormAlerta] = useState({ titulo: '', descripcion: '', remitente: 'SIGIRL', prioridad: 'media' });

  useEffect(() => {
    getAlertas()
      .then(({ data }) => setAlertas(data.results ?? data ?? []))
      .catch(() => toast.error('No se pudieron cargar las alertas'))
      .finally(() => setLoading(false));
  }, []);

  const filteredAlertas = useMemo(() => alertas.filter((alerta) => priorityFilter === 'todas' || alerta.prioridad === priorityFilter), [alertas, priorityFilter]);

  const handleCreate = async () => {
    if (!formAlerta.titulo.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    try {
      const { data } = await createAlerta({ ...formAlerta, estado: 'nueva' });
      setAlertas((prev) => [data, ...prev]);
      setFormAlerta({ titulo: '', descripcion: '', remitente: 'SIGIRL', prioridad: 'media' });
      setShowModal(false);
      toast.success('Alerta creada');
    } catch {
      toast.error('No se pudo crear la alerta');
    }
  };

  const handleResolve = async (alerta) => {
    try {
      const { data } = await updateAlerta(alerta.id, { resuelta: true });
      setAlertas((prev) => prev.map((item) => item.id === alerta.id ? data : item));
      toast.success('Alerta resuelta');
    } catch {
      toast.error('No se pudo resolver la alerta');
    }
  };

  const handleDelete = async (alerta) => {
    if (!window.confirm(`¿Eliminar alerta "${alerta.titulo}"?`)) return;
    try {
      await deleteAlerta(alerta.id);
      setAlertas((prev) => prev.filter((item) => item.id !== alerta.id));
      toast.success('Alerta eliminada');
    } catch {
      toast.error('No se pudo eliminar la alerta');
    }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-3 h-3 rounded-full mx-auto mb-3 bg-emerald-500 animate-pulse" /><p className="text-stone-500 font-mono text-sm">CARGANDO ALERTAS...</p></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-[#1FA971] animate-pulse" /><span className="text-[9px] font-mono font-bold text-[#1FA971] uppercase tracking-widest">SIGIRL · CENTRO DE ALERTAS</span></div>
            <h1 className="text-2xl font-bold font-mono text-stone-700">Alertas y seguimiento</h1>
            <p className="text-xs font-mono text-stone-500 mt-1">Supervisión de incidencias del sistema</p>
          </div>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm"><Plus className="w-3.5 h-3.5" /> Nueva alerta</button>
        </div>

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

        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="px-5 py-3 border-b border-[#E0E0E0] bg-[#E8F5F0]"><span className="text-xs font-mono font-bold text-[#157A55] uppercase tracking-wider">LISTADO DE ALERTAS</span></div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-stone-200">{['ALERTA','REMITENTE','PRIORIDAD','ESTADO','ACCIONES'].map((header) => <th key={header} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAlertas.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-stone-500 font-mono text-sm">No hay alertas para este filtro</td></tr> : filteredAlertas.map((alerta) => (
                  <tr key={alerta.id} className="hover:bg-[#E8F5F0]/40 transition-colors">
                    <td className="py-3 pr-4"><p className="text-sm font-mono font-semibold text-stone-700">{alerta.titulo}</p><p className="text-[10px] font-mono text-stone-500 mt-0.5">{alerta.descripcion || alerta.mensaje}</p></td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-500">{alerta.remitente || 'SIGIRL'}</td>
                    <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${alerta.prioridad === 'alta' ? 'bg-rose-100 text-rose-700 border-rose-200' : alerta.prioridad === 'media' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{alerta.prioridad}</span></td>
                    <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${alerta.estado === 'resuelta' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{alerta.estado}</span></td>
                    <td className="py-3"><div className="flex items-center gap-2"><button onClick={() => handleResolve(alerta)} disabled={alerta.estado === 'resuelta'} className="px-3 py-1.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Resolver</button><button onClick={() => handleDelete(alerta)} className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] bg-[#E8F5F0]"><div><h2 className="text-sm font-mono font-bold text-[#157A55] uppercase tracking-wider">NUEVA ALERTA</h2><p className="text-[10px] font-mono text-stone-500 mt-0.5">Registrar incidencia o seguimiento</p></div><button onClick={() => setShowModal(false)} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><XCircle className="w-4 h-4" /></button></div>
              <div className="p-6 space-y-4">
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Título</label><input value={formAlerta.titulo} onChange={(e) => setFormAlerta({ ...formAlerta, titulo: e.target.value })} className={inputCls} placeholder="Ej. Reactivo crítico autorizado" /></div>
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Descripción</label><textarea rows={4} value={formAlerta.descripcion} onChange={(e) => setFormAlerta({ ...formAlerta, descripcion: e.target.value })} className={`${inputCls} resize-none`} placeholder="Detalle de la alerta..." /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Remitente</label><input value={formAlerta.remitente} onChange={(e) => setFormAlerta({ ...formAlerta, remitente: e.target.value })} className={inputCls} /></div><div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Prioridad</label><select value={formAlerta.prioridad} onChange={(e) => setFormAlerta({ ...formAlerta, prioridad: e.target.value })} className={selectCls}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div></div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-[#F5F7F6]"><button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-stone-200 text-stone-600 hover:text-stone-800 hover:border-stone-300 transition-colors">Cancelar</button><button onClick={handleCreate} className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">Crear alerta</button></div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Alertas;