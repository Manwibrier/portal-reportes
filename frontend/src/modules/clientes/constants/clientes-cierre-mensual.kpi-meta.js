// src/modules/clientes/constants/clientes-cierre-mensual.kpi-meta.js

const CLIENTES_CIERRE_MENSUAL_KPI_META = {
  baseTotalClientes: {
    key: 'baseTotalClientes',
    title: 'Base Total',
    description: 'Clientes considerados en el cierre mensual.',
    format: 'number',
    decimals: 0,
    tone: 'neutral',
  },

  totalClientesActivos: {
    key: 'totalClientesActivos',
    title: 'Clientes Activos',
    description: 'Base activa consolidada del período seleccionado.',
    format: 'number',
    decimals: 0,
    tone: 'success',
  },

  totalClientesExonerados: {
    key: 'totalClientesExonerados',
    title: 'Clientes Exonerados',
    description: 'Clientes exonerados consolidados en el período.',
    format: 'number',
    decimals: 0,
    tone: 'neutral',
  },

  totalClientesPorCortar: {
    key: 'totalClientesPorCortar',
    title: 'Clientes Por Cortar',
    description: 'Clientes pendientes por cortar dentro del cierre.',
    format: 'number',
    decimals: 0,
    tone: 'warning',
  },

  totalClientesCortados: {
    key: 'totalClientesCortados',
    title: 'Clientes Cortados',
    description: 'Clientes en estatus cortado dentro del período.',
    format: 'number',
    decimals: 0,
    tone: 'danger',
  },

  totalVenta: {
    key: 'totalVenta',
    title: 'Ventas',
    description: 'Ventas registradas durante el mes seleccionado.',
    format: 'number',
    decimals: 0,
    tone: 'neutral',
  },

  totalInstalacionesFinalizadas: {
    key: 'totalInstalacionesFinalizadas',
    title: 'Instalaciones Finalizadas',
    description: 'Instalaciones cerradas dentro del período.',
    format: 'number',
    decimals: 0,
    tone: 'success',
  },

  totalInstalacionesPendientes: {
    key: 'totalInstalacionesPendientes',
    title: 'Instalaciones Pendientes',
    description: 'Instalaciones pendientes al cierre del período.',
    format: 'number',
    decimals: 0,
    tone: 'warning',
  },

  totalReclamosFinalizados: {
    key: 'totalReclamosFinalizados',
    title: 'Reclamos Finalizados',
    description: 'Reclamos operativos finalizados en el mes.',
    format: 'number',
    decimals: 0,
    tone: 'neutral',
  },

  efectividadInstalacionPct: {
    key: 'efectividadInstalacionPct',
    title: '% Efectividad Instalación',
    description: 'Instalaciones finalizadas sobre el total de instalaciones.',
    format: 'percent',
    decimals: 2,
    tone: 'success',
  },

  backlogInstalacionPct: {
    key: 'backlogInstalacionPct',
    title: '% Backlog Instalación',
    description: 'Instalaciones pendientes sobre el total de instalaciones.',
    format: 'percent',
    decimals: 2,
    tone: 'warning',
  },

  tasaCortePct: {
    key: 'tasaCortePct',
    title: '% Tasa de Corte',
    description: 'Clientes cortados sobre la base total del período.',
    format: 'percent',
    decimals: 2,
    tone: 'danger',
  },

  totalInstalaciones: {
    key: 'totalInstalaciones',
    title: 'Total Instalaciones',
    description: 'Instalaciones finalizadas y pendientes del período.',
    format: 'number',
    decimals: 0,
    tone: 'neutral',
  },

  churnRateOperacionalPct: {
    key: 'churnRateOperacionalPct',
    title: '% Churn Operacional',
    description: 'Cortados y por cortar sobre la base total.',
    format: 'percent',
    decimals: 2,
    tone: 'danger',
  },

  clientesPorCortarPct: {
    key: 'clientesPorCortarPct',
    title: '% Por Cortar',
    description: 'Clientes por cortar sobre la base total.',
    format: 'percent',
    decimals: 2,
    tone: 'warning',
  },

  clientesExoneradosPct: {
    key: 'clientesExoneradosPct',
    title: '% Exonerados',
    description: 'Clientes exonerados sobre la base total.',
    format: 'percent',
    decimals: 2,
    tone: 'neutral',
  },

  ventasSobreBasePct: {
    key: 'ventasSobreBasePct',
    title: '% Ventas sobre Base',
    description: 'Ventas registradas sobre la base total.',
    format: 'percent',
    decimals: 2,
    tone: 'neutral',
  },

  conversionVentaInstalacionPct: {
    key: 'conversionVentaInstalacionPct',
    title: '% Venta a Instalación',
    description: 'Instalaciones finalizadas sobre ventas registradas.',
    format: 'percent',
    decimals: 2,
    tone: 'success',
  },

  pendienteSobreVentaPct: {
    key: 'pendienteSobreVentaPct',
    title: '% Pendiente sobre Venta',
    description: 'Instalaciones pendientes sobre ventas registradas.',
    format: 'percent',
    decimals: 2,
    tone: 'warning',
  },
}

const CLIENTES_CIERRE_MENSUAL_KPI_GROUPS = [
  {
    key: 'clientes',
    title: 'Información de clientes',
    subtitle: 'Base y estados principales del cierre mensual.',
    order: [
      'baseTotalClientes',
      'totalClientesActivos',
      'totalClientesExonerados',
      'totalClientesPorCortar',
      'totalClientesCortados',
    ],
  },
  {
    key: 'calculados',
    title: 'Campos calculados',
    subtitle: 'Movimientos operativos consolidados del período.',
    order: [
      'totalVenta',
      'totalInstalacionesFinalizadas',
      'totalInstalacionesPendientes',
      'totalReclamosFinalizados',
    ],
  },
  {
    key: 'metricas',
    title: 'Métricas',
    subtitle: 'Indicadores porcentuales derivados del cierre.',
    order: [
      'efectividadInstalacionPct',
      'backlogInstalacionPct',
      'tasaCortePct',
    ],
  },
]

const CLIENTES_CIERRE_MENSUAL_DEFAULT_KPI_ORDER = [
  'baseTotalClientes',
  'totalClientesActivos',
  'totalClientesExonerados',
  'totalClientesPorCortar',
  'totalClientesCortados',
  'totalVenta',
  'totalInstalacionesFinalizadas',
  'totalInstalacionesPendientes',
  'totalReclamosFinalizados',
  'efectividadInstalacionPct',
  'backlogInstalacionPct',
  'tasaCortePct',
]

const CLIENTES_CIERRE_MENSUAL_SECTION_META = {
  principal: {
    key: 'principal',
    title: 'KPIs del Cierre Mensual',
    subtitle: 'Indicadores consolidados del período seleccionado.',
  },
}

function toSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function toSafeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const normalizedValue = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '')
    .trim()

  if (!normalizedValue) return fallback

  const numericValue = Number(normalizedValue)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function normalizeDecimals(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function normalizeKpiOrder(order = CLIENTES_CIERRE_MENSUAL_DEFAULT_KPI_ORDER) {
  const sourceOrder =
    toSafeArray(order).length > 0
      ? order
      : CLIENTES_CIERRE_MENSUAL_DEFAULT_KPI_ORDER

  const seen = new Set()

  return sourceOrder.filter((key) => {
    const safeKey = String(key ?? '').trim()

    if (!safeKey || seen.has(safeKey)) {
      return false
    }

    seen.add(safeKey)

    return Boolean(CLIENTES_CIERRE_MENSUAL_KPI_META[safeKey])
  })
}

function resolveKpiValue(source = {}, key = '') {
  const safeSource = toSafeObject(source)

  return toSafeNumber(safeSource[key])
}

function buildClientesCierreMensualKpiItems(
  kpis = {},
  order = CLIENTES_CIERRE_MENSUAL_DEFAULT_KPI_ORDER,
) {
  const source = toSafeObject(kpis)
  const normalizedOrder = normalizeKpiOrder(order)

  return normalizedOrder
    .map((key) => {
      const meta = CLIENTES_CIERRE_MENSUAL_KPI_META[key]

      if (!meta) return null

      return {
        ...meta,
        id: key,
        key,
        value: resolveKpiValue(source, key),
        description: meta.description || '',
        format: meta.format || 'number',
        decimals: normalizeDecimals(meta.decimals, 0),
        prefix: meta.prefix || '',
        suffix: meta.suffix || '',
        locale: meta.locale || 'es-VE',
        emptyValue: meta.emptyValue || '0',
        tone: meta.tone || '',
        meta: meta.meta || '',
      }
    })
    .filter(Boolean)
}

function buildClientesCierreMensualGroupedKpiItems(kpis = {}) {
  return CLIENTES_CIERRE_MENSUAL_KPI_GROUPS.map((group) => ({
    ...group,
    items: buildClientesCierreMensualKpiItems(kpis, group.order),
  }))
}

export {
  CLIENTES_CIERRE_MENSUAL_DEFAULT_KPI_ORDER,
  CLIENTES_CIERRE_MENSUAL_KPI_GROUPS,
  CLIENTES_CIERRE_MENSUAL_KPI_META,
  CLIENTES_CIERRE_MENSUAL_SECTION_META,
  buildClientesCierreMensualGroupedKpiItems,
  buildClientesCierreMensualKpiItems,
}