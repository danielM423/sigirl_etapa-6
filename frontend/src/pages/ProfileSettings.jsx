// Configuración de perfil del usuario.
// Permite editar datos personales, avatar y preferencias visibles en el sistema.
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Camera,
  IdCard,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Layout from '../components/Layout';
import { UserContext } from '../context/AuthContext';
import api, { getPedidos } from '../services/api';

const EMPTY_FORM = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  institution: '',
  department: '',
  phone: '',
  cargo: '',
  bio: '',
  avatar: '',
};

const DEFAULT_PREFS = {
  emailAlerts: true,
  compactView: false,
  stockReminders: true,
};

const PREFS_STORAGE_KEY = 'sigirl_profile_preferences';

const getDashboardPath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'jefe' || role === 'jefe_superior') return '/jefe';
  return '/usuario';
};

const getRoleLabel = (role) => {
  if (role === 'admin') return 'Administrador';
  if (role === 'jefe' || role === 'jefe_superior') return 'Jefe Superior';
  return 'Usuario';
};

const PreferenceItem = ({ title, description, checked, onToggle }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-[#eef9ea] px-4 py-3">
    <div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
  </div>
);

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, role, setUser, logout } = useContext(UserContext);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [actividadPedidos, setActividadPedidos] = useState([]);

  const dashboardPath = getDashboardPath(role);
  const roleLabel = getRoleLabel(role);

  const initials = useMemo(() => {
    const first = form.first_name?.[0] || form.username?.[0] || 'U';
    const second = form.last_name?.[0] || form.username?.[1] || '';
    return `${first}${second}`.toUpperCase();
  }, [form.first_name, form.last_name, form.username]);

  const activityData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const fallback = [30, 45, 60, 55, 75, 90];
    const username = (user?.username || form.username || '').toLowerCase();

    const propios = actividadPedidos.filter((pedido) => {
      const candidates = [pedido.solicitante, pedido.usuario_username]
        .filter(Boolean)
        .map((item) => String(item).toLowerCase());
      return username && candidates.includes(username);
    });

    const source = propios.length > 0 ? propios : actividadPedidos;

    return months.map((name, index) => {
      const month = String(index + 1).padStart(2, '0');
      const total = source.filter((pedido) => String(pedido.fecha_solicitud || '').includes(`-${month}-`)).length;
      return {
        name,
        value: total > 0 ? total * 15 : fallback[index],
      };
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
    setUser(data);
  }, [setUser]);

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      try {
        const [profileRes] = await Promise.all([
          api.get('auth/profile/'),
          getPedidos().then((res) => setActividadPedidos(res.data || [])).catch(() => {}),
        ]);
        if (active) {
          applyProfileData(profileRes.data);
        }
      } catch {
        toast.error('No se pudo cargar la información del perfil');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      active = false;
    };
  }, [applyProfileData]);

  useEffect(() => {
    if (!form.username) return;
    const savedPrefs = JSON.parse(localStorage.getItem(`${PREFS_STORAGE_KEY}:${form.username}`) || 'null');
    setPreferences(savedPrefs ? { ...DEFAULT_PREFS, ...savedPrefs } : DEFAULT_PREFS);
  }, [form.username]);

  useEffect(() => {
    if (!form.username) return;
    localStorage.setItem(`${PREFS_STORAGE_KEY}:${form.username}`, JSON.stringify(preferences));
  }, [preferences, form.username]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setChartReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const image = new Image();

      image.onload = () => {
        const maxSide = 320;
        const ratio = Math.min(maxSide / image.width, maxSide / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);

        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };

      image.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
      image.src = loadEvent.target?.result;
    };

    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen válida para el perfil');
      return;
    }

    try {
      const avatar = await compressImage(file);
      setForm((prev) => ({ ...prev, avatar }));
      toast.success('Foto cargada. Guarda los cambios para aplicarla.');
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar la foto');
    }
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, avatar: '' }));
    toast.info('La foto se quitará cuando guardes los cambios');
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast.error('El nombre de usuario es obligatorio');
      return;
    }

    if (form.email && !form.email.includes('@')) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }

    setSaving(true);

    try {
      const { data } = await api.patch('auth/profile/', {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        institution: form.institution.trim(),
        department: form.department.trim(),
        phone: form.phone.trim(),
        cargo: form.cargo.trim(),
        bio: form.bio.trim(),
        avatar: form.avatar || '',
      });

      applyProfileData(data);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      const message = error.response?.data?.username?.[0]
        || error.response?.data?.email?.[0]
        || error.response?.data?.avatar?.[0]
        || 'No se pudo guardar el perfil';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (user) {
      applyProfileData(user);
      toast.info('Se restauró la vista del perfil');
    }
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = async () => {
    if (confirmText.trim() !== form.username.trim()) {
      toast.error('Escribe tu usuario para confirmar la eliminación');
      return;
    }

    const confirmed = window.confirm('¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setDeleting(true);

    try {
      await api.delete('auth/profile/');
      logout();
      navigate('/login');
      toast.success('Tu cuenta fue eliminada');
    } catch {
      toast.error('No se pudo eliminar la cuenta');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-[24px] border border-emerald-100 p-10 shadow-[0_10px_30px_rgba(34,197,94,0.08)] text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-emerald-600 animate-spin" />
            <p className="text-slate-600 font-medium">Cargando configuración del perfil...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Mi Perfil</h1>
              <p className="text-[#6ca24f] font-medium">Administra tu información personal</p>
            </div>
            <button
              onClick={() => navigate(dashboardPath)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-slate-700 font-semibold hover:bg-emerald-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-emerald-100 bg-white p-5 md:p-6 shadow-[0_10px_30px_rgba(34,197,94,0.08)]">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Tu Actividad</h2>
              <p className="text-sm text-[#6ca24f]">Nivel de actividad en los últimos 6 meses</p>
            </div>
          </div>
          <div className="h-60 min-h-[240px] min-w-0 overflow-hidden rounded-2xl border border-emerald-100 bg-[#fbfffa] p-3">
            {chartReady && (
              <ResponsiveContainer width="99%" height={220} debounce={120}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9ead2" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1faa48" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="sigirl-form-surface rounded-[24px] p-5 md:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-800">Información Personal</h2>
            <p className="text-sm text-[#6ca24f]">Actualiza tus datos personales</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:items-start mb-6">
            <div className="flex items-center gap-4 min-w-[220px]">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt="Foto de perfil"
                  className="w-16 h-16 rounded-full object-cover border-4 border-emerald-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#32c356] to-[#129c43] flex items-center justify-center text-white font-bold text-2xl">
                  {initials}
                </div>
              )}

              <div>
                <p className="text-lg font-semibold text-slate-800">{user?.full_name || `${form.first_name} ${form.last_name}`.trim() || form.username}</p>
                <p className="text-sm text-[#6ca24f]">{form.email || 'Sin correo registrado'}</p>
                <p className="text-xs text-slate-500 mt-1">{roleLabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <label className="sigirl-btn-primary cursor-pointer">
                <Camera className="w-4 h-4" />
                Foto
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
              <button
                onClick={handleRemovePhoto}
                className="sigirl-btn-secondary"
              >
                <Trash2 className="w-4 h-4" />
                Quitar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="sigirl-form-label">Nombre</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="sigirl-form-control"
                placeholder="John"
              />
            </div>

            <div>
              <label className="sigirl-form-label">Apellido</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="sigirl-form-control"
                placeholder="Doe"
              />
            </div>

            <div>
              <label className="sigirl-form-label">Usuario</label>
              <div className="relative">
                <IdCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="sigirl-form-control sigirl-form-control-icon"
                />
              </div>
            </div>

            <div>
              <label className="sigirl-form-label">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="sigirl-form-control sigirl-form-control-icon"
                  placeholder="john.doe@email.com"
                />
              </div>
            </div>

            <div>
              <label className="sigirl-form-label">Teléfono</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="sigirl-form-control sigirl-form-control-icon"
                  placeholder="+123 456 78 90"
                />
              </div>
            </div>

            <div>
              <label className="sigirl-form-label">Cargo</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="cargo"
                  value={form.cargo}
                  onChange={handleChange}
                  className="sigirl-form-control sigirl-form-control-icon"
                  placeholder="Analista"
                />
              </div>
            </div>

            <div>
              <label className="sigirl-form-label">Institución</label>
              <input
                name="institution"
                value={form.institution}
                onChange={handleChange}
                className="sigirl-form-control"
                placeholder="SIGIRL Lab"
              />
            </div>

            <div>
              <label className="sigirl-form-label">Departamento</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="sigirl-form-control sigirl-form-control-icon"
                  placeholder="Laboratorio"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="sigirl-form-label">Biografía</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows="3"
              className="sigirl-form-control sigirl-form-textarea"
              placeholder="Agrega una descripción breve de tu rol o actividad."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="sigirl-btn-primary disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Cambios
            </button>
            <button
              onClick={handleReset}
              className="sigirl-btn-secondary"
            >
              <RefreshCw className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-emerald-100 bg-white p-5 md:p-6 shadow-[0_10px_30px_rgba(34,197,94,0.08)]">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">Preferencias</h2>
            <p className="text-sm text-[#6ca24f]">Configura tus preferencias de la aplicación</p>
          </div>

          <div className="space-y-3">
            <PreferenceItem
              title="Notificaciones por Email"
              description="Recibe actualizaciones por correo"
              checked={preferences.emailAlerts}
              onToggle={() => togglePreference('emailAlerts')}
            />
            <PreferenceItem
              title="Vista Compacta"
              description="Muestra tarjetas más compactas"
              checked={preferences.compactView}
              onToggle={() => togglePreference('compactView')}
            />
            <PreferenceItem
              title="Recordatorios de Stock"
              description="Avisos cuando haya niveles críticos"
              checked={preferences.stockReminders}
              onToggle={() => togglePreference('stockReminders')}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-emerald-100 bg-white p-5 md:p-6 shadow-[0_10px_30px_rgba(34,197,94,0.08)]">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-xl bg-emerald-50">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Seguridad y cuenta</h2>
              <p className="text-sm text-slate-500">Si lo necesitas, puedes eliminar tu cuenta desde aquí.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="sigirl-form-label">Confirma tu usuario</label>
              <div className="relative">
                <Bell className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  className="sigirl-form-control sigirl-form-control-icon"
                  placeholder={form.username}
                />
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="sigirl-btn-danger disabled:opacity-60"
            >
              {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileSettings;
