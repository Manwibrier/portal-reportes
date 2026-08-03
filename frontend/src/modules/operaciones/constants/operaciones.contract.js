// src/modules/operaciones/constants/operaciones.contract.js

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function createEmptyCharts() {
  return {
    smartOltStatus: [],
    smartOltSignalBand: [],
    ordenesPorEstatus: [],
  }
}

function createEmptyTables() {
  return {
    detalleTecnico: [],
    detalleOrdenes: [],
    detalleSmartOLT: [],
  }
}

function createEmptyFilters() {
  return {
    zonas: [],
    franquicias: [],
    servicios: [],
    status: [],
    signalBands: [],
  }
}

function createEmptyMeta() {
  return {
    generatedAt: '',
    appliedFilters: {},
    smartolt: {
      rows: 0,
    },
    totalnet: {
      rows: 0,
      table: '',
    },
    warnings: [],
  }
}

/**
 * Crea un dashboard vacío con la estructura completa esperada por las páginas.
 */
function createEmptyDashboard() {
  return {
    kpis: [],
    charts: createEmptyCharts(),
    tables: createEmptyTables(),
    filters: createEmptyFilters(),
    meta: createEmptyMeta(),
  }
}

function normalizeCharts(charts = {}) {
  const source = ensureObject(charts)
  const emptyCharts = createEmptyCharts()

  return {
    ...emptyCharts,
    ...source,
    smartOltStatus: ensureArray(source.smartOltStatus),
    smartOltSignalBand: ensureArray(source.smartOltSignalBand),
    ordenesPorEstatus: ensureArray(source.ordenesPorEstatus),
  }
}

function normalizeTables(tables = {}) {
  const source = ensureObject(tables)

  return {
    detalleTecnico: ensureArray(source.detalleTecnico),
    detalleOrdenes: ensureArray(
      source.detalleOrdenes ??
        source.ordenesServicio ??
        source.ordenesServicioRelacionadas,
    ),
    detalleSmartOLT: ensureArray(
      source.detalleSmartOLT ??
        source.smartolt ??
        source.smartOlt ??
        source.onus,
    ),
  }
}

function normalizeFilters(filters = {}) {
  const source = ensureObject(filters)

  return {
    zonas: ensureArray(source.zonas),
    franquicias: ensureArray(source.franquicias),
    servicios: ensureArray(source.servicios),
    status: ensureArray(source.status ?? source.estatus),
    signalBands: ensureArray(source.signalBands ?? source.signal_bands),
  }
}

function normalizeMeta(meta = {}) {
  const source = ensureObject(meta)
  const emptyMeta = createEmptyMeta()

  return {
    ...emptyMeta,
    ...source,
    generatedAt: normalizeText(source.generatedAt ?? source.generated_at),
    appliedFilters: ensureObject(source.appliedFilters ?? source.applied_filters),
    smartolt: {
      ...emptyMeta.smartolt,
      ...ensureObject(source.smartolt ?? source.smartOlt),
    },
    totalnet: {
      ...emptyMeta.totalnet,
      ...ensureObject(source.totalnet ?? source.totalNet),
    },
    warnings: ensureArray(source.warnings),
  }
}

/**
 * Normaliza un dashboard recibido para asegurar que todas las secciones existen.
 *
 * @param {object} dashboard
 * @returns {object}
 */
function normalizeOperacionesDashboard(dashboard = {}) {
  const source = ensureObject(dashboard)

  return {
    kpis: ensureArray(source.kpis),
    charts: normalizeCharts(source.charts),
    tables: normalizeTables(source.tables),
    filters: normalizeFilters(source.filters),
    meta: normalizeMeta(source.meta),
  }
}

export default createEmptyDashboard

export {
  createEmptyCharts,
  createEmptyDashboard,
  createEmptyFilters,
  createEmptyMeta,
  createEmptyTables,
  normalizeCharts,
  normalizeFilters,
  normalizeMeta,
  normalizeOperacionesDashboard,
  normalizeTables,
}