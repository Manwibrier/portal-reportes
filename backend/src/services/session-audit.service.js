const crypto = require('crypto')
const { env } = require('../config/env')
const {
  adminPocketBaseRequest,
  recordsPath,
} = require('../config/pocketbase')
const { formatRoles } = require('../utils/roles')

function hashToken(token = '') {
  const value = String(token || '').trim()

  if (!value) return ''

  return crypto.createHash('sha256').update(value).digest('hex')
}

function getRequestMeta(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .find(Boolean)

  return {
    ip: forwardedFor || req.ip || req.socket?.remoteAddress || '',
    userAgent: String(req.headers['user-agent'] || ''),
  }
}

function buildAuditPayload(event = {}) {
  const roleValue = event.role || event.user?.role || event.user?.roles || ''

  return {
    user: event.user?.id || '',
    action: event.action || '',
    success: Boolean(event.success),
    email: event.email || event.user?.email || '',
    role: Array.isArray(roleValue) ? formatRoles(roleValue) : String(roleValue || ''),
    tokenHash: hashToken(event.token),
    ip: event.requestMeta?.ip || '',
    userAgent: event.requestMeta?.userAgent || '',
    message: event.message || '',
  }
}

async function writeSessionAudit(event = {}) {
  try {
    const payload = buildAuditPayload(event)

    await adminPocketBaseRequest(
      recordsPath(env.POCKETBASE_SESSION_AUDITS_COLLECTION),
      {
        method: 'POST',
        body: payload,
      }
    )
  } catch (error) {
    console.warn('No se pudo registrar auditoria de sesion en PocketBase:', {
      action: event.action,
      message: error.message,
      code: error.code,
    })
  }
}

module.exports = {
  getRequestMeta,
  hashToken,
  writeSessionAudit,
}
