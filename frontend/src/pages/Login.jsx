import { useState, useContext } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { Eye, EyeOff, FlaskConical, Shield, Lock, Mail } from "lucide-react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setRole } = useContext(UserContext);

  const handleLogin = () => {
    setError("");
    setLoading(true);
    
    api.post("token/", { username, password })
      .then(res => {
        console.log("✅ Login exitoso");

        const savedRoles = JSON.parse(localStorage.getItem("userRoles") || "{}");

        let userRole =
          res.data?.role ||
          res.data?.user?.role ||
          savedRoles[username] ||
          "usuario";

        if (userRole === "jefe_superior") {
          userRole = "jefe";
        }

        localStorage.setItem("token", res.data.access || res.data.token || "authenticated");
        localStorage.setItem("username", username);
        localStorage.setItem("role", userRole);

        setUser({ username, role: userRole });
        setRole(userRole);
        
        setTimeout(() => {
          if (userRole === 'admin') {
            navigate('/admin');
          } else if (userRole === 'jefe') {
            navigate('/jefe');
          } else {
            navigate('/usuario');
          }
        }, 100);
      })
      .catch(err => {
        console.error("❌ Error en login:", err);
        setError("Credenciales incorrectas");
        setLoading(false);
      });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#f5f0e8' }}>
      {/* Grid de fondo sutil */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.03) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }}></div>
      
      {/* Círculos decorativos — ocultos en móvil para evitar overflow */}
      <div className="hidden sm:block absolute top-20 left-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="hidden sm:block absolute bottom-20 right-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>

      <div className="relative z-10 w-full max-w-[480px]">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-lg bg-emerald-100 border border-emerald-200 mb-4">
            <FlaskConical className="w-12 h-12 text-[#1FA971]" />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-[#157A55] font-mono">SIGIRL</h1>
          <p className="text-[10px] text-stone-500 font-mono mt-1 tracking-wider">
            SISTEMA DE GESTIÓN DE INVENTARIOS Y REACTIVOS
          </p>
          <div className="inline-block mt-4 px-4 py-1.5 font-serif text-sm font-semibold text-[#157A55] bg-[#E8F5F0] rounded-md border-l-[3px] border-[#1FA971]">
            SO₃OH · NaOH · HCl · C₂H₅OH
          </div>
        </div>

        {/* Card de Login */}
        <div className="bg-white border border-[#E0E0E0] rounded-xl relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#1FA971] via-[#4ade80] to-[#1FA971]"></div>
          
          <div className="absolute top-3 right-4 bg-stone-100 border border-stone-200 rounded-full px-2.5 py-0.5">
            <span className="text-[9px] font-mono text-emerald-600 font-semibold tracking-wider">SECURE v2.4</span>
          </div>
          
          <div className="p-8">
            <h2 className="text-xl font-bold text-[#157A55] font-mono mb-1">🔬 Acceso al sistema</h2>
            <p className="text-stone-500 text-xs mb-6 font-mono">Ingrese sus credenciales de laboratorio</p>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-md p-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow shadow-rose-500"></span>
                  <p className="text-rose-600 text-xs font-mono">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-[#E8F5F0] border border-[#1FA971]/20 rounded-lg p-3 mb-6">
              <p className="text-[#157A55] text-[9px] font-mono font-bold mb-1.5 tracking-wider">📋 CREDENCIALES DE DEMO:</p>
              <div className="space-y-1 text-[10px] font-mono">
                <p><span className="text-stone-500">admin</span> <span className="text-[#1FA971]">/ demo</span> → <span className="text-stone-500">Administrador</span></p>
                <p><span className="text-stone-500">jefe</span> <span className="text-[#1FA971]">/ demo</span> → <span className="text-stone-500">Jefe de laboratorio</span></p>
                <p><span className="text-stone-500">user</span> <span className="text-[#1FA971]">/ demo</span> → <span className="text-stone-500">Operador</span></p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] text-stone-500 font-mono mb-1.5 uppercase tracking-wider">
                  <Mail className="inline w-3 h-3 mr-1" /> USUARIO
                </label>
                <input 
                  placeholder="Ingrese su usuario" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#1FA971] focus:ring-1 focus:ring-[#1FA971]/30 text-sm font-mono text-stone-700 transition-all placeholder:text-stone-400"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-stone-500 font-mono mb-1.5 uppercase tracking-wider">
                  <Lock className="inline w-3 h-3 mr-1" /> CONTRASEÑA
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#1FA971] focus:ring-1 focus:ring-[#1FA971]/30 text-sm font-mono text-stone-700 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#1FA971] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-[#1FA971] hover:bg-[#157A55] text-white rounded-lg transition-all font-mono text-sm font-bold tracking-wider flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(31,169,113,0.35)] hover:shadow-[0_4px_14px_rgba(31,169,113,0.4)]"
            >
              {loading ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 shadow shadow-emerald-300 animate-pulse"></span>
                  AUTENTICANDO...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  INGRESAR AL SISTEMA →
                </>
              )}
            </button>

            <div className="mt-6 pt-4 border-t border-stone-100 text-center">
              <p className="text-[10px] text-stone-500 font-mono">
                ¿No tienes cuenta?{' '}
                <a href="/register" className="text-[#1FA971] hover:text-[#157A55] hover:underline">
                  Regístrate aquí
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="flex justify-center items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#1FA971] shadow-[0_0_6px_#1FA971] animate-pulse"></span>
            <span className="text-[8px] text-stone-400 font-mono tracking-wider">SYSTEM ONLINE</span>
            <span className="w-px h-3 bg-stone-300"></span>
            <span className="text-[8px] text-stone-400 font-mono tracking-wider">256-BIT ENCRYPTION</span>
          </div>
          <p className="text-[8px] text-stone-400 font-mono tracking-wider">
            SIGIRL v2.4.0 // REAGENT TRACKING SYSTEM // © 2024
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;