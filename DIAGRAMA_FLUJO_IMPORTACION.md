# 🎯 DIAGRAMA VISUAL - QUÉ IMPORTAR Y POR QUÉ

## PASO 1: IMPORTACIÓN (Lo que DEBES hacer)

```
┌─────────────────────────────────────────────────┐
│         TU EXCEL CON DATOS HISTÓRICOS           │
├─────────────────────────────────────────────────┤
│ Hoja 1: Categorías                              │
│ Hoja 2: Productos (nombres, stock, etc)         │
│ Hoja 3: Usuarios (personas del lab)             │
│ Hoja 4: Movimientos (entrada/salida histórica)  │
└────────────────┬────────────────────────────────┘
                 │
                 ├─ Exportar a CSV
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          SIGIRL - IMPORTACIÓN                   │
├─────────────────────────────────────────────────┤
│ 1. Admin → Upload CSV                           │
│ 2. Sistema valida formato                       │
│ 3. Preview de datos                             │
│ 4. Click "Importar"                             │
│ 5. ✅ Datos en BD                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│        BASE DE DATOS SIGIRL                     │
├─────────────────────────────────────────────────┤
│ Categorías: 12 items ✅                         │
│ Productos: 35 items ✅                          │
│ Usuarios: 5 items ✅                            │
│ Movimientos: 100 items (opcional)               │
└─────────────────────────────────────────────────┘
```

---

## PASO 2: FLUJO DE DATOS EN SIGIRL

```
USUARIO REGULAR (roles="usuario")
  │
  ├─ Ve productos en /inventario (READ-ONLY)
  │
  ├─ Click "Solicitar" → Crea Pedido
  │  └─ POST /pedidos/
  │     ├─ producto: "Ácido Sulfúrico"
  │     ├─ cantidad: 5
  │     ├─ prioridad: "alta"
  │     └─ Estado: "pendiente"
  │
  ├─ Espera aprobación (Dashboard muestra status)
  │
  └─ Si aprobado → Puede "Marcar entregado"
     └─ PATCH /pedidos/ID/ con fecha_entrega


ADMIN (roles="admin" o "jefe")
  │
  ├─ /inventario → Ver todos los productos
  │  ├─ Ver cantidad vs mínimo
  │  ├─ Registrar entrada (+Stock)
  │  ├─ Registrar salida (-Stock)
  │  └─ Editar/Eliminar productos
  │
  ├─ /pedidos → Aprobar/Rechazar solicitudes
  │  ├─ Click "Aprobar" → Resta stock automático
  │  ├─ Click "Rechazar" → Requiere motivo
  │  └─ Marca como "Entregado" cuando llega
  │
  ├─ /alertas → Ver alertas sistema
  │  ├─ Bajo stock: cantidad <= mínimo
  │  ├─ Vencimiento: fecha <= 7 días
  │  └─ Manual: creadas por usuarios
  │
  ├─ /reportes → Exportar datos
  │  ├─ Excel: Inventario, Pedidos, Alertas
  │  └─ PDF: Gráficos y tablas
  │
  └─ /usuarios → Gestionar usuarios
     ├─ Crear usuarios
     ├─ Asignar roles
     └─ Reset contraseña


BACKEND AUTOMÁTICO
  │
  ├─ Cuando se aprueba pedido:
  │  ├─ Valida stock
  │  ├─ Resta cantidad de producto
  │  ├─ Crea Movimiento (tipo="salida")
  │  ├─ Si nuevo stock < mínimo:
  │  │  └─ Crea Alerta automática 🔔
  │  └─ Envía email (si configurado)
  │
  ├─ Cada hora (scheduler):
  │  ├─ Verifica vencimientos
  │  └─ Crea Alertas si faltan ≤ 7 días
  │
  └─ Todos los cambios:
     └─ Registra en Auditoría (quién, qué, cuándo)
```

---

## PASO 3: TRANSFORMACIÓN DE DATOS

### ANTES (Tu Excel)
```
Acido Sulfurico 98%  | REACTIVO | Acidos | 5 | 2 | Estante A | 2027-12-31
```

### DESPUÉS (SIGIRL)
```json
{
  "id": 1,
  "nombre": "Ácido Sulfúrico 98%",
  "tipo": "reactivo",
  "categoria_id": 1,
  "categoria_nombre": "Ácidos y Bases",
  "cantidad": 5,
  "minimo": 2,
  "ubicacion": "Estante A",
  "fecha_vencimiento": "2027-12-31",
  "estado": "ok",
  "bajo_stock": false,
  "por_vencer": false,
  "nivel_riesgo": "🟢 Leve",
  "mensaje": "Estado normal",
  "recomendacion": "Sin acción requerida"
}
```

### EN DASHBOARD
```
┌─────────────────────────────┐
│ Ácido Sulfúrico 98%         │
├─────────────────────────────┤
│ Cantidad: 5 / Mínimo: 2     │
│ Estado: 🟢 OK               │
│ Ubicación: Estante A        │
│ Vencimiento: 2027-12-31     │
│ Acciones: [Editar] [Entrada] [Salida]│
└─────────────────────────────┘
```

---

## PASO 4: CICLO DE VIDA DE UN PEDIDO

```
1. SOLICITUD
   Usuario hace click "Nuevo Pedido"
   ├─ Selecciona producto: "Ácido Sulfúrico"
   ├─ Ingresa cantidad: 5
   ├─ Selecciona prioridad: "alta"
   └─ Estado: PENDIENTE ⏳
                │
                ▼
2. REVISIÓN
   Admin ve en Dashboard
   ├─ Verifica stock
   ├─ Revisa prioridad
   └─ Lee observaciones
                │
                ├─ Click "Aprobar"
                │   ├─ Stock: 5 → 0 (resta 5)
                │   ├─ Crea Movimiento(salida, 5)
                │   ├─ Si 0 < 2 (mínimo):
                │   │   └─ 🔔 Alerta automática
                │   └─ Estado: APROBADO ✅
                │
                └─ Click "Rechazar"
                    ├─ Requiere motivo
                    ├─ Stock sin cambios
                    └─ Estado: RECHAZADO ❌
                        │
                        ▼
3. ENTREGA (si fue aprobado)
   Usuario hace click "Marcar entregado"
   ├─ Ingresa fecha: 2026-04-25
   ├─ Ingresa condición: "completa"
   ├─ Ingresa responsable: "María López"
   └─ Estado: ENTREGADO 📦
```

---

## PASO 5: MATRIZ DE PERMISOS

```
Acción                  | Usuario | Jefe | Admin
─────────────────────────────────────────────────
Ver Inventario          |   ✅    |  ✅  |  ✅
Crear Producto          |   ❌    |  ✅  |  ✅
Editar Producto         |   ❌    |  ✅  |  ✅
Registrar Entrada       |   ❌    |  ✅  |  ✅
─────────────────────────────────────────────────
Crear Pedido            |   ✅    |  ✅  |  ✅
Ver Mis Pedidos         |   ✅    |  ✅  |  ✅
Ver Todos Pedidos       |   ❌    |  ✅  |  ✅
Aprobar/Rechazar        |   ❌    |  ✅  |  ✅
─────────────────────────────────────────────────
Ver Alertas             |   ✅    |  ✅  |  ✅
Crear Alerta Manual     |   ✅    |  ✅  |  ✅
Resolver Alerta         |   ✅    |  ✅  |  ✅
─────────────────────────────────────────────────
Ver Reportes            |   ❌    |  ✅  |  ✅
Exportar Excel/PDF      |   ❌    |  ✅  |  ✅
─────────────────────────────────────────────────
Gestionar Usuarios      |   ❌    |  ❌  |  ✅
Ver Auditoría           |   ❌    |  ❌  |  ✅
```

---

## PASO 6: CAMPOS QUE SIGIRL CALCULA AUTOMÁTICAMENTE

No necesitas importar estos, SIGIRL los genera:

| Campo | Cálculo |
|-------|---------|
| `id` | PK Auto-incremento |
| `codigo` (Pedido) | "PED-" + id formateado |
| `estado` (Producto) | ok / bajo_stock / agotado |
| `bajo_stock()` | cantidad <= minimo |
| `por_vencer()` | fecha_venc <= 7 días |
| `nivel_riesgo` | 🔴 🟠 🟢 según cantidad |
| `mensaje` | Descripción de estado |
| `recomendacion` | Acción sugerida |
| `ultima_actualizacion` | Timestamp automático |
| `fecha_solicitud` (Pedido) | date.today() |
| `solicitante` (Pedido) | user.full_name |
| `creado_por` (Pedido) | user.username |
| `departamento` (Pedido) | UserProfile.department |

---

## PASO 7: VENTAJAS DE IMPORTAR CORRECTAMENTE

### Sin importación
```
❌ 2-3 horas para llenar manualmente
❌ Errores de tipeo
❌ Datos incompletos
❌ Usuarios frustrados esperando
❌ Pérdida de histórico
```

### Con importación correcta
```
✅ 5-10 minutos para cargar todo
✅ Datos validados
✅ Histórico preservado
✅ Sistema listo para usar
✅ Usuarios pueden empezar a día 1
```

---

## PASO 8: CHECKLIST PRE-IMPORTACIÓN

Antes de hacer click en "Importar":

- [ ] Categorías: Nombres sin tildes problemáticas
- [ ] Productos:
  - [ ] Nombres únicos
  - [ ] Cantidad = número entero ≥ 0
  - [ ] Mínimo = número entero ≥ 0
  - [ ] Categoría existe en tabla Categorías
  - [ ] Tipo es: reactivo / insumo / equipo
  - [ ] Fechas en formato YYYY-MM-DD
- [ ] Usuarios:
  - [ ] Emails únicos
  - [ ] Rol es: usuario / jefe / admin
  - [ ] Nombres sin caracteres especiales
- [ ] Movimientos (si aplica):
  - [ ] Producto existe
  - [ ] Tipo es: entrada / salida
  - [ ] Cantidad ≥ 1
  - [ ] Fecha válida

---

## PASO 9: VALIDACIONES AUTOMÁTICAS SIGIRL

Si algo falla en importación:

```
Error: "Categoría no existe"
→ Solución: Importar categorías PRIMERO

Error: "Campo requerido: cantidad"
→ Solución: Asegurar que TODOS los productos tengan cantidad

Error: "Tipo inválido: 'quimico'"
→ Solución: Usar exactamente: reactivo / insumo / equipo

Error: "Fecha inválida: '24/04/2026'"
→ Solución: Usar YYYY-MM-DD: 2026-04-24

Error: "Email duplicado"
→ Solución: Revisar que no haya usuarios repetidos

Error: "Stock insuficiente"
→ Solución: Esto es DURANTE USO, validación normal
```

---

## RESUMEN FINAL

### QUÉ IMPORTAR (EN ORDEN):

1. **CATEGORÍAS** ← Hacerlo primero
   - CSV con: nombre
   - 5-20 items típicamente

2. **PRODUCTOS** ← Lo más importante
   - CSV con: nombre, tipo, categoria, cantidad, minimo, ubicacion, fecha_vencimiento
   - Todos tus reactivos, equipos, insumos

3. **USUARIOS** ← Si es primer setup
   - CSV con: email, first_name, department, rol
   - Staff del laboratorio

4. **MOVIMIENTOS** ← Opcional para auditoría
   - CSV con: producto, tipo, cantidad, fecha, observacion
   - Histórico de entradas/salidas

### QUÉ NO IMPORTAR:

- ❌ Pedidos (los crean usuarios después)
- ❌ Alertas (SIGIRL las genera automáticamente)
- ❌ Auditoría (sistema la registra)

### RESULTADO ESPERADO:

```
✅ Sistema funcional al 100%
✅ Datos históricos preservados
✅ Usuarios pueden empezar a solicitar
✅ Admin puede ver reportes
✅ Alertas automáticas activas
```

---

**Tiempo total importación: 10-15 minutos ⏱️**
**Hora de ahorro: 2-3 horas 🎉**
