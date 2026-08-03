// src/services/operaciones.service.js

const {
  getSmartOltDashboard,
  getSmartOltOlts,
} = require('./operaciones-smartolt.service')
const {
  getOrdenesServicioSummary: getOrdenesServicioSource,
} = require('./operaciones-ordenes.service')

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function toSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function createEmptyDashboard() {
  return {
    kpis: [],
    charts: {},
    tables: {
      detalleTecnico: [],
      detalleSmartOLT: [],
      detalleOrdenes: [],
      ordenesServicio: [],
      ordenesServicioRelacionadas: [],
    },
    catalogs: {
      olts: [],
    },
    meta: {
      smartolt: {},
      totalnet: {},
      warnings: [],
    },
  }
}

function normalizeSmartOltPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return {
      rows: payload,
      olts: [],
      meta: {},
    }
  }

  const safePayload = toSafeObject(payload)

  return {
    rows: toSafeArray(safePayload.rows ?? safePayload.data),
    olts: toSafeArray(safePayload.olts ?? safePayload.catalog ?? safePayload.catalogs?.olts),
    meta: toSafeObject(safePayload.meta),
  }
}

function normalizeOrdenesPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return {
      rows: payload,
      charts: {},
      meta: {},
    }
  }

  const safePayload = toSafeObject(payload)

  return {
    rows: toSafeArray(
      safePayload.rows ??
        safePayload.tables?.ordenesServicio ??
        safePayload.tables?.detalleOrdenes ??
        safePayload.data,
    ),
    charts: toSafeObject(safePayload.charts),
    meta: toSafeObject(safePayload.meta),
  }
}

/**
 * Dashboard consolidado de Operaciones.
 * Mantiene TotalNet y SmartOLT separados para evitar mezclar fuentes.
 *
 * @param {Record<string, unknown>} filters
 * @returns {Promise<object>}
 */
async function getDashboardSummary(filters = {}) {
  const [smartOltPayload, oltsPayload, ordenesPayload] = await Promise.all([
    getSmartOltDashboard(filters),
    getSmartOltOlts(),
    getOrdenesServicioSource(filters),
  ])

  const smartolt = normalizeSmartOltPayload(smartOltPayload)
  const ordenes = normalizeOrdenesPayload(ordenesPayload)

  const dashboard = createEmptyDashboard()

  dashboard.tables.detalleSmartOLT = smartolt.rows
  dashboard.tables.detalleTecnico = smartolt.rows
  dashboard.tables.detalleOrdenes = ordenes.rows
  dashboard.tables.ordenesServicio = ordenes.rows
  dashboard.tables.ordenesServicioRelacionadas = ordenes.rows

  dashboard.catalogs.olts = smartolt.olts.length > 0
    ? smartolt.olts
    : toSafeArray(oltsPayload)

  dashboard.charts = {
    ...ordenes.charts,
  }

  dashboard.meta = {
    smartolt: smartolt.meta,
    totalnet: {
      ...ordenes.meta,
      rows: ordenes.rows.length,
    },
    warnings: [
      ...toSafeArray(smartolt.meta?.warnings),
      ...toSafeArray(ordenes.meta?.warnings),
    ],
  }

  return dashboard
}

/**
 * Detalle SmartOLT bajo demanda.
 *
 * Devuelve:
 * {
 *   rows: [],
 *   olts: [],
 *   meta: {}
 * }
 *
 * @param {Record<string, unknown>} filters
 * @returns {Promise<object>}
 */
async function getSmartOltSummary(filters = {}) {
  return getSmartOltDashboard(filters)
}

/**
 * Catálogo de OLTs con total de ONUs calculado desde el consolidado SmartOLT.
 *
 * @param {Record<string, unknown>} _filters
 * @returns {Promise<Array>}
 */
async function getSmartOltOltsSummary(_filters = {}) {
  return getSmartOltOlts()
}

/**
 * Órdenes de servicio desde TotalNet.
 *
 * @param {Record<string, unknown>} filters
 * @returns {Promise<object>}
 */
async function getOrdenesServicioSummary(filters = {}) {
  return getOrdenesServicioSource(filters)
}

module.exports = {
  getDashboardSummary,
  getSmartOltSummary,
  getSmartOltOltsSummary,
  getOrdenesServicioSummary,
}