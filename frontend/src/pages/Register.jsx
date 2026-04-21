// Pantalla de registro de usuarios.
// Captura datos personales, credenciales y rol solicitado.
import { useState, useContext } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/AuthContext";
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Building2, ArrowLeft, ShieldCheck } from "lucide-react";

function Register() {
  // Registro guiado por pasos para capturar datos personales,
  // credenciales y el rol del usuario dentro del sistema.
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setRole, role } = useContext(UserContext);

  const sessionRole = (role || localStorage.getItem("role") || "").replace("jefe_superior", "jefe");
  const isManagedCreation = ["admin", "jefe"].includes(sessionRole);
  const backPath = sessionRole === "jefe" ? "/jefe?tab=usuarios" : sessionRole === "admin" ? "/admin" : "/login";

  const roleOptions = isManagedCreation
    ? sessionRole === 'jefe'
      ? [
          { value: 'usuario', title: 'Usuario', description: 'Solicita reactivos y consulta pedidos' },
          { value: 'admin', title: 'Administrador', description: 'Gestiona inventario y registros' },
          { value: 'jefe', title: 'Jefe Superior', description: 'Supervisa alertas, usuarios y reportes' },
        ]
      : [
          { value: 'usuario', title: 'Usuario', description: 'Solicita reactivos y consulta pedidos' },
          { value: 'admin', title: 'Administrador', description: 'Gestiona inventario y registros' },
        ]
    : [
        { value: 'usuario', title: 'Usuario', description: 'Acceso estándar para solicitudes y consultas' },
        { value: 'admin', title: 'Administrador', description: 'Acceso de administración para gestionar inventario y registros' },
      ];

  const [form, setForm] = useState({
    // El formulario se divide en 3 bloques para mejorar la experiencia de registro.
    // Paso 1
    firstName: "",
    lastName: "",
    email: "",
    // Paso 2
    username: "",
    password: "",
    confirmPassword: "",
    // Paso 3
    institution: "",
    department: "",
    role: "usuario"
  });

  const handleChange = (e) => {
    // Actualiza dinámicamente cualquier campo del formulario.
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // Calcular fuerza de contraseña
  const getPasswordStrength = () => {
    const pwd = form.password;
    if (!pwd) return { strength: 0, label: "", color: "bg-slate-300" };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[!@#$%^&*]/.test(pwd)) strength++;
    
    const levels = [
      { strength: 0, label: "", color: "bg-slate-300" },
      { strength: 1, label: "Débil", color: "bg-red-500" },
      { strength: 2, label: "Regular", color: "bg-amber-500" },
      { strength: 3, label: "Buena", color: "bg-blue-500" },
      { strength: 4, label: "Muy Fuerte", color: "bg-emerald-500" }
    ];
    
    return levels[strength];
  };

  // Validar paso actual
  const validateStep = () => {
    setError("");

    if (currentStep === 1) {
      if (!form.firstName.trim()) {
        setError("El nombre es requerido");
        return false;
      }
      if (!form.lastName.trim()) {
        setError("El apellido es requerido");
        return false;
      }
      if (!form.email.includes("@")) {
        setError("Por favor ingresa un email válido");
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (!form.username.trim()) {
        setError("El usuario es requerido");
        return false;
      }
      if (form.username.length < 3) {
        setError("El usuario debe tener al menos 3 caracteres");
        return false;
      }
      if (!form.password) {
        setError("La contraseña es requerida");
        return false;
      }
      if (form.password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Las contraseñas no coinciden");
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      if (!form.institution.trim()) {
        setError("La institución es requerida");
        return false;
      }
      if (!form.department.trim()) {
        setError("El departamento es requerido");
        return false;
      }
      return true;
    }

    return true;
  };

  // Siguiente paso
  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  // Paso anterior
  const handlePrevious = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Enviar formulario
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("register/", {
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
        institution: form.institution,
        department: form.department,
        role: form.role
      });

      // Normaliza el nombre del rol para que frontend y backend usen la misma convención.
      const normalizedRole = form.role === "jefe_superior" ? "jefe" : form.role;
      const savedRoles = JSON.parse(localStorage.getItem("userRoles") || "{}");
      savedRoles[form.username] = normalizedRole;
      localStorage.setItem("userRoles", JSON.stringify(savedRoles));

      setLoading(false);
      setSuccess(true);

      if (isManagedCreation) {
        toast.success("Usuario creado correctamente");
        setTimeout(() => {
          navigate(backPath);
        }, 1200);
        return;
      }

      localStorage.setItem("username", form.username);
      localStorage.setItem("role", normalizedRole);
      localStorage.setItem("token", response.data?.access || response.data?.token || "registered");

      setUser({ ...response.data, username: form.username, role: normalizedRole });
      setRole(normalizedRole);
      toast.success("Cuenta creada correctamente");

      // Redireccionar según el rol del usuario recién creado.
      setTimeout(() => {
        const roleRoutes = {
          usuario: "/usuario",
          admin: "/admin",
          jefe: "/jefe"
        };
        const redirectPath = roleRoutes[normalizedRole] || "/usuario";
        navigate(redirectPath);
      }, 1500);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.username?.[0] ||
        err.response?.data?.email?.[0] ||
        "Error al registrar usuario";
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse" style={{animationDelay: '4s'}}></div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Logo/Header */}
        <div className="mb-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            {isManagedCreation && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                Modo administración
              </span>
            )}
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all">
              <span className="text-3xl">🧪</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">SIGIRL</h1>
            <p className="text-slate-600 font-medium">
              {isManagedCreation ? "Crear nuevo usuario sin salir del panel" : "Crea tu cuenta en 3 pasos"}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 rounded-[24px] border border-emerald-100 bg-white/80 p-5 shadow-sm">
          <div className="flex justify-between mb-3 gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span className={currentStep >= 1 ? 'text-emerald-700' : 'text-slate-400'}>Datos</span>
            <span className={currentStep >= 2 ? 'text-emerald-700' : 'text-slate-400'}>Seguridad</span>
            <span className={currentStep >= 3 ? 'text-emerald-700' : 'text-slate-400'}>Rol</span>
          </div>
        </div>

        {/* Card */}
        <div className="sigirl-form-surface rounded-[28px] p-8 md:p-10 transition-all duration-300">
          {isManagedCreation && !success && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Estás creando un usuario desde administración. Tu sesión actual se mantendrá activa y podrás volver al panel sin recargar.
            </div>
          )}
          {/* Error Message */}
          {error && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 backdrop-blur-sm border border-rose-200/50 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm shadow-rose-500/10 animate-in shake">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-rose-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 backdrop-blur-sm border border-emerald-200/50 rounded-xl p-4 mb-6 flex items-start gap-3 animate-in fade-in shadow-sm shadow-emerald-500/10">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-700 text-sm font-bold">¡Cuenta creada exitosamente!</p>
                <p className="text-emerald-600 text-xs mt-1">
                  {isManagedCreation
                    ? "Regresando al panel para seguir gestionando usuarios..."
                    : form.role === "usuario"
                      ? "Redirigiendo a tu panel de usuario..."
                      : form.role === "admin"
                        ? "Redirigiendo a tu panel de administrador..."
                        : "Redirigiendo a tu panel de jefe superior..."}
                </p>
              </div>
            </div>
          )}

          {!success && (
            <>
              {/* PASO 1: Información Personal */}
              {currentStep === 1 && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">👤 Información Personal</h2>
                  <p className="text-slate-500 text-sm mb-6">Cuéntanos quién eres</p>

                  <div className="space-y-4">
                    <div>
                      <label className="sigirl-form-label">Nombre</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="firstName" 
                          placeholder="Tu nombre" 
                          value={form.firstName}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="sigirl-form-label">Apellido</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="lastName" 
                          placeholder="Tu apellido" 
                          value={form.lastName}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="sigirl-form-label">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="email" 
                          placeholder="tu@email.com" 
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 2: Seguridad */}
              {currentStep === 2 && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">🔒 Seguridad</h2>
                  <p className="text-slate-500 text-sm mb-6">Elige un usuario y contraseña segura</p>

                  <div className="space-y-4">
                    <div>
                      <label className="sigirl-form-label">Usuario</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="username" 
                          placeholder="Tu usuario único" 
                          value={form.username}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="sigirl-form-label">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="password" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Mínimo 6 caracteres" 
                          value={form.password}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {form.password && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[...Array(4)].map((_, i) => (
                              <div
                                key={i}
                                className={`flex-1 h-1 rounded-full transition-all ${
                                  i < passwordStrength.strength 
                                    ? passwordStrength.color 
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-xs font-medium ${
                            passwordStrength.strength === 4 ? 'text-emerald-600' :
                            passwordStrength.strength === 3 ? 'text-blue-600' :
                            passwordStrength.strength === 2 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            Fuerza: {passwordStrength.label}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="sigirl-form-label">Confirmar Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="confirmPassword" 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Repite tu contraseña" 
                          value={form.confirmPassword}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {form.confirmPassword && form.password === form.confirmPassword && (
                        <p className="text-xs text-emerald-600 font-medium mt-1">✓ Las contraseñas coinciden</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 3: Institución y Rol */}
              {currentStep === 3 && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">🏢 Institución y Rol</h2>
                  <p className="text-slate-500 text-sm mb-6">Completa tu información de institución</p>

                  <div className="space-y-4">
                    <div>
                      <label className="sigirl-form-label">Institución/Laboratorio</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="institution" 
                          placeholder="Ej: Laboratorio Central" 
                          value={form.institution}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="sigirl-form-label">Departamento</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input 
                          name="department" 
                          placeholder="Ej: Análisis Químico" 
                          value={form.department}
                          onChange={handleChange}
                          className="sigirl-form-control sigirl-form-control-icon"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3 uppercase tracking-wide">Tu Rol</label>
                      <div className="grid gap-4">
                        {roleOptions.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setForm({ ...form, role: item.value })}
                            className={`sigirl-form-option text-left transition-all ${
                              form.role === item.value
                                ? "border-emerald-500 bg-emerald-50 shadow-md"
                                : "border border-slate-200 bg-white/80 hover:border-emerald-300"
                            }`}
                          >
                            <p className="text-sm font-bold text-slate-800">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {isManagedCreation
                          ? sessionRole === 'jefe'
                            ? 'Desde jefatura puedes asignar todos los roles del sistema.'
                            : 'Desde administración solo puedes crear usuarios y administradores.'
                          : 'El registro público crea cuentas de tipo usuario.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de Navegación */}
              <div className="flex flex-col-reverse sm:flex-row gap-4 mt-8">
                <button 
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || loading}
                  className="sigirl-btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                
                {currentStep < 3 ? (
                  <button 
                    onClick={handleNext}
                    disabled={loading}
                    className="sigirl-btn-primary flex-1 disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="sigirl-btn-primary flex-1 disabled:opacity-50"
                  >
                    {loading ? "Creando..." : "✓ Crear Cuenta"}
                  </button>
                )}
              </div>

              <div className="border-t border-emerald-100/30 pt-6 mt-8">
                <p className="text-center text-slate-600 text-sm">
                  ¿Ya tienes cuenta? 
                  <Link to="/login" className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-bold hover:opacity-80 ml-1 transition-opacity">Inicia sesión aquí</Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-8 font-medium">
          © 2024 SIGIRL. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}

export default Register;