// ARCHIVO 2: src/components/Layout.jsx
import { useContext, useMemo, useState } from 'react';
import { Bell, LifeBuoy, Search, X, AlertCircle, HelpCircle, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from './Sidebar';
import { UserContext } from '../context/AuthContext';
import { createAlerta } from '../services/api';

const normalizeAlertType = (tipo) => (tipo === 'problema' || tipo === 'ayuda' ? 'otro' : tipo || 'otro');

const Layout = ({ children }) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpForm, setHelpForm] = useState({
    tipo: 'ayuda',
    prioridad: 'media',
    descripcion: '',
  });
  const { user, role } = useContext(UserContext);

  const roleLabel = useMemo(() => {
    if (role === 'admin') return 'Administrador';
    if (role === 'jefe' || role === 'jefe_superior') return 'Jefe Superior';
    return 'Usuario';
  }, [role]);

  const displayName = user?.full_name || user?.first_name || user?.username || 'Usuario';
  const avatarSrc = user?.profile?.avatar || user?.avatar || '';
  const initials = `${displayName?.[0] || 'U'}${displayName?.[1] || ''}`.toUpperCase();

  const handleHelpSubmit = async () => {
    if (!helpForm.descripcion.trim()) {
      toast.error('Describe brevemente la alerta o la ayuda que necesitas.');
      return;
    }

    try {
      await createAlerta({
        tipo: normalizeAlertType(helpForm.tipo),
        prioridad: helpForm.prioridad,
        titulo: helpForm.tipo === 'problema' ? 'Reporte de problema en el sistema' : 'Solicitud de ayuda del usuario',
        descripcion: helpForm.descripcion.trim(),
        mensaje: helpForm.descripcion.trim(),
        remitente: user?.username || 'Usuario',
        resuelta: false,
      });
      setHelpForm({ tipo: 'ayuda', prioridad: 'media', descripcion: '' });
      setShowHelpModal(false);
      toast.success('Tu reporte fue enviado correctamente.');
    } catch {
      toast.error('No se pudo enviar el reporte. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex relative">
      {/* Fondo decorativo muy sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-100/15 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content - Centrado siempre */}
      <main className="flex-1 flex flex-col min-h-screen relative z-10 overflow-hidden">
        {/* Header Moderno y Limpio */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-8 py-5 shadow-sm">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-6">
            {/* Búsqueda */}
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="Buscar en el sistema..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-200 hover:border-slate-300"
                />
              </div>
            </div>

            {/* Acciones del Header */}
            <div className="flex items-center gap-5">
              {/* Badge de estado */}
              <span className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sistema Activo
              </span>

              {/* Notificaciones */}
              <button className="relative p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-200 hover:scale-105 active:scale-95">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              </button>

              {/* Perfil de usuario */}
              <div className="flex items-center gap-4 pl-5 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-500 font-medium">{roleLabel}</p>
                </div>
                <div className="relative group cursor-pointer">
                  {avatarSrc ? (
                    <img 
                      src={avatarSrc} 
                      alt="Avatar" 
                      className="h-11 w-11 rounded-xl object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-all duration-200" 
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-sm flex items-center justify-center border-2 border-white shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:scale-105">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de Ayuda */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Centro de Ayuda</span>
              </button>
            </div>
          </div>
        </header>

        {/* Contenido Principal - Centrado y con espaciado generoso */}
        <div className="flex-1 overflow-y-auto py-10 px-8">
          <div className="max-w-7xl mx-auto w-full space-y-10">
            {/* Welcome Banner limpio y profesional */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-10 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
              
              <div className="relative flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 opacity-90">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-sm font-medium tracking-wide">Panel Institucional</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">¡Hola, {displayName}!</h1>
                  <p className="text-emerald-50 text-lg leading-relaxed">
                    {roleLabel} • Sistema de Gestión Integral SIGIRL
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="h-10 w-10 text-white/70" />
                  </div>
                </div>
              </div>
            </div>

            {/* Children Content */}
            <div className="space-y-8">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Ayuda */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="sigirl-form-surface w-full max-w-2xl rounded-[28px] overflow-hidden animate-fade-in-up">
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md">
                  <LifeBuoy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Centro de Ayuda</h3>
                  <p className="text-sm text-slate-500 mt-1">Reporta problemas o solicita asistencia técnica</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-7 md:p-10 space-y-8">
              {/* Tipo de solicitud */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <button
                  onClick={() => setHelpForm({ ...helpForm, tipo: 'ayuda' })}
                  className={`p-6 rounded-xl border-2 text-center transition-all duration-200 ${
                    helpForm.tipo === 'ayuda'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors ${
                      helpForm.tipo === 'ayuda' ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}
                  >
                    <HelpCircle className={`h-6 w-6 ${helpForm.tipo === 'ayuda' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-sm font-semibold">Solicitar Ayuda</span>
                </button>
                <button
                  onClick={() => setHelpForm({ ...helpForm, tipo: 'problema' })}
                  className={`p-6 rounded-xl border-2 text-center transition-all duration-200 ${
                    helpForm.tipo === 'problema'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md'
                      : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors ${
                      helpForm.tipo === 'problema' ? 'bg-rose-100' : 'bg-slate-100'
                    }`}
                  >
                    <AlertCircle className={`h-6 w-6 ${helpForm.tipo === 'problema' ? 'text-rose-600' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-sm font-semibold">Reportar Problema</span>
                </button>
              </div>

              {/* Prioridad */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Nivel de Prioridad</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['baja', 'media', 'alta'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setHelpForm({ ...helpForm, prioridad: p })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                        helpForm.prioridad === p
                          ? p === 'alta'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-105'
                            : p === 'media'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105'
                              : 'bg-blue-500 text-white shadow-md shadow-blue-500/25 scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Descripción detallada
                </label>
                <textarea
                  value={helpForm.descripcion}
                  onChange={(e) => setHelpForm({ ...helpForm, descripcion: e.target.value })}
                  placeholder="Describe detalladamente tu solicitud o el problema encontrado..."
                  rows={5}
                  className="sigirl-form-control sigirl-form-textarea"
                />
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 px-8 py-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="sigirl-btn-secondary w-full sm:w-auto text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleHelpSubmit}
                className="sigirl-btn-primary w-full sm:w-auto text-sm"
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;