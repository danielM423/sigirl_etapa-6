# 📊 ANÁLISIS EXHAUSTIVO DEL SISTEMA SIGIRL

**Fecha de análisis:** Abril 24, 2026  
**Estado del proyecto:** 90% funcional - Backend y Frontend integrados

---

## 📑 TABLA DE CONTENIDOS

1. [Estructura General](#-estructura-general)
2. [Modelos de Datos](#-modelos-de-datos)
3. [Endpoints de API](#-endpoints-de-api)
4. [Componentes Frontend](#-componentes-frontend)
5. [Flujos de Negocio](#-flujos-de-negocio)
6. [Datos Críticos vs Opcionales](#-datos-críticos-vs-opcionales)
7. [Recomendación: Qué Importar desde Excel](#-recomendación-qué-importar-desde-excel)

---

## 🏗️ ESTRUCTURA GENERAL

### Arquitectura de 3 capas

```
┌─────────────────────────────────────────────────┐
│                 FRONTEND (React/Vite)           │
│  Inventario | Pedidos | Alertas | Reportes     │
└──────────────────────────┬──────────────────────┘
                           │
                    /api/* Routes
                           │
┌──────────────────────────▼──────────────────────┐
│         BACKEND (Django REST Framework)          │
│  ViewSets | Serializers | Authentication JWT   │
└──────────────────────────┬──────────────────────┘
                           │
┌──────────────────────────▼──────────────────────┐
│       BASE DE DATOS (SQLite/PostgreSQL)          │
│  Productos | Pedidos | Usuarios | Alertas      │
└─────────────────────────────────────────────────┘
```

### Tecnologías
- **Backend:** Django 4.x + Django REST Framework + JWT
- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Base de datos:** SQLite (dev) / PostgreSQL (producción - Railway)
- **Autenticación:** JWT con refresh tokens
- **Roles:** Admin (superuser) | Jefe (staff) | Usuario

---

## 💾 MODELOS DE DATOS

### 1. **Producto** (Reactivos, insumos, equipos)

| Campo | Tipo | Requerido | Descripción | Valores |
|-------|------|-----------|-------------|---------|
| `id` | Integer | Auto | Identificador único | PK |
| `nombre` | String(150) | ✅ | Nombre del reactivo/insumo | Ej: "Ácido Sulfúrico" |
| `tipo` | Choice | ✅ | Tipo de elemento | `reactivo`, `insumo`, `equipo` |
| `categoria` | FK → Categoria | ✅ | Categoría del producto | Solventes, Ácidos, Bases, etc |
| `cantidad` | Integer | ✅ | Stock actual | ≥ 0 |
| `minimo` | Integer | ✅ | Umbral mínimo de reorden | ≥ 0 |
| `ubicacion` | String(100) | ⭕ | Ubicación en laboratorio | Ej: "Estante A3" |
| `fecha_vencimiento` | Date | ⭕ | Fecha de expiración | ISO 8601 |
| `ultima_actualizacion` | DateTime | Auto | Timestamp de última edición | Auto-now |

**Estado calculado:**
- `estado`: 'ok' (cantidad > mínimo) | 'bajo_stock' (cantidad ≤ mínimo) | 'agotado' (cantidad ≤ 0)
- `bajo_stock()`: True si cantidad ≤ minimo
- `por_vencer()`: True si faltan ≤ 7 días para vencimiento

**Campos derivados en API:**
- `categoria_nombre`: Nombre de la categoría (read-only)
- `nivel_riesgo`: Indicador visual (🔴 Crítico / 🟠 Medio / 🟢 Leve)
- `mensaje`: Estado legible
- `recomendacion`: Acción sugerida

---

### 2. **Categoría**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | Integer | Auto | Identificador único |
| `nombre` | String(100) | ✅ | Nombre de categoría |

**Ejemplos:** Solventes, Ácidos, Bases, Reactivos, Equipos, etc.

---

### 3. **Pedido** (Solicitudes de reactivos)

| Campo | Tipo | Requerido | Descripción | Valores |
|-------|------|-----------|-------------|---------|
| `id` | Integer | Auto | Identificador único | PK |
| `codigo` | String(30) | Unique | Código único | Auto: PED-XXXX |
| `usuario` | FK → User | ✅ | Usuario que solicita | Link a Django User |
| `producto` | FK → Producto | ✅ | Producto solicitado | Link a Producto |
| `cantidad` | Integer | ✅ | Cantidad solicitada | ≥ 1 |
| `prioridad` | Choice | ✅ | Nivel de urgencia | `baja`, `media`, `alta` |
| `estado` | Choice | ✅ | Estado del pedido | `pendiente`, `aprobado`, `rechazado`, `entregado` |
| `solicitante` | String(150) | Auto | Nombre del solicitante | Extraído de user.get_full_name() |
| `departamento` | String(150) | ⭕ | Departamento del solicitante | Extraído de UserProfile |
| `fecha_solicitud` | Date | Auto | Fecha de creación | date.today() |
| `fecha_respuesta` | Date | ⭕ | Fecha de aprobación/rechazo | Null hasta decisión |
| `observaciones` | Text | ⭕ | Notas adicionales | Notas del solicitante |
| `motivo_rechazo` | Text | ⭕ | Razón del rechazo | Requerido si estado='rechazado' |
| `creado_por` | String(150) | Auto | Username del creador | Auto al guardar |
| `evaluacion_seguridad` | JSON | ⭕ | Evaluación de riesgos | Formato libre |
| `fecha_entrega` | Date | ⭕ | Fecha de entrega física | Si estado='entregado' |
| `condicion_entrega` | Choice | ⭕ | Cómo se entregó | `completa`, `parcial`, `observaciones`, `urgente` |
| `responsable_entrega` | String(150) | ⭕ | Quién entregó | Nombre responsable |
| `notas_entrega` | Text | ⭕ | Notas de la entrega | Detalles post-entrega |

**Lógica de negocio:**
- Al crear: se asigna automáticamente usuario, solicitante, creado_por, departamento
- Al aprobar: se resta cantidad de producto.cantidad (si hay stock suficiente)
- Al rechazar: requiere motivo_rechazo
- Estados finales: aprobado, rechazado, entregado

---

### 4. **Movimiento** (Registro de entrada/salida de productos)

| Campo | Tipo | Requerido | Descripción | Valores |
|-------|------|-----------|-------------|---------|
| `id` | Integer | Auto | Identificador único | PK |
| `producto` | FK → Producto | ✅ | Producto afectado | Link a Producto |
| `tipo` | Choice | ✅ | Tipo de operación | `entrada`, `salida` |
| `cantidad` | Integer | ✅ | Cantidad movida | ≥ 1 |
| `fecha` | DateTime | Auto | Timestamp | auto_now_add |
| `observacion` | Text | ⭕ | Notas | Razón del movimiento |

**Nota:** Se crea automáticamente cuando se aprueba un pedido (tipo='salida')

---

### 5. **Alerta** (Notificaciones del sistema)

| Campo | Tipo | Requerido | Descripción | Valores |
|-------|------|-----------|-------------|---------|
| `id` | Integer | Auto | Identificador único | PK |
| `tipo` | Choice | ✅ | Tipo de alerta | `bajo_stock`, `vencimiento`, `otro` |
| `producto` | FK → Producto | ⭕ | Producto relacionado | NULL para alertas genéricas |
| `titulo` | String(200) | ✅ | Encabezado de alerta | Ej: "Stock Bajo: Ácido Sulfúrico" |
| `mensaje` | Text | ⭕ | Descripción corta | Detalles |
| `descripcion` | Text | ⭕ | Descripción detallada | Contexto completo |
| `remitente` | String(100) | ⭕ | Origen de la alerta | "SIGIRL" o nombre de usuario |
| `prioridad` | Choice | ✅ | Nivel de urgencia | `alta`, `media`, `baja` |
| `resuelta` | Boolean | ✅ | Estado | Default: False |
| `fecha` | DateTime | Auto | Timestamp | auto_now_add |

**Propiedades:**
- `estado` (read-only): "activa" o "resuelta" (basado en resuelta)

---

### 6. **HistorialCambio** (Auditoría de cambios)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | Integer | Auto | PK |
| `usuario` | FK → User | ⭕ | Quién hizo el cambio |
| `modelo` | String(100) | ⭕ | Modelo afectado (ej: "Producto") |
| `campo` | String(100) | ⭕ | Campo modificado |
| `valor_anterior` | Text | ⭕ | Valor previo |
| `valor_nuevo` | Text | ⭕ | Valor nuevo |
| `fecha` | DateTime | Auto | Timestamp |

---

### 7. **Auditoria** (Log de acciones)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | Integer | Auto | PK |
| `usuario` | FK → User | ⭕ | Quién ejecutó la acción |
| `accion` | String(100) | ✅ | Tipo de acción | CRUD, Login, etc |
| `modulo` | String(100) | ✅ | Módulo afectado | Inventario, Pedidos, etc |
| `descripcion` | Text | ⭕ | Detalles de la acción |
| `fecha` | DateTime | Auto | Timestamp |

---

### 8. **UserProfile** (Perfil extendido de usuario)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | Integer | Auto | PK |
| `user` | FK → User (1:1) | ✅ | Link a Django User |
| `institution` | String(200) | ⭕ | Institución |
| `department` | String(200) | ⭕ | Departamento |
| `phone` | String(50) | ⭕ | Teléfono |
| `cargo` | String(100) | ⭕ | Cargo/posición |
| `bio` | Text | ⭕ | Descripción personal |
| `avatar` | Text | ⭕ | URL de avatar |

---

### 9. **User** (Django Auth User - Extendido)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | Integer | Auto | PK |
| `username` | String(150) | ✅ | Nombre único | Único |
| `email` | String(254) | ⭕ | Correo electrónico | Puede estar vacío |
| `first_name` | String(150) | ⭕ | Nombre |
| `last_name` | String(150) | ⭕ | Apellido |
| `password` | String | ✅ | Hash de contraseña | Hasheada |
| `is_staff` | Boolean | ✅ | ¿Es Jefe? | Default: False |
| `is_superuser` | Boolean | ✅ | ¿Es Admin? | Default: False |
| `is_active` | Boolean | ✅ | ¿Activo? | Default: True |
| `date_joined` | DateTime | Auto | Fecha de creación |

**Roles:**
- `is_superuser=True` → Role "admin" (máximos permisos)
- `is_staff=True` y no superuser → Role "jefe" (permisos moderados)
- Ambos False → Role "usuario" (permisos limitados)

---

## 🔗 RELACIONES ENTRE TABLAS

```
┌──────────────┐
│   Usuario    │
│  (Django)    │
└──────┬───────┘
       │
       ├─► 1:1 ─► UserProfile (Datos extendidos)
       │
       ├─► 1:N ─► Pedido (Un usuario = muchos pedidos)
       │          └─► Producto (QSÉ solicitó)
       │
       ├─► 1:N ─► HistorialCambio (Auditoría personal)
       │
       └─► 1:N ─► Auditoria (Acciones realizadas)

┌──────────────┐
│   Producto   │
└──────┬───────┘
       │
       ├─► 1:N ─► Pedido (Un producto = muchos pedidos)
       │
       ├─► 1:N ─► Movimiento (Entrada/salida)
       │
       ├─► 1:N ─► Alerta (Notificaciones relacionadas)
       │
       └─► N:1 ─► Categoria (Clasificación)

┌──────────────┐
│  Categoria   │
└──────┬───────┘
       │
       └─► 1:N ─► Producto (Muchos productos por categoría)
```

---

## 🔌 ENDPOINTS DE API

### Base URL
```
/api/
```

### Autenticación
```
POST   /api/token/              → Obtener JWT (login)
POST   /api/token/refresh/      → Renovar JWT
```

**Respuesta login (POST /api/token/):**
```json
{
  "access": "eyJ0eXAi...",
  "refresh": "eyJ0eXAi...",
  "role": "admin|jefe|usuario",
  "username": "usuario1"
}
```

---

### CRUD Productos

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| `GET` | `/productos/` | Autenticado | Listar todos los productos |
| `POST` | `/productos/` | Admin/Jefe | Crear nuevo producto |
| `GET` | `/productos/{id}/` | Autenticado | Obtener detalles de 1 producto |
| `PATCH` | `/productos/{id}/` | Admin/Jefe | Actualizar producto |
| `DELETE` | `/productos/{id}/` | Admin/Jefe | Eliminar producto |

**Request/Response POST productos:**
```json
POST /productos/
{
  "nombre": "Ácido Sulfúrico",
  "tipo": "reactivo",
  "categoria": 1,
  "cantidad": 50,
  "minimo": 10,
  "ubicacion": "Estante A3",
  "fecha_vencimiento": "2026-12-31"
}
```

**Response (GET):**
```json
{
  "id": 1,
  "nombre": "Ácido Sulfúrico",
  "tipo": "reactivo",
  "categoria": 1,
  "categoria_nombre": "Ácidos",
  "cantidad": 50,
  "umbral_minimo": 10,
  "ubicacion": "Estante A3",
  "fecha_vencimiento": "2026-12-31",
  "ultima_actualizacion": "2026-04-24T10:30:00Z",
  "estado": "ok",
  "bajo_stock": false,
  "por_vencer": false,
  "nivel_riesgo": "🟢 Leve",
  "mensaje": "Estado normal",
  "recomendacion": "Sin acción requerida"
}
```

---

### CRUD Categorías

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| `GET` | `/categorias/` | Autenticado | Listar categorías |
| `POST` | `/categorias/` | Autenticado | Crear categoría |
| `PATCH` | `/categorias/{id}/` | Autenticado | Actualizar categoría |
| `DELETE` | `/categorias/{id}/` | Autenticado | Eliminar categoría |

---

### CRUD Pedidos

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| `GET` | `/pedidos/` | Autenticado | Listar pedidos (filtrados por rol) |
| `POST` | `/pedidos/` | Autenticado | Crear nuevo pedido |
| `GET` | `/pedidos/{id}/` | Autenticado | Obtener detalles de 1 pedido |
| `PATCH` | `/pedidos/{id}/` | Admin/Jefe | Actualizar estado del pedido |
| `DELETE` | `/pedidos/{id}/` | Admin/Jefe | Eliminar pedido |

**Request POST pedido:**
```json
POST /pedidos/
{
  "producto": 1,
  "cantidad": 5,
  "prioridad": "alta",
  "observaciones": "Necesario para experimento"
}
```

**Response POST pedido:**
```json
{
  "id": 42,
  "codigo": "PED-0042",
  "usuario": 5,
  "usuario_username": "usuario1",
  "producto": 1,
  "producto_nombre": "Ácido Sulfúrico",
  "stock_actual": 50,
  "cantidad": 5,
  "estado": "pendiente",
  "prioridad": "alta",
  "solicitante": "Juan Pérez",
  "departamento": "Química",
  "fecha_solicitud": "2026-04-24",
  "fecha_respuesta": null,
  "observaciones": "Necesario para experimento",
  "motivo_rechazo": null,
  "fecha_entrega": null,
  "condicion_entrega": null,
  "responsable_entrega": null,
  "notas_entrega": null
}
```

**Request PATCH (Aprobar pedido):**
```json
PATCH /pedidos/42/
{
  "estado": "aprobado"
}
```
✅ Automáticamente: resta cantidad de producto, asigna fecha_respuesta

**Request PATCH (Rechazar pedido):**
```json
PATCH /pedidos/42/
{
  "estado": "rechazado",
  "motivo_rechazo": "Stock insuficiente"
}
```
⚠️ Requiere motivo_rechazo obligatoriamente

---

### CRUD Movimientos

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| `GET` | `/movimientos/` | Autenticado | Listar todos los movimientos |
| `POST` | `/movimientos/` | Autenticado | Registrar entrada/salida |

**Request POST movimiento:**
```json
POST /movimientos/
{
  "producto": 1,
  "tipo": "entrada",
  "cantidad": 100,
  "observacion": "Compra a proveedor XYZ"
}
```

---

### CRUD Alertas

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| `GET` | `/alertas/` | Autenticado | Listar alertas |
| `POST` | `/alertas/` | Autenticado | Crear alerta manual |
| `PATCH` | `/alertas/{id}/` | Autenticado | Marcar como resuelta |

---

### CRUD Usuarios (Admin solo)

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| `GET` | `/usuarios/` | Admin | Listar todos usuarios |
| `POST` | `/usuarios/` | Admin | Crear nuevo usuario |
| `PATCH` | `/usuarios/{id}/` | Admin | Editar usuario |
| `DELETE` | `/usuarios/{id}/` | Admin | Eliminar usuario |

**Request POST usuario:**
```json
POST /usuarios/
{
  "email": "newuser@lab.com",
  "nombre_input": "Carlos López",
  "departamento_input": "Biología",
  "rol_input": "jefe",
  "password": "SigirlTemp2025!"
}
```

---

### Auditoría

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| `GET` | `/auditoria/` | Admin | Obtener log de acciones |

**Query params:**
```
?usuario=username
?accion=CREATE
?modulo=Inventario
?fecha_desde=2026-04-01
?fecha_hasta=2026-04-30
```

---

## 🎨 COMPONENTES FRONTEND

### Estructura de carpetas

```
frontend/src/
├── pages/                    # Vistas principales
│   ├── Login.jsx            # Autenticación
│   ├── Dashboard.jsx        # Dashboard usuario regular
│   ├── AdminDashboard.jsx   # Panel admin
│   ├── JefeSuperiorDashboard.jsx # Panel jefe
│   ├── Inventario.jsx       # Gestión de productos
│   ├── pedidos.jsx          # Gestión de solicitudes
│   ├── Alertas.jsx          # Sistema de alertas
│   ├── Reportes.jsx         # Reportes gráficos
│   ├── Usuarios.jsx         # Gestión de usuarios
│   ├── Perfil.jsx           # Perfil de usuario
│   └── ProfileSettings.jsx  # Configuración de perfil
│
├── components/              # Componentes reutilizables
│   ├── Layout.jsx          # Wrapper con sidebar
│   ├── Sidebar.jsx         # Menú lateral (roles)
│   ├── ProtectedRoute.jsx  # Wrapper de autenticación
│   ├── ProtectedRouteByRole.jsx # Wrapper de roles
│   ├── LabCard.jsx         # Tarjeta estilo lab
│   ├── Tabla.jsx           # Tabla genérica
│   ├── ReportPanel.jsx     # Panel de reportes
│   ├── RejectPedidoModal.jsx # Modal para rechazar
│   └── ...otros
│
├── context/                # Estado global
│   ├── UserContext.jsx     # Contexto de usuario
│   └── AuthContext.js      # Contexto de autenticación
│
├── services/               # Llamadas API
│   └── api.js             # Configuración Axios + endpoints
│
├── utils/                 # Utilidades
│   └── reportExport.js    # Exportar a Excel/PDF
│
└── styles/               # Estilos globales
    └── ...CSS
```

### Páginas principales y su consumo de datos

#### **1. Inventario.jsx**
```javascript
// DATOS QUE CONSUME:
- getProductos()          → Array de productos
- createProducto()        → POST crear producto
- updateProducto()        → PATCH editar stock
- deleteProducto()        → DELETE eliminar producto
- getMovimientos()        → Historial de movimientos
- createMovimiento()      → Registrar entrada/salida

// DATOS QUE MUESTRA:
- Tabla con: nombre, tipo, categoría, cantidad, mínimo, estado
- Cards de: Total productos, bajo stock, agotados, vencidos
- Búsqueda y filtro por estado/categoría
- Detalle individual de producto
- Historial de movimientos del producto
```

#### **2. pedidos.jsx**
```javascript
// DATOS QUE CONSUME:
- getPedidos()            → Array de pedidos
- createPedido()          → Crear nueva solicitud
- updatePedido()          → Cambiar estado
- getProductos()          → Para dropdown de productos

// DATOS QUE MUESTRA:
- Tabla con: código, producto, cantidad, estado, prioridad, solicitante
- Cards de: Pendientes, aprobados, rechazados, entregados
- Búsqueda y filtro por estado/prioridad
- Modal para crear pedido
- Modal para rechazar con motivo
- Modal para marcar como entregado
```

#### **3. AdminDashboard.jsx**
```javascript
// DATOS QUE CONSUME:
- getProductos()          → Todos los productos
- getPedidos()            → Todos los pedidos
- getAlertas()            → Todas las alertas
- updatePedido()          → Aprobar/rechazar
- getAuditoria()          → Log de acciones

// DATOS QUE MUESTRA:
- 3 tabs: Inventario | Pedidos | Alertas
- Cada tab con tabla completa + opciones de edición
- Reportes con gráficos (Pie Charts)
- Búsqueda global en cada tab
```

#### **4. Dashboard.jsx** (Usuario regular)
```javascript
// DATOS QUE CONSUME:
- getProductos()          → Productos disponibles
- getPedidos()            → Mis pedidos
- getAlertas()            → Alertas del sistema

// DATOS QUE MUESTRA:
- Cards de resumen (Total productos, mis pedidos, alertas)
- Gráficos de estado de inventario (Recharts)
- Lista de mis últimos pedidos
- Alertas activas del sistema
```

#### **5. Alertas.jsx**
```javascript
// DATOS QUE CONSUME:
- getAlertas()            → Todas las alertas
- createAlerta()          → Crear alerta manual
- updateAlerta()          → Marcar como resuelta
- deleteAlerta()          → Eliminar

// DATOS QUE MUESTRA:
- Lista de alertas por prioridad
- Filtro por: Todas | Alta | Media | Baja
- Modal para crear alerta
- Modal para resolver con acciones checkeables
```

#### **6. Reportes.jsx**
```javascript
// DATOS QUE CONSUME:
- getProductos()          → Para gráficos inventario
- getPedidos()            → Para gráficos pedidos
- getAlertas()            → Para gráficos alertas
- exportToExcel()         → Exportar datos
- exportToPdf()           → Exportar PDF

// DATOS QUE MUESTRA:
- 3 tabs: Inventario | Pedidos | Alertas
- Pie charts del estado
- Bar charts de categorías/prioridades
- Tablas detalladas exportables
```

#### **7. Usuarios.jsx** (Admin solo)
```javascript
// DATOS QUE CONSUME:
- getUsuarios()           → Lista de usuarios
- createUsuario()         → Crear usuario
- updateUsuario()         → Editar usuario
- deleteUsuario()         → Eliminar usuario

// DATOS QUE MUESTRA:
- Tabla: email, nombre, departamento, rol, total pedidos, rechazos
- Formulario para crear/editar
- Selector de rol (usuario | jefe | admin)
```

---

## 🔄 FLUJOS DE NEGOCIO

### Flujo 1: Solicitar Reactivo (Pedido)

```
1. Usuario accede a /pedidos → Lee getProductos() + getPedidos()
2. Usuario hace click "Nuevo Pedido"
   ├─ Selecciona producto
   ├─ Ingresa cantidad
   ├─ Ingresa prioridad
   └─ Ingresa observaciones
3. Frontend: POST /pedidos/
   └─ Backend asigna: usuario, solicitante, departamento, creado_por
4. Pedido creado con estado="pendiente"
5. Admin ve en AdminDashboard
6. Admin elige: "Aprobar" o "Rechazar"
   
   Si APROBAR:
   ├─ Valida stock suficiente
   ├─ Si hay: resta del producto.cantidad
   ├─ Asigna fecha_respuesta
   └─ Estado → "aprobado"
   
   Si RECHAZAR:
   ├─ Requiere motivo_rechazo
   ├─ Asigna fecha_respuesta
   └─ Estado → "rechazado"

7. Usuario puede marcar como entregado:
   ├─ Ingresa fecha_entrega
   ├─ Ingresa condicion_entrega
   ├─ Ingresa responsable_entrega
   └─ Estado → "entregado"
```

### Flujo 2: Registrar Entrada de Reactivo

```
1. Admin accede a /inventario
2. Click "Registrar Entrada"
3. Selecciona producto
4. Ingresa cantidad
5. Ingresa observación (ej: "Compra a proveedor")
6. Frontend: POST /movimientos/
   └─ Crea: Movimiento con tipo="entrada"
7. Producto se actualiza:
   └─ cantidad += amount_entrada
8. Si cantidad > mínimo y antes estaba en alerta:
   └─ Auto-crear Alerta resuelta
```

### Flujo 3: Salida por Pedido Aprobado

```
1. Admin aprueba pedido desde AdminDashboard
2. Backend automáticamente:
   ├─ Valida: producto.cantidad >= pedido.cantidad
   ├─ Si OK:
   │  ├─ producto.cantidad -= pedido.cantidad
   │  ├─ Crea Movimiento (tipo="salida")
   │  └─ Si nuevo estado < mínimo:
   │     └─ Crea Alerta automática
   └─ Si NO OK:
      └─ Retorna error 400
```

### Flujo 4: Sistema de Alertas

```
ALERTAS AUTOMÁTICAS:
├─ Bajo Stock: cantidad <= mínimo
├─ Vencimiento: fecha_vencimiento <= 7 días

ALERTAS MANUALES:
└─ Admin/Usuario crea alerta desde /alertas

CICLO DE VIDA:
1. Alerta creada con resuelta=False
2. Usuario puede:
   ├─ Ver detalles de alerta
   ├─ Ejecutar acciones sugeridas
   └─ Marcar como resuelta
3. Alerta archivada
```

### Flujo 5: Reportes

```
1. Usuario accede a /reportes
2. Selecciona tab: Inventario | Pedidos | Alertas
3. Frontend carga:
   ├─ Datos en tiempo real
   ├─ Genera Pie Chart (estado)
   ├─ Genera Bar Chart (categorías/prioridades)
   └─ Tabla detallada
4. Usuario puede:
   ├─ Exportar a Excel
   ├─ Exportar a PDF
   └─ Filtrar datos
```

---

## 📊 DATOS CRÍTICOS vs OPCIONALES

### ✅ DATOS CRÍTICOS (Imprescindibles para funcionar)

| Tabla | Campos Críticos | Por qué |
|-------|-----------------|---------|
| **Producto** | nombre, tipo, cantidad, minimo, categoria | Base del inventario |
| **Pedido** | usuario, producto, cantidad, estado, prioridad | Flujo de solicitudes |
| **Usuario** | username, email, password | Autenticación |
| **Categoría** | nombre | Clasificación productos |

### ⚠️ DATOS IMPORTANTE (Altamente recomendados)

| Tabla | Campos | Por qué |
|-------|--------|---------|
| **Producto** | ubicacion, fecha_vencimiento | Localizar rápido, control de calidad |
| **Pedido** | solicitante, departamento, observaciones | Trazabilidad y contexto |
| **Usuario** | first_name, department (profile) | Identificación clara |

### ⭕ DATOS OPCIONALES (Se pueden agregar después)

| Tabla | Campos | Nota |
|-------|--------|------|
| **Producto** | (ninguno obligatorio extra) | Los esenciales ya están |
| **Pedido** | condicion_entrega, notas_entrega, evaluacion_seguridad | Detalles post-entrega |
| **Usuario** | institution, phone, cargo, bio, avatar | Enriquecimiento de perfil |
| **Alerta** | descripcion detallada | Depende del tipo |

---

## 💾 RECOMENDACIÓN: QUÉ IMPORTAR DESDE EXCEL

### 🎯 PRIORIDAD 1 - IMPORTAR PRIMERO (CRÍTICO)

#### **1. Tabla: PRODUCTOS**

**Estructura recomendada en Excel:**

| nombre | tipo | categoria | cantidad | minimo | ubicacion | fecha_vencimiento |
|--------|------|-----------|----------|--------|-----------|-------------------|
| Ácido Sulfúrico | reactivo | Ácidos | 50 | 10 | Estante A3 | 2026-12-31 |
| Beaker 100ml | insumo | Vidrio | 200 | 50 | Armario B2 | 2027-06-30 |
| Balanza analítica | equipo | Equipos | 2 | 1 | Laboratorio 1 | 2030-01-01 |

**Campos a incluir:**
- ✅ `nombre` - Obligatorio
- ✅ `tipo` - Obligatorio (reactivo/insumo/equipo)
- ✅ `categoria` - Obligatorio (Ácidos, Bases, Solventes, etc)
- ✅ `cantidad` - Obligatorio (stock actual)
- ✅ `minimo` - Obligatorio (umbral de reorden)
- ⚠️ `ubicacion` - Muy recomendado
- ⚠️ `fecha_vencimiento` - Muy recomendado

**Formato:**
```
Cantidad: números enteros (50, 200, 1)
Fecha: ISO 8601 (YYYY-MM-DD) o DD/MM/YYYY
Categoría: texto exacto (matchear con BD o crear)
```

#### **2. Tabla: CATEGORÍAS** (Primero que Productos)

**Estructura:**

| nombre |
|--------|
| Ácidos |
| Bases |
| Solventes |
| Reactivos especiales |
| Vidrio |
| Equipos |

**Nota:** Importar primero categorías para luego enlazar con productos

---

### 🎯 PRIORIDAD 2 - IMPORTAR DESPUÉS (IMPORTANTE)

#### **3. Tabla: USUARIOS** (Solo si es primer setup)

**Estructura recomendada:**

| username | email | first_name | last_name | department | rol | password |
|----------|-------|-----------|-----------|-----------|-----|----------|
| jperez | juan@lab.com | Juan | Pérez | Química | usuario | auto |
| alopez | ana@lab.com | Ana | López | Biología | jefe | auto |
| admin | admin@lab.com | Admin | Sistema | TI | admin | auto |

**Notas:**
- Crear con contraseña temporal (sistema genera)
- Enviar credenciales por correo
- Usuarios generan nuevas contraseñas en primer login

#### **4. Tabla: MOVIMIENTOS HISTÓRICOS** (Auditoría)

**Si necesitas registrar entradas/salidas pasadas:**

| producto | tipo | cantidad | fecha | observacion |
|----------|------|----------|-------|-------------|
| Ácido Sulfúrico | entrada | 100 | 2026-01-15 | Compra inicial |
| Beaker 100ml | entrada | 500 | 2026-02-01 | Reposición |

---

### ⭕ PRIORIDAD 3 - IMPORTAR MÁS ADELANTE (OPCIONAL)

- **Pedidos históricos** - Solo si necesitas auditoría completa
- **Alertas** - Sistema las genera automáticamente
- **Perfiles extendidos** - Usuario agrega en settings

---

## 📋 PLAN DE IMPORTACIÓN RECOMENDADO

### Paso 1: Preparación (15 min)
```
1. Crear 2 hojas en Excel:
   ├─ Hoja 1: "categorias"
   ├─ Hoja 2: "productos"
   
2. Validar formatos:
   ├─ Sin caracteres especiales en nombres
   ├─ Fechas en formato DD/MM/YYYY o YYYY-MM-DD
   ├─ Números sin puntos de mil (1000 no 1.000)
   └─ Sin espacios al inicio/final
```

### Paso 2: Importación (30 min)
```
Opción A - Manual (seguro):
1. Login como Admin en SIGIRL
2. Ir a /usuarios → Crear usuarios manualmente
3. Ir a /inventario → Crear productos manualmente
   └─ Ventaja: Validar cada entrada

Opción B - Bulk (rápido):
1. Preparar CSV desde Excel
2. Script Python: import de CSV a BD
3. Validar en UI
   └─ Ventaja: Procesa 1000+ registros en segundos
```

### Paso 3: Validación (15 min)
```
1. Dashboard → Verificar totales coincidan
2. Búsqueda → Probar filtros
3. Alertas → Verificar se generan automáticamente
4. Reportes → Generar PDF/Excel
```

---

## 🔑 CAMPOS CLAVE QUE DEBES IMPORTAR

### Mínimo necesario

```python
# Productos
CAMPOS_MINIMOS = [
    'nombre',        # ej: "Ácido Sulfúrico"
    'tipo',          # ej: "reactivo"
    'categoria',     # ej: "Ácidos"
    'cantidad',      # ej: 50
    'minimo',        # ej: 10
]

# Usuarios (si es primer setup)
CAMPOS_USUARIOS = [
    'email',         # ej: "juan@lab.com"
    'first_name',    # ej: "Juan"
    'rol',           # ej: "usuario|jefe|admin"
]
```

### Recomendado

```python
CAMPOS_COMPLETOS = [
    # Productos
    'nombre',
    'tipo',
    'categoria',
    'cantidad',
    'minimo',
    'ubicacion',     # "Estante A3"
    'fecha_vencimiento', # "2026-12-31"
    
    # Usuarios
    'email',
    'first_name',
    'last_name',
    'department',
    'rol',
]
```

---

## ⚠️ ERRORES COMUNES AL IMPORTAR

| Error | Causa | Solución |
|-------|-------|----------|
| "Categoría no existe" | Excel tiene "acidos" pero BD tiene "Ácidos" | Importar categorías primero |
| "Cantidad debe ser número" | Excel tiene "50 unidades" | Limpiar a solo número: 50 |
| "Fechas inválidas" | Formato "01/02/2026" vs "2026-02-01" | Usar YYYY-MM-DD |
| "Usuario duplicado" | Mismo username dos veces | Agregar número: usuario1, usuario2 |
| "Sin permisos" | Intentar importar con rol "usuario" | Usar rol "admin" |

---

## 📊 EJEMPLO REAL: Estructura Excel para Importación

### Archivo: `inventario_inicial.xlsx`

**Hoja 1: "categorias"**
```
| nombre |
|--------|
| Ácidos y Bases |
| Solventes |
| Reactivos Especiales |
| Vidrio Laboratorio |
| Equipos Analíticos |
| Seguridad |
```

**Hoja 2: "productos"**
```
| nombre | tipo | categoria | cantidad | minimo | ubicacion | fecha_vencimiento |
|--------|------|-----------|----------|--------|-----------|-------------------|
| Ácido Sulfúrico 98% | reactivo | Ácidos y Bases | 5 | 2 | Estante A1 | 2027-12-31 |
| Etanol 96% | solvente | Solventes | 50 | 10 | Armario B3 | 2026-08-15 |
| Beaker 250ml | insumo | Vidrio Laboratorio | 100 | 20 | Armario C2 | 2029-01-01 |
| pH Metro | equipo | Equipos Analíticos | 1 | 1 | Laboratorio 1 | 2030-06-30 |
| Guantes nitrilo L | insumo | Seguridad | 500 | 100 | Armario D1 | 2025-06-30 |
```

---

## 🎓 CONCLUSIÓN Y RECOMENDACIÓN

### Lo que DEFINITIVAMENTE necesitas importar:

1. **✅ Categorías** (5-20 items)
2. **✅ Productos** (10-1000 items) - PRIORIDAD 1
3. **⚠️ Usuarios** (2-50 items) - Si es primer setup
4. **✅ Movimientos históricos** (opcional) - Si necesitas auditoría

### Lo que NO necesitas importar:

- ❌ Pedidos iniciales (los crean los usuarios)
- ❌ Alertas (se generan automáticamente)
- ❌ Cambios/Auditoría (sistema las registra)

### Ganancia esperada:

```
Sin importar:  Manual = 2-3 horas (100 productos)
Importando:    Automático = 5 minutos (100+ productos)
Ganancia:      99% de tiempo ahorrado ✅
```

### Next Steps:

1. Preparar Excel con estructura recomendada
2. Crear script Python para bulk insert (si necesitas)
3. Validar en Dashboard
4. Crear usuarios y asignar roles
5. Entrenar usuarios en el sistema

---

**Documento generado:** 2026-04-24  
**Versión SIGIRL:** 90% funcional  
**Última actualización:** Backend + Frontend integrados
