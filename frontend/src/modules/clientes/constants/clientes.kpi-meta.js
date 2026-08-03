// src/modules/clientes/constants/clientes.kpi-meta.js

export const CLIENTES_SECTION_META = Object.freeze({
  internet: {
    key: 'internet',
    title: 'INTERNET + INTERNET TV',
    subtitle:
      'Resumen operativo consolidado de servicios con componente de internet.',
  },
  television: {
    key: 'television',
    title: 'SOLO TELEVISIÓN',
    subtitle:
      'Resumen operativo del universo de clientes con servicio exclusivo de TV.',
  },
})

export const CLIENTES_CHART_META = Object.freeze({
  estatus: {
    key: 'estatus',
    title: 'Segmentación por Estatus',
    subtitle:
      'Distribución consolidada de Internet + Internet TV según estatus operativo.',
  },
  producto: {
    key: 'producto',
    title: 'Segmentación por Producto',
    subtitle:
      'Comparativo entre clientes con Internet y clientes con Internet + TV.',
  },
})

export const CLIENTES_KPI_META = Object.freeze({
  internet: [
    {
      key: 'internet-total',
      title: 'Total',
      field: 'total',
      description: 'Base instalada con internet',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'internet-activos',
      title: 'Activos',
      field: 'activos',
      compute: 'activosNetos',
      description: 'Clientes activos',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'internet-exonerados',
      title: 'Exonerados',
      field: 'exonerados',
      description: 'Clientes exonerados',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'internet-por-instalar',
      title: 'Por Instalar',
      field: 'porInstalar',
      description: '',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'internet-suspendidos',
      title: 'Suspendidos',
      field: 'suspendidos',
      description: 'Suspendidos + Por suspender',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'internet-cortados',
      title: 'Cortados',
      field: 'cortados',
      description: 'Cortados + Por reconectar',
      format: 'number',
      decimals: 0,
    },
  ],

  television: [
    {
      key: 'tv-total',
      title: 'Total TV',
      field: 'total',
      description: 'Base instalada de televisión',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'tv-activos',
      title: 'Activos TV',
      field: 'activos',
      compute: 'activosNetos',
      description: 'Clientes activos TV',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'tv-exonerados',
      title: 'Exonerados TV',
      field: 'exonerados',
      description: 'Clientes exonerados TV',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'tv-por-instalar',
      title: 'Por Instalar TV',
      field: 'porInstalar',
      description: '',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'tv-suspendidos',
      title: 'Suspendidos TV',
      field: 'suspendidos',
      description: '',
      format: 'number',
      decimals: 0,
    },
    {
      key: 'tv-cortados',
      title: 'Cortados TV',
      field: 'cortados',
      description: '',
      format: 'number',
      decimals: 0,
    },
  ],
})

export const CLIENTES_DEFAULT_KPI_ORDER = Object.freeze({
  internet: [
    'internet-total',
    'internet-activos',
    'internet-exonerados',
    'internet-por-instalar',
    'internet-suspendidos',
    'internet-cortados',
  ],

  television: [
    'tv-total',
    'tv-activos',
    'tv-exonerados',
    'tv-por-instalar',
    'tv-suspendidos',
    'tv-cortados',
  ],
})

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

function getBucketTotal(bucket = {}) {
  return toSafeNumber(bucket?.total)
}

function getBucketNonActiveTotal(bucket = {}) {
  return (
    toSafeNumber(bucket?.porInstalar) +
    toSafeNumber(bucket?.suspendidos) +
    toSafeNumber(bucket?.cortados)
  )
}

function getNetActiveValue(bucket = {}) {
  const activos = toSafeNumber(bucket?.activos)
  const exonerados = toSafeNumber(bucket?.exonerados)
  const total = getBucketTotal(bucket)
  const nonActiveTotal = getBucketNonActiveTotal(bucket)

  if (activos <= 0) {
    return 0
  }

  if (exonerados <= 0) {
    return activos
  }

  const activePlusExoneratedLooksDuplicated =
    total > 0 && activos + exonerados + nonActiveTotal > total

  if (activePlusExoneratedLooksDuplicated) {
    return Math.max(activos - exonerados, 0)
  }

  return activos
}

function resolveKpiValue(item = {}, bucket = {}) {
  if (item.compute === 'activosNetos') {
    return getNetActiveValue(bucket)
  }

  return toSafeNumber(bucket?.[item.field])
}

function normalizeKpiItem(item = {}, bucket = {}) {
  return {
    key: item.key,
    title: item.title,
    value: resolveKpiValue(item, bucket),
    description: item.description || '',
    format: item.format || 'number',
    decimals: normalizeDecimals(item.decimals, 0),
    prefix: item.prefix || '',
    suffix: item.suffix || '',
    locale: item.locale || 'es-VE',
    emptyValue: item.emptyValue || '0',
  }
}

export function buildClientesKpiItems(section, bucket = {}) {
  const config = CLIENTES_KPI_META[section]

  if (!Array.isArray(config)) {
    return []
  }

  return config.map((item) => normalizeKpiItem(item, bucket))
}

export function buildClientesDonutItems(type, segment = {}) {
  if (type === 'estatus') {
    return [
      {
        key: 'clientes-estatus-activos',
        name: 'Activos',
        value: getNetActiveValue(segment),
        colorToken: 'success',
      },
      {
        key: 'clientes-estatus-exonerados',
        name: 'Exonerados',
        value: toSafeNumber(segment?.exonerados),
        colorToken: 'neutral',
      },
      {
        key: 'clientes-estatus-cortados',
        name: 'Cortados',
        value: toSafeNumber(segment?.cortados),
        colorToken: 'danger',
      },
      {
        key: 'clientes-estatus-por-instalar',
        name: 'Por Instalar',
        value: toSafeNumber(segment?.porInstalar),
        colorToken: 'tertiary',
      },
      {
        key: 'clientes-estatus-suspendidos',
        name: 'Suspendidos',
        value: toSafeNumber(segment?.suspendidos),
        colorToken: 'warning',
      },
    ].filter((item) => item.value > 0)
  }

  if (type === 'producto') {
    return [
      {
        key: 'clientes-producto-internet',
        name: 'Clientes Internet',
        value: toSafeNumber(segment?.internet),
        colorToken: 'primary',
      },
      {
        key: 'clientes-producto-internet-tv',
        name: 'Clientes Internet + TV',
        value: toSafeNumber(segment?.internetTv),
        colorToken: 'secondary',
      },
    ].filter((item) => item.value > 0)
  }

  return []
}