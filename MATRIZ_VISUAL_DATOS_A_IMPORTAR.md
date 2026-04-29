# 📊 MATRIZ VISUAL - QUÉ DATOS TRAER DEL EXCEL (EN 1 HOJA)

## 🎯 RESPUESTA CORTA
```
✅ TRAER ESTO:          ⚠️ OPCIONAL:              ❌ NO TRAER:
┌─────────────────┐    ┌──────────────────┐     ┌─────────────────┐
│ CATEGORÍAS      │    │ MOVIMIENTOS      │     │ PEDIDOS         │
│ PRODUCTOS       │    │ (históricos)     │     │ ALERTAS         │
│ USUARIOS (STAFF)│    └──────────────────┘     │ AUDITORÍA       │
└─────────────────┘                             └─────────────────┘
```

---

## 📋 TABLA: QUÉ INFORMACIÓN USA SIGIRL

| Tabla | Campos | Ejemplo | Fuente Ideal |
|-------|--------|---------|--------------|
| **CATEGORÍA** | nombre | "Ácidos y Bases" | Excel |
| **PRODUCTO** | nombre, tipo, categoría, cantidad, mín., ubicación, vencimiento | "Ácido Sulfúrico", reactivo, 5 unidades | Excel ⭐ |
| **USUARIO** | nombre, email, departamento, rol | "Juan Pérez", usuario@lab.com | Excel o Panel |
| PEDIDO | usuario, producto, cantidad, prioridad | Auto-generado después | Sistema |
| MOVIMIENTO | producto, tipo, cantidad, fecha | Auto-registrado | Sistema |
| ALERTA | tipo, nivel, producto | Auto-generado | Sistema |
| AUDITORÍA | quién, qué, cuándo | Auto-registrado | Sistema |

---

## 🔴 PRIORIDAD DE IMPORTACIÓN

### **Nivel 1: CRÍTICO (Importa ASAP)**
```
┌─ CATEGORÍAS (5-20 items)
│  └─ Ácidos/Bases, Solventes, Equipos, etc.
│     ⏱️ Tarda: 2 minutos
│     💾 Formato: CSV o manual en panel
│
└─ PRODUCTOS (50-500 items) 
   └─ Todos tus reactivos e insumos
      ⏱️ Tarda: 5-10 minutos (si tienes Excel bien hecho)
      💾 Formato: CSV importado automáticamente
      ✅ Sistema se alinea automáticamente
```

### **Nivel 2: IMPORTANTE (Si es setup nuevo)**
```
└─ USUARIOS (10-50 staff)
   └─ Solo el personal del laboratorio
      ⏱️ Tarda: 3-5 minutos
      💾 Formato: CSV o panel admin
      ✅ Sistema asigna roles automáticamente
```

### **Nivel 3: OPCIONAL (Puede esperar)**
```
└─ MOVIMIENTOS HISTÓRICOS (100-1000)
   └─ Si quieres auditoría completa desde el inicio
      ⏱️ Tarda: 10-20 minutos
      💾 Solo si tienes datos limpios
      ✅ Sistema recalcula stocks automáticamente
```

---

## 💡 POR QUÉ NO TRAER OTRAS COSAS

| Qué | Por Qué NO | Qué Hace el Sistema |
|-----|-----------|-------------------|
| **Pedidos** | Los crean usuarios después | Automático desde interfaz |
| **Alertas** | El sistema las genera | Se crean cuando stock es bajo |
| **Auditoría** | Redundante | Sistema registra todo |
| **Reportes** | Se generan en tiempo real | API integrada |

---

## 🚀 IMPACTO DE IMPORTAR

```
ANTES (sin datos):
└─ Sistema vacío
   ├─ Usuarios no pueden solicitar (no hay productos)
   ├─ Admin no puede ver inventario
   └─ Necesita manual 2-3 horas

DESPUÉS (con datos importados):
└─ Sistema 100% operacional
   ├─ Usuarios solicitan reactivos → Aprobación → Entrega
   ├─ Admin ve inventario completo
   ├─ Alertas funcionan (bajo stock, vencimientos)
   ├─ Reportes ejecutivos (KPIs)
   └─ Auditoría completa
```

---

## 📊 ESTRUCTURA ESPERADA DE EXCEL

### **Excel 1: CATEGORÍAS**
```
nombre
Ácidos y Bases
Solventes
Equipos de Laboratorio
Plásticos y Vidrios
Reactivos especiales
```
↳ **5-20 filas max** | **Tiempo:** 2 minutos

### **Excel 2: PRODUCTOS**
```
nombre                 | tipo      | categoría            | cantidad | mínimo | ubicación | vencimiento
Ácido Sulfúrico        | reactivo  | Ácidos y Bases       | 10       | 2      | Estante A | 2027-12-31
Acetona                | solvente  | Solventes            | 5        | 1      | Estante B | 2026-06-30
Pipetas 10mL           | equipo    | Equipos de Lab       | 50       | 10     | Drawer 1  | (null)
```
↳ **50-500 filas** | **Tiempo:** 5-10 minutos

### **Excel 3: USUARIOS (opcional)**
```
username | email              | nombre       | departamento | rol
juan     | juan@lab.com       | Juan Pérez   | Química      | usuario
maria    | maria@lab.com      | María López  | Biología     | admin
```
↳ **10-50 filas** | **Tiempo:** 3-5 minutos

---

## ✅ CHECKLIST RÁPIDO

- [ ] Tengo CATEGORÍAS en Excel (5-20)
- [ ] Tengo PRODUCTOS en Excel (50-500)
- [ ] Tengo USUARIOS en Excel o los creo manual
- [ ] Los datos están limpios (sin duplicados)
- [ ] Las fechas están en formato YYYY-MM-DD
- [ ] Falta información, la dejo en blanco (null)

---

## 🎯 PRÓXIMO PASO

1. **Prepara los Excel** con la estructura arriba
2. **Avísame cuando estén listos**
3. Creo script de importación (5 minutos)
4. Ejecutas el script (1 minuto)
5. ✅ **SIGIRL lista con tus datos**

---

## 📞 RESPUESTAS RÁPIDAS

**P: ¿Y si mis Excel están desordenados?**
R: No hay problema. Creo un script que los limpia y alinea automáticamente.

**P: ¿Se pierde información?**
R: No. Solo filtramos campos que SIGIRL no usa. Todo lo demás lo guardamos.

**P: ¿Puedo agregar productos después?**
R: Sí, 100%. Puedes agregar/editar desde el panel admin o interfaz.

**P: ¿Cuántas horas tarda todo?**
R: 30 minutos (prep) + 5 (importación) = 35 minutos total.

---

**¡Listo! ¿Pasas los Excel cuando los tengas?** 📎
