# 📌 RESUMEN EJECUTIVO - QUÉ IMPORTAR DESDE EXCEL

## TL;DR (La versión corta)

El usuario tiene datos en Excel pero no sabe qué traer a SIGIRL. Aquí está la respuesta:

| Tabla | Campos | Ejemplo | Criticidad |
|-------|--------|---------|-----------|
| **Categorías** | nombre | "Ácidos", "Solventes", "Equipos" | ⚠️ PRIMERO |
| **Productos** | nombre, tipo, categoría, cantidad, mínimo, ubicación, vencimiento | "Ácido Sulfúrico" | ✅ CRÍTICO |
| **Usuarios** | email, nombre, departamento, rol | "juan@lab.com" | ✅ IMPORTANTE |
| **Movimientos** | producto, cantidad, fecha | Registro histórico | ⭕ OPCIONAL |

---

## ✅ CHECKLIST: QUÉ IMPORTAR

### Primero (Sin esto no funciona):
- [ ] **Categorías** de productos (Ácidos, Bases, Solventes, etc) - 5-20 items
- [ ] **Productos** del inventario (Reactivos, insumos, equipos) - Todos
- [ ] **Usuarios** del sistema (si es primera vez) - Staff del lab

### Después (Sistema depende):
- [ ] **Movimientos históricos** - Si quieres auditoría completa

### NO importar (Sistema las crea):
- [ ] ❌ Pedidos - Los crean los usuarios cuando solicitan
- [ ] ❌ Alertas - Se generan automáticamente por bajo stock/vencimiento
- [ ] ❌ Auditoría/Cambios - Sistema registra automáticamente

---

## 🗂️ FORMATO EXCEL RECOMENDADO

### Hoja 1: CATEGORÍAS

```
Nombre de categoría en célula A1, datos desde A2:

A
─────────────────────
Categoría
─────────────────────
Ácidos y Bases
Solventes Orgánicos
Reactivos Especiales
Vidrio Laboratorio
Equipos Analíticos
Seguridad
─────────────────────
```

### Hoja 2: PRODUCTOS

```
Encabezados en fila 1, datos desde fila 2:

A | B | C | D | E | F | G
──────────────────────────────────────────────────────────────
nombre | tipo | categoria | cantidad | minimo | ubicacion | fecha_vencimiento
──────────────────────────────────────────────────────────────
Ácido Sulfúrico 98% | reactivo | Ácidos y Bases | 5 | 2 | Estante A1 | 2027-12-31
Etanol 96% | solvente | Solventes Orgánicos | 50 | 10 | Armario B | 2026-08-15
Beaker 250ml | insumo | Vidrio Laboratorio | 100 | 20 | Armario C | 2029-01-01
──────────────────────────────────────────────────────────────
```

### Hoja 3: USUARIOS (Opcional)

```
A | B | C | D | E
────────────────────────────────
email | first_name | last_name | department | rol
────────────────────────────────
juan@lab.com | Juan | Pérez | Química | usuario
ana@lab.com | Ana | López | Biología | jefe
────────────────────────────────
```

---

## 📊 CAMPOS DETALLE POR TABLA

### CATEGORÍAS

| Campo | Ejemplo | Tipo | Notas |
|-------|---------|------|-------|
| nombre | "Ácidos y Bases" | Texto | Único, máximo 100 caracteres |

**Ejemplos típicos para un laboratorio:**
- Ácidos y Bases
- Solventes Orgánicos
- Reactivos Especiales
- Vidrio Laboratorio
- Equipos Analíticos
- Seguridad
- Consumibles
- Equipos Informáticos

---

### PRODUCTOS

| Campo | Obligatorio | Tipo | Ejemplo | Validación |
|-------|-------------|------|---------|-----------|
| nombre | ✅ | Texto | "Ácido Sulfúrico 98%" | Máx 150 caracteres |
| tipo | ✅ | Choice | "reactivo" | reactivo / insumo / equipo |
| categoria | ✅ | Relación | "Ácidos y Bases" | Debe existir en tabla Categorías |
| cantidad | ✅ | Número | 50 | Entero ≥ 0 |
| minimo | ✅ | Número | 10 | Entero ≥ 0 |
| ubicacion | ⭕ | Texto | "Estante A3, Refrigerador" | Máx 100 caracteres |
| fecha_vencimiento | ⭕ | Fecha | 2027-12-31 | YYYY-MM-DD |

---

### USUARIOS

| Campo | Obligatorio | Tipo | Ejemplo | Notas |
|-------|-------------|------|---------|-------|
| email | ✅ | Email | juan@lab.com | Único |
| first_name | ✅ | Texto | Juan | Nombre propio |
| last_name | ⭕ | Texto | Pérez | Apellido |
| department | ⭕ | Texto | Química | O "Biology", "Physics", etc |
| rol | ✅ | Choice | usuario | usuario / jefe / admin |

**Roles:**
- `usuario` - Puede ver inventario y hacer pedidos
- `jefe` - Puede aprobar/rechazar pedidos + ver reportes
- `admin` - Control total

---

### MOVIMIENTOS (Opcional para auditoría)

| Campo | Obligatorio | Tipo | Ejemplo |
|-------|-------------|------|---------|
| producto | ✅ | Texto | "Ácido Sulfúrico 98%" |
| tipo | ✅ | Choice | entrada / salida |
| cantidad | ✅ | Número | 100 |
| fecha | ✅ | Fecha | 2026-04-24 |
| observacion | ⭕ | Texto | "Compra a proveedor XYZ" |

---

## ⚡ IMPORTACIÓN RÁPIDA (Opciones)

### Opción 1: Manual + UI (Seguro pero lento)
```
1. Login como Admin
2. /inventario → Botón "+Nuevo"
3. Llenar formulario
4. Guardar
Tiempo: ~2 min por producto × cantidad
```

### Opción 2: Bulk + Script (Rápido pero técnico)
```
1. Exportar Excel a CSV
2. Ejecutar script Python:
   python import_products.py --file="data.csv"
3. Script valida y carga a BD
Tiempo: Segundos para 1000 productos
```

### Opción 3: Import Wizard (Balance)
```
1. Admin Dashboard
2. Upload CSV
3. Preview de datos
4. Confirmar importación
Tiempo: 5-10 minutos
```

---

## 🚨 VALIDACIONES ANTES DE IMPORTAR

✅ Checklist previo:

- [ ] **Categorías**: Verificar que existan todas en Excel
- [ ] **Nombres de productos**: Sin caracteres especiales raros
- [ ] **Números**: Solo dígitos, sin puntos de mil (1000 no 1.000)
- [ ] **Fechas**: Mismo formato en todo (YYYY-MM-DD)
- [ ] **Emails**: Válidos y únicos
- [ ] **Roles**: Solo usuario/jefe/admin
- [ ] **Stock**: Cantidad ≥ 0

---

## 📈 IMPACTO DE IMPORTAR

### Sin importar datos:
- ⏱️ Tiempo setup: 2-3 horas (100 productos)
- 👨‍💼 Manual: Admin llena uno por uno
- 😫 Tedioso: Errores de tipeo

### Con importar datos:
- ⏱️ Tiempo setup: 5-10 minutos
- 🤖 Automático: Script carga todo
- ✅ Seguro: Validación de datos

**Ahorro de tiempo: 95%** 🎉

---

## 🔗 RELACIONES IMPORTANTES

```
Categoría
    ↓
Producto (Cantidad ✅ | Mínimo ✅)
    ↓
Pedido (Usuario solicita)
    ↓
Estado: Pendiente → Aprobado/Rechazado → Entregado
    ↓
Movimiento automático de stock
    ↓
Alerta automática si stock < mínimo
```

**Flujo:** Categoría → Productos → Pedidos → Stock → Alertas

---

## 💡 RECOMENDACIÓN FINAL

**START HERE:**
1. Exportar datos actuales a 3 hojas Excel:
   - categorias.xlsx
   - productos.xlsx
   - usuarios.xlsx (si aplica)

2. Validar formato siguiendo tabla arriba

3. Importar en orden:
   - Primero: Categorías
   - Segundo: Productos
   - Tercero: Usuarios

4. Verificar en SIGIRL:
   - Dashboard → Totales corretos
   - Búsqueda → Funciona
   - Alertas → Se generan automáticamente

---

## 📞 SOPORTE

Si al importar:
- ❓ "Categoría no existe" → Importar categorías primero
- ❓ "Stock inválido" → Asegurar que sea número ≥ 0
- ❓ "Fecha inválida" → Usar YYYY-MM-DD
- ❓ "Email duplicado" → Revisar unicidad

---

**¿Listo para importar?** ✅ Sigue la estructura Excel recomendada y estarás 90% del camino!
