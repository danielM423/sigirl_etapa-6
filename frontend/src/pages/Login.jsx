import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { resendVerificationEmail } from '../services/api';
import { UserContext } from '../context/UserContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const navigate = useNavigate();
  const { setUser, setRole } = useContext(UserContext);

  const handleLogin = async () => {
    setError('');
    setResendStatus('');
    setNeedsVerification(false);

    if (!username.trim() || !password) {
      setError('Ingresa usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('token/', { username: username.trim(), password });

      const savedRoles = JSON.parse(localStorage.getItem('userRoles') || '{}');
      let userRole = res.data?.role || res.data?.user?.role || savedRoles[username] || 'usuario';
      if (userRole === 'jefe_superior') userRole = 'jefe';

      localStorage.setItem('token', res.data.access || res.data.token || 'authenticated');
      localStorage.setItem('username', username.trim());
      localStorage.setItem('role', userRole);

      setUser({ username: username.trim(), role: userRole });
      setRole(userRole);

      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'jefe') navigate('/jefe');
      else navigate('/usuario');
    } catch (err) {
      const data = err.response?.data || {};
      if (data.email_not_verified) {
        setNeedsVerification(true);
        setError(data.error || 'Debes verificar tu correo antes de iniciar sesión.');
      } else {
        setError(data.error || 'Credenciales incorrectas.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('');
    try {
      const res = await resendVerificationEmail({ username: username.trim() });
      setResendStatus(res.data?.mensaje || 'Revisa tu bandeja de entrada para continuar.');
    } catch (err) {
      setResendStatus(err.response?.data?.error || 'No fue posible reenviar el correo de verificación.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[radial-gradient(circle_at_top_left,_#d9f3e8_0%,_#f1f8f5_45%,_#e6f4ee_100%)]">
      <div className="w-full max-w-md bg-white/90 border border-[#d2e8de] rounded-2xl shadow-[0_16px_40px_rgba(16,102,69,0.12)] p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wider text-[#0f7a53]">SIGIRL</h1>
          <p className="text-sm text-stone-600 mt-2">Acceso al sistema de inventarios y reactivos</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {needsVerification && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Tu cuenta existe, pero aún no has verificado el correo.</p>
            <button
              type="button"
              onClick={handleResendVerification}
              className="mt-2 text-xs font-semibold text-[#0f7a53] hover:text-[#0b5f40]"
            >
              Reenviar correo de verificación
            </button>
            {resendStatus && <p className="text-xs mt-2 text-stone-600">{resendStatus}</p>}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-stone-600 mb-1">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1fa971]/30 focus:border-[#1fa971]"
              placeholder="Ingresa tu usuario"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-600 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1fa971]/30 focus:border-[#1fa971]"
              placeholder="Ingresa tu contraseña"
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-6 py-2.5 rounded-lg bg-[#1fa971] hover:bg-[#157a55] text-white font-semibold transition-colors disabled:opacity-60"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className="text-center text-xs text-stone-500 mt-5">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#0f7a53] hover:underline font-semibold">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
