import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, Eye, Pencil, Plus, Search, Trash2, Users, Shield, UserCheck, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { createUsuario, deleteUsuario, getUsuarios, updateUsuario } from '../services/api';

const inputCls = 'w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

const StatCard = ({ label, value, icon, color = 'emerald' }) => {
  const iconColors = {
    emerald: 'border-[#1FA971]/20 text-[#1FA971] bg-[#E8F5F0]',
    blue:    'border-blue-200 text-blue-600 bg-blue-50',
    purple:  'border-purple-200 text-purple-600 bg-purple-50',
  };
  const valueColors = {
    emerald: 'text-[#157A55]',
    blue:    'text-blue-600',
    purple:  'text-purple-600',
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

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('todos');
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formUsuario, setFormUsuario] = useState({ username: '', nombreCompleto: '', email: '', departamento: '', rol: 'usuario', password: '' });

  const normalizeUsuario = (usuario) => ({
    ...usuario,
    username: usuario.username || usuario.nombre || '',
    departamento: usuario.departamento || usuario.department || '',
    rol: usuario.rol || (usuario.is_superuser ? 'jefe' : usuario.is_staff ? 'admin' : 'usuario'),
  });

  useEffect(() => {
    getUsuarios()
      .then(({ data }) => setUsuarios((data.results ?? data ?? []).map(normalizeUsuario)))
      .catch((err) => toast.error(err.response?.data?.detail || 'No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsuarios = useMemo(() => usuarios.filter((usuario) => {
    const term = searchTerm.toLowerCase();
    return (
      (usuario.username || '').toLowerCase().includes(term)
      || (usuario.email || '').toLowerCase().includes(term)
      || (usuario.departamento || '').toLowerCase().includes(term)
    ) && (filterRole === 'todos' || usuario.rol === filterRole);
  }), [filterRole, searchTerm, usuarios]);

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter((usuario) => usuario.is_active !== false).length,
    admins: usuarios.filter((usuario) => usuario.rol === 'admin').length,
    jefes: usuarios.filter((usuario) => usuario.rol === 'jefe').length,
  };

  const resetForm = () => {
    setSelectedUsuario(null);
    setFormUsuario({ username: '', nombreCompleto: '', email: '', departamento: '', rol: 'usuario', password: '' });
    setShowModal(false);
  };

  const openCreate = () => {
    setSelectedUsuario(null);
    setFormUsuario({ username: '', nombreCompleto: '', email: '', departamento: '', rol: 'usuario', password: '' });
    setShowModal(true);
  };

  const openEdit = (usuario) => {
    setSelectedUsuario(usuario);
    setFormUsuario({
      username: usuario.username,
      nombreCompleto: usuario.nombre || usuario.username,
      email: usuario.email || '',
      departamento: usuario.departamento || '',
      rol: usuario.rol || 'usuario',
      password: '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formUsuario.username.trim() || !formUsuario.email.trim()) {
      toast.error('Completa usuario y correo');
      return;
    }

    const payload = {
      username: formUsuario.username.trim(),
      nombre_input: formUsuario.nombreCompleto.trim() || formUsuario.username.trim(),
      nombre_completo: formUsuario.nombreCompleto.trim() || formUsuario.username.trim(),
      email: formUsuario.email.trim(),
      departamento_input: formUsuario.departamento.trim(),
      rol_input: formUsuario.rol,
      password: formUsuario.password,
    };

    try {
      if (selectedUsuario) {
        const { data } = await updateUsuario(selectedUsuario.id, payload);
        setUsuarios((prev) => prev.map((usuario) => usuario.id === selectedUsuario.id ? normalizeUsuario(data) : usuario));
        toast.success('Usuario actualizado');
      } else {
        if (!formUsuario.password.trim()) {
          toast.error('Debes definir una contraseña inicial');
          return;
        }
        const { data } = await createUsuario(payload);
        setUsuarios((prev) => [normalizeUsuario(data), ...prev]);
        toast.success('Usuario creado');
      }
      resetForm();
    } catch (err) {
      const msg = err.response?.data;
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : (msg || 'No se pudo guardar el usuario'));
    }
  };

  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Eliminar a ${usuario.username}?`)) return;
    try {
      await deleteUsuario(usuario.id);
      setUsuarios((prev) => prev.filter((item) => item.id !== usuario.id));
      toast.success('Usuario eliminado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar el usuario');
    }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-3 h-3 rounded-full mx-auto mb-3 bg-emerald-500 animate-pulse" /><p className="text-stone-500 font-mono text-sm">CARGANDO USUARIOS...</p></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-[#1FA971] animate-pulse" /><span className="text-[9px] font-mono font-bold text-[#1FA971] uppercase tracking-widest">SIGIRL · GESTIÓN DE USUARIOS</span></div>
            <h1 className="text-2xl font-bold font-mono text-stone-700">Usuarios del sistema</h1>
            <p className="text-xs font-mono text-stone-500 mt-1">Listado, detalle, edición y alta de cuentas</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm"><Plus className="w-3.5 h-3.5" /> Nuevo usuario</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} icon={<Users className="w-4 h-4" />} color="blue" />
          <StatCard label="Activos" value={stats.activos} icon={<UserCheck className="w-4 h-4" />} color="emerald" />
          <StatCard label="Admins" value={stats.admins} icon={<Shield className="w-4 h-4" />} color="purple" />
          <StatCard label="Jefes" value={stats.jefes} icon={<Shield className="w-4 h-4" />} color="emerald" />
        </div>

        <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9`} placeholder="Buscar por usuario, correo o departamento..." />
            </div>
            <div className="relative w-44">
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="todos">Todos los roles</option>
                <option value="usuario">Usuario</option>
                <option value="admin">Admin</option>
                <option value="jefe">Jefe</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="px-5 py-3 border-b border-[#E0E0E0] bg-[#E8F5F0]"><span className="text-xs font-mono font-bold text-[#157A55] uppercase tracking-wider">USUARIOS REGISTRADOS</span></div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-stone-200">{['USUARIO','EMAIL','DEPARTAMENTO','ROL','ACCIONES'].map((header) => <th key={header} className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsuarios.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-stone-500 font-mono text-sm">No se encontraron usuarios</td></tr> : filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-[#E8F5F0]/40 transition-colors">
                    <td className="py-3 pr-4 text-sm font-mono font-semibold text-stone-700">{usuario.username}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-500">{usuario.email || '—'}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-stone-500">{usuario.departamento || '—'}</td>
                    <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${usuario.rol === 'jefe' ? 'bg-purple-100 text-purple-700 border-purple-200' : usuario.rol === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{usuario.rol}</span></td>
                    <td className="py-3"><div className="flex items-center gap-1"><button onClick={() => toast.info(<div className="text-sm font-mono"><p className="font-bold mb-2 text-emerald-600">DETALLE USUARIO</p><div className="space-y-1 text-stone-600"><p>Usuario: {usuario.username}</p><p>Email: {usuario.email || '—'}</p><p>Departamento: {usuario.departamento || '—'}</p><p>Rol: {usuario.rol}</p><p>Total pedidos: {usuario.total_pedidos ?? 0}</p></div></div>, { autoClose: 7000 })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ver detalle"><Eye className="w-3.5 h-3.5" /></button><button onClick={() => openEdit(usuario)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Editar usuario"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(usuario)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Eliminar usuario"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] bg-[#E8F5F0]"><div><h2 className="text-sm font-mono font-bold text-[#157A55] uppercase tracking-wider">{selectedUsuario ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}</h2><p className="text-[10px] font-mono text-stone-500 mt-0.5">Configura acceso y datos del usuario</p></div><button onClick={resetForm} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><XCircle className="w-4 h-4" /></button></div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Usuario</label><input value={formUsuario.username} onChange={(e) => setFormUsuario({ ...formUsuario, username: e.target.value })} className={inputCls} placeholder="usuario_laboratorio" /></div>
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nombre completo</label><input value={formUsuario.nombreCompleto} onChange={(e) => setFormUsuario({ ...formUsuario, nombreCompleto: e.target.value })} className={inputCls} placeholder="Nombre y apellido" /></div>
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Correo</label><input value={formUsuario.email} onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })} className={inputCls} placeholder="correo@sigirl.com" /></div>
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Departamento</label><input value={formUsuario.departamento} onChange={(e) => setFormUsuario({ ...formUsuario, departamento: e.target.value })} className={inputCls} placeholder="Laboratorio central" /></div>
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Rol</label><select value={formUsuario.rol} onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })} className={selectCls}><option value="usuario">Usuario</option><option value="admin">Admin</option><option value="jefe">Jefe</option></select></div>
                <div><label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Contraseña {selectedUsuario ? '(opcional)' : ''}</label><input type="password" value={formUsuario.password} onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })} className={inputCls} placeholder={selectedUsuario ? 'Solo si deseas cambiarla' : 'Contraseña inicial'} /></div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-[#F5F7F6]"><button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-stone-200 text-stone-600 hover:text-stone-800 hover:border-stone-300 transition-colors">Cancelar</button><button onClick={handleSave} className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">{selectedUsuario ? 'Guardar cambios' : 'Crear usuario'}</button></div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Usuarios;