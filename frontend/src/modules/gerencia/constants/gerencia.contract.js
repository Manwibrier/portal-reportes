import {
  DEFAULT_SEGMENTS,
  GERENCIA_KPI_META,
  GERENCIA_SECTION_META,
} from './gerencia.kpi-meta'

const EMPTY_APPLIED_FILTERS = Object.freeze({
  zona: '',
  franquicia: '',
  segmento: '',
  periodo: '',
})

const EMPTY_FILTERS = Object.freeze({
  zonas: [],
  franquicias: [],
  segmentos: [...DEFAULT_SEGMENTS],
  periodos: [],
  appliedFilters: { ...EMPTY_APPLIED_FILTERS },
})

const EMPTY_KPIS = Object.freeze({
  totalClientes: 0,
  clientesActivos: 0,
  clientesCortados: 0,
  clientesPorCortar: 0,
  clientesExonerados: 0,

  facturacionMes: 0,
  descuentosMes: 0,
  facturacionNetaMes: 0,
  crecimientoFacturacionPct: 0,
  metaFacturacion20Pct: 0,

  ventasMes: 0,
  ventasMesAnterior: 0,
  metaVentas: 0,

  recaudoMes: 0,
  recaudoMesAnterior: 0,
  metaRecaudo20Pct: 0,
  crecimientoRecaudoPct: 0,
  recaudoVsFacturacionPct: 0,

  instalacionesFinalizadas: 0,
  instalacionesPendientes: 0,
  reclamosFinalizados: 0,

  clientesHogar: 0,
  clientesJuridico: 0,
  clientesGobierno: 0,

  clientesRecuperados: 'N/D',
  cortadosMesAnterior: 0,
  metaCorte: 0,

  metaChurn: 'N/D',
  churnMes: 'N/D',
  churnMesAnterior: 'N/D',

  arpuHogar: 'N/D',
  arpuJuridico: 'N/D',
  arpuGobierno: 'N/D',

  metaCmc15: 'N/D',
  cmc15Mes: 'N/D',
  cmc15MesAnterior: 'N/D',

  metaCalidadServicio: 'N/D',
  calidadServicioMes: 'N/D',
  calidadServicioMesAnterior: 'N/D',

  reclamosEjecutados: 0,
  reclamosPendientes: 'N/D',
  reclamosEnSla: 'N/D',

  instalacionesEnSla: 'N/D',
})

const EMPTY_CHARTS = Object.freeze({
  estadoClientes: [],
  distribucionServicios: [],
  operacionMensual: [],
  facturacionMensual: [],
  recaudoMensual: [],
  facturacionPorServicio: [],
  recaudoPorFormaPago: [],
})

function toSafeNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function toSafeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function cloneArray(items = []) {
  return toSafeArray(items).map((item) =>
    item && typeof item === 'object' ? { ...item } : item,
  )
}

function resolveMetricValue(value, fallback = 'N/D') {
  return value === undefined || value === null || value === '' ? fallback : value
}

function normalizeAppliedFilters(filters = {}) {
  return {
    zona: toSafeText(filters?.zona),
    franquicia: toSafeText(filters?.franquicia),
    segmento: toSafeText(filters?.segmento),
    periodo: toSafeText(filters?.periodo),
  }
}

function normalizeFilters(filters = {}) {
  return {
    zonas: cloneArray(filters?.zonas),
    franquicias: cloneArray(filters?.franquicias),
    segmentos:
      toSafeArray(filters?.segmentos).length > 0
        ? cloneArray(filters.segmentos)
        : [...DEFAULT_SEGMENTS],
    periodos: cloneArray(filters?.periodos),
    appliedFilters: normalizeAppliedFilters(filters?.appliedFilters),
  }
}

function normalizeCharts(charts = {}) {
  return {
    estadoClientes: cloneArray(charts?.estadoClientes),
    distribucionServicios: cloneArray(charts?.distribucionServicios),
    operacionMensual: cloneArray(charts?.operacionMensual),
    facturacionMensual: cloneArray(charts?.facturacionMensual),
    recaudoMensual: cloneArray(charts?.recaudoMensual),
    facturacionPorServicio: cloneArray(charts?.facturacionPorServicio),
    recaudoPorFormaPago: cloneArray(charts?.recaudoPorFormaPago),
  }
}

function normalizeKpis(kpis = {}) {
  return {
    ...EMPTY_KPIS,

    totalClientes: toSafeNumber(kpis?.totalClientes),
    clientesActivos: toSafeNumber(kpis?.clientesActivos),
    clientesCortados: toSafeNumber(kpis?.clientesCortados),
    clientesPorCortar: toSafeNumber(kpis?.clientesPorCortar),
    clientesExonerados: toSafeNumber(kpis?.clientesExonerados),

    facturacionMes: toSafeNumber(kpis?.facturacionMes),
    descuentosMes: toSafeNumber(kpis?.descuentosMes),
    facturacionNetaMes: toSafeNumber(kpis?.facturacionNetaMes),
    crecimientoFacturacionPct: toSafeNumber(kpis?.crecimientoFacturacionPct),
    metaFacturacion20Pct: toSafeNumber(kpis?.metaFacturacion20Pct),

    ventasMes: toSafeNumber(kpis?.ventasMes),
    ventasMesAnterior: toSafeNumber(kpis?.ventasMesAnterior),
    metaVentas:
      kpis?.metaVentas === undefined ||
      kpis?.metaVentas === null ||
      kpis?.metaVentas === 'N/D'
        ? 'N/D'
        : toSafeNumber(kpis?.metaVentas),

    recaudoMes: toSafeNumber(kpis?.recaudoMes),
    recaudoMesAnterior: toSafeNumber(kpis?.recaudoMesAnterior),
    metaRecaudo20Pct: toSafeNumber(kpis?.metaRecaudo20Pct),
    crecimientoRecaudoPct: toSafeNumber(kpis?.crecimientoRecaudoPct),
    recaudoVsFacturacionPct: toSafeNumber(kpis?.recaudoVsFacturacionPct),

    instalacionesFinalizadas: toSafeNumber(kpis?.instalacionesFinalizadas),
    instalacionesPendientes: toSafeNumber(kpis?.instalacionesPendientes),
    reclamosFinalizados: toSafeNumber(kpis?.reclamosFinalizados),

    clientesHogar: toSafeNumber(kpis?.clientesHogar),
    clientesJuridico: toSafeNumber(kpis?.clientesJuridico),
    clientesGobierno: toSafeNumber(kpis?.clientesGobierno),

    clientesRecuperados:
      kpis?.clientesRecuperados === undefined ||
      kpis?.clientesRecuperados === null ||
      kpis?.clientesRecuperados === 'N/D'
        ? 'N/D'
        : toSafeNumber(kpis?.clientesRecuperados),

    cortadosMesAnterior: toSafeNumber(kpis?.cortadosMesAnterior),
    metaCorte: toSafeNumber(kpis?.metaCorte),

    metaChurn: resolveMetricValue(kpis?.metaChurn, 'N/D'),
    churnMes: resolveMetricValue(kpis?.churnMes, 'N/D'),
    churnMesAnterior: resolveMetricValue(kpis?.churnMesAnterior, 'N/D'),

    arpuHogar: resolveMetricValue(kpis?.arpuHogar, 'N/D'),
    arpuJuridico: resolveMetricValue(kpis?.arpuJuridico, 'N/D'),
    arpuGobierno: resolveMetricValue(kpis?.arpuGobierno, 'N/D'),

    metaCmc15: resolveMetricValue(kpis?.metaCmc15, 'N/D'),
    cmc15Mes: resolveMetricValue(kpis?.cmc15Mes, 'N/D'),
    cmc15MesAnterior: resolveMetricValue(kpis?.cmc15MesAnterior, 'N/D'),

    metaCalidadServicio: resolveMetricValue(kpis?.metaCalidadServicio, 'N/D'),
    calidadServicioMes: resolveMetricValue(kpis?.calidadServicioMes, 'N/D'),
    calidadServicioMesAnterior: resolveMetricValue(
      kpis?.calidadServicioMesAnterior,
      'N/D',
    ),

    reclamosEjecutados: toSafeNumber(
      kpis?.reclamosEjecutados ?? kpis?.reclamosFinalizados,
    ),
    reclamosPendientes: resolveMetricValue(kpis?.reclamosPendientes, 'N/D'),
    reclamosEnSla: resolveMetricValue(kpis?.reclamosEnSla, 'N/D'),

    instalacionesEnSla: resolveMetricValue(kpis?.instalacionesEnSla, 'N/D'),
  }
}

export function createEmptyAppliedFilters() {
  return {
    ...EMPTY_APPLIED_FILTERS,
  }
}

export function createEmptyFilters() {
  return {
    zonas: [],
    franquicias: [],
    segmentos: [...DEFAULT_SEGMENTS],
    periodos: [],
    appliedFilters: createEmptyAppliedFilters(),
  }
}

export function createEmptyKpis() {
  return {
    ...EMPTY_KPIS,
  }
}

export function createEmptyCharts() {
  return {
    ...EMPTY_CHARTS,
    estadoClientes: [],
    distribucionServicios: [],
    operacionMensual: [],
    facturacionMensual: [],
    recaudoMensual: [],
    facturacionPorServicio: [],
    recaudoPorFormaPago: [],
  }
}

export function createEmptyDashboard() {
  return {
    kpis: createEmptyKpis(),
    kpiMeta: { ...GERENCIA_KPI_META },
    charts: createEmptyCharts(),
    chartMeta: {},
    filters: createEmptyFilters(),
    meta: {
      windowMonths: 12,
      currentPeriod: '',
      previousPeriod: '',
      segmentScope: '',
      segmentCoverage: {},
      notes: [],
      warnings: [],
    },
    ui: {
      kpiOrder: [],
      sections: Object.values(GERENCIA_SECTION_META),
    },
  }
}

export function normalizeGerenciaDashboard(payload = {}) {
  const emptyDashboard = createEmptyDashboard()

  return {
    ...emptyDashboard,
    ...payload,
    kpis: normalizeKpis(payload?.kpis),
    charts: normalizeCharts(payload?.charts),
    filters: normalizeFilters(payload?.filters),
    meta: {
      ...emptyDashboard.meta,
      ...(payload?.meta || {}),
      notes: toSafeArray(payload?.meta?.notes),
      warnings: toSafeArray(payload?.meta?.warnings),
    },
    ui: {
      ...emptyDashboard.ui,
      ...(payload?.ui || {}),
      sections:
        toSafeArray(payload?.ui?.sections).length > 0
          ? cloneArray(payload.ui.sections)
          : Object.values(GERENCIA_SECTION_META),
    },
  }
}

export function getUniverseTotal(dashboard = {}) {
  return toSafeNumber(dashboard?.kpis?.totalClientes)
}

export {
  normalizeAppliedFilters,
  normalizeCharts,
  normalizeFilters,
  normalizeKpis,
}