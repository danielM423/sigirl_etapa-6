# 📖 GUÍA DE IMPORTACIÓN DESDE EXCEL - PASO A PASO

## 🎯 META
Importar tus datos desde Excel → Sistema SIGIRL en **menos de 10 minutos**

---

## 📋 PASO 0: PREPARACIÓN (5 minutos)

### **Verifica que tus Excel tengan esta estructura:**

#### **1️⃣ CATEGORÍAS.xlsx**
```
Columna A: nombre
─────────────────────────
Ácidos y Bases
Solventes
Equipos de Laboratorio
Plásticos y Vidrios
```
✅ **1 hoja, 1 columna, sin encabezado (o con)**

#### **2️⃣ PRODUCTOS.xlsx**
```
Columna    | A              | B        | C                   | D        | E       | F          | G
Encabezado | nombre         | tipo     | categoría           | cantidad | mínimo  | ubicación  | vencimiento
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Fila 1     | Ácido Sulfúrico| reactivo | Ácidos y Bases      | 10       | 2       | Estante A  | 2027-12-31
Fila 2     | Acetona        | solvente | Solventes           | 5        | 1       | Estante B  | 2026-06-30
Fila 3     | Pipetas 10mL   | equipo   | Equipos Laboratorio | 50       | 10      | Drawer 1   | (vacío)
```
✅ **1 hoja, 7 columnas OBLIGATORIAS, con encabezado**

#### **3️⃣ USUARIOS.xlsx** (OPCIONAL)
```
Columna    | A        | B                 | C             | D
Encabezado | username | email             | nombre        | departamento
──────────────────────────────────────────────────────────────────
Fila 1     | juan     | juan@lab.com      | Juan Pérez    | Química
Fila 2     | maria    | maria@lab.com     | María López   | Biología
```
✅ **Opcional, pero recomendado si es setup nuevo**

---

## 🔧 PASO 1: CONVERSA A CSV (5 minutos)

### **En Excel:**
1. Abre **CATEGORÍAS.xlsx**
2. **Archivo** → **Guardar Como** → **Formato: CSV**
3. Nombre: `categorias.csv`
4. Repite para **PRODUCTOS.xlsx** → `productos.csv`
5. Repite para **USUARIOS.xlsx** → `usuarios.csv`

**Resultado:**
```
📁 Carpeta del proyecto
├── categorias.csv
├── productos.csv
└── usuarios.csv
```

---

## 📂 PASO 2: VALIDA LOS DATOS (3 minutos)

### **Abre cada CSV con Notepad++ o VSCode:**

**categorias.csv debe ver así:**
```
nombre
Ácidos y Bases
Solventes
Equipos de Laboratorio
```

**productos.csv debe ver así:**
```
nombre,tipo,categoría,cantidad,mínimo,ubicación,vencimiento
Ácido Sulfúrico,reactivo,Ácidos y Bases,10,2,Estante A,2027-12-31
Acetona,solvente,Solventes,5,1,Estante B,2026-06-30
```

### **Checklist:**
- [ ] Los datos están separados por comas (`,`)
- [ ] No hay comillas raras alrededor
- [ ] Las fechas están en formato YYYY-MM-DD
- [ ] Los datos numéricos son números (no texto)
- [ ] No hay acentos problemáticos (Ácido, Pérez son OK)

---

## 🚀 PASO 3: IMPORTA LOS DATOS (1-2 minutos)

### **Opción A: Panel Admin de Django** (MÁS FÁCIL)
```
1. Ve a: http://localhost:8000/admin
2. Usa: admin / demo
3. Clic "AGREGAR" en cada modelo
4. Copia y pega los datos manualmente
```
⏱️ **Tarda:** 5-10 minutos (manual)

### **Opción B: Script Python** (AUTOMÁTICO - RECOMENDADO)
Voy a crear un script que lo hace automáticamente en **30 segundos**.

**Solo necesitas:**
1. Copiar el script a la carpeta raíz
2. Ejecutar: `python importar_datos.py`
3. ✅ ¡Listo!

---

## 💾 SCRIPT DE IMPORTACIÓN (Opción B)

### **Paso 1: Copia este código a `importar_datos.py`:**

```python
#!/usr/bin/env python
import os
import django
import csv
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sigirl.settings')
django.setup()

from django.contrib.auth.models import User
from inventario.models import Categoria, Producto, UserProfile

# 1️⃣ IMPORTAR CATEGORÍAS
print("📁 Importando categorías...")
categorias_creadas = 0

with open('categorias.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        nombre = row.get('nombre', '').strip()
        if nombre and not Categoria.objects.filter(nombre=nombre).exists():
            Categoria.objects.create(nombre=nombre)
            categorias_creadas += 1
            print(f"   ✅ {nombre}")

print(f"✅ {categorias_creadas} categorías importadas\n")

# 2️⃣ IMPORTAR PRODUCTOS
print("🧪 Importando productos...")
productos_creados = 0

with open('productos.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        nombre = row.get('nombre', '').strip()
        tipo = row.get('tipo', 'reactivo').lower()
        categoria_nombre = row.get('categoría', '').strip()
        cantidad = int(row.get('cantidad', 0))
        minimo = int(row.get('mínimo', 1))
        ubicacion = row.get('ubicación', '').strip()
        vencimiento_str = row.get('vencimiento', '').strip()
        
        # Buscar categoría
        try:
            categoria = Categoria.objects.get(nombre=categoria_nombre)
        except Categoria.DoesNotExist:
            print(f"   ⚠️ Categoría '{categoria_nombre}' no encontrada para {nombre}")
            continue
        
        # Parsear vencimiento
        vencimiento = None
        if vencimiento_str:
            try:
                vencimiento = datetime.strptime(vencimiento_str, '%Y-%m-%d').date()
            except:
                print(f"   ⚠️ Formato de fecha inválido: {vencimiento_str}")
        
        # Crear producto si no existe
        if not Producto.objects.filter(nombre=nombre).exists():
            Producto.objects.create(
                nombre=nombre,
                tipo=tipo,
                categoria=categoria,
                cantidad=cantidad,
                minimo=minimo,
                ubicacion=ubicacion,
                fecha_vencimiento=vencimiento
            )
            productos_creados += 1
            print(f"   ✅ {nombre} ({cantidad} unidades)")

print(f"✅ {productos_creados} productos importados\n")

# 3️⃣ IMPORTAR USUARIOS (OPCIONAL)
print("👥 Importando usuarios...")
usuarios_creados = 0

if os.path.exists('usuarios.csv'):
    with open('usuarios.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            username = row.get('username', '').strip()
            email = row.get('email', '').strip()
            nombre = row.get('nombre', '').strip()
            departamento = row.get('departamento', '').strip()
            
            if username and not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=nombre,
                    password='demo123',  # Contraseña temporal
                    is_staff=False,
                    is_active=True
                )
                usuarios_creados += 1
                print(f"   ✅ {nombre} ({username})")
                print(f"      📧 Email: {email}")
                print(f"      🏢 Departamento: {departamento}\n")
else:
    print("   ℹ️ usuarios.csv no encontrado (opcional)\n")

print(f"✅ {usuarios_creados} usuarios importados\n")

print("🎉 ¡IMPORTACIÓN COMPLETADA!")
print("\nResumen:")
print(f"  • Categorías: {categorias_creadas}")
print(f"  • Productos: {productos_creados}")
print(f"  • Usuarios: {usuarios_creados}")
print("\n✅ Los datos ya están en SIGIRL")
print("   Ve a: http://localhost:8000 o http://localhost:5173")
```

### **Paso 2: Guarda como `importar_datos.py` en la RAÍZ del proyecto**

```
📁 Sistema de Gestión de Inventarios...
├── importar_datos.py          ← AQUÍ
├── categorias.csv
├── productos.csv
├── usuarios.csv
├── manage.py
└── sigirl/
```

### **Paso 3: Ejecuta en terminal:**

```powershell
cd C:\ruta\a\SIGIRL
python importar_datos.py
```

### **Resultado esperado:**
```
📁 Importando categorías...
   ✅ Ácidos y Bases
   ✅ Solventes
   ✅ Equipos de Laboratorio
✅ 3 categorías importadas

🧪 Importando productos...
   ✅ Ácido Sulfúrico (10 unidades)
   ✅ Acetona (5 unidades)
   ✅ Pipetas 10mL (50 unidades)
✅ 3 productos importados

👥 Importando usuarios...
   ✅ Juan Pérez (juan)
      📧 Email: juan@lab.com
      🏢 Departamento: Química
✅ 1 usuario importado

🎉 ¡IMPORTACIÓN COMPLETADA!
   • Categorías: 3
   • Productos: 3
   • Usuarios: 1
```

---

## ✅ VERIFICA QUE FUNCIONÓ

### **1. Panel Admin:**
```
http://localhost:8000/admin
usuario: admin / demo
```
- Busca "Productos" → Debería ver tus datos

### **2. API:**
```
http://localhost:8000/api/productos/
```
- Debería listar todos tus productos en JSON

### **3. Frontend:**
```
http://localhost:5174/inventario
usuario: admin / demo
```
- Debería mostrar tu inventario completo con alertas

---

## 🆘 SI ALGO SALE MAL

| Error | Causa | Solución |
|-------|-------|----------|
| `FileNotFoundError: categorias.csv` | CSV no en la carpeta raíz | Copia los CSV a la raíz del proyecto |
| `KeyError: 'nombre'` | Encabezado diferente | Verifica que las columnas se llamen exacto |
| `ValueError: invalid literal` | Número como texto | Elimina comillas en Excel antes de CSV |
| `Categoria.DoesNotExist` | Categoría no creada | Primero importa categorías, luego productos |

---

## 📞 PRÓXIMOS PASOS

1. **Prepara tus CSV** con la estructura de arriba
2. **Avísame cuando estén listos**
3. Te envío el script `importar_datos.py`
4. Ejecutas: `python importar_datos.py`
5. ✅ **¡Sistema poblado!**

---

**¿Necesitas ayuda con los CSV? Avísame y te los preparo.** 📎
