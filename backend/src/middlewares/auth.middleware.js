const { AppError } = require('../utils/app-error')
const { hasAnyRole } = require('../utils/roles')
const { resolveSessionFromToken } = require('../services/auth.service')

function extractAccessToken(req) {
  const authorization = req.headers.authorization || ''
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i)

  if (bearerMatch?.[1]) {
    return bearerMatch[1].trim()
  }

  return String(req.headers['x-access-token'] || '').trim()
}

async function authenticateRequest(req, _res, next) {
  try {
    const token = extractAccessToken(req)
    const session = await resolveSessionFromToken(token)

    if (!session) {
      return next(
        new AppError(
          'No autorizado. Proporcione un token válido.',
          401,
          'UNAUTHORIZED'
        )
      )
    }

    req.user = session.user
    req.accessToken = session.token || token
    return next()
  } catch (error) {
    return next(error)
  }
}

function authorizeRoles(allowedRoles = []) {
  return function authorizeRequest(req, _res, next) {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return next()
    }

    const userRoles = req.user?.role || req.user?.roles

    if (!hasAnyRole(userRoles, allowedRoles)) {
      return next(
        new AppError(
          'No posee permisos para acceder a este recurso.',
          403,
          'FORBIDDEN'
        )
      )
    }

    return next()
  }
}

module.exports = {
  authenticateRequest,
  authorizeRoles,
  extractAccessToken,
}
