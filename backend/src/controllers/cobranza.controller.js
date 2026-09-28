const {
  captureCobranzaSnapshot,
  getCobranzaAuditoria,
  getCobranzaClientesXCobrar,
  getCobranzaDashboard,
  getCobranzaFranquicias,
  getCobranzaHistorico,
  getCobranzaAnalisisComparativo,
  getCobranzaRegiones,
  getCobranzaTablas,
} = require('../services/cobranza.service')

async function dashboard(req, res) {
  const data = await getCobranzaDashboard(req?.validated?.query || {})
  res.json(data)
}

async function regiones(req, res) {
  const data = await getCobranzaRegiones(req?.validated?.query || {})
  res.json(data)
}

async function franquicias(req, res) {
  const data = await getCobranzaFranquicias(req?.validated?.query || {})
  res.json(data)
}

async function analisisComparativo(req, res) {
  const data = await getCobranzaAnalisisComparativo(req?.validated?.query || {})
  res.json(data)
}

async function tablas(req, res) {
  const data = await getCobranzaTablas(req?.validated?.query || {})
  res.json(data)
}

async function clientesXCobrar(req, res) {
  const data = await getCobranzaClientesXCobrar(req?.validated?.query || {})
  res.json(data)
}

async function historico(req, res) {
  const data = await getCobranzaHistorico(req?.validated?.query || {})
  res.json(data)
}

async function auditoria(req, res) {
  const data = await getCobranzaAuditoria(req?.validated?.query || {})
  res.json(data)
}

async function snapshot(req, res) {
  const data = await captureCobranzaSnapshot(req?.validated?.body || {})
  res.status(201).json(data)
}

module.exports = {
  analisisComparativo,
  auditoria,
  clientesXCobrar,
  dashboard,
  franquicias,
  historico,
  regiones,
  snapshot,
  tablas,
}
