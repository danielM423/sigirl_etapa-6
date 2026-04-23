import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Bell, ClipboardList, Package, BarChart3, Info } from 'lucide-react';
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
    const estadoBadge = (estado) => {
      if (estado === 'aprobado')  return { badge: 'Aprobado',  badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      if (estado === 'rechazado') return { badge: 'Rechazado', badgeCls: 'bg-rose-100 text-rose-700 border-rose-200' };
      if (estado === 'pendiente') return { badge: 'Pendiente', badgeCls: 'bg-amber-100 text-amber-700 border-amber-200' };
      return { badge: estado, badgeCls: 'bg-stone-100 text-stone-500 border-stone-200' };
    };
    const stockBadge = (item) => {
      if (item.estado === 'agotado')    return { badge: 'Agotado',    badgeCls: 'bg-rose-100 text-rose-700 border-rose-200' };
      if (item.estado === 'bajo_stock') return { badge: 'Bajo stock', badgeCls: 'bg-amber-100 text-amber-700 border-amber-200' };
      return { badge: 'En stock', badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    };
    const prioridadBadge = (p) => {
      if (p === 'alta')  return { badge: '⬆ Alta',  badgeCls: 'bg-rose-100 text-rose-700 border-rose-200' };
      if (p === 'baja')  return { badge: '⬇ Baja',  badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      return { badge: '→ Media', badgeCls: 'bg-amber-100 text-amber-700 border-amber-200' };
    };

    if (tab === 'inventario') {
      return productos.slice(0, 6).map((item) => ({
        id: `producto-${item.id}`,
        title: item.nombre,
        detail: `${item.cantidad} u. disponibles · Ubicación: ${item.ubicacion || 'sin especificar'} · Mín. ${item.umbral_minimo || '—'}`,
        date: item.ultima_actualizacion || item.updated_at,
        ...stockBadge(item),
      }));
    }
    if (tab === 'pedidos') {
      return pedidos.slice(0, 6).map((item) => ({
        id: `pedido-${item.id}`,
        title: `${item.codigo || `PED-${item.id}`} · ${item.producto_nombre || item.producto}`,
        detail: `${item.solicitante || item.usuario_username || 'Usuario'} solicitó ${item.cantidad} u. de ${item.producto_nombre || item.producto}`,
        date: item.fecha_respuesta || item.fecha_solicitud,
        ...estadoBadge(item.estado),
      }));
    }
    return alertas.slice(0, 6).map((item) => ({
      id: `alerta-${item.id}`,
      title: item.titulo,
      detail: `${item.descripcion || item.mensaje || 'Sin descripción'} · Por: ${item.remitente || 'SIGIRL'}`,
      date: item.fecha,
      ...prioridadBadge(item.prioridad),
    }));
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

        {/* ── Descripción de gráficas ──────────────────────────── */}
        <div className="bg-white border border-[#E0E0E0] rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#1FA971]" />
            <span className="text-xs font-mono font-bold text-[#1FA971] uppercase tracking-wider">INTERPRETACIÓN DE LAS GRÁFICAS</span>
          </div>
          {tab === 'inventario' && (
            <div className="space-y-2 text-sm font-mono text-stone-600">
              <p><span className="font-bold text-stone-700">Gráfica de estado:</span> Muestra cuántos productos están en estado OK (stock adecuado), Bajo stock (por debajo del umbral mínimo) o Agotados (sin unidades disponibles). Permite identificar de inmediato cuántos reactivos requieren reposición urgente.</p>
              <p><span className="font-bold text-stone-700">Gráfica por categoría:</span> Distribuye el total de productos según su categoría (Solventes, Reactivos, etc.). Ayuda a detectar qué áreas tienen mayor concentración de productos y cuáles podrían necesitar mayor seguimiento.</p>
            </div>
          )}
          {tab === 'pedidos' && (
            <div className="space-y-2 text-sm font-mono text-stone-600">
              <p><span className="font-bold text-stone-700">Gráfica de estado:</span> Compara el número de pedidos Pendientes (en espera de revisión), Aprobados (autorizados y descontados del stock) y Rechazados (no autorizados con motivo registrado). Permite evaluar el flujo de aprobaciones.</p>
              <p><span className="font-bold text-stone-700">Gráfica por prioridad:</span> Muestra cuántas solicitudes se clasificaron como Alta, Media o Baja prioridad. Un alto porcentaje de prioridad alta puede indicar escasez frecuente de reactivos críticos.</p>
            </div>
          )}
          {tab === 'alertas' && (
            <div className="space-y-2 text-sm font-mono text-stone-600">
              <p><span className="font-bold text-stone-700">Gráfica de estado:</span> Indica cuántas alertas están Activas (sin resolver), Resueltas o marcadas de Alta prioridad. Una cantidad elevada de alertas activas requiere atención inmediata del equipo responsable.</p>
              <p><span className="font-bold text-stone-700">Gráfica por prioridad:</span> Clasifica las alertas según su nivel de urgencia. Ayuda a priorizar la respuesta del personal de laboratorio y administrativo.</p>
            </div>
          )}
        </div>

        {/* ── Listado detallado ────────────────────────────────── */}
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="px-5 py-3 border-b border-[#E0E0E0] bg-[#E8F5F0]">
            <span className="text-xs font-mono font-bold text-[#157A55] uppercase tracking-wider">
              {tab === 'inventario' ? `LISTADO DE INVENTARIO (${productos.length} registros)` : tab === 'pedidos' ? `LISTADO DE PEDIDOS (${pedidos.length} registros)` : `LISTADO DE ALERTAS (${alertas.length} registros)`}
            </span>
          </div>
          <div className="overflow-x-auto">
            {tab === 'inventario' && (
              <table className="w-full">
                <thead><tr className="border-b border-stone-200">{['Producto','Categoría','Cantidad','Umbral mín.','Ubicación','Estado'].map(h=><th key={h} className="px-4 py-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {productos.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400 font-mono text-sm">Sin datos</td></tr> : productos.map(item => (
                    <tr key={item.id} className="hover:bg-[#E8F5F0]/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-stone-700">{item.nombre}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-500">{item.categoria_nombre || item.categoria || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-600">{item.cantidad}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-500">{item.umbral_minimo ?? item.minimo ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-500">{item.ubicacion || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.estado==='ok'?'bg-[#E8F5F0] text-[#1FA971] border-[#1FA971]/25':item.estado==='bajo_stock'?'bg-amber-100 text-amber-400 border-amber-200':'bg-rose-100 text-rose-400 border-rose-200'}`}>{item.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'pedidos' && (
              <table className="w-full">
                <thead><tr className="border-b border-stone-200">{['Código','Solicitante','Producto','Cantidad','Prioridad','Estado','Fecha'].map(h=><th key={h} className="px-4 py-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {pedidos.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400 font-mono text-sm">Sin datos</td></tr> : pedidos.map(item => (
                    <tr key={item.id} className="hover:bg-[#E8F5F0]/40 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-mono font-bold text-stone-600">{item.codigo}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-500">{item.solicitante || item.usuario_username || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-600">{item.producto_nombre || item.producto || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-500">{item.cantidad}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.prioridad==='alta'?'bg-rose-100 text-rose-400 border-rose-200':item.prioridad==='media'?'bg-amber-100 text-amber-400 border-amber-200':'bg-[#E8F5F0] text-[#1FA971] border-[#1FA971]/25'}`}>{item.prioridad}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.estado==='aprobado'?'bg-[#E8F5F0] text-[#1FA971] border-[#1FA971]/25':item.estado==='rechazado'?'bg-rose-100 text-rose-400 border-rose-200':'bg-amber-100 text-amber-400 border-amber-200'}`}>{item.estado}</span></td>
                      <td className="px-4 py-3 text-[11px] font-mono text-stone-400">{item.fecha_solicitud || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'alertas' && (
              <table className="w-full">
                <thead><tr className="border-b border-stone-200">{['Título','Remitente','Prioridad','Estado','Descripción','Fecha'].map(h=><th key={h} className="px-4 py-3 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {alertas.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400 font-mono text-sm">Sin datos</td></tr> : alertas.map(item => (
                    <tr key={item.id} className="hover:bg-[#E8F5F0]/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-stone-700">{item.titulo}</td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-500">{item.remitente || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.prioridad==='alta'?'bg-rose-100 text-rose-400 border-rose-200':item.prioridad==='media'?'bg-amber-100 text-amber-400 border-amber-200':'bg-[#E8F5F0] text-[#1FA971] border-[#1FA971]/25'}`}>{item.prioridad}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.estado==='resuelta'?'bg-[#E8F5F0] text-[#1FA971] border-[#1FA971]/25':'bg-amber-100 text-amber-400 border-amber-200'}`}>{item.estado || 'activa'}</span></td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-400 max-w-xs truncate">{item.descripcion || item.mensaje || '—'}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-stone-400">{item.fecha || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Reportes;