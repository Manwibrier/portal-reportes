const { getDashboardSummary } = require('../services/gerencia.service')

/**
 * Controlador estandarizado para Gerencia.
 * Consume filtros ya validados por middleware y delega toda la lógica al service.
 *
 * @param {import('express').Request & {
 *   validated?: {
 *     query?: {
 *       zona?: string,
 *       franquicia?: string,
 *       segmento?: string,
 *       periodo?: string,
 *       windowMonths?: number
 *     }
 *   }
 * }} req
 * @param {import('express').Response} res
 */
async function getDashboard(req, res) {
  const data = await getDashboardSummary(req?.validated?.query || {})
  res.json(data)
}

module.exports = {
  getDashboard,
}