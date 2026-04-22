// Vista dedicada al inventario — Tema Laboratorio Claro
import { useState, useEffect, useMemo, useContext } from 'react';
import { toast } from 'react-toastify';
import { Search, ChevronDown, Plus, Edit2, Trash2, Download, Eye, Package, AlertCircle, TrendingUp, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { UserContext } from '../context/UserContext';
import { exportToExcel } from '../utils/reportExport';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../services/api';

const inputCls = 'w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

const StatCard = ({ label, value, icon, color = 'emerald' }) => {
  const iconColors = {
    emerald: 'border-[#1FA971]/20 text-[#1FA971] bg-[#E8F5F0]',
    amber:   'border-amber-200  text-amber-600  bg-amber-50',
    rose:    'border-rose-200   text-rose-600   bg-rose-50',
    blue:    'border-blue-200   text-blue-600   bg-blue-50',
  };
  const valueColors = {
    emerald: 'text-[#157A55]',
    amber:   'text-amber-600',
    rose:    'text-rose-600',
    blue:    'text-blue-600',
  };
  return (
    <div className="bg-white border border-[#E0E0E0] border-t-[3px] border-t-[#1FA971] rounded-xl p-4 shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_18px_rgba(31,169,113,0.13)] hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">{label}</span>
          <p className={`text-3xl font-bold font-mono mt-1 ${valueColors[color]}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-lg border ${iconColors[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

const EstadoBadge = ({ estado }) => {
  const styles = { ok: 'bg-emerald-100 text-emerald-700 border-emerald-200', bajo_stock: 'bg-amber-100 text-amber-700 border-amber-200', agotado: 'bg-rose-100 text-rose-700 border-rose-200' };
  const dots = { ok: 'bg-emerald-500', bajo_stock: 'bg-amber-500', agotado: 'bg-rose-500' };
  const labels = { ok: 'OK', bajo_stock: 'Bajo stock', agotado: 'Agotado' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${styles[estado] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[estado] || 'bg-stone-400'}`} />
      {labels[estado] || estado}
    </span>
  );
};

const LabSection = ({ title, children }) => (
  <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#E0E0E0] bg-[#E8F5F0]">
      <span className="text-xs font-mono font-bold text-[#157A55] uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Inventario = () => {
  const { role } = useContext(UserContext);
  const normalizedRole = role === 'jefe_superior' ? 'jefe' : role;
  const canManage = normalizedRole === 'admin' || normalizedRole === 'jefe';

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formProducto, setFormProducto] = useState({ nombre: '', categoria: 'Solventes', ubicacion: '', cantidad: '', umbral_minimo: '', tipo: 'reactivo' });

  useEffect(() => {
    getProductos()
      .then((res) => setProductos(res.data.results ?? res.data ?? []))
      .catch(() => toast.error('Error al cargar el inventario'))
      .finally(() => setLoading(false));
  }, []);

  const normalizedProducts = useMemo(() => productos.map((p, i) => ({
    id: Number(p.id ?? i + 1),
    nombre: p.nombre || 'Sin nombre',
    categoria: typeof p.categoria === 'string' ? p.categoria : p.categoria?.nombre || p.categoria_nombre || 'General',
    cantidad: Number(p.cantidad ?? 0),
    umbral_minimo: Number(p.umbral_minimo ?? p.minimo ?? 0),
    ubicacion: p.ubicacion || 'Sin ubicacion',
    estado: p.estado || (Number(p.cantidad ?? 0) <= 0 ? 'agotado' : Number(p.cantidad ?? 0) <= Number(p.umbral_minimo ?? p.minimo ?? 0) ? 'bajo_stock' : 'ok'),
  })), [productos]);

  const categories = useMemo(() => ['todas', ...new Set(normalizedProducts.map((p) => p.categoria).filter(Boolean))], [normalizedProducts]);

  const filteredProducts = normalizedProducts.filter((p) => {
    const t = searchTerm.toLowerCase();
    return (p.nombre.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t) || p.ubicacion.toLowerCase().includes(t))
      && (filterStatus === 'todos' || p.estado === filterStatus)
      && (filterCategory === 'todas' || p.categoria === filterCategory);
  });

  const stats = { total: normalizedProducts.length, ok: normalizedProducts.filter((p) => p.estado === 'ok').length, bajoStock: normalizedProducts.filter((p) => p.estado === 'bajo_stock').length, agotado: normalizedProducts.filter((p) => p.estado === 'agotado').length };

  const resetForm = () => { setShowModal(false); setSelectedProduct(null); setFormProducto({ nombre: '', categoria: 'Solventes', ubicacion: '', cantidad: '', umbral_minimo: '', tipo: 'reactivo' }); };

  const handleGuardarProducto = async () => {
    if (!canManage) { toast.error('Solo consulta permitida.'); return; }
    if (!formProducto.nombre || !formProducto.cantidad || !formProducto.umbral_minimo || !formProducto.ubicacion) { toast.error('Completa todos los campos'); return; }
    const payload = { nombre: formProducto.nombre, categoria_texto: formProducto.categoria, ubicacion: formProducto.ubicacion, cantidad: parseInt(formProducto.cantidad, 10), umbral_minimo: parseInt(formProducto.umbral_minimo, 10), tipo: formProducto.tipo || 'reactivo' };
    try {
      if (selectedProduct) {
        const { data } = await updateProducto(selectedProduct.id, payload);
        setProductos((prev) => prev.map((p) => p.id === selectedProduct.id ? data : p));
        toast.success('Producto actualizado');
      } else {
        const { data } = await createProducto(payload);
        setProductos((prev) => [...prev, data]);
        toast.success('Producto creado');
      }
      resetForm();
    } catch (err) {
      const msg = err.response?.data;
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : (msg || 'Error al guardar'));
    }
  };

  const handleEliminarProducto = async (id) => {
    if (!canManage) { toast.error('Sin permisos.'); return; }
    if (!window.confirm('¿Eliminar este producto?')) return;
    try { await deleteProducto(id); setProductos((prev) => prev.filter((p) => p.id !== id)); toast.success('Producto eliminado'); }
    catch { toast.error('Error al eliminar'); }
  };

  const handleExportar = () => {
    if (!canManage) { toast.info('Solo consulta.'); return; }
    exportToExcel(filteredProducts.map((p) => ({ Nombre: p.nombre, Categoria: p.categoria, Cantidad: p.cantidad, 'Umbral min': p.umbral_minimo, Ubicacion: p.ubicacion, Estado: p.estado })), `inventario-sigirl-${new Date().toISOString().slice(0,10)}.xlsx`, 'Inventario');
    toast.success('Exportado a Excel');
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-3 h-3 rounded-full mx-auto mb-3 bg-emerald-500 animate-pulse" /><p className="text-stone-500 font-mono text-sm">CARGANDO INVENTARIO...</p></div></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 max-w-[1400px] mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#1FA971] animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-[#1FA971] uppercase tracking-widest">SIGIRL · MÓDULO INVENTARIO</span>
            </div>
            <h1 className="text-2xl font-bold font-mono text-stone-700">Inventario General</h1>
            <p className="text-xs font-mono text-stone-500 mt-1">Gestión de productos y reactivos del laboratorio</p>
          </div>
          {!canManage && <span className="px-3 py-1.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700 border border-blue-200">MODO CONSULTA</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Productos" value={stats.total}     icon={<Package className="w-4 h-4" />}     color="blue" />
          <StatCard label="Stock OK"        value={stats.ok}        icon={<TrendingUp className="w-4 h-4" />}  color="emerald" />
          <StatCard label="Bajo Stock"      value={stats.bajoStock} icon={<AlertCircle className="w-4 h-4" />} color="amber" />
          <StatCard label="Agotados"        value={stats.agotado}   icon={<AlertCircle className="w-4 h-4" />} color="rose" />
        </div>

        <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input type="text" placeholder="Buscar por nombre, categoría o ubicación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9`} />
            </div>
            <div className="relative w-44">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="todos">Todos los estados</option>
                <option value="ok">Stock OK</option>
                <option value="bajo_stock">Bajo Stock</option>
                <option value="agotado">Agotado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
            </div>
            <div className="relative w-44">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`${selectCls} pr-8`}>
                {categories.map((c) => <option key={c} value={c}>{c === 'todas' ? 'Todas las categorías' : c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
            </div>
            {canManage && (
              <div className="flex gap-2">
                <button onClick={handleExportar} className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold bg-white border border-stone-200 text-stone-600 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Exportar
                </button>
                <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Nuevo producto
                </button>
              </div>
            )}
          </div>
        </div>

        <LabSection title={`PRODUCTOS · ${filteredProducts.length} resultado${filteredProducts.length !== 1 ? 's' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  {['PRODUCTO','CATEGORÍA','CANT.','MÍN.','UBICACIÓN','ESTADO','ACCIONES'].map((h) => (
                    <th key={h} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left last:text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center"><Package className="w-8 h-8 text-stone-300 mx-auto mb-2" /><p className="text-stone-500 font-mono text-sm">No se encontraron productos</p></td></tr>
                ) : filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#E8F5F0]/40 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-sm font-mono font-semibold text-stone-700">{p.nombre}</p>
                      <p className="text-[10px] font-mono text-stone-400 mt-0.5">#{String(p.id).padStart(4,'0')}</p>
                    </td>
                    <td className="py-3 pr-4"><span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">{p.categoria}</span></td>
                    <td className="py-3 pr-4"><span className={`inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm font-mono ${p.cantidad <= p.umbral_minimo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.cantidad}</span></td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-500">{p.umbral_minimo}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-500">{p.ubicacion}</td>
                    <td className="py-3 pr-4"><EstadoBadge estado={p.estado} /></td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => toast.info(<div className="text-sm font-mono"><p className="font-bold mb-2 text-emerald-600">DETALLE</p><div className="space-y-1 text-stone-600"><p>Nombre: {p.nombre}</p><p>Categoría: {p.categoria}</p><p>Ubicación: {p.ubicacion}</p><p>Cantidad: {p.cantidad}</p><p>Umbral: {p.umbral_minimo}</p><p>Estado: {p.estado}</p></div></div>, { autoClose: 7000 })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ver"><Eye className="w-3.5 h-3.5" /></button>
                        {canManage && (<>
                          <button onClick={() => { setSelectedProduct(p); setFormProducto({ nombre: p.nombre, categoria: p.categoria, ubicacion: p.ubicacion, cantidad: String(p.cantidad), umbral_minimo: String(p.umbral_minimo), tipo: p.tipo || 'reactivo' }); setShowModal(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminarProducto(p.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
            <p className="text-[10px] font-mono text-stone-500">Mostrando {filteredProducts.length} de {normalizedProducts.length} productos</p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-[10px] font-mono border border-stone-200 rounded text-stone-500 opacity-50 cursor-not-allowed" disabled>Anterior</button>
              <button className="px-3 py-1.5 text-[10px] font-mono border border-stone-200 rounded text-stone-500 opacity-50 cursor-not-allowed" disabled>Siguiente</button>
            </div>
          </div>
        </LabSection>

      </div>

      {showModal && canManage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] bg-[#E8F5F0]">
              <div>
                <h2 className="text-sm font-mono font-bold text-[#157A55] uppercase tracking-wider">{selectedProduct ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}</h2>
                <p className="text-[10px] font-mono text-stone-500 mt-0.5">Complete la información del inventario</p>
              </div>
              <button onClick={resetForm} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><XCircle className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nombre</label>
                <input type="text" value={formProducto.nombre} onChange={(e) => setFormProducto({...formProducto, nombre: e.target.value})} className={inputCls} placeholder="Nombre del producto" />
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Categoría</label>
                <select value={formProducto.categoria} onChange={(e) => setFormProducto({...formProducto, categoria: e.target.value})} className={selectCls}>
                  {['Solventes','Ácidos','Bases','EPP','Vidrio','Materiales'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Ubicación</label>
                <input type="text" value={formProducto.ubicacion} onChange={(e) => setFormProducto({...formProducto, ubicacion: e.target.value})} className={inputCls} placeholder="Ej. Almacén A" />
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Tipo</label>
                <select value={formProducto.tipo} onChange={(e) => setFormProducto({...formProducto, tipo: e.target.value})} className={selectCls}>
                  <option value="reactivo">Reactivo</option>
                  <option value="insumo">Insumo</option>
                  <option value="equipo">Equipo</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cantidad</label>
                <input type="number" min="0" value={formProducto.cantidad} onChange={(e) => setFormProducto({...formProducto, cantidad: e.target.value})} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Umbral mínimo</label>
                <input type="number" min="0" value={formProducto.umbral_minimo} onChange={(e) => setFormProducto({...formProducto, umbral_minimo: e.target.value})} className={inputCls} placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-[#F5F7F6]">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-stone-200 text-stone-600 hover:text-stone-800 hover:border-stone-300 transition-colors">Cancelar</button>
              <button onClick={handleGuardarProducto} className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">{selectedProduct ? 'Guardar cambios' : 'Crear producto'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Inventario;