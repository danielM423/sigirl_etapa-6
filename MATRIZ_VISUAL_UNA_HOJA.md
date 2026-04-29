# 🎯 MATRIZ VISUAL - QUÉ IMPORTAR (UNA HOJA)

## DECISIÓN RÁPIDA: ¿QUÉ TRAIGO DEL EXCEL?

```
┌──────────────────────────────────────────────────────────────────┐
│                    RECOMENDACIÓN DEFINITIVA                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ IMPORTAR DEFINITIVAMENTE:                                    │
│  ├─ CATEGORÍAS          → Ácidos, Solventes, Equipos, etc      │
│  ├─ PRODUCTOS           → Todos tus reactivos e insumos        │
│  └─ USUARIOS (si nuevo) → Staff del laboratorio                 │
│                                                                  │
│  ⭕ IMPORTAR OPCIONAL:                                           │
│  └─ MOVIMIENTOS         → Si quieres auditoría completa        │
│                                                                  │
│  ❌ NO IMPORTAR:                                                │
│  ├─ Pedidos             → Los crean usuarios después            │
│  ├─ Alertas             → SIGIRL las genera automático          │
│  └─ Auditoría           → Sistema registra todo automático      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 TABLA RESUMEN

```
┌─────────────┬──────────┬─────────────┬──────────────┬────────────────┐
│   Tabla     │ Importar │ Orden       │ Cantidad     │ Campos Mín     │
├─────────────┼──────────┼─────────────┼──────────────┼────────────────┤
│CATEGORÍAS   │    ✅    │ 1ero        │ 5-20 items   │ nombre         │
│PRODUCTOS    │    ✅    │ 2do         │ Todos        │ 7 campos       │
│USUARIOS     │    ✅    │ 3ero        │ 5-50 items   │ 5 campos       │
│MOVIMIENTOS  │    ⭕    │ 4to (opt)   │ Histórico    │ 5 campos       │
│             │          │             │              │                │
│Pedidos      │    ❌    │ Auto        │ Futuros      │ NO IMPORTAR    │
│Alertas      │    ❌    │ Auto        │ Auto         │ NO IMPORTAR    │
│Auditoría    │    ❌    │ Auto        │ Auto         │ NO IMPORTAR    │
└─────────────┴──────────┴─────────────┴──────────────┴────────────────┘
```

---

## 🔢 CAMPOS EXACTOS A INCLUIR

### CATEGORÍAS
```
CSV Header:
nombre

Ejemplo:
Ácidos y Bases
Solventes Orgánicos
Vidrio Laboratorio
Equipos Analíticos
Reactivos Especiales
```

### PRODUCTOS
```
CSV Header:
nombre | tipo | categoria | cantidad | minimo | ubicacion | fecha_vencimiento

Campos requeridos: ✅✅✅✅✅
Campos opcionales: ⭕ ⭕

Tipos válidos: reactivo, insumo, equipo
Ejemplo:
Ácido Sulfúrico 98% | reactivo | Ácidos y Bases | 5 | 2 | Estante A | 2027-12-31
```

### USUARIOS
```
CSV Header:
email | first_name | last_name | department | rol

Campos requeridos: ✅✅ ⭕ ⭕ ✅
Roles válidos: usuario, jefe, admin

Ejemplo:
juan@lab.com | Juan | Pérez | Química | usuario
admin@lab.com | Admin | Sistema | TI | admin
```

### MOVIMIENTOS (Opcional)
```
CSV Header:
producto | tipo | cantidad | fecha | observacion

Tipo válido: entrada, salida
Ejemplo:
Ácido Sulfúrico | entrada | 100 | 2026-04-15 | Compra inicial
```

---

## ⏱️ TIMELINE RECOMENDADO

```
AHORA (Hoy)
├─ 5 min: Revisar EJEMPLO_CATEGORIAS.csv
├─ 5 min: Revisar EJEMPLO_PRODUCTOS.csv
├─ 10 min: Preparar tus datos en Excel
│   └─ Copiar ejemplo
│   └─ Reemplazar con tus datos
│   └─ Guardar como CSV
└─ LISTO ✅

MAÑANA
├─ 2 min: Login como Admin
├─ 3 min: Upload categorías CSV
├─ 3 min: Upload productos CSV
├─ 2 min: Upload usuarios CSV (si aplica)
└─ HECHO ✅ (Sistema listo para usar)
```

---

## 🎓 VALIDACIONES CRÍTICAS

```
❌ ERRORES COMUNES A EVITAR:

1. "Categoría no existe en tabla Categorías"
   → Importar CATEGORÍAS primero, luego PRODUCTOS

2. "Cantidad debe ser número, no 'unidades'"
   → Limpiar: "5 unidades" → "5"

3. "Fecha inválida 24/04/2026"
   → Formato correcto: "2026-04-24" (YYYY-MM-DD)

4. "Email duplicado juan@lab.com"
   → Verificar usuario no existe ya

5. "Rol inválido: 'jefe_químico'"
   → Solo: usuario, jefe, admin

6. "Sin permiso para importar"
   → User debe tener rol = admin
```

---

## 💾 CÓMO PREPARAR TU EXCEL

### Paso 1: Crear 3 hojas
```
Hoja 1: "categorias"
Hoja 2: "productos"
Hoja 3: "usuarios"
```

### Paso 2: Copiar headers
```
categorias:
nombre

productos:
nombre | tipo | categoria | cantidad | minimo | ubicacion | fecha_vencimiento

usuarios:
email | first_name | last_name | department | rol
```

### Paso 3: Llenar datos
```
Consulta tus registros históricos
Copia información actual
Limpia datos (sin caracteres raros)
Valida formatos (números, fechas, etc)
```

### Paso 4: Exportar CSV
```
File → Export as → CSV
O: Save as → Cambiar tipo a CSV
Resultado: 3 archivos
  - categorias.csv
  - productos.csv
  - usuarios.csv
```

---

## 🚀 IMPORTACIÓN EN SIGIRL

```
Login como ADMIN
    ↓
Ir a Administración
    ↓
Click en "Importar datos"
    ↓
Seleccionar "categorias.csv"
    ↓
Click "Validar"
    ↓
Si todo OK → Click "Importar"
    ↓
Repetir para productos.csv
    ↓
Repetir para usuarios.csv
    ↓
✅ LISTO - Sistema funcional
```

---

## 📈 RESULTADO ESPERADO

### Antes (sin importar)
```
Productos en BD: 0
Usuarios en BD: 1 (admin)
Stock: 0
Sistema: No operacional
```

### Después (importando)
```
Productos en BD: 100+ (todos tus reactivos)
Usuarios en BD: 20+ (staff del lab)
Stock: Actualizado
Sistema: 100% operacional ✅
```

---

## 🔗 ARCHIVOS DE REFERENCIA

```
📄 ANALISIS_EXHAUSTIVO_SIGIRL.md
   ↳ Análisis técnico completo (2500+ líneas)
   
📄 GUIA_IMPORTACION_EXCEL.md
   ↳ Guía ejecutiva paso-a-paso
   
📄 DIAGRAMA_FLUJO_IMPORTACION.md
   ↳ Diagramas visuales del sistema
   
📊 EJEMPLO_CATEGORIAS.csv
   ↳ Template de categorías (copiar)
   
📊 EJEMPLO_PRODUCTOS.csv
   ↳ Template de 35 productos reales (copiar)
   
📄 REPORTE_FINAL_ANALISIS.md
   ↳ Resumen ejecutivo final
```

---

## ✨ BENEFICIOS DE IMPORTAR

```
✅ 95% ahorro de tiempo
   2-3 horas de trabajo manual → 5-10 minutos automático

✅ 100% precisión
   Datos validados, sin tipeos

✅ Histórico preservado
   No pierdes información anterior

✅ Sistema listo día 1
   Usuarios pueden empezar a usar inmediatamente

✅ Alertas automáticas
   Stock bajo se detecta automático
   Vencimientos se monitorizan
   
✅ Reportes ejecutivos
   PDF/Excel con gráficos lista
```

---

## 🎯 DECISIÓN FINAL

```
┌────────────────────────────────────────────────┐
│ ¿DEBO IMPORTAR MIS DATOS DESDE EXCEL?          │
│                                                │
│ RESPUESTA: ✅ SÍ, DEFINITIVAMENTE              │
│                                                │
│ ¿QUÉ IMPORTO?                                  │
│ 1. Categorías (primero)                        │
│ 2. Productos (segundo)                         │
│ 3. Usuarios (tercero)                          │
│                                                │
│ ¿CUÁNTO TARDA?                                 │
│ 5-10 minutos total                             │
│                                                │
│ ¿FUNCIONA BIEN?                                │
│ Sí, 100% integrado con SIGIRL                  │
│                                                │
│ → PROCEDE AL PASO SIGUIENTE →                  │
│   Leer GUIA_IMPORTACION_EXCEL.md               │
└────────────────────────────────────────────────┘
```

---

## 📞 SOPORTE RÁPIDO

| Problema | Solución |
|----------|----------|
| "¿Por dónde empiezo?" | Lee GUIA_IMPORTACION_EXCEL.md |
| "¿Qué campos necesito?" | Mira EJEMPLO_PRODUCTOS.csv |
| "¿En qué orden?" | Categorías → Productos → Usuarios |
| "¿Cómo importo?" | Admin Panel → Importar CSV |
| "¿Funciona?" | Dashboard muestra datos ✅ |

---

**RESUMEN EN UNA LÍNEA:**  
*Importa Categorías, Productos y Usuarios desde Excel en 10 minutos y tendrás tu laboratorio funcionando 100%* ✅
