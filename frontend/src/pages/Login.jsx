// Pantalla de inicio de sesión del sistema.
// Valida datos, solicita el token al backend y redirige al panel correcto.
import { useState, useContext } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

const normalizeRole = (role) => (role === "jefe_superior" ? "jefe" : role || "usuario");

function Login() {
  // Estados locales del formulario de inicio de sesión.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setUser, setRole } = useContext(UserContext);

  // Envía las credenciales al backend y guarda la sesión en el navegador.
  const handleLogin = () => {
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Completa usuario y contraseña");
      toast.error("Completa usuario y contraseña");
      return;
    }

    axios.post("http://127.0.0.1:8000/api/token/", { username, password })
      .then(async res => {
        console.log("✅ Login exitoso");

        const token = res.data.access || res.data.token || "authenticated";
        const backendRole = normalizeRole(res.data?.role || res.data?.user?.role);
        localStorage.setItem("token", token);
        localStorage.setItem("username", res.data?.username || username);

        // Consultar el perfil para rehidratar la sesión sin perder el rol del login.
        let userRole = backendRole;
        try {
          const profileRes = await axios.get("http://127.0.0.1:8000/api/auth/profile/", {
            headers: { Authorization: `Bearer ${token}` }
          });
          userRole = normalizeRole(profileRes.data?.role || backendRole);
        } catch {
          userRole = backendRole;
        }

        localStorage.setItem("role", userRole);
        setUser({ ...res.data, username: res.data?.username || username, role: userRole });
        setRole(userRole);
        toast.success("Inicio de sesión exitoso");

        if (userRole === 'admin') {
          navigate('/admin');
        } else if (userRole === 'jefe') {
          navigate('/jefe');
        } else {
          navigate('/usuario');
        }
      })
      .catch(err => {
        console.error("❌ Error en login:", err);
        setError("Credenciales incorrectas");
        toast.error("Credenciales incorrectas");
      });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse" style={{animationDelay: '4s'}}></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">SIGIRL</h1>
          <p className="text-slate-600 font-medium">Sistema de Gestión de Inventarios y Reactivos</p>
        </div>

        {/* Card */}
        <div className="sigirl-form-surface rounded-[28px] p-8 md:p-10 transition-all duration-300">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">Bienvenido</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresa con tu cuenta para acceder a tu panel.</p>

          {error && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 backdrop-blur-sm border border-rose-200/50 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm shadow-rose-500/10">
              <span className="text-rose-600 text-xl flex-shrink-0">⚠️</span>
              <p className="text-rose-700 text-sm font-medium">{error}</p>
            </div>
          )}


          <div className="space-y-6 mb-8">
                  <div>
                    <label className="sigirl-form-label">
                      Usuario
                    </label>
                    <input 
                      placeholder="Tu usuario" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="sigirl-form-control"
                    />
                  </div>
                  
                  <div>
                    <label className="sigirl-form-label">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Tu contraseña" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="sigirl-form-control pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

          <button 
            onClick={handleLogin}
            className="sigirl-btn-primary w-full mb-6"
          >
            Ingresar
          </button>

          <div className="border-t border-emerald-100/30 pt-6">
            <p className="text-center text-slate-600 text-sm">
              ¿No tienes cuenta? 
              <a href="/register" className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-bold hover:opacity-80 ml-1 transition-opacity">Regístrate aquí</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-8 font-medium">
          © 2024 SIGIRL. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}

export default Login;