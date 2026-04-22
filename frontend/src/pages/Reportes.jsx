import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Bell, ClipboardList, Package, BarChart3 } from 'lucide-react';
import Layout from '../components/Layout';
import ReportPanel from '../components/ReportPanel';
import { getAlertas, getPedidos, getProductos } from '../services/api';
import { exportToExcel, exportToPdf } from '../utils/reportExport';

const Reportes = () => {
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('inventario');

  useEffect(() => {
    Promise.all([getProductos(), getPedidos(), getAlertas()])
      .then(([productosRes, pedidosRes, alertasRes]) => {
        setProductos(productosRes.data?.results ?? productosRes.data ?? []);
        setPedidos(pedidosRes.data?.results ?? pedidosRes.data ?? []);
        setAlertas(alertasRes.data?.results ?? alertasRes.data ?? []);
      })
      .catch(() => toast.error('No se pudieron cargar los reportes'))
      .finally(() => setLoading(false));
  }, []);

  const primaryData = useMemo(() => {
    if (tab === 'inventario') {
      return [
        { name: 'OK', value: productos.filter((item) => item.estado === 'ok').length },
        { name: 'Bajo stock', value: productos.filter((item) => item.estado === 'bajo_stock').length },
        { name: 'Agotados', value: productos.filter((item) => item.estado === 'agotado').length },
      ];
    }
    if (tab === 'pedidos') {
      return [
        { name: 'Pendientes', value: pedidos.filter((item) => item.estado === 'pendiente').length },
        { name: 'Aprobados', value: pedidos.filter((item) => item.estado === 'aprobado').length },
        { name: 'Rechazados', value: pedidos.filter((item) => item.estado === 'rechazado').length },
      ];
    }
    return [
      { name: 'Activas', value: alertas.filter((item) => item.estado !== 'resuelta').length },
      { name: 'Resueltas', value: alertas.filter((item) => item.estado === 'resuelta').length },
      { name: 'Alta prioridad', value: alertas.filter((item) => item.prioridad === 'alta').length },
    ];
  }, [alertas, pedidos, productos, tab]);

  const secondaryData = useMemo(() => {
    if (tab === 'inventario') {
      return Object.entries(productos.reduce((acc, item) => {
        const key = item.categoria_nombre || item.categoria || 'General';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value }));
    }
    if (tab === 'pedidos') {
      return Object.entries(pedidos.reduce((acc, item) => {
        const key = item.prioridad || 'media';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value }));
    }
    return Object.entries(alertas.reduce((acc, item) => {
      const key = item.prioridad || 'media';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([name, value]) => ({ name, value }));
  }, [alertas, pedidos, productos, tab]);

  const activity = useMemo(() => {
    if (tab === 'inventario') {
      return productos.slice(0, 5).map((item) => ({ id: `producto-${item.id}`, title: item.nombre, detail: `${item.cantidad} unidades en ${item.ubicacion || 'sin ubicación'}`, date: item.ultima_actualizacion }));
    }
    if (tab === 'pedidos') {
      return pedidos.slice(0, 5).map((item) => ({ id: `pedido-${item.id}`, title: item.codigo || `PED-${item.id}`, detail: `${item.solicitante || item.usuario_username} · ${item.producto_nombre || item.producto}`, date: item.fecha_solicitud }));
    }
    return alertas.slice(0, 5).map((item) => ({ id: `alerta-${item.id}`, title: item.titulo, detail: item.descripcion || item.mensaje, date: item.fecha }));
  }, [alertas, pedidos, productos, tab]);

  const handleExportExcel = () => {
    if (tab === 'inventario') {
      exportToExcel(productos.map((item) => ({ Producto: item.nombre, Categoria: item.categoria_nombre || item.categoria, Cantidad: item.cantidad, Estado: item.estado })), 'reporte-inventario.xlsx');
    } else if (tab === 'pedidos') {
      exportToExcel(pedidos.map((item) => ({ Codigo: item.codigo, Solicitante: item.solicitante || item.usuario_username, Producto: item.producto_nombre || item.producto, Prioridad: item.prioridad, Estado: item.estado })), 'reporte-pedidos.xlsx');
    } else {
      exportToExcel(alertas.map((item) => ({ Alerta: item.titulo, Prioridad: item.prioridad, Estado: item.estado, Remitente: item.remitente })), 'reporte-alertas.xlsx');
    }
    toast.success('Reporte exportado a Excel');
  };

  const handleExportPdf = () => {
    if (tab === 'inventario') {
      exportToPdf({ title: 'Reporte de inventario SIGIRL', headers: ['Producto', 'Categoría', 'Cantidad', 'Estado'], rows: productos.map((item) => [item.nombre, item.categoria_nombre || item.categoria, item.cantidad, item.estado]), fileName: 'reporte-inventario.pdf' });
    } else if (tab === 'pedidos') {
      exportToPdf({ title: 'Reporte de pedidos SIGIRL', headers: ['Código', 'Solicitante', 'Producto', 'Prioridad', 'Estado'], rows: pedidos.map((item) => [item.codigo, item.solicitante || item.usuario_username, item.producto_nombre || item.producto, item.prioridad, item.estado]), fileName: 'reporte-pedidos.pdf' });
    } else {
      exportToPdf({ title: 'Reporte de alertas SIGIRL', headers: ['Alerta', 'Remitente', 'Prioridad', 'Estado'], rows: alertas.map((item) => [item.titulo, item.remitente, item.prioridad, item.estado]), fileName: 'reporte-alertas.pdf' });
    }
    toast.success('Reporte exportado a PDF');
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-3 h-3 rounded-full mx-auto mb-3 bg-emerald-500 animate-pulse" /><p className="text-stone-500 font-mono text-sm">CARGANDO REPORTES...</p></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        <div className="bg-white border border-[#E0E0E0] rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4 text-[#1FA971]" /><span className="text-[10px] font-mono font-bold text-[#1FA971] uppercase tracking-wider">MÓDULO DE REPORTES</span><span className="w-2 h-2 rounded-full bg-[#1FA971] animate-pulse" /></div>
              <h1 className="text-xl font-bold font-mono text-stone-700">Reportes operativos</h1>
              <p className="text-[10px] font-mono text-stone-500 mt-1">Visualización consolidada de inventario, pedidos y alertas</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ key: 'inventario', label: 'Inventario', icon: <Package className="w-3.5 h-3.5" /> }, { key: 'pedidos', label: 'Pedidos', icon: <ClipboardList className="w-3.5 h-3.5" /> }, { key: 'alertas', label: 'Alertas', icon: <Bell className="w-3.5 h-3.5" /> }].map((item) => (
                <button key={item.key} onClick={() => setTab(item.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${tab === item.key ? 'bg-[#E8F5F0] border border-[#1FA971]/30 text-[#157A55]' : 'bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-800 hover:border-stone-300'}`}>{item.icon}{item.label}</button>
              ))}
            </div>
          </div>
        </div>

        <ReportPanel
          title={tab === 'inventario' ? 'Reporte de inventario y stock' : tab === 'pedidos' ? 'Reporte de pedidos y prioridades' : 'Reporte de alertas y seguimiento'}
          subtitle={tab === 'inventario' ? 'Estado general de productos por categoría y nivel' : tab === 'pedidos' ? 'Seguimiento del flujo de solicitudes y su prioridad' : 'Distribución y atención de alertas por prioridad'}
          primaryData={primaryData}
          secondaryData={secondaryData}
          activity={activity}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
        />
      </div>
    </Layout>
  );
};

export default Reportes;