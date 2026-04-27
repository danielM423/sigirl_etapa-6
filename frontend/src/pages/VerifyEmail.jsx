import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resendVerificationEmail, verifyEmailToken } from '../services/api';

function VerifyEmail() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Validando enlace de verificación...');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await verifyEmailToken(uid, token);
        setStatus('success');
        setMessage(res.data?.mensaje || 'Correo verificado correctamente.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'No fue posible verificar el correo.');
      }
    };

    run();
  }, [uid, token]);

  const handleResend = async () => {
    try {
      const res = await resendVerificationEmail({ email });
      setMessage(res.data?.mensaje || 'Se reenviaron instrucciones de verificación.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'No se pudo reenviar el correo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top_right,_#d9f3e8_0%,_#f4faf7_40%,_#e6f4ee_100%)]">
      <div className="w-full max-w-lg bg-white/95 border border-[#d2e8de] rounded-2xl shadow-[0_16px_40px_rgba(16,102,69,0.12)] p-8">
        <h1 className="text-2xl font-bold text-[#0f7a53] text-center">Verificación de correo</h1>
        <p className="text-center text-sm text-stone-600 mt-3">{message}</p>

        {status === 'loading' && <p className="text-center text-xs text-stone-500 mt-4">Espera un momento...</p>}

        {status === 'success' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded bg-[#1fa971] hover:bg-[#157a55] text-white text-sm"
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 border border-amber-200 bg-amber-50 rounded-lg p-4">
            <p className="text-xs text-amber-700 mb-2">Puedes solicitar un nuevo correo de verificación:</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@dominio.com"
                className="flex-1 px-3 py-2 rounded border border-stone-300 text-sm"
              />
              <button
                type="button"
                onClick={handleResend}
                className="px-3 py-2 rounded bg-[#1fa971] hover:bg-[#157a55] text-white text-sm"
              >
                Reenviar
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-stone-500">
          <Link to="/login" className="text-[#0f7a53] hover:underline">Volver al login</Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
