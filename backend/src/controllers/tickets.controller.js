const {
  getBacklogMonthly,
  getManagementSummary,
  getMonthlyTickets,
  getOperationalCriticalTickets,
  getOperationalSummary,
  getRejectionReasons,
  getTicketsDataset,
} = require('../services/tickets.service')

/**
 * Devuelve la query validada por middleware.
 * Si por alguna razón el middleware no corrió, hace fallback seguro a req.query.
 *
 * @param {import('express').Request & { validated?: { query?: Record<string, unknown> } }} req
 * @returns {Record<string, unknown>}
 */
function getValidatedQuery(req) {
  return req?.validated?.query || req?.query || {}
}

/**
 * Genera un controller estándar para endpoints GET de Tickets.
 * Mantiene el controller fino y delega completamente la lógica al service.
 *
 * @param {(query: Record<string, unknown>) => Promise<unknown>} serviceHandler
 * @returns {(
 *   req: import('express').Request & { validated?: { query?: Record<string, unknown> } },
 *   res: import('express').Response
 * ) => Promise<void>}
 */
function createTicketsQueryHandler(serviceHandler) {
  return async function ticketsQueryController(req, res) {
    const data = await serviceHandler(getValidatedQuery(req))
    res.json(data)
  }
}

/**
 * Dataset detallado de tickets para drill-down y validaciones operativas.
 */
const listTickets = createTicketsQueryHandler(getTicketsDataset)

/**
 * Serie mensual de tickets registrados.
 */
const listMonthlyTickets = createTicketsQueryHandler(getMonthlyTickets)

/**
 * Dashboard operacional estandarizado del módulo Tickets.
 */
const getOperationalDashboard = createTicketsQueryHandler(getOperationalSummary)

/**
 * Tickets operacionales con avance crítico y compromiso próximo/vencido.
 */
const listOperationalCriticalTickets = createTicketsQueryHandler(
  getOperationalCriticalTickets,
)

/**
 * Dashboard gerencial estandarizado del módulo Tickets.
 */
const getManagementDashboard = createTicketsQueryHandler(getManagementSummary)

/**
 * Serie mensual de backlog de Tickets.
 */
const listBacklogMonthly = createTicketsQueryHandler(getBacklogMonthly)

/**
 * Ranking de motivos de rechazo.
 */
const listRejectionReasons = createTicketsQueryHandler(getRejectionReasons)

module.exports = {
  listTickets,
  listMonthlyTickets,
  getOperationalDashboard,
  listOperationalCriticalTickets,
  getManagementDashboard,
  listBacklogMonthly,
  listRejectionReasons,
}
