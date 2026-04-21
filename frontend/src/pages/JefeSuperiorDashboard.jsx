// Panel del jefe superior.
// Centraliza aprobaciones, usuarios, estadísticas y alertas.
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { Users, TrendingUp, AlertCircle, BarChart3, Search, ChevronDown, Eye, Download, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import ReportPanel from '../components/ReportPanel';
import { exportToExcel, exportToPdf } from '../utils/reportExport';
import {
  getPedidos, createPedido, updatePedido, deletePedido,
  getAlertas, createAlerta, updateAlerta,
  getProductos, getUsuarios, createUsuario, updateUsuario, deleteUsuario,
} from '../services/api';

const pedidoVacio = {
  codigo: '',
  productoId: '',
  cantidad: '',
  solicitante: '',
  estado: 'pendiente',
  prioridad: 'media',
  fecha_solicitud: '',
  observaciones: '',
  motivo_rechazo: ''
};

const usuarioVacio = {
  nombre: '',
  email: '',
  rol: 'usuario'
};

const JefeSuperiorDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pedidos, setPedidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('todos');
  const [alertPriorityFilter, setAlertPriorityFilter] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [alertas, setAlertas] = useState([]);
  const activeTab = ['pedidos', 'usuarios', 'alertas'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'estadisticas';
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [formPedido, setFormPedido] = useState(pedidoVacio);
  const [formUsuario, setFormUsuario] = useState(usuarioVacio);

  const getToday = () => new Date().toISOString().split('T')[0];
  const formatDisplayDate = (value) => {
    if (!value) return 'Sin fecha';

    const normalizedValue = typeof value === 'string' && value.length <= 10
      ? `${value}T00:00:00`
      : value;
    const parsed = new Date(normalizedValue);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  };

  const changeTab = (tab) => {
    setSearchParams({ tab });
  };

  const getNextPedidoCode = (listaPedidos) =>
    `PED-2024-${String(Math.max(...listaPedidos.map(p => p.id), 0) + 1).padStart(3, '0')}`;

  const syncUsuariosConPedidos = (listaUsuarios, listaPedidos) =>
    listaUsuarios.map((usuario) => {
      const pedidosUsuario = listaPedidos.filter(
        (pedido) => pedido.usuario_username === usuario.username || pedido.solicitante === usuario.nombre
      );
      const rechazos = pedidosUsuario.filter((pedido) => pedido.estado === 'rechazado').length;
      return { ...usuario, total_pedidos: pedidosUsuario.length, rechazos };
    });

  const normalizePedido = (p) => ({
    ...p,
    producto: p.producto_nombre || p.producto || '',
    solicitante: p.solicitante || p.usuario_username || '',
    codigo: p.codigo || `PED-${String(p.id).padStart(3, '0')}`,
  });

  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);
      try {
        const [pedidosRes, alertasRes, productosRes, usuariosRes] = await Promise.all([
          getPedidos().catch(() => ({ data: [] })),
          getAlertas().catch(() => ({ data: [] })),
          getProductos().catch(() => ({ data: [] })),
          getUsuarios().catch(() => ({ data: [] })),
        ]);
        const pedidosNorm = (pedidosRes.data || []).map(normalizePedido);
        const usuariosData = usuariosRes.data || [];
        setPedidos(pedidosNorm);
        setAlertas(alertasRes.data || []);
        setProductos(productosRes.data || []);
        setUsuarios(syncUsuariosConPedidos(usuariosData, pedidosNorm));
      } catch {
        toast.error('Error al cargar datos del panel de jefatura');
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []);

  const resetPedidoForm = () => {
    setFormPedido({
      ...pedidoVacio,
      codigo: getNextPedidoCode(pedidos),
      fecha_solicitud: getToday(),
    });
    setSelectedPedido(null);
  };

  const resetUsuarioForm = () => {
    setFormUsuario(usuarioVacio);
    setSelectedUsuario(null);
  };

  const handleNuevoPedido = () => {
    resetPedidoForm();
    setShowPedidoModal(true);
  };

  const handleEditarPedido = (pedido) => {
    setSelectedPedido(pedido);
    setFormPedido({
      codigo: pedido.codigo,
      productoId: pedido.producto_id || pedido.producto || '',
      cantidad: String(pedido.cantidad),
      solicitante: pedido.solicitante,
      estado: pedido.estado,
      prioridad: pedido.prioridad || 'media',
      fecha_solicitud: pedido.fecha_solicitud || '',
      observaciones: pedido.observaciones || '',
      motivo_rechazo: pedido.motivo_rechazo || ''
    });
    setShowPedidoModal(true);
  };

  const handleGuardarPedido = async () => {
    if (!formPedido.productoId || !formPedido.cantidad) {
      toast.error('Selecciona el producto y completa la cantidad');
      return;
    }

    if (Number(formPedido.cantidad) <= 0) {
      toast.error('La cantidad debe ser mayor que cero');
      return;
    }

    if (formPedido.estado === 'rechazado' && !formPedido.motivo_rechazo.trim()) {
      toast.error('Ingresa el motivo del rechazo');
      return;
    }

    const payload = {
      producto: Number(formPedido.productoId),
      cantidad: Number(formPedido.cantidad),
      estado: formPedido.estado,
      prioridad: formPedido.prioridad,
      fecha_solicitud: formPedido.fecha_solicitud || getToday(),
      observaciones: formPedido.observaciones,
      motivo_rechazo: formPedido.estado === 'rechazado' ? formPedido.motivo_rechazo : '',
      solicitante: formPedido.solicitante,
    };

    try {
      if (selectedPedido) {
        const res = await updatePedido(selectedPedido.id, payload);
        setPedidos((prev) => prev.map((p) => p.id === selectedPedido.id ? normalizePedido(res.data) : p));
        toast.success('Pedido actualizado');
      } else {
        const res = await createPedido(payload);
        setPedidos((prev) => [normalizePedido(res.data), ...prev]);
        toast.success('Pedido creado');
      }
      setShowPedidoModal(false);
      resetPedidoForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar pedido');
    }
  };

  const handleEliminarPedido = async (id) => {
    const pedido = pedidos.find((item) => item.id === id);
    if (!pedido) return;

    const confirmar = window.confirm(`¿Eliminar el pedido ${pedido.codigo}?`);
    if (!confirmar) return;

    try {
      await deletePedido(id);
      setPedidos((prev) => prev.filter((item) => item.id !== id));
      toast.success('Pedido eliminado');
    } catch {
      toast.error('Error al eliminar el pedido');
    }
  };

  const handleVerPedido = (pedido) => {
    const detalle = [
      `Código: ${pedido.codigo}`,
      `Solicitante: ${pedido.solicitante}`,
      `Producto: ${pedido.producto}`,
      `Cantidad: ${pedido.cantidad}`,
      `Departamento: ${pedido.departamento}`,
      `Estado: ${pedido.estado}`,
      `Prioridad: ${pedido.prioridad}`,
      `Fecha solicitud: ${formatDisplayDate(pedido.fecha_solicitud)}`,
      pedido.evaluacion_seguridad?.reactivoCritico ? `Puntaje seguridad: ${pedido.evaluacion_seguridad.puntaje}/${pedido.evaluacion_seguridad.puntajeMinimo}` : null,
      pedido.observaciones ? `Observaciones: ${pedido.observaciones}` : null,
      pedido.motivo_rechazo ? `Motivo rechazo: ${pedido.motivo_rechazo}` : null,
    ].filter(Boolean);

    toast.info(
      <div className="text-sm">
        <p className="font-semibold mb-2">Detalle del pedido</p>
        <div className="space-y-1">{detalle.map((line, index) => <p key={index}>{line}</p>)}</div>
      </div>,
      { autoClose: 8000, closeOnClick: false }
    );
  };

  const handleCambiarEstadoPedido = async (pedido, estado) => {
    let motivoRechazo = pedido.motivo_rechazo || '';

    if (estado === 'rechazado') {
      const motivo = window.prompt('Motivo del rechazo:', motivoRechazo);
      if (motivo === null) return;
      if (!motivo.trim()) {
        toast.error('Debes indicar un motivo de rechazo');
        return;
      }
      motivoRechazo = motivo;
    }

    try {
      const payload = { estado, motivo_rechazo: estado === 'rechazado' ? motivoRechazo : '' };
      const res = await updatePedido(pedido.id, payload);
      setPedidos((prev) => prev.map((p) => p.id === pedido.id ? normalizePedido(res.data) : p));

      if (estado === 'aprobado' && pedido.evaluacion_seguridad?.reactivoCritico) {
        await createAlerta({
          tipo: 'autorizacion',
          titulo: `Reactivo autorizado por jefe: ${pedido.producto}`,
          descripcion: `El jefe superior autorizó la solicitud de ${pedido.solicitante}.`,
          remitente: 'Jefe Superior',
          prioridad: 'media',
          mensaje: `Pedido ${pedido.codigo} aprobado.`,
        }).catch(() => {});
      }

      toast.success(estado === 'aprobado' ? 'Pedido aprobado' : 'Pedido rechazado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleExportarPedidosExcel = () => {
    exportToExcel(filteredPedidos, 'pedidos-jefatura.xlsx');
    toast.success('Reporte exportado en Excel');
  };

  const handleExportarPedidosPdf = () => {
    exportToPdf({
      title: 'Reporte de Pedidos - Jefatura SIGIRL',
      headers: ['Código', 'Solicitante', 'Producto', 'Cantidad', 'Estado'],
      rows: filteredPedidos.map((pedido) => [pedido.codigo, pedido.solicitante, pedido.producto, pedido.cantidad, pedido.estado]),
      fileName: 'pedidos-jefatura.pdf',
    });
    toast.success('Reporte exportado en PDF');
  };

  const handleExportarUsuariosExcel = () => {
    exportToExcel(
      filteredUsuarios.map((usuario) => ({
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol || 'usuario',
        total_pedidos: usuario.total_pedidos || 0,
        rechazos: usuario.rechazos || 0,
        recomendacion: (usuario.rechazos || 0) > 2 ? 'Revisión y acompañamiento' : 'Seguimiento normal',
      })),
      'usuarios-jefatura.xlsx'
    );
    toast.success('Listado de usuarios exportado');
  };

  const handleExportarAlertasExcel = () => {
    exportToExcel(
      filteredAlertas.map((alerta) => ({
        alerta: alerta.titulo,
        remitente: alerta.remitente,
        prioridad: alerta.prioridad,
        estado: alerta.estado,
        descripcion: alerta.descripcion,
      })),
      'alertas-jefatura.xlsx'
    );
    toast.success('Alertas exportadas');
  };

  const handleNuevoUsuario = () => {
    resetUsuarioForm();
    setShowUsuarioModal(true);
  };

  const handleEditarUsuario = (usuario) => {
    setSelectedUsuario(usuario);
    setFormUsuario({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol || 'usuario'
    });
    setShowUsuarioModal(true);
  };

  const handleGuardarUsuario = async () => {
    if (!formUsuario.nombre.trim() || !formUsuario.email.trim()) {
      toast.error('Completa todos los campos del usuario');
      return;
    }

    if (!formUsuario.email.includes('@')) {
      toast.error('Ingresa un correo válido');
      return;
    }

    const emailDuplicado = usuarios.some((usuario) =>
      usuario.email?.toLowerCase() === formUsuario.email.trim().toLowerCase() && usuario.id !== selectedUsuario?.id
    );

    if (emailDuplicado) {
      toast.error('Ese correo ya está registrado');
      return;
    }

    const payload = {
      nombre_input: formUsuario.nombre.trim(),
      email: formUsuario.email.trim(),
      rol_input: formUsuario.rol
    };

    try {
      if (selectedUsuario) {
        const res = await updateUsuario(selectedUsuario.id, payload);
        setUsuarios((prev) => prev.map((u) => u.id === selectedUsuario.id ? { ...u, ...res.data } : u));
        toast.success('Usuario actualizado');
      } else {
        const res = await createUsuario(payload);
        setUsuarios((prev) => [res.data, ...prev]);
        toast.success('Usuario creado');
      }
      setShowUsuarioModal(false);
      resetUsuarioForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleEliminarUsuario = async (id) => {
    const usuario = usuarios.find((item) => item.id === id);
    if (!usuario) return;

    const confirmar = window.confirm(`¿Eliminar a ${usuario.nombre}?`);
    if (!confirmar) return;

    try {
      await deleteUsuario(id);
      setUsuarios((prev) => prev.filter((item) => item.id !== id));
      toast.success('Usuario eliminado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar el usuario');
    }
  };

  const handleVerUsuario = (usuario) => {
    const detalle = [
      `Nombre: ${usuario.nombre}`,
      `Correo: ${usuario.email}`,
      `Rol: ${usuario.rol || 'usuario'}`,
      `Total pedidos: ${usuario.total_pedidos || 0}`,
      `Rechazos: ${usuario.rechazos || 0}`,
    ];

    toast.info(
      <div className="text-sm">
        <p className="font-semibold mb-2">Detalle del usuario</p>
        <div className="space-y-1">{detalle.map((line, index) => <p key={index}>{line}</p>)}</div>
      </div>,
      { autoClose: 8000, closeOnClick: false }
    );
  };

  const getEstadoBadge = (estado) => {
    const styles = {
      aprobado: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      rechazado: 'bg-rose-100 text-rose-700 border border-rose-300',
      pendiente: 'bg-blue-100 text-blue-700 border border-blue-300'
    };

    const icons = {
      aprobado: '✅',
      rechazado: '❌',
      pendiente: '⏳'
    };

    const labels = {
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      pendiente: 'Pendiente'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${styles[estado]}`}>
        {icons[estado]}
        {labels[estado]}
      </span>
    );
  };

  const stats = {
    totalPedidos: pedidos.length,
    aprobados: pedidos.filter((p) => p.estado === 'aprobado').length,
    rechazados: pedidos.filter((p) => p.estado === 'rechazado').length,
    pendientes: pedidos.filter((p) => p.estado === 'pendiente').length,
    totalUsuarios: usuarios.length,
    usuariosConRechazos: usuarios.filter((u) => (u.rechazos || 0) > 0).length,
    tasaAprobacion: pedidos.length ? ((pedidos.filter((p) => p.estado === 'aprobado').length / pedidos.length) * 100).toFixed(1) : '0.0',
    tasaRechazo: pedidos.length ? ((pedidos.filter((p) => p.estado === 'rechazado').length / pedidos.length) * 100).toFixed(1) : '0.0'
  };

  const filteredPedidos = pedidos.filter((pedido) => {
    const text = searchTerm.toLowerCase();
    const matchesSearch =
      pedido.producto.toLowerCase().includes(text) ||
      pedido.codigo.toLowerCase().includes(text) ||
      pedido.solicitante.toLowerCase().includes(text);
    const matchesFilter = filterStatus === 'todos' || pedido.estado === filterStatus;
    const matchesFrom = !dateFrom || (pedido.fecha_solicitud || '') >= dateFrom;
    const matchesTo = !dateTo || (pedido.fecha_solicitud || '') <= dateTo;
    return matchesSearch && matchesFilter && matchesFrom && matchesTo;
  });

  const filteredUsuarios = usuarios.filter((usuario) => {
    const text = userSearchTerm.toLowerCase();
    const matchesSearch =
      usuario.nombre.toLowerCase().includes(text) ||
      usuario.email.toLowerCase().includes(text);
    const matchesRole = userRoleFilter === 'todos' || (usuario.rol || 'usuario') === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredAlertas = alertas.filter((alerta) => alertPriorityFilter === 'todas' || alerta.prioridad === alertPriorityFilter);

  const statsAlertas = {
    total: alertas.length,
    nuevas: alertas.filter((alerta) => alerta.estado === 'nueva').length,
    altas: alertas.filter((alerta) => alerta.prioridad === 'alta').length,
  };

  const reportPrimaryData = [
    { name: 'Aprobados', value: stats.aprobados },
    { name: 'Pendientes', value: stats.pendientes },
    { name: 'Rechazados', value: stats.rechazados },
  ];

  const reportSecondaryData = Object.entries(
    pedidos.reduce((acc, pedido) => {
      acc[pedido.producto] = (acc[pedido.producto] || 0) + Number(pedido.cantidad || 0);
      return acc;
    }, {})
  )
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const activityItems = [
    ...filteredPedidos.slice(0, 5).map((pedido) => ({
      id: `pedido-${pedido.id}`,
      title: `${pedido.codigo} · ${pedido.estado}`,
      detail: `${pedido.solicitante} · ${pedido.producto}`,
      date: formatDisplayDate(pedido.fecha_respuesta || pedido.fecha_solicitud),
    })),
    ...alertas.slice(0, 3).map((alerta) => ({
      id: `alerta-${alerta.id}`,
      title: alerta.titulo,
      detail: alerta.descripcion,
      date: alerta.fecha,
    })),
  ].slice(0, 8);

  const handleResolverAlerta = async (id) => {
    try {
      const res = await updateAlerta(id, { resuelta: true });
      setAlertas((prev) => prev.map((a) => a.id === id ? res.data : a));
      toast.success('Alerta actualizada');
    } catch {
      toast.error('Error al resolver la alerta');
    }
  };

  return (
    <Layout>
      <div>
        <div className="mb-10 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_35px_rgba(34,197,94,0.10)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-[34px] font-bold text-slate-800">Dashboard ejecutivo PRO</h1>
              <p className="text-slate-500 text-base">Supervisa pedidos, usuarios, alertas y métricas generales del laboratorio con una vista directiva moderna.</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {stats.totalPedidos} pedidos
                </span>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  {stats.totalUsuarios} usuarios
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  {stats.pendientes} pendientes
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 rounded-[24px] border border-emerald-100 bg-[#f8fff7] p-2.5">
              <button
                onClick={() => changeTab('estadisticas')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  activeTab === 'estadisticas'
                    ? 'bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-emerald-100 text-slate-700 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                Estadísticas
              </button>
              <button
                onClick={() => changeTab('pedidos')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  activeTab === 'pedidos'
                    ? 'bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-emerald-100 text-slate-700 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                Pedidos
              </button>
              <button
                onClick={() => changeTab('usuarios')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  activeTab === 'usuarios'
                    ? 'bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-emerald-100 text-slate-700 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                Usuarios
              </button>
              <button
                onClick={() => changeTab('alertas')}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  activeTab === 'alertas'
                    ? 'bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-emerald-100 text-slate-700 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                Alertas
              </button>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS TAB */}
        {activeTab === 'estadisticas' && (
          <div>
            <ReportPanel
              title="Reportes de jefatura y trazabilidad"
              subtitle="Visualiza pedidos, consumo aproximado por producto y actividad reciente."
              primaryData={reportPrimaryData}
              secondaryData={reportSecondaryData}
              activity={activityItems}
              onExportExcel={handleExportarPedidosExcel}
              onExportPdf={handleExportarPedidosPdf}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
              <div className="rounded-[20px] bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Total Pedidos</p>
                    <p className="text-4xl font-bold mt-2">{stats.totalPedidos}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-red-500 to-rose-500 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Rechazados</p>
                    <p className="text-4xl font-bold mt-2">{stats.rechazados}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-amber-400 to-orange-500 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Pendientes</p>
                    <p className="text-4xl font-bold mt-2">{stats.pendientes}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-gradient-to-r from-lime-500 to-green-600 text-white p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/90">Aprobación</p>
                    <p className="text-4xl font-bold mt-2">{stats.tasaAprobacion}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              <div className="rounded-[20px] bg-white border border-emerald-100 p-5 shadow-[0_10px_30px_rgba(34,197,94,0.08)]">
                <p className="text-sm font-semibold text-slate-500">Usuarios registrados</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalUsuarios}</p>
              </div>
              <div className="rounded-[20px] bg-white border border-emerald-100 p-5 shadow-[0_10px_30px_rgba(34,197,94,0.08)]">
                <p className="text-sm font-semibold text-slate-500">Usuarios con rechazos</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.usuariosConRechazos}</p>
              </div>
              <div className="rounded-[20px] bg-white border border-emerald-100 p-5 shadow-[0_10px_30px_rgba(34,197,94,0.08)]">
                <p className="text-sm font-semibold text-slate-500">Tasa de rechazo</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.tasaRechazo}%</p>
              </div>
            </div>
          </div>
        )}

        {/* PEDIDOS TAB */}
        {activeTab === 'pedidos' && (
          <div>
            <div className="bg-white rounded-[24px] border border-emerald-100 shadow-[0_10px_30px_rgba(34,197,94,0.08)] p-5 md:p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar pedido o solicitante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#f8fff7] border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="relative w-full sm:w-48">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="rechazado">Rechazado</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 text-sm"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 text-sm"
                  />
                  <button
                    onClick={handleExportarPedidosExcel}
                    className="px-5 py-3 bg-white border border-emerald-100 text-slate-700 rounded-xl transition-all font-semibold shadow-sm text-sm whitespace-nowrap hover:bg-emerald-50"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Exportar
                  </button>
                  <button
                    onClick={handleNuevoPedido}
                    className="px-5 py-3 bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white rounded-xl transition-all font-semibold shadow-md shadow-emerald-500/20 text-sm whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Nuevo pedido
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f6fff2] border-b border-emerald-100">
                    <tr>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Código</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Solicitante</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Producto</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Cantidad</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Prioridad</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Fecha Solicitud</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Estado</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-orange-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-500/10">
                    {filteredPedidos.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-16 text-center text-slate-600 font-medium">
                          No hay pedidos registrados
                        </td>
                      </tr>
                    ) : filteredPedidos.map((pedido) => (
                      <tr key={pedido.id} className="group hover:bg-orange-500/5 transition-all duration-200">
                        <td className="py-5 px-5">
                          <p className="font-bold text-slate-900 text-sm">{pedido.codigo}</p>
                        </td>
                        <td className="py-5 px-5">
                          <p className="font-semibold text-slate-700 text-sm">{pedido.solicitante}</p>
                        </td>
                        <td className="py-5 px-5">
                          <p className="text-slate-600 text-sm">{pedido.producto}</p>
                          {pedido.evaluacion_seguridad?.reactivoCritico && (
                            <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                              Solicitud restringida
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm bg-blue-100 text-blue-700">
                            {pedido.cantidad}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${pedido.prioridad === 'alta' ? 'bg-rose-100 text-rose-700 border-rose-300' : pedido.prioridad === 'media' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                            {pedido.prioridad}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-sm text-slate-600">{formatDisplayDate(pedido.fecha_solicitud)}</td>
                        <td className="py-5 px-5 text-center">{getEstadoBadge(pedido.estado)}</td>
                        <td className="py-5 px-5">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button onClick={() => handleVerPedido(pedido)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Ver">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditarPedido(pedido)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEliminarPedido(pedido.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {pedido.estado === 'pendiente' && (
                              <>
                                <button onClick={() => handleCambiarEstadoPedido(pedido, 'aprobado')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Aprobar">
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleCambiarEstadoPedido(pedido, 'rechazado')} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Rechazar">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alertas' && (
          <div>
            <div className="mb-5 rounded-[24px] border border-rose-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Alertas de jefatura</p>
                  <p className="text-xs text-slate-500">Prioriza incidencias críticas y registra seguimiento oportuno.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="relative w-full md:w-52">
                    <select
                      value={alertPriorityFilter}
                      onChange={(e) => setAlertPriorityFilter(e.target.value)}
                      className="appearance-none bg-[#fff7f7] border border-rose-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer text-sm w-full transition-all"
                    >
                      <option value="todas">Todas las prioridades</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={handleExportarAlertasExcel}
                    className="px-5 py-3 bg-white border border-emerald-100 text-slate-700 rounded-xl transition-all font-semibold shadow-sm text-sm whitespace-nowrap hover:bg-emerald-50"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Exportar alertas
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl border border-rose-200 bg-white/80 p-5 shadow-sm">
                <p className="text-sm font-semibold text-rose-600 uppercase">Total alertas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{statsAlertas.total}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/80 p-5 shadow-sm">
                <p className="text-sm font-semibold text-amber-600 uppercase">Nuevas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{statsAlertas.nuevas}</p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-white/80 p-5 shadow-sm">
                <p className="text-sm font-semibold text-indigo-600 uppercase">Prioridad alta</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{statsAlertas.altas}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f6fff2] border-b border-emerald-100">
                    <tr>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-red-700">Alerta</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-red-700">Remitente</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-red-700">Prioridad</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-red-700">Estado</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-red-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-500/10">
                    {filteredAlertas.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-16 text-center text-slate-600 font-medium">No hay alertas registradas con ese filtro</td>
                      </tr>
                    ) : filteredAlertas.map((alerta) => (
                      <tr key={alerta.id} className="group hover:bg-red-500/5 transition-all duration-200">
                        <td className="py-5 px-5">
                          <p className="font-bold text-slate-900 text-sm">{alerta.titulo}</p>
                          <p className="text-xs text-slate-500 mt-1">{alerta.descripcion}</p>
                        </td>
                        <td className="py-5 px-5 text-sm text-slate-600">{alerta.remitente}</td>
                        <td className="py-5 px-5 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${alerta.prioridad === 'alta' ? 'bg-rose-100 text-rose-700 border-rose-300' : alerta.prioridad === 'media' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                            {alerta.prioridad}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${alerta.estado === 'resuelta' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-blue-100 text-blue-700 border-blue-300'}`}>
                            {alerta.estado}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-center">
                          <button
                            onClick={() => handleResolverAlerta(alerta.id)}
                            disabled={alerta.estado === 'resuelta'}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-600 text-white text-xs font-semibold disabled:opacity-50"
                          >
                            Cerrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div>
            <div className="bg-white rounded-[24px] border border-emerald-100 shadow-[0_10px_30px_rgba(34,197,94,0.08)] p-5 md:p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar usuario..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#f8fff7] border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="relative w-full sm:w-44">
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="appearance-none bg-[#f8fff7] border border-emerald-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer text-sm w-full transition-all"
                    >
                      <option value="todos">Todos los roles</option>
                      <option value="usuario">Usuario</option>
                      <option value="admin">Administrador</option>
                      <option value="jefe">Jefe superior</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={handleExportarUsuariosExcel}
                    className="px-5 py-3 bg-white border border-emerald-100 text-slate-700 rounded-xl transition-all font-semibold shadow-sm text-sm whitespace-nowrap hover:bg-emerald-50"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Exportar
                  </button>
                  <button
                    onClick={handleNuevoUsuario}
                    className="px-5 py-3 bg-gradient-to-r from-[#78d64b] to-[#43bb52] text-white rounded-xl transition-all font-semibold shadow-md shadow-emerald-500/20 text-sm whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Nuevo usuario
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f6fff2] border-b border-emerald-100">
                    <tr>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-yellow-700">Nombre</th>
                      <th className="text-left py-4 px-5 font-bold text-xs uppercase tracking-wider text-yellow-700">Email</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-yellow-700">Rol</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-yellow-700">Pedidos</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-yellow-700">Rechazos</th>
                      <th className="text-center py-4 px-5 font-bold text-xs uppercase tracking-wider text-yellow-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-500/10">
                    {filteredUsuarios.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-slate-600 font-medium">
                          No hay usuarios registrados
                        </td>
                      </tr>
                    ) : filteredUsuarios.map((usuario) => {
                      const tasaRechazo = usuario.total_pedidos ? ((usuario.rechazos / usuario.total_pedidos) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={usuario.id} className="group hover:bg-yellow-500/5 transition-all duration-200">
                          <td className="py-5 px-5">
                            <p className="font-bold text-slate-900 text-sm">{usuario.nombre}</p>
                          </td>
                          <td className="py-5 px-5">
                            <p className="text-slate-600 text-sm">{usuario.email}</p>
                          </td>
                          <td className="py-5 px-5 text-center">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300">
                              {usuario.rol || 'usuario'}
                            </span>
                          </td>
                          <td className="py-5 px-5 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm bg-blue-100 text-blue-700">
                              {usuario.total_pedidos || 0}
                            </span>
                          </td>
                          <td className="py-5 px-5 text-center">
                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${Number(tasaRechazo) > 50 ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                              {usuario.rechazos || 0}
                            </span>
                          </td>
                          <td className="py-5 px-5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => handleVerUsuario(usuario)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Ver">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEditarUsuario(usuario)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEliminarUsuario(usuario.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {showPedidoModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-[28px] sigirl-form-surface overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-gradient-to-r from-[#f6fff2] to-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedPedido ? 'Editar pedido' : 'Nuevo pedido'}</h2>
                  <p className="text-sm text-slate-500">Gestiona la información del pedido</p>
                </div>
                <button
                  onClick={() => {
                    setShowPedidoModal(false);
                    resetPedidoForm();
                  }}
                  className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Código</label>
                  <input value={formPedido.codigo} readOnly className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha solicitud</label>
                  <input
                    type="date"
                    value={formPedido.fecha_solicitud}
                    onChange={(e) => setFormPedido({ ...formPedido, fecha_solicitud: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Producto</label>
                  <select
                    value={formPedido.productoId}
                    onChange={(e) => setFormPedido({ ...formPedido, productoId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Selecciona un producto</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.cantidad})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Solicitante</label>
                  <input
                    type="text"
                    value={formPedido.solicitante}
                    onChange={(e) => setFormPedido({ ...formPedido, solicitante: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Nombre del solicitante"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={formPedido.cantidad}
                    onChange={(e) => setFormPedido({ ...formPedido, cantidad: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Prioridad</label>
                  <select
                    value={formPedido.prioridad}
                    onChange={(e) => setFormPedido({ ...formPedido, prioridad: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
                  <select
                    value={formPedido.estado}
                    onChange={(e) => setFormPedido({ ...formPedido, estado: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Observaciones</label>
                  <textarea
                    rows="3"
                    value={formPedido.observaciones}
                    onChange={(e) => setFormPedido({ ...formPedido, observaciones: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Notas adicionales"
                  />
                </div>
                {formPedido.estado === 'rechazado' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo de rechazo</label>
                    <input
                      type="text"
                      value={formPedido.motivo_rechazo}
                      onChange={(e) => setFormPedido({ ...formPedido, motivo_rechazo: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Indica por qué se rechaza"
                    />
                  </div>
                )}
              </div>

              <div className="sigirl-form-footer px-6 py-4 border-t border-emerald-100 bg-[#f8fff7]">
                <button
                  onClick={() => {
                    setShowPedidoModal(false);
                    resetPedidoForm();
                  }}
                  className="sigirl-btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarPedido}
                  className="sigirl-btn-primary"
                >
                  {selectedPedido ? 'Guardar cambios' : 'Crear pedido'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showUsuarioModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-[28px] sigirl-form-surface overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-gradient-to-r from-[#f6fff2] to-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedUsuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                  <p className="text-sm text-slate-500">Administra la lista de usuarios del sistema</p>
                </div>
                <button
                  onClick={() => {
                    setShowUsuarioModal(false);
                    resetUsuarioForm();
                  }}
                  className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formUsuario.nombre}
                    onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Correo</label>
                  <input
                    type="email"
                    value={formUsuario.email}
                    onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="correo@dominio.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Rol</label>
                  <select
                    value={formUsuario.rol}
                    onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="usuario">Usuario</option>
                    <option value="admin">Administrador</option>
                    <option value="jefe">Jefe superior</option>
                  </select>
                </div>
              </div>

              <div className="sigirl-form-footer px-6 py-4 border-t border-emerald-100 bg-[#f8fff7]">
                <button
                  onClick={() => {
                    setShowUsuarioModal(false);
                    resetUsuarioForm();
                  }}
                  className="sigirl-btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarUsuario}
                  className="sigirl-btn-primary"
                >
                  {selectedUsuario ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default JefeSuperiorDashboard;
