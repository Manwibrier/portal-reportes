const {
  getDashboardSummary,
  getCierreMensualSummary,
} = require('../services/clientes.service')

/**
 * Controlador estandarizado para el resumen diario de Clientes.
 * Consume filtros ya validados por middleware y delega toda la lógica al servicio.
 *
 * @param {import('express').Request & {
 *   validated?: {
 *     query?: {
 *       zona?: string,
 *       franquicia?: string
 *     }
 *   }
 * }} req
 * @param {import('express').Response} res
 */
async function getDashboard(req, res) {
  const data = await getDashboardSummary(req?.validated?.query || {})
  res.json(data)
}

/**
 * Controlador estandarizado para el sub-módulo Cierre Mensual de Clientes.
 * Consume filtros ya validados por middleware y delega toda la lógica al servicio.
 *
 * @param {import('express').Request & {
 *   validated?: {
 *     query?: {
 *       zona?: string,
 *       franquicia?: string,
 *       mes: number,
 *       anio: number
 *     }
 *   }
 * }} req
 * @param {import('express').Response} res
 */
async function getCierreMensual(req, res) {
  const data = await getCierreMensualSummary(req?.validated?.query || {})
  res.json(data)
}

module.exports = {
  getDashboard,
  getCierreMensual,
}