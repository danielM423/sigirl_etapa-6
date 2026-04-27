import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Users, 
  AlertTriangle,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  FlaskConical
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, role } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const normalizedRole = role === 'jefe_superior' ? 'jefe' : role;

  const isAdmin = normalizedRole === 'admin';
  const isJefe = normalizedRole === 'jefe';

  // Avatar reactivo: se actualiza cuando cambia el usuario o la ruta
  const username = user?.username || localStorage.getItem('username') || '';
  const [avatarSrc, setAvatarSrc] = useState(() => localStorage.getItem(`sigirl_avatar:${username}`) || '');

  // Re-leer avatar si el username o la ruta cambia (al volver de Perfil)
  useEffect(() => {
    const stored = localStorage.getItem(`sigirl_avatar:${username}`) || '';
    setAvatarSrc(stored);
  }, [username, location.pathname]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['admin', 'jefe', 'usuario'] },
    { path: '/inventario', label: 'Inventario', icon: <Package className="w-4 h-4" />, roles: ['admin', 'jefe', 'usuario'] },
    { path: '/pedidos', label: 'Pedidos', icon: <ClipboardList className="w-4 h-4" />, roles: ['admin', 'jefe', 'usuario'] },
    { path: '/usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" />, roles: ['admin', 'jefe'] },
    { path: '/alertas', label: 'Alertas', icon: <AlertTriangle className="w-4 h-4" />, roles: ['admin', 'jefe'] },
    { path: '/reportes', label: 'Reportes', icon: <FileText className="w-4 h-4" />, roles: ['admin', 'jefe'] },
    { path: '/perfil', label: 'Perfil', icon: <User className="w-4 h-4" />, roles: ['admin', 'jefe', 'usuario'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(normalizedRole));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-[#E0E0E0] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex justify-between items-center px-3 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-[#1FA971] hover:text-[#157A55] transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-[#E8F5F0] border border-[#1FA971]/20 shadow-sm">
                <FlaskConical className="w-5 h-5 text-[#1FA971]" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-extrabold tracking-widest font-mono bg-gradient-to-r from-[#1FA971] via-[#157A55] to-emerald-400 bg-clip-text text-transparent leading-none">
                  SIGIRL
                </h1>
                <p className="text-[8px] text-stone-400 font-mono hidden md:block leading-tight mt-0.5 max-w-[220px]">
                  Sistema de Información para la Gestión de Investigación del Laboratorio
                </p>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1FA971] shadow-[0_0_6px_#1FA971] animate-pulse"></span>
              <span className="text-[10px] text-[#1FA971] font-mono uppercase tracking-wider">SYSTEM ONLINE</span>
            </div>
            
            <div className="w-px h-6 bg-stone-200 hidden md:block"></div>
            
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full border-2 border-[#1FA971]/40 overflow-hidden flex-shrink-0 shadow-sm">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#E8F5F0] flex items-center justify-center">
                    <span className="text-sm font-extrabold text-[#157A55] font-mono">
                      {(user?.nombre || username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-stone-700 font-mono leading-none">
                  {user?.nombre || username || 'Usuario'}
                </p>
                <p className="text-[9px] text-[#1FA971] font-mono uppercase tracking-wider mt-0.5">
                  {normalizedRole === 'admin' ? 'Administrador' : normalizedRole === 'jefe' ? 'Jefe Superior' : 'Usuario'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar + Main Content */}
      <div className="flex pt-[57px]">
        {/* Backdrop móvil para cerrar sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[9] bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed z-10
          w-64 h-[calc(100vh-57px)] 
          bg-[#F0F4F2] border-r border-[#E0E0E0]
          transition-transform duration-300 ease-in-out
          overflow-y-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-1">
            <div className="mb-5 px-2 pt-2 pb-4 border-b border-[#D8E8E0]">
              <div className="text-center text-[11px] font-mono text-[#1FA971]/70">
                SO₃OH · NaOH · HCl
              </div>
            </div>
            
            {filteredNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg
                  transition-all font-mono text-sm
                  ${location.pathname === item.path 
                    ? 'bg-[#E8F5F0] text-[#157A55] border-l-[3px] border-[#1FA971] font-semibold pl-[13px]' 
                    : 'text-stone-600 hover:text-[#1FA971] hover:bg-[#E8F5F0]/70'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            
            <div className="pt-4 mt-4 border-t border-[#D8E8E0]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all font-mono text-sm w-full"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 overflow-auto lg:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;