import axios from "axios";

// Cliente HTTP central del frontend.
// Todas las solicitudes al backend pasan por esta instancia.
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// Interceptor de salida:
// agrega automáticamente el token a cada solicitud privada.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const requestUrl = config.url || "";
  const isPublicRoute = ["token/", "register/"].some((route) => requestUrl.includes(route));

  if (token && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!token && !isPublicRoute) {
    console.warn("Sesión no encontrada para esta solicitud");
  }

  return config;
});

// Interceptor de entrada:
// detecta errores de autenticación y obliga a volver al login si el token expiró.
api.interceptors.response.use(
  response => response,
  error => {
    const requestUrl = error.config?.url || "";
    const isPublicRoute = ["token/", "register/"].some((route) => requestUrl.includes(route));

    if (error.response?.status === 401 && !isPublicRoute) {
      console.error("❌ 401 - Token inválido o expirado");
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else if (error.response?.status === 403) {
      import('react-toastify').then(({ toast }) => {
        toast.error('No tienes permiso para realizar esta acción.');
      });
    } else if (error.response?.status >= 500) {
      import('react-toastify').then(({ toast }) => {
        toast.error('Error interno del servidor. Intenta de nuevo.');
      });
    }
    return Promise.reject(error);
  }
);

// ── Productos ──────────────────────────────────────────────
export const getProductos   = ()         => api.get('productos/');
export const createProducto = (data)     => api.post('productos/', data);
export const updateProducto = (id, data) => api.patch(`productos/${id}/`, data);
export const deleteProducto = (id)       => api.delete(`productos/${id}/`);

// ── Pedidos ────────────────────────────────────────────────
export const getPedidos   = ()         => api.get('pedidos/');
export const createPedido = (data)     => api.post('pedidos/', data);
export const updatePedido = (id, data) => api.patch(`pedidos/${id}/`, data);
export const deletePedido = (id)       => api.delete(`pedidos/${id}/`);

// ── Alertas ────────────────────────────────────────────────
export const getAlertas   = ()         => api.get('alertas/');
export const createAlerta = (data)     => api.post('alertas/', data);
export const updateAlerta = (id, data) => api.patch(`alertas/${id}/`, data);
export const deleteAlerta = (id)       => api.delete(`alertas/${id}/`);

// ── Usuarios (gestión staff) ───────────────────────────────
export const getUsuarios   = ()         => api.get('usuarios/');
export const createUsuario = (data)     => api.post('usuarios/', data);
export const updateUsuario = (id, data) => api.patch(`usuarios/${id}/`, data);
export const deleteUsuario = (id)       => api.delete(`usuarios/${id}/`);

// ── Movimientos ───────────────────────────────────────────
export const getMovimientos    = ()         => api.get('movimientos/');
export const createMovimiento  = (data)     => api.post('movimientos/', data);

// ── Auditoría ──────────────────────────────────────────────
export const getAuditoria = (params = {}) => api.get('auditoria/', { params });

export default api;