// Dashboard general del sistema - Estilo Laboratorio Claro (NO responsive)
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  AlertCircle, 
  BarChart3, 
  ClipboardList, 
  Package2, 
  RefreshCw,
  TrendingUp,
  XCircle,
  Download,
  ArrowUpRight,
  FlaskConical,
} from 'lucide-react';
import api from '../services/api';
import { UserContext } from '../context/UserContext';
import { exportToExcel } from '../utils/reportExport';
import Layout from '../components/Layout';

// Colores para gráficos
const CHART_COLORS = ['#1FA971', '#157A55', '#4ade80', '#f59e0b', '#ef4444'];

// Componente de tarjeta métrica estilo claro
const LabMetricCard = ({ title, value, icon, trend, subtitle }) => {
  return (
    <div className="bg-white border border-[#E0E0E0] border-t-[3px] border-t-[#1FA971] rounded-xl p-4 shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_18px_rgba(31,169,113,0.13)] hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">{title}</span>
            {trend && (
              <span className="flex items-center gap-0.5 text-[8px] font-mono text-[#157A55] bg-[#E8F5F0] px-1.5 py-0.5 rounded">
                <TrendingUp className="h-2.5 w-2.5" />
                {trend}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold font-mono text-[#157A55]">{value}</p>
          {subtitle && <p className="text-[9px] text-stone-500 font-mono mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-[#E8F5F0] border border-[#1FA971]/20 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </div>
  );
};

// Componente de sección estilo claro
const LabSection = ({ title, subtitle, icon, children, action, onActionClick }) => (
  <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
    <div className="px-5 py-4 border-b border-[#E0E0E0] bg-[#E8F5F0] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white border border-[#1FA971]/20 shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold font-mono text-[#157A55] uppercase tracking-wider">{title}</h2>
          {subtitle && <p className="text-[10px] text-stone-500 font-mono">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={onActionClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold text-[#157A55] bg-white border border-[#1FA971]/30 hover:bg-[#E8F5F0] transition-all"
        >
          {action}
        </button>
      )}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

// Tooltip personalizado claro
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-stone-200 rounded-md p-3 shadow-lg">
        <p className="font-mono font-bold text-emerald-600 mb-1.5 text-[10px]">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-[10px] font-mono">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-stone-500">{entry.name}:</span>
            <span className="font-bold text-emerald-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const navigate = useNavigate();
  const { role } = useContext(UserContext);
  const isAdmin = role === 'admin';
  const isJefe = role === 'jefe' || role === 'jefe_superior';
  const canExportReports = isAdmin || isJefe;
  
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);

  const cargarDatos = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const [productosResponse, pedidosResponse] = await Promise.all([
        api.get('productos/').catch(() => ({ data: [] })),
        api.get('pedidos/').catch(() => ({ data: [] })),
      ]);

      const prods = productosResponse.data?.results ?? productosResponse.data ?? [];
      setProductos(prods);
      setPedidos(pedidosResponse.data?.results ?? pedidosResponse.data ?? []);

      if (showToast) toast.success('🔬 Dashboard actualizado');

      // Recordatorios de stock — leer preferencia del usuario
      if (!showToast) {
        try {
          const username = localStorage.getItem('username') || '';
          const prefs = JSON.parse(localStorage.getItem(`sigirl_profile_preferences:${username}`) || '{}');
          const stockReminders = prefs.stockReminders !== false; // activo por defecto
          if (stockReminders) {
            const criticos = prods.filter((p) => Number(p.cantidad ?? 0) <= 0);
            const bajos    = prods.filter((p) => Number(p.cantidad ?? 0) > 0 && Number(p.cantidad ?? 0) <= Number(p.minimo ?? p.umbral_minimo ?? 5));
            if (criticos.length > 0) {
              toast.error(`🔴 ${criticos.length} reactivo${criticos.length > 1 ? 's' : ''} agotado${criticos.length > 1 ? 's' : ''}: ${criticos.slice(0,2).map(p=>p.nombre).join(', ')}${criticos.length > 2 ? '...' : ''}`, { autoClose: 6000 });
            }
            if (bajos.length > 0) {
              toast.warn(`🟠 ${bajos.length} reactivo${bajos.length > 1 ? 's' : ''} bajo mínimo: ${bajos.slice(0,2).map(p=>p.nombre).join(', ')}${bajos.length > 2 ? '...' : ''}`, { autoClose: 6000 });
            }
          }
        } catch { /* preferencias no críticas */ }
      }
    } catch {
      toast.error('❌ Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const stats = useMemo(() => ({
    totalProductos: productos.length,
    bajoStock: productos.filter((item) => Number(item.cantidad || 0) <= Number(item.minimo || 5)).length,
    totalPedidos: pedidos.length,
    alertas: pedidos.filter((item) => item.estado === 'rechazado').length,
    aprobados: pedidos.filter((item) => item.estado === 'aprobado').length,
    pendientes: pedidos.filter((item) => item.estado === 'pendiente').length,
  }), [productos, pedidos]);

  const barData = useMemo(() => {
    const grouped = productos.reduce((acc, item) => {
      const key = item.categoria_nombre || item.categoria || 'General';
      acc[key] = (acc[key] || 0) + Number(item.cantidad || 0);
      return acc;
    }, {});
    return Object.entries(grouped).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [productos]);

  const donutData = useMemo(() => {
    return [
      { name: 'Aprobados', value: stats.aprobados, color: '#22c55e' },
      { name: 'Pendientes', value: stats.pendientes, color: '#f59e0b' },
      { name: 'Rechazados', value: stats.alertas, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const handleExportCategorias = () => {
    if (!canExportReports) {
      toast.info('Exportación disponible para administración');
      return;
    }
    const total = barData.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
    const rows = barData.map((item) => ({
      Categoria: item.name,
      Cantidad: item.value,
      Porcentaje: `${((Number(item.value || 0) / total) * 100).toFixed(1)}%`,
      Nivel: Number(item.value || 0) <= 5 ? 'Leve' : Number(item.value || 0) <= 15 ? 'Medio' : 'Crítico',
    }));
    exportToExcel(rows, 'reporte-categorias.xlsx', 'Categorias');
    toast.success('Reporte exportado');
  };

  const handleExportEstados = () => {
    if (!canExportReports) return;
    const rows = donutData.map((item) => ({
      Estado: item.name,
      Total: item.value,
    }));
    exportToExcel(rows, 'estado-pedidos.xlsx', 'Pedidos');
    toast.success('Reporte exportado');
  };

  const handleVerTodos = () => {
    if (isAdmin) navigate('/admin?tab=pedidos');
    else if (isJefe) navigate('/jefe?tab=pedidos');
    else navigate('/pedidos');
  };

  const quickActions = [
    { label: 'Inventario', path: '/inventario', enabled: true },
    { label: 'Pedidos', path: '/pedidos', enabled: true },
    { label: 'Usuarios', path: '/usuarios', enabled: isAdmin || isJefe },
    { label: 'Alertas', path: '/alertas', enabled: isAdmin || isJefe },
    { label: 'Reportes', path: '/reportes', enabled: isAdmin || isJefe },
  ].filter((item) => item.enabled);

  const recentOrders = useMemo(() => {
    return pedidos.slice(0, 6).map((pedido) => ({
      id: pedido.id,
      codigo: pedido.codigo || `PED-${String(pedido.id).padStart(4, '0')}`,
      producto: pedido.producto_nombre || pedido.producto || 'Producto',
      solicitante: pedido.solicitante || pedido.usuario_username || 'Usuario',
      cantidad: pedido.cantidad || 1,
      estado: pedido.estado || 'pendiente',
    }));
  }, [pedidos]);

  return (
    <Layout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider">PANEL DE CONTROL</span>
            </div>
            <h2 className="text-xl font-bold font-mono text-stone-700">Dashboard Ejecutivo</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-stone-500 font-mono">REAGENT TRACKING SYSTEM</p>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500 animate-pulse"></span>
            </div>
          </div>
          <button
            onClick={() => cargarDatos(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-stone-200 text-emerald-600 font-mono text-xs hover:border-emerald-300 hover:bg-emerald-50 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            ACTUALIZAR
          </button>
        </div>

        {/* Métricas - Grid FIJA 4 columnas */}
        <div className="grid grid-cols-4 gap-4">
          <LabMetricCard 
            title="TOTAL PRODUCTOS" 
            value={stats.totalProductos} 
            icon={<Package2 className="h-5 w-5 text-emerald-600" />}
            subtitle="En inventario"
          />
          <LabMetricCard 
            title="PEDIDOS ACTIVOS" 
            value={stats.totalPedidos} 
            icon={<ClipboardList className="h-5 w-5 text-emerald-600" />}
            trend="+12%"
            subtitle="Este mes"
          />
          <LabMetricCard 
            title="STOCK BAJO" 
            value={stats.bajoStock} 
            icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
            subtitle="Requieren reposición"
          />
          <LabMetricCard 
            title="RECHAZADOS" 
            value={stats.alertas} 
            icon={<XCircle className="h-5 w-5 text-rose-500" />}
            subtitle="Alertas críticas"
          />
        </div>

        {/* Accesos rápidos */}
        <LabSection
          title="ACCESOS RÁPIDOS"
          subtitle="Navegación operativa por módulo"
          icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />}
        >
          <div className="grid grid-cols-5 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="px-4 py-3 rounded-md border border-stone-200 bg-stone-50 text-xs font-mono font-bold text-stone-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </LabSection>

        {/* Gráficos - Grid FIJA 2 columnas */}
        <div className="grid grid-cols-2 gap-5">
          <LabSection
            title="DISTRIBUCIÓN POR CATEGORÍA"
            subtitle="Stock actual por categoría"
            icon={<BarChart3 className="h-4 w-4 text-emerald-600" />}
            action={canExportReports && <><Download className="h-3 w-3" /> EXPORTAR</>}
            onActionClick={handleExportCategorias}
          >
            <div className="h-[280px]">
              {chartsReady && barData.length > 0 && (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </LabSection>

          <LabSection
            title="ESTADO DE PEDIDOS"
            subtitle="Distribución de solicitudes"
            icon={<ClipboardList className="h-4 w-4 text-emerald-600" />}
            action={canExportReports && <><Download className="h-3 w-3" /> EXPORTAR</>}
            onActionClick={handleExportEstados}
          >
            <div className="flex items-center justify-center gap-4">
              <div className="relative w-48 h-48">
                {chartsReady && donutData.length > 0 && (
                  <ResponsiveContainer width={192} height={192}>
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                        {donutData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold font-mono text-emerald-600">{stats.totalPedidos}</p>
                    <p className="text-[8px] text-stone-500 font-mono uppercase">TOTAL</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {donutData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-mono text-stone-500">{item.name}:</span>
                    <span className="text-[10px] font-mono font-bold text-stone-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </LabSection>
        </div>

        {/* Tabla de pedidos recientes */}
        <LabSection
          title="PEDIDOS RECIENTES"
          subtitle="Últimas solicitudes del sistema"
          icon={<ClipboardList className="h-4 w-4 text-emerald-600" />}
          action={<span className="text-emerald-600 hover:text-emerald-700">VER TODOS →</span>}
          onActionClick={handleVerTodos}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">CÓDIGO</th>
                  <th className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">SOLICITANTE</th>
                  <th className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">PRODUCTO</th>
                  <th className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">CANT.</th>
                  <th className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">ESTADO</th>
                  <th className="pb-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="py-3 text-[11px] font-mono text-stone-500">{order.codigo}</td>
                    <td className="py-3 text-[11px] font-mono text-stone-600">{order.solicitante}</td>
                    <td className="py-3 text-[11px] font-mono text-stone-600">{order.producto}</td>
                    <td className="py-3 text-[11px] font-mono text-stone-500">{order.cantidad}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        order.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        order.estado === 'rechazado' ? 'bg-rose-100 text-rose-600 border border-rose-200' :
                        'bg-amber-100 text-amber-600 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.estado === 'aprobado' ? 'bg-emerald-500 animate-pulse' :
                          order.estado === 'rechazado' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        {order.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3">
                      <button className="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                        {order.estado === 'pendiente' ? 'REVISAR →' : 'DETALLES →'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LabSection>
      </div>
    </Layout>
  );
}

export default Dashboard;