// src/controllers/operaciones.controller.js

const {
  getDashboardSummary,
  getSmartOltSummary,
  getSmartOltOltsSummary,
} = require('../services/operaciones.service')

const {
  getOrdenesServicioSummary,
} = require('../services/operaciones-ordenes.service')

/**
 * Devuelve la query validada por middleware.
 * Si por alguna razón el middleware no corrió, usa req.query como fallback.
 *
 * @param {import('express').Request & {
 *   validated?: {
 *     query?: Record<string, unknown>
 *   }
 * }} req
 * @returns {Record<string, unknown>}
 */
function getValidatedQuery(req) {
  return req?.validated?.query || req?.query || {}
}

/**
 * Crea un controller estándar para endpoints GET de Operaciones.
 * Mantiene el controller delgado y delega la lógica al service.
 *
 * @param {(filters: Record<string, unknown>) => Promise<unknown>} serviceHandler
 * @returns {(
 *   req: import('express').Request & {
 *     validated?: {
 *       query?: Record<string, unknown>
 *     }
 *   },
 *   res: import('express').Response
 * ) => Promise<void>}
 */
function createOperacionesQueryHandler(serviceHandler) {
  return async function operacionesQueryController(req, res) {
    const query = getValidatedQuery(req)
    const data = await serviceHandler(query)

    res.json(data)
  }
}

/**
 * Dashboard consolidado de Operaciones.
 * Mantiene intacta la lógica existente de SmartOLT y Dashboard.
 */
const getDashboard = createOperacionesQueryHandler(getDashboardSummary)

/**
 * Catálogo liviano de OLTs desde SmartOLT.
 * Endpoint recomendado:
 * GET /api/operaciones/smartolt/olts
 */
const getSmartOltOlts = createOperacionesQueryHandler(getSmartOltOltsSummary)

/**
 * Detalle SmartOLT bajo demanda para una OLT seleccionada.
 * Endpoint recomendado:
 * GET /api/operaciones/smartolt?olt=<OLT_ID>
 */
const getSmartOlt = createOperacionesQueryHandler(getSmartOltSummary)

/**
 * Órdenes de servicio desde TotalNet.
 * Endpoint recomendado:
 * GET /api/operaciones/ordenes-servicio
 */
const getOrdenesServicio = createOperacionesQueryHandler(
  getOrdenesServicioSummary,
)

module.exports = {
  getDashboard,
  getSmartOlt,
  getSmartOltOlts,
  getOrdenesServicio,
}