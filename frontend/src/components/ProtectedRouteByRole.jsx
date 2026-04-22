import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';

// Este componente protege rutas según el rol permitido.
// Si el usuario no cumple el rol requerido, se redirige automáticamente.
const ProtectedRouteByRole = ({ children, requiredRoles }) => {
  const { role } = useContext(UserContext);
  const storedRole = role || localStorage.getItem('role');
  const normalizedRole = storedRole === 'jefe_superior' ? 'jefe' : storedRole;

  if (!normalizedRole) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredRoles.includes(normalizedRole)) {
    if (normalizedRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (normalizedRole === 'jefe') {
      return <Navigate to="/jefe" replace />;
    } else {
      return <Navigate to="/usuario" replace />;
    }
  }

  return children;
};

export default ProtectedRouteByRole;
