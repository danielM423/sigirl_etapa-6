// Configuración de perfil del usuario - Estilo Laboratorio Oscuro
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, Bell, Briefcase, Building2, Camera,
  IdCard, Mail, Phone, RefreshCw, Save, Shield, Trash2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Layout from '../components/Layout';
import { UserContext } from '../context/UserContext';
import api, { getPedidos } from '../services/api';

// ─── Constants ───────────────────────────────────────────────────
const EMPTY_FORM = { username:'', first_name:'', last_name:'', email:'', institution:'', department:'', phone:'', cargo:'', bio:'', avatar:'' };
const DEFAULT_PREFS = { emailAlerts: true, compactView: false, stockReminders: true };
const PREFS_STORAGE_KEY = 'sigirl_profile_preferences';

const getDashboardPath = (role) => role==='admin'?'/admin':role==='jefe'||role==='jefe_superior'?'/jefe':'/usuario';
const getRoleLabel    = (role) => role==='admin'?'Administrador':role==='jefe'||role==='jefe_superior'?'Jefe Superior':'Usuario';

// ─── Design helpers ──────────────────────────────────────────────
const inputCls = 'w-full bg-stone-50 border border-[#E0E0E0] rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition-colors';

const Section = ({ title, subtitle, icon, children }) => (
  <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E0E0E0]">
      {icon && <div className="p-1.5 rounded bg-[#E8F5F0] border border-emerald-500/20">{icon}</div>}
      <div>
        <h2 className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-[10px] font-mono text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const ToggleItem = ({ title, description, checked, onToggle }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E0E0E0] bg-stone-50 px-4 py-3 hover:border-[#1FA971]/25 transition-colors">
    <div>
      <p className="text-sm font-mono text-stone-700">{title}</p>
      <p className="text-[10px] font-mono text-stone-500">{description}</p>
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#1FA971] shadow-sm' : 'bg-stone-300'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-md p-2 shadow-xl">
      <p className="font-mono font-bold text-[#1FA971] text-[10px]">{label}</p>
      <p className="text-[10px] font-mono text-stone-500">Actividad: <span className="font-bold text-[#1FA971]">{payload[0].value}</span></p>
    </div>
  );
};

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, role, setUser, setRole, logout } = useContext(UserContext);

  const [form,      setForm]     = useState(EMPTY_FORM);
  const [savedProfile, setSavedProfile] = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [saving,    setSaving]   = useState(false);
  const [deleting,  setDeleting] = useState(false);
  const [chartReady,setChartReady] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [actividadPedidos, setActividadPedidos] = useState([]);

  const dashboardPath = getDashboardPath(role);
  const roleLabel     = getRoleLabel(role);

  const initials = useMemo(() => {
    const first  = form.first_name?.[0] || form.username?.[0] || 'U';
    const second = form.last_name?.[0]  || form.username?.[1] || '';
    return `${first}${second}`.toUpperCase();
  }, [form.first_name, form.last_name, form.username]);

  const activityData = useMemo(() => {
    const months   = ['Ene','Feb','Mar','Abr','May','Jun'];
    const fallback = [30, 45, 60, 55, 75, 90];
    const username = (user?.username || form.username || '').toLowerCase();
    const propios  = actividadPedidos.filter(p => {
      const candidates = [p.solicitante, p.usuario_username].filter(Boolean).map(v=>String(v).toLowerCase());
      return username && candidates.includes(username);
    });
    const source = propios.length > 0 ? propios : actividadPedidos;
    return months.map((name, idx) => {
      const month = String(idx + 1).padStart(2, '0');
      const total = source.filter(p => String(p.fecha_solicitud||'').includes(`-${month}-`)).length;
      return { name, value: total > 0 ? total * 15 : fallback[idx] };
    });
  }, [form.username, user?.username, actividadPedidos]);

  const applyProfileData = useCallback((data) => {
    setForm({
      username: data.username || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      institution: data.profile?.institution || '',
      department: data.profile?.department || '',
      phone: data.profile?.phone || '',
      cargo: data.profile?.cargo || '',
      bio: data.profile?.bio || '',
      avatar: data.profile?.avatar || '',
    });
    setSavedProfile(data);
    setUser(data);
    if (data.role) setRole(data.role);
  }, [setRole, setUser]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [profileRes] = await Promise.all([
          api.get('auth/profile/'),
          getPedidos().then(res => setActividadPedidos(res.data?.results ?? res.data ?? [])).catch(()=>{}),
        ]);
        if (active) applyProfileData(profileRes.data);
      } catch {
        toast.error('No se pudo cargar la información del perfil');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [applyProfileData]);

  useEffect(() => {
    if (!form.username) return;
    const saved = JSON.parse(localStorage.getItem(`${PREFS_STORAGE_KEY}:${form.username}`) || 'null');
    setPreferences(saved ? { ...DEFAULT_PREFS, ...saved } : DEFAULT_PREFS);
  }, [form.username]);

  useEffect(() => {
    if (!form.username) return;
    localStorage.setItem(`${PREFS_STORAGE_KEY}:${form.username}`, JSON.stringify(preferences));
  }, [preferences, form.username]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setChartReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 320;
        const ratio   = Math.min(maxSide / image.width, maxSide / image.height, 1);
        const canvas  = document.createElement('canvas');
        canvas.width  = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      image.src = ev.target?.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecciona una imagen válida'); return; }
    try {
      const avatar = await compressImage(file);
      setForm(prev => ({ ...prev, avatar }));
      toast.success('Foto cargada. Guarda los cambios para aplicarla.');
    } catch (err) { toast.error(err.message || 'No se pudo cargar la foto'); }
  };

  const handleRemovePhoto = () => {
    setForm(prev => ({ ...prev, avatar: '' }));
    toast.info('La foto se quitará cuando guardes los cambios');
  };

  const handleSave = async () => {
    if (!form.username.trim()) { toast.error('El nombre de usuario es obligatorio'); return; }
    if (form.email && !form.email.includes('@')) { toast.error('Email inválido'); return; }
    setSaving(true);
    try {
      const { data } = await api.patch('auth/profile/', {
        username: form.username.trim(), first_name: form.first_name.trim(),
        last_name: form.last_name.trim(), email: form.email.trim(),
        profile: {
          institution: form.institution.trim(), department: form.department.trim(),
          phone: form.phone.trim(), cargo: form.cargo.trim(),
          bio: form.bio.trim(), avatar: form.avatar || '',
        },
      });
      applyProfileData(data);
      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      toast.error(err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'No se pudo guardar el perfil');
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    if (savedProfile) { applyProfileData(savedProfile); toast.info('Cambios descartados'); }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.trim() !== form.username.trim()) { toast.error('Escribe tu usuario exactamente para confirmar'); return; }
    if (!window.confirm('¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await api.delete('auth/profile/');
      logout();
      navigate('/login');
      toast.success('Tu cuenta fue eliminada');
    } catch { toast.error('No se pudo eliminar la cuenta'); }
    finally { setDeleting(false); }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_6px_#1FA971] animate-pulse mx-auto mb-3" />
          <p className="text-stone-500 font-mono text-sm">CARGANDO PERFIL...</p>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold text-[#1FA971] uppercase tracking-wider">CONFIGURACIÓN DE PERFIL</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e] animate-pulse" />
              </div>
              <h1 className="text-xl font-bold font-mono text-stone-700">Mi Perfil</h1>
              <p className="text-[10px] font-mono text-stone-500 mt-1">Administra tu información personal y preferencias</p>
            </div>
            <button
              onClick={() => navigate(dashboardPath)}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </button>
          </div>
        </div>

        {/* Activity chart */}
        <Section title="TU ACTIVIDAD" subtitle="Nivel de actividad en los últimos 6 meses" icon={<BarChart3 className="w-3.5 h-3.5 text-[#1FA971]" />}>
          <div className="h-52 rounded-lg border border-[#E0E0E0] bg-stone-50 p-3">
            {chartReady && (
              <ResponsiveContainer width="99%" height="100%" debounce={120}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#64748b', fontSize:10, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'#F0F4F2' }} />
                  <Bar dataKey="value" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        {/* Personal info */}
        <Section title="INFORMACIÓN PERSONAL" subtitle="Actualiza tus datos personales">
          {/* Avatar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6 pb-5 border-b border-[#E0E0E0]">
            <div className="relative group flex-shrink-0">
              {form.avatar ? (
                <img src={form.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[#1FA971]/35 shadow-[0_0_15px_rgba(34,197,94,0.15)]" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#E8F5F0] border-2 border-[#1FA971]/35 flex items-center justify-center text-[#1FA971] font-bold font-mono text-xl shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold font-mono text-stone-700 truncate">
                {user?.full_name || `${form.first_name} ${form.last_name}`.trim() || form.username}
              </p>
              <p className="text-xs font-mono text-stone-500 truncate">{form.email || 'Sin correo registrado'}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/25">{roleLabel}</span>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <label className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors cursor-pointer">
                <Camera className="w-3 h-3" /> Foto
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
              <button onClick={handleRemovePhoto} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-rose-400 hover:border-rose-500/40 transition-colors">
                <Trash2 className="w-3 h-3" /> Quitar
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nombre</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} className={inputCls} placeholder="Juan" />
            </div>
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Apellido</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} className={inputCls} placeholder="Pérez" />
            </div>
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Usuario</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input name="username" value={form.username} onChange={handleChange} className={`${inputCls} pl-9`} />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input name="email" value={form.email} onChange={handleChange} className={`${inputCls} pl-9`} placeholder="correo@laboratorio.com" />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input name="phone" value={form.phone} onChange={handleChange} className={`${inputCls} pl-9`} placeholder="+57 300 123 4567" />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Cargo</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input name="cargo" value={form.cargo} onChange={handleChange} className={`${inputCls} pl-9`} placeholder="Analista de Laboratorio" />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Institución</label>
              <input name="institution" value={form.institution} onChange={handleChange} className={inputCls} placeholder="Universidad / Hospital" />
            </div>
            <div>
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Departamento</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input name="department" value={form.department} onChange={handleChange} className={`${inputCls} pl-9`} placeholder="Laboratorio Química" />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Biografía</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} rows="3" className={`${inputCls} resize-none`} placeholder="Describe brevemente tu rol o actividad..." />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>
        </Section>

        {/* Preferences */}
        <Section title="PREFERENCIAS" subtitle="Configura las opciones de la aplicación">
          <div className="space-y-3">
            <ToggleItem
              title="Notificaciones por Email"
              description="Recibe actualizaciones importantes por correo"
              checked={preferences.emailAlerts}
              onToggle={() => setPreferences(prev => ({ ...prev, emailAlerts: !prev.emailAlerts }))}
            />
            <ToggleItem
              title="Vista Compacta"
              description="Muestra tarjetas en formato más condensado"
              checked={preferences.compactView}
              onToggle={() => setPreferences(prev => ({ ...prev, compactView: !prev.compactView }))}
            />
            <ToggleItem
              title="Recordatorios de Stock"
              description="Avisos automáticos cuando hay niveles críticos de reactivos"
              checked={preferences.stockReminders}
              onToggle={() => setPreferences(prev => ({ ...prev, stockReminders: !prev.stockReminders }))}
            />
          </div>
        </Section>

        {/* Security / Delete account */}
        <Section title="SEGURIDAD Y CUENTA" icon={<Shield className="w-3.5 h-3.5 text-rose-400" />}>
          <p className="text-[11px] font-mono text-stone-500 mb-4">Para eliminar tu cuenta, escribe exactamente tu nombre de usuario y confirma la acción. Esta operación es irreversible.</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Confirma tu usuario</label>
              <div className="relative">
                <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className={`${inputCls} pl-9`}
                  placeholder={form.username || 'tu_usuario'}
                />
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {deleting ? 'Eliminando...' : 'Eliminar Cuenta'}
            </button>
          </div>
        </Section>

      </div>
    </Layout>
  );
};

export default ProfileSettings;
