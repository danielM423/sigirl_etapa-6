// Registro de usuario - Estilo Laboratorio Oscuro
import { useState, useContext } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, Building2, FlaskConical, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../services/api';

const inputCls = 'w-full bg-stone-50 border border-[#E0E0E0] rounded-md px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

const getPasswordStrength = (pwd) => {
  if (!pwd) return { strength: 0, label: '', color: '' };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[!@#$%^&*]/.test(pwd)) s++;
  return [
    { strength: 0, label: '', color: '' },
    { strength: 1, label: 'Débil',     color: 'bg-rose-500' },
    { strength: 2, label: 'Regular',   color: 'bg-amber-500' },
    { strength: 3, label: 'Buena',     color: 'bg-blue-500' },
    { strength: 4, label: 'Muy fuerte',color: 'bg-emerald-500' },
  ][s];
};

const STEPS = [
  { num: 1, label: 'PERSONAL' },
  { num: 2, label: 'SEGURIDAD' },
  { num: 3, label: 'INSTITUCIÓN' },
];

export default function Register() {
  const navigate  = useNavigate();
  const { setUser, setRole } = useContext(UserContext);

  const [currentStep, setCurrentStep] = useState(1);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'',
    username:'', password:'', confirmPassword:'',
    institution:'', department:'', role:'usuario',
  });

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validateStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!form.firstName.trim()) { setError('El nombre es requerido'); return false; }
      if (!form.lastName.trim())  { setError('El apellido es requerido'); return false; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) { setError('Ingresa un correo válido.'); return false; }
    }
    if (currentStep === 2) {
      if (!form.username.trim() || form.username.length < 3) { setError('Usuario: mínimo 3 caracteres'); return false; }
      if (!form.password || form.password.length < 6) { setError('Contraseña: mínimo 6 caracteres'); return false; }
      if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return false; }
    }
    if (currentStep === 3) {
      if (!form.institution.trim()) { setError('La institución es requerida'); return false; }
      if (!form.department.trim())  { setError('El departamento es requerido'); return false; }
    }
    return true;
  };

  const handleNext = () => { if (validateStep()) setCurrentStep(s => Math.min(s + 1, 3)); };
  const handlePrevious = () => { setError(''); setCurrentStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('register/', {
        username: form.username, email: form.email, password: form.password,
        first_name: form.firstName, last_name: form.lastName,
        institution: form.institution, department: form.department, role: form.role,
      });

      // El registro no autentica hasta verificar correo.
      localStorage.removeItem('token');
      setUser(null);
      setRole(null);
      setVerificationEmail(res.data?.email || form.email);
      setSuccess(true);
      toast.success('¡Registro exitoso! Revisa tu correo para verificar la cuenta.');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'Error al registrar usuario';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const pwdStrength = getPasswordStrength(form.password);

  if (success) return (
    <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#E8F5F0] border border-emerald-500/50 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.3)]">
          <CheckCircle2 className="w-8 h-8 text-[#1FA971]" />
        </div>
        <h2 className="text-xl font-bold font-mono text-[#1FA971]">REGISTRO EXITOSO</h2>
        <p className="text-stone-600 font-mono text-sm">Revisa tu correo para verificar la cuenta.</p>
        <p className="text-stone-500 font-mono text-xs">Se envió un enlace a: {verificationEmail}</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-2 px-4 py-2 rounded bg-[#1FA971] hover:bg-[#157A55] text-white text-xs font-mono"
        >
          Ir al login
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center p-4">
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage:'linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)', backgroundSize:'40px 40px' }} />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5F0] border border-[#1FA971]/35 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <FlaskConical className="w-5 h-5 text-[#1FA971]" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-widest">SIGIRL</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e] animate-pulse" />
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">Nuevo acceso</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold font-mono text-stone-700">Crear Cuenta</h1>
          <p className="text-xs font-mono text-stone-500 mt-1">Sistema de Gestión de Inventarios y Reactivos</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 flex-1 ${i < STEPS.length - 1 ? 'pr-2' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 transition-all ${
                  currentStep > s.num
                    ? 'bg-[#1FA971] text-white shadow-sm'
                    : currentStep === s.num
                      ? 'bg-[#E8F5F0] text-[#1FA971] border border-[#1FA971]/50 shadow-[0_0_6px_rgba(31,169,113,0.2)]'
                      : 'bg-stone-50 text-stone-400 border border-[#E0E0E0]'
                }`}>
                  {currentStep > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider hidden sm:block ${currentStep >= s.num ? 'text-[#1FA971]' : 'text-stone-400'}`}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 transition-colors ${currentStep > s.num ? 'bg-[#E8F5F0]' : 'bg-stone-300'}`} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-[#E0E0E0]">
            <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">
              {STEPS[currentStep-1].label} — PASO {currentStep} DE 3
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* ── Paso 1: Datos personales ─────────────────────── */}
            {currentStep === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                      <input name="firstName" value={form.firstName} onChange={handleChange} type="text" placeholder="Juan" className={`${inputCls} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Apellido</label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} type="text" placeholder="Pérez" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="correo@laboratorio.com" className={`${inputCls} pl-9`} />
                  </div>
                </div>
              </>
            )}

            {/* ── Paso 2: Credenciales ───────────────────────────── */}
            {currentStep === 2 && (
              <>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nombre de Usuario</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input name="username" value={form.username} onChange={handleChange} type="text" placeholder="lab_usuario_01" className={`${inputCls} pl-9`} autoComplete="username" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input name="password" value={form.password} onChange={handleChange} type={showPassword?'text':'password'} placeholder="••••••••" className={`${inputCls} pl-9 pr-10`} autoComplete="new-password" />
                    <button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-500 transition-colors">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i<=pwdStrength.strength?pwdStrength.color:'bg-stone-200'}`} />)}
                      </div>
                      {pwdStrength.label && <span className={`text-[9px] font-mono ${pwdStrength.strength<=1?'text-rose-400':pwdStrength.strength===2?'text-amber-400':pwdStrength.strength===3?'text-blue-400':'text-[#1FA971]'}`}>{pwdStrength.label}</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Confirmar Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type={showConfirmPassword?'text':'password'} placeholder="••••••••" className={`${inputCls} pl-9 pr-10`} autoComplete="new-password" />
                    <button type="button" onClick={()=>setShowConfirmPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-500 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-[9px] font-mono text-rose-400 mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>
              </>
            )}

            {/* ── Paso 3: Institución ────────────────────────────── */}
            {currentStep === 3 && (
              <>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Institución</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input name="institution" value={form.institution} onChange={handleChange} type="text" placeholder="Universidad / Hospital / Empresa" className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Departamento</label>
                  <input name="department" value={form.department} onChange={handleChange} type="text" placeholder="Laboratorio de Química" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Rol</label>
                  <select name="role" value={form.role} onChange={handleChange} className={selectCls}>
                    <option value="usuario">Usuario de Laboratorio</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <p className="text-[9px] font-mono text-stone-400 mt-1">El acceso de Jefe Superior es asignado por el sistema.</p>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-rose-500/10 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <p className="text-[11px] font-mono text-rose-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
            {currentStep > 1 ? (
              <button onClick={handlePrevious} className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-slate-500 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
            ) : (
              <Link to="/login" className="text-xs font-mono text-stone-500 hover:text-[#1FA971] transition-colors">Ya tengo cuenta →</Link>
            )}

            {currentStep < 3 ? (
              <button onClick={handleNext} className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm">
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded text-xs font-mono font-bold bg-[#1FA971] text-white hover:bg-[#157A55] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> Creando...</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Crear Cuenta</>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[9px] font-mono text-stone-600 mt-6 uppercase tracking-widest">
          SIGIRL · Sistema de Gestión de Inventarios y Reactivos
        </p>
      </div>
    </div>
  );
}
