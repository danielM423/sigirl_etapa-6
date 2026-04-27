import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import ProtectedRouteByRole from './components/ProtectedRouteByRole';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas de autenticación
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

// Dashboards por rol
import UsuarioDashboard from './pages/UsuarioDashboard';
import AdminDashboard from './pages/AdminDashboard';
import JefeSuperiorDashboard from './pages/JefeSuperiorDashboard';

// Perfil de usuario
import Perfil from './pages/Perfil';
import Usuarios from './pages/Usuarios';
import Alertas from './pages/Alertas';
import Reportes from './pages/Reportes';

// Páginas antiguas (mantener compatibilidad)
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Pedidos from './pages/pedidos';

function App() {
  return (
    <Router>
      {/* UserProvider envuelve toda la app para que cualquier vista
          pueda acceder al usuario autenticado y a su rol. */}
      <UserProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />

          {/* Dashboards por rol */}
          <Route
            path="/usuario"
            element={
              <ProtectedRouteByRole requiredRoles={['usuario']}>
                <UsuarioDashboard />
              </ProtectedRouteByRole>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRouteByRole requiredRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRouteByRole>
            }
          />
          <Route
            path="/jefe"
            element={
              <ProtectedRouteByRole requiredRoles={['jefe']}>
                <JefeSuperiorDashboard />
              </ProtectedRouteByRole>
            }
          />

          {/* Rutas antiguas (compatibilidad) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario"
            element={
              <ProtectedRoute>
                <Inventario />
              </ProtectedRoute>
            }
          />
          <Route path="/pedidos"
            element={
              <ProtectedRoute>
                <Pedidos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRouteByRole requiredRoles={['admin', 'jefe']}>
                <Usuarios />
              </ProtectedRouteByRole>
            }
          />
          <Route
            path="/alertas"
            element={
              <ProtectedRouteByRole requiredRoles={['admin', 'jefe']}>
                <Alertas />
              </ProtectedRouteByRole>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRouteByRole requiredRoles={['admin', 'jefe']}>
                <Reportes />
              </ProtectedRouteByRole>
            }
          />

          {/* Redirección por defecto */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;