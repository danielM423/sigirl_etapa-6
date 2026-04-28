# VERIFICACIÓN DE FUNCIONALIDADES - SIGIRL

## 📋 MATRIZ DE PERMISOS

| Acción | Admin | Jefe | Usuario |
|--------|-------|------|---------|
| **Ver productos** | ✅ | ✅ | ✅ |
| **Agregar producto** | ✅ | ✅ | ❌ |
| **Editar producto** | ✅ | ✅ | ❌ |
| **Eliminar producto** | ✅ | ✅ | ❌ |
| **Ver todos los pedidos** | ✅ | ✅ | Solo los suyos |
| **Crear pedido** | ✅ | ✅ | ✅ |
| **Aceptar/Rechazar pedido** | ✅ | ✅ | ❌ |
| **Ver categorías** | ✅ | ✅ | ✅ |
| **Crear categoría** | ✅ | ✅ | ❌ |
| **Ver movimientos** | ✅ | ✅ | ✅ |
| **Crear movimiento** | ✅ | ✅ | ❌ |
| **Descargar Excel** | ✅ | ✅ | ✅ |
| **Descargar PDF** | ✅ | ✅ | ✅ |
| **Crear usuario** | Solo admin* | ✅ | ❌ |
| **Editar rol usuario** | Solo admin* | ✅ | ❌ |
| **Gestionar auditoria** | ✅ | ✅ | ❌ |

*Admin puede crear/editar usuarios con rol "admin" o "usuario", pero NO "jefe".
Jefe puede crear/editar usuarios con cualquier rol (admin, jefe, usuario).

---

## 🔐 LÓGICA DE PERMISOS EN CÓDIGO

### UserProfile
- **Admin**: `is_staff=True`, `is_superuser=True`, `email_verified=True`
- **Jefe**: `is_staff=True`, `is_superuser=False`, `email_verified=True`
- **Usuario**: `is_staff=False`, `is_superuser=False`, `email_verified=True` (o False si requiere verificación)

### Endpoints y su lógica

#### ProductoViewSet
```python
permission_classes = [IsInventoryManagerOrReadOnly]
# Permite:
# - GET para todos autenticados
# - POST/PUT/DELETE solo si is_staff=True o is_superuser=True
```

#### PedidoViewSet
```python
permission_classes = [IsAuthenticated]
def update():
    if not (is_staff or is_superuser):  # Solo admin/jefe pueden aprobar
        return 403 Forbidden
```

#### UserManagementViewSet
```python
permission_classes = [IsStaffOrSuperuser]
# Solo admin puede agregar/editar usuarios
```

---

## ✅ QUÉ YA ESTÁ REPARADO

1. **Email verificación**: Desactivada por defecto (False) → acceso inmediato
2. **Admin permisos**: Migración 0014 obliga `is_staff=True` y `is_superuser=True`
3. **Jefe permisos**: Migración 0013 crea con `is_staff=True`
4. **Caracteres especiales**: Excel ahora con UTF-8 y acentos
5. **Login UX**: Mensajes claros para errores 401/500

---

## 🧪 PRUEBAS A HACER EN RENDER

### Paso 1: Login
```
1. Abre https://sigirl-etapa-6.onrender.com/login
2. Usuario: admin
3. Contraseña: [tu DJANGO_SUPERUSER_PASSWORD]
4. Espera redirección a /admin
```

### Paso 2: CRUD de Productos (Admin)
```
1. Ve a Admin → Inventario → Productos
2. Click en "+ Agregar Producto"
3. Llena: Nombre, Tipo, Categoría, Cantidad, Mínimo
4. Guarda
5. ✅ Debería crear (201) sin error 403
6. Intenta editar y eliminar también
```

### Paso 3: CRUD de Productos (Jefe)
```
1. Cierra sesión
2. Login como: jefe
3. Contraseña: [tu DJANGO_JEFE_PASSWORD]
4. Ve a Jefe → Inventario (si aplica)
5. Intenta agregar producto
6. ✅ Debería permitir (mismo que admin)
```

### Paso 4: CRUD de Pedidos (Ambos)
```
1. Como admin: Ve a Admin → Pedidos
2. Ve un pedido en estado "pendiente"
3. Click en editar
4. Cambia estado a "aprobado"
5. Guarda
6. ✅ Debería permitir (201) sin error 403
7. Repite como jefe
```

### Paso 5: CRUD de Usuarios (Solo Admin y Jefe)
```
1. Como admin: Ve a Admin → Usuarios
2. Click en "+ Agregar Usuario"
3. Llena formulario e intenta:
   - Crear con rol "usuario" → ✅ PERMITIDO
   - Crear con rol "admin" → ✅ PERMITIDO
   - Crear con rol "jefe" → ❌ PROHIBIDO (ver error 403)
4. Como jefe: intenta las mismas pruebas
   - Crear con rol "usuario" → ✅ PERMITIDO
   - Crear con rol "admin" → ✅ PERMITIDO
   - Crear con rol "jefe" → ✅ PERMITIDO (jefe sí puede)
5. Como usuario normal: intenta crear usuario
   - ❌ PROHIBIDO (ver error 403)
```

### Paso 6: Editar Rol de Usuario (Escalada de permisos)
```
1. Como admin: Ve a Admin → Usuarios
2. Elige un usuario existente y edita
3. Intenta cambiar rol a "jefe" → ❌ PROHIBIDO (error 403)
4. Intenta cambiar rol a "admin" → ✅ PERMITIDO
5. Como jefe: edita el mismo usuario
6. Intenta cambiar rol a "jefe" → ✅ PERMITIDO
7. Como usuario normal: edita usuario
   - ❌ PROHIBIDO (error 403)
```

### Paso 7: Descargas (Todos)
```
1. Ve a Reportes
2. Descarga Excel
3. ✅ Abre sin corrupción, acentos visibles
4. Descarga PDF
5. ✅ Abre sin errores
```

### Paso 8: Registro de Usuario (Cualquiera)
```
1. Ve a /register
2. Llena formulario con correo real (@gmail, @hotmail, etc)
3. Intenta registrar
4. ✅ Debería permitir y crear usuario con rol "usuario"
```

---

## 🚨 SI ALGO FALLA

### 403 en Productos
```
Causa: usuario no tiene is_staff=True
Solución: Verifica en admin/django que el usuario tenga is_staff=True
```

### 403 en Usuarios
```
Causa: solo admin puede agregar usuarios
Solución: Espera; jefe NO debe poder (retorna 403 correcto)
```

### 500 al crear pedido
```
Causa: posible error de validación o campos faltantes
Solución: Revisa console del navegador (Network tab) → copia JSON de respuesta
```

### Caracteres corruptos en Excel
```
Causa: encoding no es UTF-8
Solución: Ya está reparado en v26b065a
```

---

## 📊 Estado de Migraciones

```
0012_userprofile_attempts_db_default        ✅
0013_seed_default_access_users              ✅
0014_ensure_admin_is_staff                  ✅
```

Si alguna no aparece en logs de Render, el deploy no aplicó la últimas 3 migraciones.
