/**
 * Exposición mínima de healthcheck.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
function getHealth(_req, res) {
  res.json({
    status: 'ok',
    service: 'portal-reportes-backend',
    timestamp: new Date().toISOString(),
  })
}

module.exports = {
  getHealth,
}
