// src/modules/clientes/constants/clientes-cierre-mensual.contract.js

const NUMBER_FIELDS = [
  'totalClientesActivos',
  'totalClientesCortados',
  'totalClientesPorCortar',
  'totalClientesExonerados',
  'totalVenta',
  'totalInstalacionesFinalizadas',
  'totalInstalacionesPendientes',
  'totalReclamosFinalizados',
  'efectividadInstalacionPct',
  'backlogInstalacionPct',
  'tasaCortePct',
  'churnRateOperacionalPct',
  'clientesPorCortarPct',
  'clientesExoneradosPct',
  'ventasSobreBasePct',
  'conversionVentaInstalacionPct',
  'pendienteSobreVentaPct',
  'baseTotalClientes',
  'totalInstalaciones',
]

const DETALLE_NUMBER_FIELDS = [
  'totalClientesActivos',
  'totalClientesCortados',
  'totalClientesPorCortar',
  'totalClientesExonerados',
  'totalVenta',
  'totalInstalacionesFinalizadas',
  'totalInstalacionesPendientes',
  'totalReclamosFinalizados',
]

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
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

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function toSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function toSafeNumberArray(value) {
  return toSafeArray(value)
    .map((item) => toSafeNumber(item))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function getFirstField(row = {}, fields = []) {
  for (const field of fields) {
    const value = row?.[field]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function calculatePercentage(numerator, denominator) {
  const safeNumerator = toSafeNumber(numerator)
  const safeDenominator = toSafeNumber(denominator)

  if (safeDenominator <= 0) return 0

  return (safeNumerator / safeDenominator) * 100
}

function createEmptyDetalleRow() {
  return {
    id: '',
    key: '',
    servicio: '',
    zona: '',
    franquicia: '',
    totalClientesActivos: 0,
    totalClientesCortados: 0,
    totalClientesPorCortar: 0,
    totalClientesExonerados: 0,
    totalVenta: 0,
    totalInstalacionesFinalizadas: 0,
    totalInstalacionesPendientes: 0,
    totalReclamosFinalizados: 0,
    efectividadInstalacionPct: 0,
    backlogInstalacionPct: 0,
    tasaCortePct: 0,
    churnRateOperacionalPct: 0,
    clientesPorCortarPct: 0,
    clientesExoneradosPct: 0,
    ventasSobreBasePct: 0,
    conversionVentaInstalacionPct: 0,
    pendienteSobreVentaPct: 0,
    baseTotalClientes: 0,
    totalInstalaciones: 0,
  }
}

function normalizeDetalleRow(row = {}, index = 0) {
  const source = toSafeObject(row)

  const normalized = {
    ...createEmptyDetalleRow(),

    id: normalizeText(
      getFirstField(source, ['id', 'key']),
      `cierre-mensual-detalle-${index}`,
    ),

    key: normalizeText(
      getFirstField(source, ['key', 'id']),
      `cierre-mensual-detalle-${index}`,
    ),

    servicio: normalizeText(
      getFirstField(source, [
        'servicio',
        'service',
        'tipoServicio',
        'tipo_servicio',
        'producto',
        'categoria',
      ]),
      'SIN DATO',
    ),

    zona: normalizeText(
      getFirstField(source, [
        'zona',
        'zone',
        'region',
        'nombreZona',
        'nombre_zona',
      ]),
    ),

    franquicia: normalizeText(
      getFirstField(source, [
        'franquicia',
        'franchise',
        'nombreFranquicia',
        'nombre_franquicia',
      ]),
    ),

    totalClientesActivos: toSafeNumber(
      getFirstField(source, [
        'totalClientesActivos',
        'clientesActivos',
        'activos',
        'total_activos',
        'total_clientes_activos',
      ]),
    ),

    totalClientesCortados: toSafeNumber(
      getFirstField(source, [
        'totalClientesCortados',
        'clientesCortados',
        'cortados',
        'total_cortados',
        'total_clientes_cortados',
      ]),
    ),

    totalClientesPorCortar: toSafeNumber(
      getFirstField(source, [
        'totalClientesPorCortar',
        'clientesPorCortar',
        'porCortar',
        'total_por_cortar',
        'total_clientes_por_cortar',
      ]),
    ),

    totalClientesExonerados: toSafeNumber(
      getFirstField(source, [
        'totalClientesExonerados',
        'clientesExonerados',
        'exonerados',
        'total_exonerados',
        'total_clientes_exonerados',
      ]),
    ),

    totalVenta: toSafeNumber(
      getFirstField(source, [
        'totalVenta',
        'ventas',
        'venta',
        'totalVentas',
        'total_venta',
        'total_ventas',
      ]),
    ),

    totalInstalacionesFinalizadas: toSafeNumber(
      getFirstField(source, [
        'totalInstalacionesFinalizadas',
        'instalacionesFinalizadas',
        'instalaciones_finalizadas',
        'total_instalaciones_finalizadas',
        'finalizadas',
      ]),
    ),

    totalInstalacionesPendientes: toSafeNumber(
      getFirstField(source, [
        'totalInstalacionesPendientes',
        'instalacionesPendientes',
        'instalaciones_pendientes',
        'total_instalaciones_pendientes',
        'pendientes',
      ]),
    ),

    totalReclamosFinalizados: toSafeNumber(
      getFirstField(source, [
        'totalReclamosFinalizados',
        'reclamosFinalizados',
        'reclamos_finalizados',
        'total_reclamos_finalizados',
      ]),
    ),
  }

  const baseTotalClientes =
    normalized.totalClientesActivos +
    normalized.totalClientesCortados +
    normalized.totalClientesPorCortar +
    normalized.totalClientesExonerados

  const totalInstalaciones =
    normalized.totalInstalacionesFinalizadas +
    normalized.totalInstalacionesPendientes

  return {
    ...normalized,

    baseTotalClientes,
    totalInstalaciones,

    efectividadInstalacionPct: toSafeNumber(
      getFirstField(source, [
        'efectividadInstalacionPct',
        'efectividadInstalacion',
        'efectividad_instalacion_pct',
        'efectividad_instalacion',
      ]),
      calculatePercentage(
        normalized.totalInstalacionesFinalizadas,
        totalInstalaciones,
      ),
    ),

    backlogInstalacionPct: toSafeNumber(
      getFirstField(source, [
        'backlogInstalacionPct',
        'backlogInstalacion',
        'backlog_instalacion_pct',
        'backlog_instalacion',
      ]),
      calculatePercentage(
        normalized.totalInstalacionesPendientes,
        totalInstalaciones,
      ),
    ),

    tasaCortePct: toSafeNumber(
      getFirstField(source, [
        'tasaCortePct',
        'tasaCorte',
        'tasa_corte_pct',
        'tasa_corte',
      ]),
      calculatePercentage(
        normalized.totalClientesCortados,
        baseTotalClientes,
      ),
    ),

    churnRateOperacionalPct: toSafeNumber(
      getFirstField(source, [
        'churnRateOperacionalPct',
        'churnRateOperacional',
        'churn_rate_operacional_pct',
        'churn_rate_operacional',
        'churn',
      ]),
      calculatePercentage(
        normalized.totalClientesCortados + normalized.totalClientesPorCortar,
        baseTotalClientes,
      ),
    ),

    clientesPorCortarPct: toSafeNumber(
      getFirstField(source, [
        'clientesPorCortarPct',
        'clientes_por_cortar_pct',
      ]),
      calculatePercentage(
        normalized.totalClientesPorCortar,
        baseTotalClientes,
      ),
    ),

    clientesExoneradosPct: toSafeNumber(
      getFirstField(source, [
        'clientesExoneradosPct',
        'clientes_exonerados_pct',
      ]),
      calculatePercentage(
        normalized.totalClientesExonerados,
        baseTotalClientes,
      ),
    ),

    ventasSobreBasePct: toSafeNumber(
      getFirstField(source, [
        'ventasSobreBasePct',
        'ventas_sobre_base_pct',
      ]),
      calculatePercentage(normalized.totalVenta, baseTotalClientes),
    ),

    conversionVentaInstalacionPct: toSafeNumber(
      getFirstField(source, [
        'conversionVentaInstalacionPct',
        'conversion_venta_instalacion_pct',
      ]),
      calculatePercentage(
        normalized.totalInstalacionesFinalizadas,
        normalized.totalVenta,
      ),
    ),

    pendienteSobreVentaPct: toSafeNumber(
      getFirstField(source, [
        'pendienteSobreVentaPct',
        'pendiente_sobre_venta_pct',
      ]),
      calculatePercentage(
        normalized.totalInstalacionesPendientes,
        normalized.totalVenta,
      ),
    ),
  }
}

function normalizeDetalleRows(rows = []) {
  return toSafeArray(rows).map((row, index) => normalizeDetalleRow(row, index))
}

function createEmptyCierreMensualKpis() {
  return {
    totalClientesActivos: 0,
    totalClientesCortados: 0,
    totalClientesPorCortar: 0,
    totalClientesExonerados: 0,
    totalVenta: 0,
    totalInstalacionesFinalizadas: 0,
    totalInstalacionesPendientes: 0,
    totalReclamosFinalizados: 0,
    baseTotalClientes: 0,
    totalInstalaciones: 0,
    efectividadInstalacionPct: 0,
    backlogInstalacionPct: 0,
    tasaCortePct: 0,
    churnRateOperacionalPct: 0,
    clientesPorCortarPct: 0,
    clientesExoneradosPct: 0,
    ventasSobreBasePct: 0,
    conversionVentaInstalacionPct: 0,
    pendienteSobreVentaPct: 0,
  }
}

function aggregateDetalleRows(rows = []) {
  const totals = createEmptyCierreMensualKpis()

  toSafeArray(rows).forEach((row) => {
    DETALLE_NUMBER_FIELDS.forEach((field) => {
      totals[field] += toSafeNumber(row?.[field])
    })
  })

  totals.baseTotalClientes =
    totals.totalClientesActivos +
    totals.totalClientesCortados +
    totals.totalClientesPorCortar +
    totals.totalClientesExonerados

  totals.totalInstalaciones =
    totals.totalInstalacionesFinalizadas +
    totals.totalInstalacionesPendientes

  totals.efectividadInstalacionPct = calculatePercentage(
    totals.totalInstalacionesFinalizadas,
    totals.totalInstalaciones,
  )

  totals.backlogInstalacionPct = calculatePercentage(
    totals.totalInstalacionesPendientes,
    totals.totalInstalaciones,
  )

  totals.tasaCortePct = calculatePercentage(
    totals.totalClientesCortados,
    totals.baseTotalClientes,
  )

  totals.churnRateOperacionalPct = calculatePercentage(
    totals.totalClientesCortados + totals.totalClientesPorCortar,
    totals.baseTotalClientes,
  )

  totals.clientesPorCortarPct = calculatePercentage(
    totals.totalClientesPorCortar,
    totals.baseTotalClientes,
  )

  totals.clientesExoneradosPct = calculatePercentage(
    totals.totalClientesExonerados,
    totals.baseTotalClientes,
  )

  totals.ventasSobreBasePct = calculatePercentage(
    totals.totalVenta,
    totals.baseTotalClientes,
  )

  totals.conversionVentaInstalacionPct = calculatePercentage(
    totals.totalInstalacionesFinalizadas,
    totals.totalVenta,
  )

  totals.pendienteSobreVentaPct = calculatePercentage(
    totals.totalInstalacionesPendientes,
    totals.totalVenta,
  )

  return totals
}

function normalizeCierreMensualKpis(kpis = {}, fallbackRows = []) {
  const source = toSafeObject(kpis)
  const fallbackTotals = aggregateDetalleRows(fallbackRows)
  const normalized = createEmptyCierreMensualKpis()

  NUMBER_FIELDS.forEach((field) => {
    const sourceValue = toSafeNumber(source?.[field])
    const fallbackValue = toSafeNumber(fallbackTotals?.[field])

    normalized[field] = sourceValue !== 0 ? sourceValue : fallbackValue
  })

  const baseTotalClientes =
    normalized.totalClientesActivos +
    normalized.totalClientesCortados +
    normalized.totalClientesPorCortar +
    normalized.totalClientesExonerados

  const totalInstalaciones =
    normalized.totalInstalacionesFinalizadas +
    normalized.totalInstalacionesPendientes

  normalized.baseTotalClientes =
    normalized.baseTotalClientes || baseTotalClientes

  normalized.totalInstalaciones =
    normalized.totalInstalaciones || totalInstalaciones

  normalized.efectividadInstalacionPct =
    normalized.efectividadInstalacionPct ||
    calculatePercentage(
      normalized.totalInstalacionesFinalizadas,
      normalized.totalInstalaciones,
    )

  normalized.backlogInstalacionPct =
    normalized.backlogInstalacionPct ||
    calculatePercentage(
      normalized.totalInstalacionesPendientes,
      normalized.totalInstalaciones,
    )

  normalized.tasaCortePct =
    normalized.tasaCortePct ||
    calculatePercentage(
      normalized.totalClientesCortados,
      normalized.baseTotalClientes,
    )

  normalized.churnRateOperacionalPct =
    normalized.churnRateOperacionalPct ||
    calculatePercentage(
      normalized.totalClientesCortados + normalized.totalClientesPorCortar,
      normalized.baseTotalClientes,
    )

  normalized.clientesPorCortarPct =
    normalized.clientesPorCortarPct ||
    calculatePercentage(
      normalized.totalClientesPorCortar,
      normalized.baseTotalClientes,
    )

  normalized.clientesExoneradosPct =
    normalized.clientesExoneradosPct ||
    calculatePercentage(
      normalized.totalClientesExonerados,
      normalized.baseTotalClientes,
    )

  normalized.ventasSobreBasePct =
    normalized.ventasSobreBasePct ||
    calculatePercentage(normalized.totalVenta, normalized.baseTotalClientes)

  normalized.conversionVentaInstalacionPct =
    normalized.conversionVentaInstalacionPct ||
    calculatePercentage(
      normalized.totalInstalacionesFinalizadas,
      normalized.totalVenta,
    )

  normalized.pendienteSobreVentaPct =
    normalized.pendienteSobreVentaPct ||
    calculatePercentage(
      normalized.totalInstalacionesPendientes,
      normalized.totalVenta,
    )

  return normalized
}

function createEmptyCierreMensualFilters() {
  return {
    zonas: [],
    franquicias: [],
    meses: [],
    anios: [],
  }
}

function createEmptyCierreMensualAppliedFilters() {
  return {
    zona: '',
    franquicia: '',
    mes: 0,
    anio: 0,
    mesNombre: '',
  }
}

function createEmptyCierreMensualTables() {
  return {
    porServicio: [],
    porZona: [],
    porFranquicia: [],
  }
}

function createEmptyCierreMensualDashboard() {
  return {
    kpis: createEmptyCierreMensualKpis(),
    filtrosDisponibles: createEmptyCierreMensualFilters(),
    filtrosAplicados: createEmptyCierreMensualAppliedFilters(),
    tablas: createEmptyCierreMensualTables(),
    meta: {
      generatedAt: '',
      totalRegistros: 0,
    },
  }
}

function normalizeFilters(filters = {}) {
  const source = toSafeObject(filters)

  return {
    zonas: toSafeArray(source.zonas)
      .map((item) => normalizeText(item))
      .filter(Boolean),

    franquicias: toSafeArray(source.franquicias)
      .map((item) => normalizeText(item))
      .filter(Boolean),

    meses: toSafeNumberArray(source.meses),

    anios: toSafeNumberArray(source.anios),
  }
}

function normalizeAppliedFilters(filters = {}) {
  const source = toSafeObject(filters)

  return {
    zona: normalizeText(source.zona),
    franquicia: normalizeText(source.franquicia),
    mes: toSafeNumber(source.mes),
    anio: toSafeNumber(source.anio),
    mesNombre: normalizeText(source.mesNombre),
  }
}

function normalizeTables(tables = {}) {
  const source = toSafeObject(tables)

  return {
    porServicio: normalizeDetalleRows(source.porServicio),
    porZona: normalizeDetalleRows(source.porZona),
    porFranquicia: normalizeDetalleRows(source.porFranquicia),
  }
}

function normalizeClientesCierreMensualDashboard(data = {}) {
  const fallback = createEmptyCierreMensualDashboard()
  const dashboard = toSafeObject(data)

  const normalizedTables = normalizeTables(dashboard.tablas)
  const fallbackRows =
    normalizedTables.porServicio.length > 0
      ? normalizedTables.porServicio
      : normalizedTables.porZona.length > 0
        ? normalizedTables.porZona
        : normalizedTables.porFranquicia

  return {
    ...fallback,
    ...dashboard,

    kpis: normalizeCierreMensualKpis(dashboard.kpis, fallbackRows),

    filtrosDisponibles: {
      ...fallback.filtrosDisponibles,
      ...toSafeObject(dashboard.filtrosDisponibles),
      ...normalizeFilters(dashboard.filtrosDisponibles),
    },

    filtrosAplicados: {
      ...fallback.filtrosAplicados,
      ...toSafeObject(dashboard.filtrosAplicados),
      ...normalizeAppliedFilters(dashboard.filtrosAplicados),
    },

    tablas: {
      ...fallback.tablas,
      ...toSafeObject(dashboard.tablas),
      ...normalizedTables,
    },

    meta: {
      ...fallback.meta,
      ...toSafeObject(dashboard.meta),
      generatedAt: normalizeText(dashboard?.meta?.generatedAt),
      totalRegistros: toSafeNumber(
        dashboard?.meta?.totalRegistros,
        fallbackRows.length,
      ),
    },
  }
}

export {
  createEmptyDetalleRow,
  createEmptyCierreMensualKpis,
  createEmptyCierreMensualFilters,
  createEmptyCierreMensualAppliedFilters,
  createEmptyCierreMensualTables,
  createEmptyCierreMensualDashboard,
  normalizeDetalleRow,
  normalizeDetalleRows,
  normalizeCierreMensualKpis,
  normalizeClientesCierreMensualDashboard,
}