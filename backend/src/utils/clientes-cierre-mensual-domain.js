const MONTH_MIN = 1
const MONTH_MAX = 12
const YEAR_MIN = 2000
const YEAR_MAX = 2100

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function toSafeArray(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean)
    : []
}

function toSafeNumberArray(value) {
  return Array.isArray(value)
    ? value
        .map((item) => toSafeNumber(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : []
}

function round(value, decimals = 2) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  const factor = 10 ** decimals
  return Math.round(numericValue * factor) / factor
}

function calculatePercentage(numerator, denominator, decimals = 2) {
  const safeNumerator = toSafeNumber(numerator)
  const safeDenominator = toSafeNumber(denominator)

  if (safeDenominator <= 0) {
    return 0
  }

  return round((safeNumerator / safeDenominator) * 100, decimals)
}

function normalizeMonth(value) {
  const month = toSafeNumber(value)

  if (month < MONTH_MIN || month > MONTH_MAX) {
    return 0
  }

  return month
}

function normalizeYear(value) {
  const year = toSafeNumber(value)

  if (year < YEAR_MIN || year > YEAR_MAX) {
    return 0
  }

  return year
}

function getMonthLabel(month) {
  const labels = [
    '',
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  return labels[toSafeNumber(month)] || ''
}

function createEmptyDetalleRow({
  servicio = '',
  zona = '',
  franquicia = '',
} = {}) {
  return {
    servicio: normalizeText(servicio, 'SIN DATO'),
    zona: normalizeText(zona),
    franquicia: normalizeText(franquicia),
    totalClientesActivos: 0,
    totalClientesCortados: 0,
    totalClientesPorCortar: 0,
    totalClientesExonerados: 0,
    totalVenta: 0,
    totalInstalacionesFinalizadas: 0,
    totalInstalacionesPendientes: 0,
    totalReclamosFinalizados: 0,
    efectividadInstalacionPct: 0,
    tasaCortePct: 0,
    churnRateOperacionalPct: 0,
  }
}

function normalizeDetalleRow(row = {}) {
  const totalClientesActivos = toSafeNumber(
    row.totalClientesActivos ?? row.total_clientes_activos,
  )
  const totalClientesCortados = toSafeNumber(
    row.totalClientesCortados ?? row.total_clientes_cortados,
  )
  const totalClientesPorCortar = toSafeNumber(
    row.totalClientesPorCortar ?? row.total_clientes_por_cortar,
  )
  const totalClientesExonerados = toSafeNumber(
    row.totalClientesExonerados ?? row.total_clientes_exonerados,
  )
  const totalVenta = toSafeNumber(row.totalVenta ?? row.total_venta)
  const totalInstalacionesFinalizadas = toSafeNumber(
    row.totalInstalacionesFinalizadas ?? row.total_instalaciones_finalizadas,
  )
  const totalInstalacionesPendientes = toSafeNumber(
    row.totalInstalacionesPendientes ?? row.total_instalaciones_pendientes,
  )
  const totalReclamosFinalizados = toSafeNumber(
    row.totalReclamosFinalizados ?? row.total_reclamos_finalizados,
  )

  const baseClientes =
    totalClientesActivos +
    totalClientesCortados +
    totalClientesPorCortar +
    totalClientesExonerados

  const totalInstalaciones =
    totalInstalacionesFinalizadas + totalInstalacionesPendientes

  return {
    ...createEmptyDetalleRow({
      servicio: row.servicio,
      zona: row.zona,
      franquicia: row.franquicia,
    }),
    totalClientesActivos,
    totalClientesCortados,
    totalClientesPorCortar,
    totalClientesExonerados,
    totalVenta,
    totalInstalacionesFinalizadas,
    totalInstalacionesPendientes,
    totalReclamosFinalizados,
    efectividadInstalacionPct: calculatePercentage(
      totalInstalacionesFinalizadas,
      totalInstalaciones,
    ),
    tasaCortePct: calculatePercentage(totalClientesCortados, baseClientes),
    churnRateOperacionalPct: calculatePercentage(
      totalClientesCortados + totalClientesPorCortar,
      baseClientes,
    ),
  }
}

function buildDetallePorServicio(rows = []) {
  return Array.isArray(rows) ? rows.map((row) => normalizeDetalleRow(row)) : []
}

function aggregateRows(rows = [], dimension) {
  const buckets = new Map()

  rows.forEach((row) => {
    const source = normalizeDetalleRow(row)
    const key = normalizeText(source?.[dimension], 'SIN DATO')
    const current = buckets.get(key) || createEmptyDetalleRow({ [dimension]: key })

    current.totalClientesActivos += source.totalClientesActivos
    current.totalClientesCortados += source.totalClientesCortados
    current.totalClientesPorCortar += source.totalClientesPorCortar
    current.totalClientesExonerados += source.totalClientesExonerados
    current.totalVenta += source.totalVenta
    current.totalInstalacionesFinalizadas += source.totalInstalacionesFinalizadas
    current.totalInstalacionesPendientes += source.totalInstalacionesPendientes
    current.totalReclamosFinalizados += source.totalReclamosFinalizados

    if (dimension === 'zona') {
      current.zona = key
    }

    if (dimension === 'franquicia') {
      current.franquicia = key
    }

    if (dimension === 'servicio') {
      current.servicio = key
    }

    buckets.set(key, current)
  })

  return Array.from(buckets.values())
    .map((row) => normalizeDetalleRow(row))
    .sort((left, right) => {
      const leftKey = normalizeText(left?.[dimension], 'SIN DATO')
      const rightKey = normalizeText(right?.[dimension], 'SIN DATO')

      return leftKey.localeCompare(rightKey, 'es', {
        sensitivity: 'base',
      })
    })
}

function buildKpis(rows = []) {
  const totals = rows.reduce(
    (acc, row) => {
      const source = normalizeDetalleRow(row)

      acc.totalClientesActivos += source.totalClientesActivos
      acc.totalClientesCortados += source.totalClientesCortados
      acc.totalClientesPorCortar += source.totalClientesPorCortar
      acc.totalClientesExonerados += source.totalClientesExonerados
      acc.totalVenta += source.totalVenta
      acc.totalInstalacionesFinalizadas += source.totalInstalacionesFinalizadas
      acc.totalInstalacionesPendientes += source.totalInstalacionesPendientes
      acc.totalReclamosFinalizados += source.totalReclamosFinalizados

      return acc
    },
    {
      totalClientesActivos: 0,
      totalClientesCortados: 0,
      totalClientesPorCortar: 0,
      totalClientesExonerados: 0,
      totalVenta: 0,
      totalInstalacionesFinalizadas: 0,
      totalInstalacionesPendientes: 0,
      totalReclamosFinalizados: 0,
    },
  )

  const baseClientes =
    totals.totalClientesActivos +
    totals.totalClientesCortados +
    totals.totalClientesPorCortar +
    totals.totalClientesExonerados

  const totalInstalaciones =
    totals.totalInstalacionesFinalizadas + totals.totalInstalacionesPendientes

  return {
    totalClientesActivos: totals.totalClientesActivos,
    totalClientesCortados: totals.totalClientesCortados,
    totalClientesPorCortar: totals.totalClientesPorCortar,
    totalClientesExonerados: totals.totalClientesExonerados,
    totalVenta: totals.totalVenta,
    totalInstalacionesFinalizadas: totals.totalInstalacionesFinalizadas,
    totalInstalacionesPendientes: totals.totalInstalacionesPendientes,
    totalReclamosFinalizados: totals.totalReclamosFinalizados,
    baseTotalClientes: baseClientes,
    totalInstalaciones,
    efectividadInstalacionPct: calculatePercentage(
      totals.totalInstalacionesFinalizadas,
      totalInstalaciones,
    ),
    backlogInstalacionPct: calculatePercentage(
      totals.totalInstalacionesPendientes,
      totalInstalaciones,
    ),
    tasaCortePct: calculatePercentage(
      totals.totalClientesCortados,
      baseClientes,
    ),
    churnRateOperacionalPct: calculatePercentage(
      totals.totalClientesCortados + totals.totalClientesPorCortar,
      baseClientes,
    ),
    clientesPorCortarPct: calculatePercentage(
      totals.totalClientesPorCortar,
      baseClientes,
    ),
    clientesExoneradosPct: calculatePercentage(
      totals.totalClientesExonerados,
      baseClientes,
    ),
    ventasSobreBasePct: calculatePercentage(
      totals.totalVenta,
      baseClientes,
    ),
    conversionVentaInstalacionPct: calculatePercentage(
      totals.totalInstalacionesFinalizadas,
      totals.totalVenta,
    ),
    pendienteSobreVentaPct: calculatePercentage(
      totals.totalInstalacionesPendientes,
      totals.totalVenta,
    ),
  }
}

module.exports = {
  MONTH_MIN,
  MONTH_MAX,
  YEAR_MIN,
  YEAR_MAX,
  normalizeText,
  toSafeNumber,
  toSafeArray,
  toSafeNumberArray,
  round,
  calculatePercentage,
  normalizeMonth,
  normalizeYear,
  getMonthLabel,
  createEmptyDetalleRow,
  normalizeDetalleRow,
  buildDetallePorServicio,
  aggregateRows,
  buildKpis,
}