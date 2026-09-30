const {
  getFinanzasDashboard,
} = require('../services/finanzas.service')

async function dashboard(req, res) {
  const data = await getFinanzasDashboard(
    req?.validated?.query || {},
  )

  res.json(data)
}

module.exports = {
  dashboard,
}