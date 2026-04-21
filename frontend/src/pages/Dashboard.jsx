// Dashboard general del sistema.
// Muestra métricas, gráficas, alertas y resumen operativo.

// IMPORTS - Librerías y dependencias externas
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'; // Hooks de React para estado, efectos y memoización
import { toast } from 'react-toastify'; // Notificaciones emergentes estilo toast
import { useNavigate } from 'react-router-dom'; // Hook para navegación entre rutas
import {
  ResponsiveContainer, // Contenedor responsive para gráficos
  BarChart, // Componente de gráfico de barras
  Bar, // Componente de barra individual
  XAxis, // Eje X del gráfico
  YAxis, // Eje Y del gráfico
  CartesianGrid, // Cuadrícula de fondo
  Tooltip, // Tooltip interactivo
  PieChart, // Componente de gráfico circular
  Pie, // Componente de porción del gráfico circular
  Cell, // Celda individual para colorear porciones
} from 'recharts'; // Librería de gráficos
import { 
  AlertCircle, // Icono de alerta/círculo de exclamación
  BarChart3, // Icono de gráfico de barras
  ClipboardList, // Icono de lista/portapapeles
  Package2, // Icono de paquete/producto
  RefreshCw, // Icono de actualización/recargar
  TrendingUp, // Icono de tendencia al alza
  Users, // Icono de usuarios (no usado)
  CheckCircle2, // Icono de verificación (no usado)
  Clock, // Icono de reloj (no usado)
  XCircle, // Icono de círculo con equis (error/eliminar)
  Download, // Icono de descarga
  ArrowUpRight, // Icono de flecha diagonal hacia arriba derecha
  Sparkles // Icono de estrellas/destellos
} from 'lucide-react'; // Librería de iconos moderna
import api from '../services/api'; // Servicio de API configurado con axios
import { UserContext } from '../context/AuthContext'; // Contexto de autenticación de usuario
import { exportToExcel } from '../utils/reportExport'; // Utilidad para exportar datos a Excel
import Layout from '../components/Layout'; // Componente de layout principal (header, sidebar, etc.)

// CONFIGURACIÓN VISUAL
// Paleta de colores actualizada con más vibrancia
const CHART_COLORS = ['#43bb52', '#78d64b', '#a3e579', '#f59e0b', '#ef4444']; // Colores para gráficos (verdes, naranja, rojo)

// Objeto con temas de color para diferentes tipos de tarjetas métricas
const METRIC_COLORS = {
  blue: { // Tema azul (para productos)
    bg: 'from-blue-500 to-blue-600', // Gradiente de fondo azul
    light: 'bg-blue-50', // Versión clara para hover
    text: 'text-blue-700', // Color de texto azul
    border: 'border-blue-200', // Borde azul claro
    shadow: 'shadow-blue-200/50' // Sombra azul semi-transparente
  },
  red: { // Tema rojo (para alertas/errores)
    bg: 'from-rose-500 to-red-600', // Gradiente de fondo rojo/rosa
    light: 'bg-rose-50', // Versión clara
    text: 'text-rose-700', // Texto rosa
    border: 'border-rose-200', // Borde rosa claro
    shadow: 'shadow-rose-200/50' // Sombra rosa
  },
  orange: { // Tema naranja (para advertencias/stock bajo)
    bg: 'from-amber-400 to-orange-500', // Gradiente ámbar a naranja
    light: 'bg-amber-50', // Versión clara ámbar
    text: 'text-amber-700', // Texto ámbar
    border: 'border-amber-200', // Borde ámbar claro
    shadow: 'shadow-orange-200/50' // Sombra naranja
  },
  green: { // Tema verde (para pedidos/éxito)
    bg: 'from-emerald-500 to-green-600', // Gradiente esmeralda a verde
    light: 'bg-emerald-50', // Versión clara esmeralda
    text: 'text-emerald-700', // Texto esmeralda
    border: 'border-emerald-200', // Borde esmeralda claro
    shadow: 'shadow-emerald-200/50' // Sombra esmeralda
  },
};

// COMPONENTE: Tarjeta de métricas con glassmorphism
// Props: title (título), value (valor numérico), icon (icono), tone (color), trend (tendencia), subtitle (subtítulo), onClick (acción al hacer clic)
const StatCard = ({ title, value, icon, tone, trend, subtitle, onClick }) => {
  const colors = METRIC_COLORS[tone] || METRIC_COLORS.green; // Selecciona el tema de color según 'tone', si no existe usa verde por defecto
  
  return (
    <div // Contenedor principal de la tarjeta
      onClick={onClick} // Manejador de clic para navegación o acción
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.bg} ${colors.shadow} p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
      // group: permite estilos anidados en hover, relative: para posicionar elementos absolutos internos
      // overflow-hidden: oculta desbordes, rounded-2xl: bordes muy redondeados
      // bg-gradient-to-br: gradiente diagonal, p-6: padding grande
      // shadow-xl: sombra grande, hover:shadow-2xl: sombra más grande al hover
      // hover:-translate-y-1: levanta la tarjeta al pasar el mouse
      // cursor-pointer: cambia el cursor a mano
    >
      {/* Efectos de luz decorativos - círculos con blur */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors" />
      {/* absolute: posicionamiento absoluto, top-0 right-0: esquina superior derecha */}
      {/* -mt-4 -mr-4: desplaza ligeramente hacia afuera, w-28 h-28: tamaño cuadrado */}
      {/* bg-white/20: blanco 20% opacidad, rounded-full: círculo perfecto */}
      {/* blur-2xl: desenfoque extremo, group-hover:bg-white/30: aumenta opacidad al hover */}
      
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
      {/* Similar al anterior pero en esquina inferior izquierda, más pequeño */}
      
      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/10 rounded-full blur-lg" />
      {/* Círculo decorativo adicional en posición central derecha */}
      
      <div className="relative flex items-start justify-between"> {/* relative: para estar por encima de los círculos absolutos, flex: layout flexible, items-start: alineación superior, justify-between: espacio entre elementos */}
        <div className="flex-1"> {/* flex-1: ocupa todo el espacio disponible */}
          <div className="flex items-center gap-2 mb-3"> {/* flex: alineación horizontal, gap-2: espacio entre elementos, mb-3: margen inferior */}
            <span className="text-xs font-bold text-white/90 uppercase tracking-wider">{title}</span> {/* texto pequeño, negrita, blanco 90%, mayúsculas, espaciado entre letras */}
            {trend && ( // Si existe la prop 'trend', muestra el indicador de tendencia
              <span className="flex items-center gap-1 text-xs font-bold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" /> {/* Icono de tendencia al alza */}
                {trend} {/* Texto de la tendencia (ej: "+12%") */}
              </span>
            )}
          </div>
          <p className="text-4xl font-bold tracking-tight">{value}</p> {/* Valor principal grande, negrita, espaciado ajustado */}
          {subtitle && <p className="mt-2 text-sm text-white/80 font-medium">{subtitle}</p>} {/* Subtítulo si existe, blanco 80%, margen superior */}
        </div>
        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform duration-300">
          {/* Contenedor del ícono con padding, bordes redondeados, fondo blanco semi-transparente, blur */}
          {/* border: borde blanco muy transparente, group-hover:scale-110: aumenta tamaño al 110% al hover */}
          {icon} {/* Renderiza el ícono pasado como prop */}
        </div>
      </div>
      
      {/* Indicador de hover - flecha que aparece al pasar el mouse */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* absolute bottom-4 right-4: posicionado en esquina inferior derecha */}
        {/* opacity-0: invisible por defecto, group-hover:opacity-100: visible al hover */}
        <ArrowUpRight className="h-5 w-5 text-white/60" /> {/* Icono de flecha diagonal, blanco 60% */}
      </div>
    </div>
  );
};

// COMPONENTE: Sección/Card con glassmorphism
// Props: title, subtitle, icon, children (contenido interno), action (botón opcional), onActionClick, className
const SectionCard = ({ title, subtitle, icon, children, action, onActionClick, className = '' }) => (
  <div className={`rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl p-6 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 ${className}`}>
    {/* rounded-3xl: bordes muy redondeados, border-white/60: borde blanco 60% opaco */}
    {/* bg-white/80: fondo blanco 80% opaco, backdrop-blur-xl: desenfoque de fondo tipo cristal */}
    {/* shadow-xl: sombra grande, shadow-slate-200/50: sombra gris pizarra semi-transparente */}
    {/* hover:shadow-2xl: sombra más grande al hover, transition-all: transición suave en todas las propiedades */}
    
    <div className="flex items-center justify-between mb-6"> {/* Header de la sección con título y botón de acción */}
      <div className="flex items-center gap-3"> {/* Contenedor del icono y títulos */}
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 shadow-sm">
          {/* Contenedor del ícono con gradiente verde claro, sombra pequeña */}
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2> {/* Título principal */}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>} {/* Subtítulo si existe */}
        </div>
      </div>
      {action && ( // Si existe la prop 'action', renderiza el botón
        <button
          type="button" // Previene envío de formularios
          onClick={onActionClick} // Manejador de clic para la acción
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all hover:scale-105"
          // flex con gap para ícono y texto, padding horizontal/vertical, bordes redondeados
          // text-emerald-700: texto verde esmeralda, bg-emerald-50: fondo verde claro
          // hover:bg-emerald-100: fondo más oscuro al hover, border-emerald-200: borde verde
          // hover:scale-105: aumenta tamaño 5% al hover
        >
          {action} {/* Renderiza el contenido del botón (ej: "Exportar") */}
        </button>
      )}
    </div>
    {children} {/* Renderiza el contenido interno (gráficos, tablas, etc.) */}
  </div>
);

// COMPONENTE: Tooltip personalizado elegante para gráficos
// Props: active (si está activo), payload (datos del punto), label (etiqueta del punto)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) { // Solo muestra si está activo y hay datos
    return (
      <div className="bg-white/95 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-emerald-100">
        {/* Fondo blanco 95% opaco con blur, padding, bordes redondeados, sombra grande, borde verde claro */}
        <p className="font-bold text-slate-800 mb-2 text-sm">{label}</p> {/* Etiqueta (ej: nombre de categoría) */}
        {payload.map((entry, index) => ( // Itera sobre cada valor en el punto del gráfico
          <div key={`tooltip-${entry.name}-${index}`} className="flex items-center gap-2 text-sm">
            {/* key único para React, flex con gap para alinear */}
            <div 
              className="w-3 h-3 rounded-full shadow-sm" 
              style={{ backgroundColor: entry.color }} // Cuadro de color que coincide con el gráfico
            />
            <span className="text-slate-600">{entry.name}:</span> {/* Nombre de la serie */}
            <span className="font-bold text-slate-800 text-lg">{entry.value}</span> {/* Valor en negrita grande */}
          </div>
        ))}
      </div>
    );
  }
  return null; // Si no está activo, no muestra nada
};

// COMPONENTE PRINCIPAL: Dashboard
function Dashboard() {
  // HOOKS Y CONTEXTO
  const navigate = useNavigate(); // Hook para navegación programática entre rutas
  const { isAdmin, role } = useContext(UserContext); // Obtiene si es admin y el rol del contexto de autenticación
  const isJefe = role === 'jefe' || role === 'jefe_superior'; // Determina si el usuario es jefe (normal o superior)
  const canExportReports = isAdmin || isJefe; // Permiso para exportar reportes (solo admin o jefe)
  
  // ESTADOS
  const [productos, setProductos] = useState([]); // Estado para lista de productos
  const [pedidos, setPedidos] = useState([]); // Estado para lista de pedidos
  const [loading, setLoading] = useState(true); // Estado de carga (true mientras carga datos)
  const [chartsReady, setChartsReady] = useState(false); // Estado para saber si los gráficos están listos para renderizar (evita errores de recharts)

  // FUNCIÓN: Cargar datos del dashboard
  // useCallback: memoiza la función para que no se recree en cada renderizado
  // showToast: si es true, muestra toast de éxito al cargar
  const cargarDatos = useCallback(async (showToast = false) => {
    setLoading(true); // Activa el estado de carga
    try {
      // Realiza ambas peticiones en paralelo con Promise.all para mayor eficiencia
      const [productosResponse, pedidosResponse] = await Promise.all([
        api.get('productos/').catch(() => ({ data: [] })), // Obtiene productos, si falla devuelve array vacío
        (isAdmin || isJefe) // Solo admin y jefe pueden ver pedidos
          ? api.get('pedidos/').catch(() => ({ data: [] })) // Obtiene pedidos si tiene permiso
          : Promise.resolve({ data: [] }), // Si no tiene permiso, devuelve array vacío directamente
      ]);

      setProductos(productosResponse.data || []); // Actualiza estado de productos (array vacío si no hay datos)
      setPedidos(pedidosResponse.data || []); // Actualiza estado de pedidos (array vacío si no hay datos)

      if (showToast) toast.success('✨ Dashboard actualizado correctamente'); // Toast de éxito si se solicitó
    } catch {
      toast.error('❌ No se pudo cargar el dashboard'); // Toast de error genérico
    } finally {
      setLoading(false); // Desactiva estado de carga siempre (éxito o error)
    }
  }, [isAdmin]); // Dependencia: solo se recrea si cambia isAdmin (isJefe se deriva de role que también cambia)

  // EFECTO: Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos(); // Ejecuta carga inicial sin mostrar toast
  }, [cargarDatos]); // Dependencia: cargarDatos (que depende de isAdmin)

  // EFECTO: Preparar gráficos después del montaje
  useEffect(() => {
    // requestAnimationFrame: espera al próximo frame de animación del navegador
    const frame = window.requestAnimationFrame(() => setChartsReady(true));
    // Esto asegura que los gráficos se rendericen después de que el DOM esté listo
    // Evita errores de recharts con dimensiones no disponibles
    return () => window.cancelAnimationFrame(frame); // Cleanup: cancela si el componente se desmonta antes
  }, []); // Solo se ejecuta una vez al montar

  // MÉTRICAS CALCULADAS con useMemo para optimización
  // useMemo: solo recalcula cuando productos o pedidos cambian
  const stats = useMemo(() => ({
    totalProductos: productos.length, // Cantidad total de productos en inventario
    bajoStock: productos.filter((item) => Number(item.cantidad || 0) <= Number(item.minimo || 5)).length,
    // Filtra productos donde cantidad <= mínimo (si no hay mínimo usa 5 por defecto)
    totalPedidos: pedidos.length, // Cantidad total de pedidos realizados
    alertas: pedidos.filter((item) => item.estado === 'rechazado').length, // Pedidos rechazados
    aprobados: pedidos.filter((item) => item.estado === 'aprobado').length, // Pedidos aprobados
    pendientes: pedidos.filter((item) => item.estado === 'pendiente').length, // Pedidos pendientes
  }), [productos, pedidos]); // Dependencias: productos y pedidos

  // DATOS PARA GRÁFICA DE BARRAS (Distribución por categoría)
  const barData = useMemo(() => {
    // Agrupa productos por categoría y suma cantidades
    const grouped = productos.reduce((acc, item) => {
      const key = item.categoria_nombre || item.categoria || 'General'; // Usa nombre de categoría o 'General' por defecto
      acc[key] = (acc[key] || 0) + Number(item.cantidad || 0); // Suma la cantidad (convierte a número, 0 si no hay)
      return acc;
    }, {}); // Objeto vacío como acumulador inicial

    // Convierte el objeto agrupado a array de objetos {name, value}
    // slice(0,5): limita a las 5 categorías con más stock
    return Object.entries(grouped).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [productos]); // Dependencia: productos

  // DATOS PARA GRÁFICA DE DONUT (Estado de pedidos)
  const donutData = useMemo(() => {
    const values = [
      { name: 'Aprobados', value: stats.aprobados, color: '#43bb52' }, // Verde para aprobados
      { name: 'Pendientes', value: stats.pendientes, color: '#f59e0b' }, // Naranja para pendientes
      { name: 'Rechazados', value: stats.alertas, color: '#ef4444' }, // Rojo para rechazados
    ].filter((item) => item.value > 0); // Filtra para mostrar solo estados con valores > 0
    
    return values;
  }, [stats]); // Dependencia: stats (aprobados, pendientes, alertas)

  // MANEJADOR: Exportar reporte de categorías a Excel
  const handleExportCategorias = () => {
    // Verifica permisos
    if (!canExportReports) {
      toast.info('La exportación de reportes está disponible para administración y jefatura.');
      return; // Sale de la función si no tiene permiso
    }

    // Calcula el total de productos (si es 0 usa 1 para evitar división por cero)
    const total = barData.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
    
    // Construye las filas para el Excel con datos enriquecidos
    const rows = barData.map((item) => ({
      Categoria: item.name, // Nombre de la categoría
      Cantidad: item.value, // Cantidad de productos
      Porcentaje: `${((Number(item.value || 0) / total) * 100).toFixed(1)}%`, // Porcentaje del total
      Nivel: Number(item.value || 0) <= 5 ? 'Leve' : Number(item.value || 0) <= 15 ? 'Medio' : 'Crítico',
      // Clasifica según cantidad: <=5 Leve, <=15 Medio, >15 Crítico
      Recomendacion: Number(item.value || 0) <= 5 
        ? 'Seguimiento normal' 
        : Number(item.value || 0) <= 15 
          ? 'Revisar abastecimiento' 
          : 'Priorizar reposición y control',
      // Recomendación según el nivel de stock
    }));

    exportToExcel(rows, 'reporte-categorias-sigirl.xlsx', 'Categorias'); // Exporta a Excel
    toast.success('Reporte por categoría exportado a Excel.'); // Confirma al usuario
  };

  // MANEJADOR: Exportar reporte de estados de pedidos a Excel
  const handleExportEstados = () => {
    // Verifica permisos
    if (!canExportReports) {
      toast.info('La exportación de reportes está disponible para administración y jefatura.');
      return;
    }

    // Calcula el total de pedidos (evita división por cero)
    const total = donutData.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
    
    // Construye las filas para el Excel
    const rows = donutData.map((item) => {
      // Determina severidad según el estado
      const severity = item.name === 'Rechazados' 
        ? 'Crítico' 
        : item.name === 'Pendientes' 
          ? 'Medio' 
          : 'Leve';
      
      // Recomendación según el estado
      const recommendation = item.name === 'Rechazados'
        ? 'Revisar causa raíz y contactar a soporte o jefatura.'
        : item.name === 'Pendientes'
          ? 'Dar seguimiento y validar stock disponible.'
          : 'Mantener monitoreo normal.';

      return {
        Estado: item.name, // Estado del pedido
        Total: item.value, // Cantidad de pedidos
        Porcentaje: `${((Number(item.value || 0) / total) * 100).toFixed(1)}%`, // Porcentaje
        Severidad: severity, // Nivel de severidad
        Recomendacion: recommendation, // Recomendación de acción
      };
    });

    exportToExcel(rows, 'estado-pedidos-sigirl.xlsx', 'Pedidos'); // Exporta a Excel
    toast.success('Estado de pedidos exportado a Excel.'); // Confirma al usuario
  };

  // MANEJADOR: Ver todos los pedidos (navega según rol)
  const handleVerTodos = () => {
    if (isAdmin) {
      navigate('/admin?tab=pedidos'); // Admin va a /admin con parámetro tab=pedidos
      return;
    }

    if (isJefe) {
      navigate('/jefe?tab=pedidos'); // Jefe va a /jefe con parámetro tab=pedidos
      return;
    }

    navigate('/pedidos'); // Usuario normal va a /pedidos
  };

  // DATOS: Pedidos recientes (últimos 8)
  const recentOrders = useMemo(() => {
    // Toma los primeros 8 pedidos y los mapea a un formato estandarizado
    return pedidos.slice(0, 8).map((pedido) => ({
      id: pedido.id, // ID del pedido
      codigo: pedido.codigo || `PED-${String(pedido.id).padStart(3, '0')}`, // Código o genera uno por defecto
      // padStart(3,'0'): asegura mínimo 3 dígitos (ej: 1 -> "001")
      producto: pedido.producto_nombre || pedido.producto || 'Producto', // Nombre del producto
      solicitante: pedido.solicitante || pedido.usuario_username || 'Usuario', // Nombre del solicitante
      cantidad: pedido.cantidad || 1, // Cantidad (1 por defecto)
      estado: pedido.estado || 'pendiente', // Estado (pendiente por defecto)
      fecha: pedido.fecha_solicitud || pedido.fecha || new Date().toISOString().split('T')[0], // Fecha o fecha actual
    }));
  }, [pedidos]); // Dependencia: pedidos

  // RENDERIZADO PRINCIPAL
  return (
    <Layout> {/* Componente Layout que provee estructura base (header, sidebar, etc.) */}
      <div className="space-y-6"> {/* Contenedor con espaciado vertical entre elementos */}
        
        {/* HEADER DEL DASHBOARD */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          {/* flex-col en móvil, sm:flex-row en pantallas pequeñas en adelante */}
          {/* pb-2: padding bottom pequeño */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-emerald-500" /> {/* Icono decorativo */}
              <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Panel Ejecutivo</span>
              {/* Etiqueta superior */}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Dashboard de Control</h2> {/* Título principal */}
            <p className="text-slate-500">Visualiza métricas, pedidos y actividad del laboratorio en tiempo real</p>
            {/* Subtítulo descriptivo */}
          </div>
          <button
            onClick={() => cargarDatos(true)} // Al hacer clic, recarga datos y muestra toast
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm hover:shadow-md hover:scale-105"
            // Botón de actualización con ícono
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 
            {/* Ícono que gira si está cargando */}
            Actualizar datos
          </button>
        </div>

        {/* CARDS DE MÉTRICAS - Grid responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* 1 columna en móvil, 2 en tablet, 4 en escritorio grande */}
          
          <StatCard 
            title="Total Productos" 
            value={stats.totalProductos} 
            icon={<Package2 className="h-6 w-6 text-white" />} 
            tone="blue" // Tema azul
            subtitle="En inventario general"
          />
          
          <StatCard 
            title="Pedidos Activos" 
            value={stats.totalPedidos} 
            icon={<ClipboardList className="h-6 w-6 text-white" />} 
            tone="green" // Tema verde
            trend="+12%" // Muestra tendencia positiva
            subtitle="Este mes"
          />
          
          <StatCard 
            title="Stock Bajo" 
            value={stats.bajoStock} 
            icon={<AlertCircle className="h-6 w-6 text-white" />} 
            tone="orange" // Tema naranja (advertencia)
            subtitle="Requieren reposición"
          />
          
          <StatCard 
            title="Alertas Críticas" 
            value={stats.alertas} 
            icon={<XCircle className="h-6 w-6 text-white" />} 
            tone="red" // Tema rojo (crítico)
            subtitle="Pedidos rechazados"
          />
        </div>

        {/* GRID DE GRÁFICAS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 1 columna en móvil, 2 en escritorio grande */}
          
          {/* GRÁFICA DE BARRAS - Distribución por Categoría */}
          <SectionCard
            title="Distribución por Categoría"
            subtitle="Inventario actualizado en tiempo real"
            icon={<BarChart3 className="h-5 w-5" />}
            action={canExportReports ? <><Download className="h-4 w-4" /> Exportar</> : null}
            // Solo muestra botón Exportar si tiene permisos
            onActionClick={handleExportCategorias}
          >
            <div className="h-[320px] min-h-[320px] min-w-0 w-full overflow-hidden">
              {/* Altura fija, overflow hidden para evitar desbordes */}
              {chartsReady && ( // Solo renderiza si chartsReady es true (evita errores de recharts)
                <ResponsiveContainer width="99%" height={280} debounce={120}>
                  {/* debounce: retraso para redimensionamiento, mejora rendimiento */}
                  <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    {/* Cuadrícula punteada, sin líneas verticales */}
                    
                    <XAxis 
                      dataKey="name" // Usa la propiedad 'name' de los datos
                      axisLine={false} // Oculta línea del eje
                      tickLine={false} // Oculta marcas de los ticks
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} // Estilo de etiquetas
                      dy={10} // Desplazamiento vertical de etiquetas
                    />
                    
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 8 }} />
                    {/* Tooltip personalizado, cursor con fondo gris y borde redondeado */}
                    
                    <Bar 
                      dataKey="value" // Usa la propiedad 'value'
                      fill="url(#colorGradient)" // Usa gradiente definido en defs
                      radius={[12, 12, 0, 0]} // Bordes superiores redondeados (12px), inferiores rectos
                      maxBarSize={60} // Ancho máximo de cada barra
                    />
                    
                    <defs> {/* Definición de gradiente para las barras */}
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#78d64b" /> {/* Verde claro arriba */}
                        <stop offset="100%" stopColor="#43bb52" /> {/* Verde oscuro abajo */}
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          {/* GRÁFICA DE DONUT - Estado de Pedidos */}
          <SectionCard
            title="Estado de Pedidos"
            subtitle="Distribución de solicitudes"
            icon={<ClipboardList className="h-5 w-5" />}
            action={canExportReports ? <><Download className="h-4 w-4" /> Exportar</> : null}
            onActionClick={handleExportEstados}
          >
            <div className="h-[320px] min-h-[320px] min-w-0 w-full flex items-center gap-3 overflow-hidden">
              {/* Contenedor flex para poner gráfico y leyenda lado a lado */}
              
              <div className="flex-1 h-full min-w-0 relative">
                {/* Contenedor del gráfico, relative para posicionar elemento central */}
                {chartsReady && (
                  <ResponsiveContainer width="99%" height={280} debounce={120}>
                    <PieChart>
                      <Pie 
                        data={donutData} 
                        dataKey="value" 
                        nameKey="name" 
                        innerRadius={70} // Radio interno (crea efecto donut)
                        outerRadius={110} // Radio externo
                        paddingAngle={4} // Espacio entre porciones (4 grados)
                        stroke="none" // Sin borde
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`donut-cell-${entry.name}-${index}`} fill={entry.color} />
                          // Asigna color específico a cada porción
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                
                {/* Centro del donut - muestra el total de pedidos */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* pointer-events-none: permite hacer clic a través del elemento */}
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-800">{stats.totalPedidos}</p>
                    <p className="text-xs text-slate-500 font-medium uppercase">Total</p>
                  </div>
                </div>
              </div>
              
              {/* LEYENDA PERSONALIZADA del donut */}
              <div className="w-44 space-y-4 pr-2">
                {/* Ancho fijo, espacio vertical entre elementos, padding right */}
                {donutData.map((item, index) => (
                  <div key={`donut-legend-${item.name}-${index}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    {/* Elemento de leyenda clickeable con hover */}
                    <div 
                      className="w-4 h-4 rounded-full shadow-md group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: item.color }} // Cuadro de color
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.value} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* TABLA DE PEDIDOS RECIENTES */}
        <SectionCard
          title="Pedidos Recientes"
          subtitle="Últimas solicitudes del sistema"
          icon={<ClipboardList className="h-5 w-5" />}
          action={<span className="text-emerald-600 font-semibold hover:text-emerald-700 cursor-pointer">Ver todos →</span>}
          // Acción que parece un enlace
          onActionClick={handleVerTodos}
        >
          <div className="overflow-x-auto -mx-6 px-6">
            {/* overflow-x-auto: scroll horizontal si es necesario */}
            {/* -mx-6 px-6: compensa el padding del SectionCard para que la tabla ocupe todo el ancho */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {/* Encabezados de columnas */}
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cantidad</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Cuerpo de la tabla con divisiones entre filas */}
                {recentOrders.map((order) => ( // Itera sobre los pedidos recientes
                  <tr key={order.id} className="hover:bg-emerald-50/30 transition-colors group">
                    {/* Fila con hover sutil */}
                    
                    {/* Celda: Código */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-sm font-semibold group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                        {order.codigo}
                      </span>
                    </td>
                    
                    {/* Celda: Solicitante con avatar de iniciales */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">
                          {order.solicitante.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          {/* Toma primeras letras de cada palabra, máximo 2 caracteres, mayúsculas */}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{order.solicitante}</span>
                      </div>
                    </td>
                    
                    {/* Celda: Producto */}
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-slate-700">{order.producto}</span>
                    </td>
                    
                    {/* Celda: Cantidad */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                        {order.cantidad}
                      </span>
                    </td>
                    
                    {/* Celda: Estado con badge colorido */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                          order.estado === 'aprobado'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' // Verde para aprobado
                            : order.estado === 'rechazado'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' // Rojo para rechazado
                              : 'bg-amber-100 text-amber-700 border border-amber-200' // Ámbar para pendiente
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            order.estado === 'aprobado'
                              ? 'bg-emerald-500 animate-pulse' // Verde con animación de pulso
                              : order.estado === 'rechazado'
                                ? 'bg-rose-500' // Rojo sin pulso
                                : 'bg-amber-500' // Ámbar sin pulso
                          }`}
                        />
                        {order.estado.charAt(0).toUpperCase() + order.estado.slice(1)}
                        {/* Capitaliza primera letra del estado */}
                      </span>
                    </td>
                    
                    {/* Celda: Acción */}
                    <td className="py-4 px-4">
                      <button className="text-sm font-bold text-emerald-600 hover:text-emerald-800 hover:underline transition-all">
                        {order.estado === 'pendiente' ? 'Revisar →' : 'Ver detalles →'}
                        {/* Texto dinámico según estado */}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </Layout>
  );
}

export default Dashboard; // Exporta el componente para uso en otras partes de la app