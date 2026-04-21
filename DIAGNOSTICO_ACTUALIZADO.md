# DIAGNÓSTICO ACTUALIZADO — SIGIRL
**Fecha:** 21 de abril de 2026  
**Estado general del sistema:** ✅ Operativo

---

## 1. ARQUITECTURA GENERAL

| Capa | Tecnología | Estado |
|---|---|---|
| Backend | Django 4.2.7 + DRF + SimpleJWT | ✅ Funcionando |
| Frontend | React 18 + Vite 8 + TailwindCSS | ✅ Funcionando |
| Base de datos | SQLite (dev) | ✅ Migrada |
| Autenticación | JWT (`rest_framework_simplejwt`) | ✅ Corregida |
| Estilos | TailwindCSS + clases personalizadas | ✅ OK |

---

## 2. RUTAS Y PUERTOS

| Servicio | URL |
|---|---|
| Backend Django | `http://127.0.0.1:8000/` |
| Frontend Vite | `http://127.0.0.1:5173/` |
| Login endpoint | `POST http://127.0.0.1:8000/api/token/` |
| Refresh token | `POST http://127.0.0.1:8000/api/token/refresh/` |
| Registro | `POST http://127.0.0.1:8000/api/register/` |
| Perfil de usuario | `GET/PUT http://127.0.0.1:8000/api/auth/profile/` |

---

## 3. CÓMO INICIAR EL SISTEMA

### Backend
```powershell
# Desde la raíz del proyecto
cd sigirl
..\.venv\Scripts\python manage.py runserver 8000
```

### Frontend
```powershell
# Desde la raíz del proyecto
cd frontend
npm run dev
```

---

## 4. USUARIOS DE PRUEBA

| Usuario | Contraseña | Rol | Panel |
|---|---|---|---|
| `admin` | `demo` | Administrador | `/admin` |
| `jefe` | `demo` | Jefe Superior | `/jefe` |
| `user` | `demo` | Usuario | `/usuario` |

> Usuarios adicionales en DB: `daniel` (staff), `alex` (staff)

---

## 5. ESTRUCTURA DE ARCHIVOS CLAVE

```
sigirl/                          ← Proyecto Django
  sigirl/
    settings.py                  ← Configuración principal
    urls.py                      ← Rutas globales
  inventario/
    models.py                    ← Modelos: Producto, Pedido, Alerta, UserProfile…
    views.py                     ← Vistas REST + PublicTokenObtainPairView
    serializers.py               ← Serializadores DRF
    urls.py                      ← Rutas de la app inventario

frontend/src/
  pages/
    Login.jsx                    ← Formulario de login (usa axios directo)
    AdminDashboard.jsx           ← Panel administrador (inventario/pedidos/alertas)
    JefeSuperiorDashboard.jsx    ← Panel jefe (pedidos/usuarios/alertas)
    UsuarioDashboard.jsx         ← Panel usuario (mis pedidos)
    Dashboard.jsx                ← Dashboard ejecutivo con métricas
  services/
    api.js                       ← Cliente Axios centralizado con interceptores
  utils/
    sigirlStorage.js             ← Gestión localStorage + sync con API
    reportExport.js              ← Exportación Excel/PDF
  context/
    AuthContext.js               ← Contexto de autenticación
    UserContext.jsx              ← Contexto de usuario/rol
  components/
    Layout.jsx                   ← Layout principal con Sidebar
    Sidebar.jsx                  ← Navegación lateral
    ReportPanel.jsx              ← Panel de reportes con gráficas
    ProtectedRoute.jsx           ← Ruta protegida por autenticación
    ProtectedRouteByRole.jsx     ← Ruta protegida por rol
```

---

## 6. BUGS RESUELTOS EN ESTA SESIÓN

### BUG 1 — Django auth corrompido
- **Causa:** `.venv/Lib/site-packages/django/contrib/auth/models.py` tenía código del proyecto inyectado al inicio.
- **Solución:** `pip install --force-reinstall django==4.2.7`

### BUG 2 — Modelo `Alerta` faltante
- **Causa:** `views.py` importaba `Alerta` pero el modelo no existía en `models.py`.
- **Solución:** Se añadió el modelo `Alerta` con campos `tipo`, `producto (FK)`, `mensaje`, `resuelta`, `fecha`.

### BUG 3 — Migraciones rotas
- **Causa:** Base de datos en estado inconsistente después del reinicio.
- **Solución:** Eliminación de la DB, `makemigrations` + `migrate` desde cero.

### BUG 4 — React: `key` duplicada en Dashboard
- **Causa:** Múltiples `.map()` en el mismo árbol de render usando `key={index}`.
- **Solución:** Claves compuestas: `tooltip-{name}-{index}`, `donut-cell-{name}-{index}`, etc.

### BUG 5 — Login 401 Unauthorized (primera causa)
- **Causa:** El interceptor de `api.js` enviaba el token almacenado (`Authorization: Bearer`) incluso en el endpoint `/api/token/`, causando que Django rechazara la petición.
- **Solución:** El interceptor ahora omite el header en rutas públicas (`token/`, `register/`).

### BUG 6 — Login 401 Unauthorized (causa raíz en Django)
- **Causa:** `JWTAuthentication` se ejecuta **antes** que las verificaciones de permisos. Aunque `PublicTokenObtainPairView` tenía `AllowAny`, si el navegador enviaba cualquier token inválido/expirado, DRF lanzaba `AuthenticationFailed` antes de llegar al permiso.
- **Solución:** Se añadió `authentication_classes = []` a `PublicTokenObtainPairView` y `PublicTokenRefreshView` en `sigirl/inventario/views.py`.

### BUG 7 — Login: `api.js` cacheado en el navegador
- **Causa:** Vite HMR no actualizó `api.js` en el navegador tras el fix del interceptor.
- **Solución:** `Login.jsx` ahora usa `axios` directamente (sin el cliente compartido) para el POST de login.

### BUG 8 — React: `key` duplicada en JefeSuperiorDashboard (usuarios)
- **Causa:** `usuariosStore` podía contener IDs duplicados en localStorage tras actualizaciones concurrentes del estado.
- **Solución:** Deduplicación por `id` en el `hydrate` del `useEffect` de `JefeSuperiorDashboard.jsx`.

---

## 7. CONFIGURACIÓN DJANGO RELEVANTE

### `sigirl/sigirl/settings.py`
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
}

CORS_ALLOW_ALL_ORIGINS = True
AUTH_USER_MODEL = 'auth.User'  # Modelo estándar de Django
```

### `sigirl/inventario/views.py` — Vistas públicas de auth
```python
class PublicTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    authentication_classes = []   # ← CRÍTICO: evita 401 con tokens viejos

class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []
```

---

## 8. FLUJO DE AUTENTICACIÓN (corregido)

```
Navegador
  │
  ├── POST /api/token/ {username, password}
  │     └── Login.jsx usa axios puro (sin interceptor)
  │
  └── Django: PublicTokenObtainPairView
        ├── authentication_classes = [] → no evalúa tokens viejos
        ├── permission_classes = [AllowAny] → permite acceso sin autenticar
        └── Retorna {access, refresh, role, username, ...}

Frontend
  └── Guarda {token, username, role} en localStorage
  └── Redirige según rol: /admin | /jefe | /usuario
```

---

## 9. PRÓXIMOS PASOS SUGERIDOS

- [ ] Conectar `UsuarioDashboard` al backend para pedidos reales (actualmente usa localStorage)
- [ ] Implementar refresh automático del token JWT cuando expire
- [ ] Validar permisos por rol en el backend (actualmente `IsStaffForWrites` cubre escritura)
- [ ] Configurar PostgreSQL para producción (reemplazar SQLite)
- [ ] Configurar `CORS_ALLOWED_ORIGINS` con dominios específicos para producción
- [ ] Añadir tests unitarios para los serializers y vistas principales
