const {
  auditTokenValidation,
  loginWithPassword,
  logoutSession,
} = require('../services/auth.service')
const { getRequestMeta } = require('../services/session-audit.service')

async function getMe(req, res) {
  await auditTokenValidation(
    {
      token: req.accessToken,
      user: req.user,
    },
    getRequestMeta(req)
  )

  res.json({
    token: req.accessToken,
    user: req.user,
  })
}

async function login(req, res) {
  const session = await loginWithPassword(
    req.validated.body,
    getRequestMeta(req)
  )

  res.json(session)
}

async function logout(req, res) {
  await logoutSession(req.accessToken, getRequestMeta(req))

  res.status(204).send()
}

module.exports = {
  getMe,
  login,
  logout,
}
