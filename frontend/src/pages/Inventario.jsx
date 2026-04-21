// Vista dedicada al inventario.
// Permite listar, filtrar y mantener productos del laboratorio.

// IMPORTS - Librerías y dependencias externas
import { useState, useEffect, useMemo, useContext } from 'react'; // Hooks de React para estado, efectos y memoización
import { toast } from 'react-toastify'; // Notificaciones emergentes estilo toast
import { Search, ChevronDown, Plus, Edit2, Trash2, Download, Eye, Package, AlertCircle, TrendingUp } from 'lucide-react'; // Iconos de la librería lucide-react
import Layout from '../components/Layout'; // Componente de layout principal (header, sidebar, etc.)
import { UserContext } from '../context/AuthContext'; // Contexto de autenticación de usuario
import { exportToExcel } from '../utils/reportExport'; // Utilidad para exportar datos a Excel
import { getProductos, createProducto, updateProducto, deleteProducto } from '../services/api'; // Funciones API para CRUD de productos

// COMPONENTE PRINCIPAL: Inventario
const Inventario = () => {
  // CONTEXTO Y PERMISOS
  const { user, role } = useContext(UserContext); // Obtiene usuario y rol del contexto de autenticación
  const normalizedRole = role === 'jefe_superior' ? 'jefe' : role; // Normaliza el rol: 'jefe_superior' se trata como 'jefe'
  const canManageInventory = normalizedRole === 'admin' || normalizedRole === 'jefe'; 
  // Permiso para gestionar inventario (crear, editar, eliminar, exportar)
  // Solo admin y jefe tienen permisos de escritura

  // ESTADOS DEL COMPONENTE
  const [productos, setProductos] = useState([]); // Estado para la lista de productos (datos crudos de la API)
  const [loading, setLoading] = useState(true); // Estado de carga (true mientras se cargan datos)
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda para filtrar productos
  const [filterStatus, setFilterStatus] = useState('todos'); // Filtro por estado (todos/ok/bajo_stock/agotado)
  const [filterCategory, setFilterCategory] = useState('todas'); // Filtro por categoría
  const [showModal, setShowModal] = useState(false); // Controla visibilidad del modal de formulario
  const [selectedProduct, setSelectedProduct] = useState(null); // Producto seleccionado para editar (null si es creación)
  const [formProducto, setFormProducto] = useState({ // Estado del formulario para crear/editar
    nombre: '',
    categoria: 'Solventes', // Categoría por defecto
    ubicacion: '',
    cantidad: '',
    umbral_minimo: ''
  });

  // EFECTO: Cargar productos al montar el componente
  useEffect(() => {
    getProductos() // Llama a la API para obtener todos los productos
      .then((res) => setProductos(res.data || [])) // Actualiza estado con los datos recibidos (array vacío si no hay)
      .catch(() => toast.error('Error al cargar el inventario')) // Muestra error si falla la petición
      .finally(() => setLoading(false)); // Desactiva estado de carga siempre (éxito o error)
  }, []); // Solo se ejecuta una vez al montar el componente

  // FUNCIÓN: Obtener badge (insignia) de estado con colores e íconos
  // Parámetro: estado del producto ('ok', 'bajo_stock', 'agotado')
  const getEstadoBadge = (estado) => {
    // Estilos CSS según el estado (colores de fondo, texto y borde)
    const styles = {
      ok: 'bg-emerald-100 text-emerald-700 border border-emerald-300', // Verde para OK
      bajo_stock: 'bg-amber-100 text-amber-700 border border-amber-300', // Ámbar para bajo stock
      agotado: 'bg-rose-100 text-rose-700 border border-rose-300' // Rojo para agotado
    };
    
    // Iconos emoji según el estado
    const icons = {
      ok: '✅', // Check verde
      bajo_stock: '⚠️', // Advertencia
      agotado: '❌' // Equis roja
    };

    // Textos legibles según el estado
    const labels = {
      ok: 'OK',
      bajo_stock: 'Bajo Stock',
      agotado: 'Agotado'
    };

    // Retorna el componente badge con los estilos correspondientes
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${styles[estado]}`}>
        {icons[estado]} {/* Ícono emoji */}
        {labels[estado]} {/* Texto del estado */}
      </span>
    );
  };

  // MEMO: Productos normalizados (transformados a formato consistente)
  // useMemo: solo recalcula cuando 'productos' cambia
  const normalizedProducts = useMemo(() => productos.map((producto, index) => ({
    id: Number(producto.id ?? index + 1), // ID numérico (usa índice como fallback)
    nombre: producto.nombre || 'Producto sin nombre', // Nombre (con valor por defecto)
    categoria: typeof producto.categoria === 'string'
      ? producto.categoria // Si es string, lo usa directamente
      : producto.categoria?.nombre || producto.categoria_nombre || 'General', 
      // Si es objeto, intenta obtener .nombre o .categoria_nombre, o usa 'General' por defecto
    cantidad: Number(producto.cantidad ?? 0), // Cantidad (número, 0 por defecto)
    umbral_minimo: Number(producto.umbral_minimo ?? producto.minimo ?? 0), // Umbral mínimo (0 por defecto)
    ubicacion: producto.ubicacion || 'Sin ubicación', // Ubicación (valor por defecto)
    estado: producto.estado || ( // Calcula estado si no viene en el producto
      Number(producto.cantidad ?? 0) <= 0 ? 'agotado' // Si cantidad <= 0: agotado
      : Number(producto.cantidad ?? 0) <= Number(producto.umbral_minimo ?? producto.minimo ?? 0) 
        ? 'bajo_stock' // Si cantidad <= umbral: bajo stock
        : 'ok' // Si cantidad > umbral: OK
    ),
    ultima_actualizacion: producto.ultima_actualizacion || new Date().toISOString().split('T')[0], // Fecha o fecha actual
  })), [productos]); // Dependencia: productos

  // MEMO: Lista de categorías únicas para el filtro
  // useMemo: solo recalcula cuando 'normalizedProducts' cambia
  const categories = useMemo(() => [
    'todas', // Opción "Todas las categorías"
    ...new Set(normalizedProducts.map((producto) => producto.categoria).filter(Boolean))
    // Obtiene categorías únicas (Set elimina duplicados), filtra valores vacíos
  ], [normalizedProducts]); // Dependencia: normalizedProducts

  // FILTRADO DE PRODUCTOS (aplica búsqueda y filtros)
  const filteredProducts = normalizedProducts.filter((producto) => {
    // Búsqueda por texto (nombre, categoría o ubicación)
    const text = searchTerm.toLowerCase(); // Convierte búsqueda a minúsculas para comparación insensible
    const matchesSearch = producto.nombre.toLowerCase().includes(text) // Busca en nombre
      || producto.categoria.toLowerCase().includes(text) // Busca en categoría
      || producto.ubicacion.toLowerCase().includes(text); // Busca en ubicación
    
    // Filtro por estado
    const matchesFilter = filterStatus === 'todos' || producto.estado === filterStatus;
    
    // Filtro por categoría
    const matchesCategory = filterCategory === 'todas' || producto.categoria === filterCategory;
    
    // Retorna true solo si cumple todos los criterios
    return matchesSearch && matchesFilter && matchesCategory;
  });

  // ESTADÍSTICAS para mostrar en las tarjetas superiores
  const stats = {
    total: normalizedProducts.length, // Total de productos
    ok: normalizedProducts.filter((p) => p.estado === 'ok').length, // Productos con stock OK
    bajoStock: normalizedProducts.filter((p) => p.estado === 'bajo_stock').length, // Productos con bajo stock
    agotado: normalizedProducts.filter((p) => p.estado === 'agotado').length // Productos agotados
  };

  // FUNCIÓN: Mostrar toast con detalles del producto
  // Parámetros: title (título del toast), lines (array de líneas de texto)
  const showDetalleToast = (title, lines) => {
    toast.info(
      <div className="text-sm">
        <p className="font-semibold mb-2">{title}</p> {/* Título del producto */}
        <div className="space-y-1">
          {lines.filter(Boolean).map((line, index) => ( // Itera sobre líneas no vacías
            <p key={`${title}-${index}`}>{line}</p> // Renderiza cada línea
          ))}
        </div>
      </div>,
      { autoClose: 7000, closeOnClick: false } // Cierra después de 7 segundos, no cierra al hacer clic
    );
  };

  // MANEJADOR: Guardar producto (crear o actualizar)
  const handleGuardarProducto = async () => {
    // Verifica permisos
    if (!canManageInventory) {
      toast.error('Tu rol solo puede visualizar el inventario.');
      return; // Sale si no tiene permisos
    }

    // Validación de campos requeridos
    if (!formProducto.nombre || !formProducto.cantidad || !formProducto.umbral_minimo || !formProducto.ubicacion) {
      toast.error('Por favor completa todos los campos');
      return; // Sale si falta algún campo
    }

    // Prepara el payload para la API
    const payload = {
      nombre: formProducto.nombre,
      categoria_texto: formProducto.categoria, // Envía categoría como texto
      ubicacion: formProducto.ubicacion,
      cantidad: parseInt(formProducto.cantidad), // Convierte a número entero
      umbral_minimo: parseInt(formProducto.umbral_minimo), // Convierte a número entero
    };

    try {
      if (selectedProduct) {
        // MODO EDICIÓN: Actualiza producto existente
        const res = await updateProducto(selectedProduct.id, payload);
        // Actualiza el producto en el estado local (reemplaza el antiguo por el nuevo)
        setProductos((prev) => prev.map((p) => p.id === selectedProduct.id ? res.data : p));
        toast.success('Producto actualizado exitosamente');
      } else {
        // MODO CREACIÓN: Crea nuevo producto
        const res = await createProducto(payload);
        // Agrega el nuevo producto al estado local
        setProductos((prev) => [...prev, res.data]);
        toast.success('Producto creado exitosamente');
      }
      // Limpia el estado y cierra el modal
      setShowModal(false);
      setSelectedProduct(null);
      setFormProducto({ nombre: '', categoria: 'Solventes', ubicacion: '', cantidad: '', umbral_minimo: '' });
    } catch (err) {
      // Muestra error específico de la API o mensaje genérico
      toast.error(err.response?.data?.error || 'Error al guardar el producto');
    }
  };

  // MANEJADOR: Eliminar producto
  // Parámetro: id del producto a eliminar
  const handleEliminarProducto = async (id) => {
    // Verifica permisos
    if (!canManageInventory) {
      toast.error('Tu rol no tiene permiso para eliminar productos.');
      return; // Sale si no tiene permisos
    }

    // Confirmación del usuario (ventana nativa de confirmación)
    const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar este producto?');
    if (!confirmDelete) return; // Sale si cancela

    try {
      await deleteProducto(id); // Llama a la API para eliminar
      // Filtra el estado local para remover el producto eliminado
      setProductos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Producto eliminado exitosamente');
    } catch {
      toast.error('Error al eliminar el producto'); // Error genérico
    }
  };

  // MANEJADOR: Exportar inventario a Excel
  const handleExportarInventario = () => {
    // Verifica permisos
    if (!canManageInventory) {
      toast.info('El inventario para usuarios es solo de consulta.');
      return; // Sale si no tiene permisos
    }

    // Prepara las filas para el Excel (usa los productos filtrados)
    const rows = filteredProducts.map((producto) => ({
      Nombre: producto.nombre,
      Cantidad: producto.cantidad,
      Categoria: producto.categoria,
      Estado: producto.estado,
      Ubicacion: producto.ubicacion,
      'Umbral minimo': producto.umbral_minimo,
      'Ultima actualizacion': producto.ultima_actualizacion,
    }));

    // Exporta a Excel con nombre que incluye fecha actual
    exportToExcel(rows, `inventario-sigirl-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Inventario');
    toast.success('Inventario exportado correctamente.'); // Confirma al usuario
  };

  // RENDERIZADO PRINCIPAL
  return (
    <Layout> {/* Componente Layout que provee estructura base */}
      <div>
        {/* ALERTA DE MODO CONSULTA (solo visible si no tiene permisos de gestión) */}
        {!canManageInventory && (
          <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Estás en modo consulta: solo puedes visualizar el inventario y ver detalles de los productos.
          </div>
        )}

        {/* HEADER PRINCIPAL - Título y estadísticas rápidas */}
        <div className="mb-10 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_35px_rgba(34,197,94,0.10)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-[34px] font-bold text-slate-800">Inventario general PRO</h1>
              <p className="text-slate-500 text-base">
                Consulta, filtra y administra todos los productos del laboratorio desde una vista común para todos los roles.
              </p>

              {/* Chips de estadísticas rápidas */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {stats.total} productos {/* Total de productos */}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  {stats.bajoStock} bajo stock {/* Productos con bajo stock */}
                </span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  {stats.agotado} agotados {/* Productos agotados */}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETAS DE MÉTRICAS (4 tarjetas con gradientes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {/* Tarjeta: Productos Totales */}
          <div className="rounded-[20px] bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">Productos Totales</p>
                <p className="text-4xl font-bold mt-2">{stats.total}</p> {/* Valor numérico grande */}
              </div>
              <div className="p-3 rounded-xl bg-white/15">
                <Package className="w-6 h-6 text-white" /> {/* Icono de paquete */}
              </div>
            </div>
          </div>
          
          {/* Tarjeta: Agotados */}
          <div className="rounded-[20px] bg-gradient-to-r from-red-500 to-rose-500 text-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">Agotados</p>
                <p className="text-4xl font-bold mt-2">{stats.agotado}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/15">
                <AlertCircle className="w-6 h-6 text-white" /> {/* Icono de alerta */}
              </div>
            </div>
          </div>
          
          {/* Tarjeta: Bajo stock */}
          <div className="rounded-[20px] bg-gradient-to-r from-amber-400 to-orange-500 text-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">Bajo stock</p>
                <p className="text-4xl font-bold mt-2">{stats.bajoStock}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/15">
                <AlertCircle className="w-6 h-6 text-white" /> {/* Icono de alerta */}
              </div>
            </div>
          </div>
          
          {/* Tarjeta: Stock OK */}
          <div className="rounded-[20px] bg-gradient-to-r from-lime-500 to-green-600 text-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">Stock OK</p>
                <p className="text-4xl font-bold mt-2">{stats.ok}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/15">
                <TrendingUp className="w-6 h-6 text-white" /> {/* Icono de tendencia al alza */}
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="bg-white rounded-[24px] border border-emerald-100 shadow-[0_10px_30px_rgba(34,197,94,0.08)] p-5 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            {/* Contenedor de filtros (búsqueda + selects) */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 flex-1">
              {/* Input de búsqueda */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /> {/* Icono de lupa dentro del input */}
                <input
                  type="text"
                  placeholder="Buscar por nombre, categoría o ubicación..."
                  value={searchTerm} // Valor controlado
                  onChange={(e) => setSearchTerm(e.target.value)} // Actualiza estado al escribir
                  className="w-full pl-10 pr-4 py-3 bg-[#f8fff7] border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all"
                />
              </div>
              
              {/* Selector de filtro por estado */}
              <div className="relative w-full sm:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="ok">Stock OK</option>
                  <option value="bajo_stock">Bajo Stock</option>
                  <option value="agotado">Agotado</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                {/* Ícono de flecha hacia abajo (simula el dropdown nativo) */}
              </div>

              {/* Selector de filtro por categoría */}
              <div className="relative w-full sm:w-48">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                >
                  {categories.map((category) => ( // Itera sobre las categorías disponibles
                    <option key={category} value={category}>
                      {category === 'todas' ? 'Todas las categorías' : category}
                      {/* Muestra texto amigable para la opción 'todas' */}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* BOTONES DE ACCIÓN (solo visibles si tiene permisos de gestión) */}
            {canManageInventory && (
              <div className="flex gap-3">
                <button
                  onClick={handleExportarInventario} // Exportar a Excel
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-emerald-100 text-slate-700 rounded-xl transition-all font-semibold shadow-sm text-sm whitespace-nowrap hover:bg-emerald-50"
                >
                  <Download className="w-4 h-4" /> {/* Icono de descarga */}
                  <span>Exportar</span>
                </button>
                <button 
                  onClick={() => setShowModal(true)} // Abrir modal para crear producto
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white rounded-xl transition-all font-semibold shadow-md shadow-emerald-500/20 text-sm whitespace-nowrap"
                >
                  <Plus className="w-5 h-5" /> {/* Icono de más/agregar */}
                  <span>Nuevo</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
          <div className="overflow-x-auto"> {/* Scroll horizontal para móviles si la tabla es ancha */}
            <table className="w-full">
              <thead className="bg-[#f6fff2] border-b border-emerald-100">
                <tr>
                  {/* Encabezados de columnas */}
                  <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-emerald-700">Producto</th>
                  <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-emerald-700">Categoría</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-emerald-700">Cant.</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-emerald-700">Mín.</th>
                  <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-emerald-700">Ubicación</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-emerald-700">Estado</th>
                  <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-emerald-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {loading ? (
                  // ESTADO DE CARGA: Muestra animación de 3 puntos saltando
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce"></div> {/* Punto 1 */}
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div> {/* Punto 2 con delay */}
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div> {/* Punto 3 con delay */}
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  // ESTADO VACÍO: No hay productos que coincidan con los filtros
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-200/30 to-teal-200/20 flex items-center justify-center text-3xl">
                          📦 {/* Emoji de caja */}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">No se encontraron productos</p>
                          <p className="text-xs text-slate-500 mt-1">Intenta ajustar los filtros de búsqueda</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // LISTA DE PRODUCTOS: Itera y muestra cada producto
                  filteredProducts.map((producto) => (
                    <tr key={producto.id} className="group hover:bg-emerald-500/5 transition-all duration-200 border-b border-emerald-500/10 hover:border-emerald-500/30 last:border-b-0">
                      {/* Celda: Nombre y ID del producto */}
                      <td className="py-5 px-5">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{producto.nombre}</p>
                          <p className="text-xs text-slate-500 mt-0.5">ID: #{producto.id.toString().padStart(4, '0')}</p>
                          {/* padStart: asegura 4 dígitos (ej: 1 -> "0001") */}
                        </div>
                      </td>
                      
                      {/* Celda: Categoría con badge de color */}
                      <td className="py-5 px-5">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-300">
                          {producto.categoria}
                        </span>
                      </td>
                      
                      {/* Celda: Cantidad (con fondo de color según stock) */}
                      <td className="py-5 px-5 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${producto.cantidad <= producto.umbral_minimo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {producto.cantidad}
                        </span>
                      </td>
                      
                      {/* Celda: Umbral mínimo */}
                      <td className="py-5 px-5 text-center font-semibold text-slate-700 text-sm">{producto.umbral_minimo}</td>
                      
                      {/* Celda: Ubicación */}
                      <td className="py-5 px-5 text-slate-700 text-sm">{producto.ubicacion}</td>
                      
                      {/* Celda: Estado (badge con ícono y color) */}
                      <td className="py-5 px-5 text-center">{getEstadoBadge(producto.estado)}</td>
                      
                      {/* Celda: Acciones (botones de detalles, editar, eliminar) */}
                      <td className="py-5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Ver detalles: muestra toast con información del producto */}
                          <button
                            onClick={() => showDetalleToast('Detalle del producto', [
                              `Nombre: ${producto.nombre}`,
                              `Categoría: ${producto.categoria}`,
                              `Ubicación: ${producto.ubicacion}`,
                              `Cantidad disponible: ${producto.cantidad}`,
                              `Umbral mínimo: ${producto.umbral_minimo}`,
                              `Estado: ${producto.estado}`,
                            ])}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors hover:text-sky-700"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" /> {/* Icono de ojo */}
                          </button>
                          
                          {/* Botones de gestión (solo si tiene permisos) */}
                          {canManageInventory && (
                            <>
                              {/* Botón Editar: abre modal con datos del producto */}
                              <button 
                                onClick={() => {
                                  setSelectedProduct(producto); // Guarda producto seleccionado
                                  setFormProducto({ // Llena formulario con datos actuales
                                    nombre: producto.nombre,
                                    categoria: producto.categoria,
                                    ubicacion: producto.ubicacion,
                                    cantidad: producto.cantidad.toString(),
                                    umbral_minimo: producto.umbral_minimo.toString()
                                  });
                                  setShowModal(true); // Abre modal
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors hover:text-indigo-700"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" /> {/* Icono de edición */}
                              </button>
                              
                              {/* Botón Eliminar: confirma y elimina producto */}
                              <button 
                                onClick={() => handleEliminarProducto(producto.id)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors hover:text-rose-700"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" /> {/* Icono de basura */}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* PAGINACIÓN (actualmente deshabilitada - botones disabled) */}
          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
            {/* Información de cantidad de productos mostrados */}
            <p className="text-sm text-slate-500">
              Mostrando {filteredProducts.length} de {productos.length} productos
            </p>
            {/* Botones de paginación (deshabilitados, solo UI) */}
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled>
                Anterior
              </button>
              <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PARA AGREGAR/EDITAR PRODUCTO */}
      {/* Solo se muestra si showModal es true Y tiene permisos de gestión */}
      {showModal && canManageInventory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          {/* Contenedor del modal */}
          <div className="sigirl-form-surface rounded-[28px] max-w-2xl w-full max-h-[92vh] overflow-y-auto animate-in zoom-in duration-300">
            
            {/* HEADER DEL MODAL */}
            <div className="p-6 md:p-8 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white shadow-lg shadow-emerald-500/40">
                  {selectedProduct ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {/* Icono dinámico: Edit si es edición, Plus si es creación */}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
                    {/* Título dinámico según modo */}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                    Complete el formulario para {selectedProduct ? 'actualizar' : 'crear'} un producto
                  </p>
                </div>
              </div>
            </div>
            
            {/* CUERPO DEL MODAL - Formulario */}
            <div className="p-7 md:p-10 space-y-6">
              {/* Campo: Nombre del producto */}
              <div>
                <label className="sigirl-form-label">Nombre del producto</label>
                <input 
                  type="text" 
                  value={formProducto.nombre}
                  onChange={(e) => setFormProducto({...formProducto, nombre: e.target.value})}
                  className="sigirl-form-control" 
                  placeholder="Ej: Alcohol etílico" 
                />
              </div>
              
              {/* Campos en grid de 2 columnas */}
              <div className="grid grid-cols-2 gap-5">
                {/* Campo: Categoría (select) */}
                <div>
                  <label className="sigirl-form-label">Categoría</label>
                  <select 
                    value={formProducto.categoria}
                    onChange={(e) => setFormProducto({...formProducto, categoria: e.target.value})}
                    className="sigirl-form-control"
                  >
                    <option>Solventes</option>
                    <option>Ácidos</option>
                    <option>EPP</option>
                    <option>Vidrio</option>
                  </select>
                </div>
                
                {/* Campo: Ubicación */}
                <div>
                  <label className="sigirl-form-label">Ubicación</label>
                  <input 
                    type="text" 
                    value={formProducto.ubicacion}
                    onChange={(e) => setFormProducto({...formProducto, ubicacion: e.target.value})}
                    className="sigirl-form-control" 
                    placeholder="Ej: Almacén A" 
                  />
                </div>
              </div>
              
              {/* Campos en grid de 2 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campo: Cantidad */}
                <div>
                  <label className="sigirl-form-label">Cantidad</label>
                  <input 
                    type="number" 
                    value={formProducto.cantidad}
                    onChange={(e) => setFormProducto({...formProducto, cantidad: e.target.value})}
                    className="sigirl-form-control" 
                    placeholder="0" 
                    min="0" // No permite números negativos
                  />
                </div>
                
                {/* Campo: Umbral mínimo */}
                <div>
                  <label className="sigirl-form-label">Umbral mín.</label>
                  <input 
                    type="number" 
                    value={formProducto.umbral_minimo}
                    onChange={(e) => setFormProducto({...formProducto, umbral_minimo: e.target.value})}
                    className="sigirl-form-control" 
                    placeholder="5" 
                    min="0" // No permite números negativos
                  />
                </div>
              </div>
            </div>
            
            {/* FOOTER DEL MODAL - Botones de acción */}
            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 rounded-b-[28px] flex flex-col-reverse sm:flex-row gap-3 justify-end">
              {/* Botón Cancelar */}
              <button 
                onClick={() => {
                  setShowModal(false); // Cierra modal
                  setSelectedProduct(null); // Limpia producto seleccionado
                  setFormProducto({ // Resetea formulario
                    nombre: '',
                    categoria: 'Solventes',
                    ubicacion: '',
                    cantidad: '',
                    umbral_minimo: ''
                  });
                }}
                className="sigirl-btn-secondary text-sm w-full sm:w-auto"
              >
                Cancelar
              </button>
              
              {/* Botón Guardar/Crear */}
              <button 
                onClick={handleGuardarProducto}
                className="sigirl-btn-primary text-sm w-full sm:w-auto"
              >
                {selectedProduct ? 'Guardar cambios' : 'Crear producto'}
                {/* Texto dinámico según modo */}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Inventario; // Exporta el componente para uso en otras partes de la app