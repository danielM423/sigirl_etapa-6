import { createContext, useState, useEffect } from "react";

// Contexto global de autenticación.
// Desde aquí se comparte el usuario logueado y su rol en toda la app.
export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'usuario', 'admin', 'jefe_superior'

  useEffect(() => {
    // Al cargar la aplicación, se intenta reconstruir la sesión
    // usando los datos guardados en localStorage.
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const userRole = localStorage.getItem("role"); // 'usuario', 'admin', 'jefe_superior'

    if (token && username && userRole) {
      setUser({ username, nombre: username });
      setRole(userRole);
    }
  }, []);

  useEffect(() => {
    if (user?.username) {
      localStorage.setItem("username", user.username);
    } else {
      localStorage.removeItem("username");
    }
  }, [user]);

  useEffect(() => {
    if (role) {
      localStorage.setItem("role", role);
    } else {
      localStorage.removeItem("role");
    }
  }, [role]);

  const logout = () => {
    // Cierra la sesión tanto en memoria como en el navegador.
    setUser(null);
    setRole(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
  };

  return (
    <UserContext.Provider value={{ user, role, setUser, setRole, logout }}>
      {children}
    </UserContext.Provider>
  );
}
