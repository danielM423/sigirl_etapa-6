import api from '../services/api';

export const STORAGE_KEYS = {
  productos: 'sigirl_productos',
  pedidos: 'sigirl_pedidos',
  usuarios: 'sigirl_usuarios',
  alertas: 'sigirl_alertas',
};

export const REACTIVOS_CRITICOS = [
  {
    nombre: 'Ácido sulfúrico concentrado',
    nivel: 'crítico',
    categoria: 'Ácidos',
    descripcion: 'Solo personal entrenado y con supervisión directa.',
    puntajeMinimo: 80,
    cupoMaximo: 2,
    requiereAutorizacion: true,
  },
  {
    nombre: 'Metanol',
    nivel: 'alto',
    categoria: 'Solventes',
    descripcion: 'Reactivo inflamable y tóxico por inhalación y contacto.',
    puntajeMinimo: 70,
    cupoMaximo: 3,
    requiereAutorizacion: true,
  },
  {
    nombre: 'Ácido clorhídrico',
    nivel: 'alto',
    categoria: 'Ácidos',
    descripcion: 'Requiere campana, gafas, guantes y protocolo de derrames.',
    puntajeMinimo: 65,
    cupoMaximo: 4,
    requiereAutorizacion: true,
  },
  {
    nombre: 'Nitrato de plata',
    nivel: 'medio',
    categoria: 'Sales',
    descripcion: 'Uso controlado para prácticas y análisis específicos.',
    puntajeMinimo: 60,
    cupoMaximo: 4,
    requiereAutorizacion: true,
  },
];

const getToday = () => new Date().toISOString().split('T')[0];

const defaultProductos = [
  { id: 1, nombre: 'Alcohol etílico', cantidad: 3, categoria: 'Solventes', estado: 'bajo_stock', umbral_minimo: 5, ubicacion: 'Almacén A', ultima_actualizacion: getToday() },
  { id: 2, nombre: 'Ácido clorhídrico', cantidad: 14, categoria: 'Ácidos', estado: 'ok', umbral_minimo: 5, ubicacion: 'Almacén B', ultima_actualizacion: getToday() },
  { id: 3, nombre: 'Guantes nitrilo', cantidad: 35, categoria: 'EPP', estado: 'ok', umbral_minimo: 10, ubicacion: 'Almacén A', ultima_actualizacion: getToday() },
  { id: 4, nombre: 'Metanol', cantidad: 2, categoria: 'Solventes', estado: 'bajo_stock', umbral_minimo: 5, ubicacion: 'Almacén C', ultima_actualizacion: getToday() },
  { id: 5, nombre: 'Ácido sulfúrico concentrado', cantidad: 1, categoria: 'Ácidos', estado: 'bajo_stock', umbral_minimo: 2, ubicacion: 'Gabinete de seguridad', ultima_actualizacion: getToday() },
  { id: 6, nombre: 'Nitrato de plata', cantidad: 6, categoria: 'Sales', estado: 'ok', umbral_minimo: 2, ubicacion: 'Gabinete oscuro', ultima_actualizacion: getToday() },
];

const defaultPedidos = [
  {
    id: 1,
    codigo: 'PED-2024-001',
    producto: 'Alcohol etílico',
    cantidad: 5,
    solicitante: 'Juan García',
    creadoPor: 'Juan García',
    departamento: 'Laboratorio General',
    estado: 'aprobado',
    prioridad: 'alta',
    fecha_solicitud: '2024-04-10',
    fecha_respuesta: '2024-04-11',
    observaciones: 'Uso para análisis rutinario',
  },
  {
    id: 2,
    codigo: 'PED-2024-002',
    producto: 'Pipetas 10ml',
    cantidad: 10,
    solicitante: 'María López',
    creadoPor: 'María López',
    departamento: 'Laboratorio B',
    estado: 'rechazado',
    prioridad: 'media',
    fecha_solicitud: '2024-04-09',
    fecha_respuesta: '2024-04-10',
    motivo_rechazo: 'Stock insuficiente',
    observaciones: 'Se requiere para prácticas',
  },
  {
    id: 3,
    codigo: 'PED-2024-003',
    producto: 'Ácido clorhídrico',
    cantidad: 2,
    solicitante: 'Carlos Ruiz',
    creadoPor: 'Carlos Ruiz',
    departamento: 'Laboratorio C',
    estado: 'pendiente',
    prioridad: 'alta',
    fecha_solicitud: '2024-04-12',
    fecha_respuesta: null,
    observaciones: 'Pendiente de validación de seguridad',
    evaluacion_seguridad: {
      reactivoCritico: true,
      puntaje: 65,
      puntajeMinimo: 65,
      aprobado: true,
      nivel: 'alto',
    },
  },
];

const defaultUsuarios = [
  { id: 1, nombre: 'Juan García', email: 'juan@lab.com', departamento: 'Laboratorio General', rol: 'usuario' },
  { id: 2, nombre: 'María López', email: 'maria@lab.com', departamento: 'Laboratorio B', rol: 'usuario' },
  { id: 3, nombre: 'Carlos Ruiz', email: 'carlos@lab.com', departamento: 'Laboratorio C', rol: 'admin' },
  { id: 4, nombre: 'Ana Martínez', email: 'ana@lab.com', departamento: 'Laboratorio A', rol: 'jefe' },
];

const defaultAlertas = [
  {
    id: 101,
    tipo: 'stock',
    titulo: 'Bajo stock de reactivos críticos',
    descripcion: 'Metanol y ácido sulfúrico se encuentran por debajo del umbral recomendado.',
    prioridad: 'alta',
    fecha: getToday(),
    estado: 'nueva',
    remitente: 'SIGIRL',
    destinatario: 'Admin y Jefe',
  },
];

const getDefaultData = () => ({
  productos: defaultProductos,
  pedidos: defaultPedidos,
  usuarios: defaultUsuarios,
  alertas: defaultAlertas,
});

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const hasToken = () => canUseStorage() && !!window.localStorage.getItem('token');

let hydrateStarted = false;
let syncInFlight = false;
let pendingSyncData = {};
let syncTimer = null;

const readCollection = (key, fallback) => {
  if (!canUseStorage()) return fallback;

  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const persistLocally = (next) => {
  if (!canUseStorage()) return next;

  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    window.localStorage.setItem(key, JSON.stringify(next[name] || []));
  });

  window.dispatchEvent(new Event('sigirl-data-updated'));
  return next;
};

const normalizeProducto = (producto = {}) => {
  const cantidad = Number(producto.cantidad ?? 0);
  const umbral = Number(producto.umbral_minimo ?? producto.minimo ?? 0);
  const categoriaBase = typeof producto.categoria === 'string'
    ? producto.categoria
    : producto.categoria?.nombre || producto.categoria?.categoria_nombre || '';

  return {
    id: Number(producto.id ?? 0),
    nombre: producto.nombre || 'Producto sin nombre',
    cantidad,
    categoria: producto.categoria_nombre || categoriaBase || 'General',
    estado: producto.estado || (cantidad <= 0 ? 'agotado' : cantidad <= umbral ? 'bajo_stock' : 'ok'),
    umbral_minimo: umbral,
    ubicacion: producto.ubicacion || 'Sin ubicación',
    ultima_actualizacion: producto.ultima_actualizacion || getToday(),
  };
};

const normalizePedido = (pedido) => ({
  id: Number(pedido.id),
  codigo: pedido.codigo || `PED-${new Date().getFullYear()}-${String(pedido.id).padStart(4, '0')}`,
  producto: pedido.producto_nombre || pedido.producto_nombre_display || pedido.producto || 'Producto',
  producto_id: pedido.producto_id || pedido.producto,
  cantidad: Number(pedido.cantidad ?? 0),
  solicitante: pedido.solicitante || pedido.usuario_username || 'Usuario',
  creadoPor: pedido.creado_por || pedido.solicitante || pedido.usuario_username || 'Usuario',
  departamento: pedido.departamento || 'Laboratorio General',
  estado: (pedido.estado || 'pendiente').toLowerCase(),
  prioridad: (pedido.prioridad || 'media').toLowerCase(),
  fecha_solicitud: pedido.fecha_solicitud || getToday(),
  fecha_respuesta: pedido.fecha_respuesta || null,
  observaciones: pedido.observaciones || '',
  motivo_rechazo: pedido.motivo_rechazo || '',
  evaluacion_seguridad: pedido.evaluacion_seguridad || null,
});

const normalizeAlerta = (alerta) => ({
  id: Number(alerta.id),
  tipo: alerta.tipo === 'ayuda' || alerta.tipo === 'problema' ? 'otro' : alerta.tipo || 'otro',
  titulo: alerta.titulo || 'Alerta SIGIRL',
  descripcion: alerta.descripcion || '',
  prioridad: (alerta.prioridad || 'media').toLowerCase(),
  fecha: alerta.fecha || getToday(),
  estado: (alerta.estado || 'nueva').toLowerCase(),
  remitente: alerta.remitente || 'Sistema',
  destinatario: alerta.destinatario || 'Admin y Jefe',
});

const detectTipoProducto = (item = {}) => {
  const categoria = (item.categoria || '').toLowerCase();

  if (categoria.includes('epp') || categoria.includes('vidrio') || categoria.includes('consum')) {
    return 'insumo';
  }

  if (categoria.includes('equipo')) {
    return 'equipo';
  }

  return 'reactivo';
};

const getStoredCollections = () => {
  const defaults = getDefaultData();

  return {
    productos: readCollection(STORAGE_KEYS.productos, defaults.productos).map(normalizeProducto),
    pedidos: readCollection(STORAGE_KEYS.pedidos, defaults.pedidos).map(normalizePedido),
    usuarios: readCollection(STORAGE_KEYS.usuarios, defaults.usuarios),
    alertas: readCollection(STORAGE_KEYS.alertas, defaults.alertas).map(normalizeAlerta),
  };
};

const resolveCategoriaId = async (nombre = 'General') => {
  const limpio = nombre.trim() || 'General';
  const response = await api.get('categorias/');
  const existente = response.data.find((categoria) => categoria.nombre.toLowerCase() === limpio.toLowerCase());

  if (existente) return existente.id;

  const creada = await api.post('categorias/', { nombre: limpio });
  return creada.data.id;
};

const buildProductoPayload = async (item) => ({
  nombre: item.nombre,
  tipo: detectTipoProducto(item),
  categoria: await resolveCategoriaId(item.categoria || 'General'),
  cantidad: Number(item.cantidad || 0),
  minimo: Number(item.umbral_minimo ?? item.minimo ?? 0),
  ubicacion: item.ubicacion || '',
});

const resolveProductoId = async (pedido) => {
  if (pedido.producto_id) return pedido.producto_id;

  const response = await api.get('productos/');
  const nombreBuscado = (pedido.producto || '').trim().toLowerCase();
  let producto = response.data.find((item) => item.nombre.trim().toLowerCase() === nombreBuscado);

  if (!producto) {
    producto = (
      await api.post(
        'productos/',
        await buildProductoPayload({
          nombre: pedido.producto || 'Producto sin nombre',
          categoria: 'General',
          cantidad: 0,
          umbral_minimo: 0,
          ubicacion: 'Pendiente',
        })
      )
    ).data;
  }

  return producto.id;
};

const buildPedidoPayload = async (item) => ({
  producto: await resolveProductoId(item),
  cantidad: Number(item.cantidad || 0),
  estado: (item.estado || 'pendiente').toLowerCase(),
  prioridad: (item.prioridad || 'media').toLowerCase(),
  codigo: item.codigo,
  solicitante: item.solicitante || item.creadoPor || 'Usuario',
  creado_por: item.creadoPor || item.solicitante || 'Usuario',
  departamento: item.departamento || 'Laboratorio General',
  fecha_solicitud: item.fecha_solicitud || getToday(),
  fecha_respuesta: item.fecha_respuesta || null,
  observaciones: item.observaciones || '',
  motivo_rechazo: item.motivo_rechazo || '',
  evaluacion_seguridad: item.evaluacion_seguridad || null,
});

const buildAlertaPayload = (item) => ({
  tipo: item.tipo === 'ayuda' || item.tipo === 'problema' ? 'otro' : item.tipo || 'otro',
  titulo: item.titulo || 'Alerta SIGIRL',
  descripcion: item.descripcion || '',
  prioridad: (item.prioridad || 'media').toLowerCase(),
  fecha: item.fecha || getToday(),
  estado: (item.estado || 'nueva').toLowerCase(),
  remitente: item.remitente || 'Sistema',
  destinatario: item.destinatario || 'Admin y Jefe',
});

const syncResource = async (resource, items, buildPayload) => {
  const remoteResponse = await api.get(`${resource}/`);
  const remoteItems = remoteResponse.data || [];
  const remoteIds = new Set(remoteItems.map((item) => Number(item.id)));
  const localIds = new Set(items.filter((item) => item?.id).map((item) => Number(item.id)));

  for (const item of items) {
    const payload = await buildPayload(item);

    if (item.id && remoteIds.has(Number(item.id))) {
      await api.put(`${resource}/${item.id}/`, payload);
    } else {
      await api.post(`${resource}/`, payload);
    }
  }

  for (const remoteItem of remoteItems) {
    if (!localIds.has(Number(remoteItem.id))) {
      await api.delete(`${resource}/${remoteItem.id}/`);
    }
  }
};

const flushPendingSync = async () => {
  if (!hasToken() || syncInFlight || Object.keys(pendingSyncData).length === 0) return;

  syncInFlight = true;
  const dataToSync = { ...pendingSyncData };
  pendingSyncData = {};

  try {
    if (dataToSync.productos) {
      await syncResource('productos', dataToSync.productos, buildProductoPayload);
    }

    if (dataToSync.pedidos) {
      await syncResource('pedidos', dataToSync.pedidos, buildPedidoPayload);
    }

    if (dataToSync.alertas) {
      await syncResource('alertas', dataToSync.alertas, async (item) => buildAlertaPayload(item));
    }

    await hydrateFromApi(true);
  } catch (error) {
    console.warn('No se pudo sincronizar con el backend.', error);
  } finally {
    syncInFlight = false;

    if (Object.keys(pendingSyncData).length > 0) {
      scheduleSync({});
    }
  }
};

const scheduleSync = (partialData) => {
  pendingSyncData = { ...pendingSyncData, ...partialData };

  if (syncTimer) {
    window.clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    void flushPendingSync();
  }, 250);
};

export const hydrateFromApi = async (silent = false) => {
  if (!hasToken()) return getStoredCollections();

  try {
    const [productosRes, pedidosRes, alertasRes] = await Promise.all([
      api.get('productos/'),
      api.get('pedidos/'),
      api.get('alertas/'),
    ]);

    const remoteHasData = productosRes.data.length || pedidosRes.data.length || alertasRes.data.length;
    const currentLocal = getStoredCollections();

    if (!remoteHasData && (currentLocal.productos.length || currentLocal.pedidos.length || currentLocal.alertas.length)) {
      scheduleSync(currentLocal);
      return currentLocal;
    }

    const next = {
      productos: productosRes.data.map(normalizeProducto),
      pedidos: pedidosRes.data.map(normalizePedido),
      usuarios: currentLocal.usuarios,
      alertas: alertasRes.data.map(normalizeAlerta),
    };

    return silent ? persistLocally(next) : persistLocally(next);
  } catch (error) {
    console.warn('No se pudo hidratar desde la API. Se usarán datos locales.', error);
    return getStoredCollections();
  }
};

export const loadSigirlCollections = () => {
  const current = getStoredCollections();

  if (hasToken() && !hydrateStarted) {
    hydrateStarted = true;
    void hydrateFromApi(true);
  }

  return current;
};

export const saveSigirlCollections = (partialData) => {
  if (!canUseStorage()) return partialData;

  const current = getStoredCollections();
  const next = { ...current, ...partialData };
  persistLocally(next);

  if (hasToken()) {
    scheduleSync(partialData);
  }

  return next;
};

export const appendSystemAlert = (alerta) => {
  const { alertas } = loadSigirlCollections();

  const nuevaAlerta = {
    id: Date.now(),
    fecha: getToday(),
    estado: 'nueva',
    remitente: 'Sistema',
    destinatario: 'Admin y Jefe',
    prioridad: 'media',
    ...alerta,
  };

  saveSigirlCollections({ alertas: [nuevaAlerta, ...alertas] });
  return nuevaAlerta;
};

export const evaluateReactivoAccess = (producto, respuestas = {}) => {
  const reactivo = REACTIVOS_CRITICOS.find((item) => item.nombre === producto);

  if (!reactivo) {
    return {
      reactivoCritico: false,
      aprobado: true,
      puntaje: 100,
      puntajeMinimo: 0,
      nivel: 'general',
      detalle: 'Producto de acceso general.',
    };
  }

  let puntaje = 0;

  if (respuestas.capacitacion === 'si') puntaje += 35;
  if (respuestas.epp === 'si') puntaje += 25;
  if (respuestas.protocolos === 'si') puntaje += 25;
  if (respuestas.supervision === 'si') puntaje += 15;

  const aprobado = puntaje >= reactivo.puntajeMinimo;

  return {
    reactivoCritico: true,
    aprobado,
    puntaje,
    puntajeMinimo: reactivo.puntajeMinimo,
    nivel: reactivo.nivel,
    cupoMaximo: reactivo.cupoMaximo,
    requiereAutorizacion: reactivo.requiereAutorizacion,
    detalle: aprobado
      ? 'Cumple el puntaje mínimo y pasa a revisión de autorización.'
      : 'No cumple el puntaje mínimo; se notificará al administrador y al jefe.',
  };
};
