const crypto = require('crypto')
const { env } = require('../config/env')
const { getAdminPocketBase } = require('../config/pocketbase')
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

  const payload = {
    action: event.action,
    success: Boolean(event.success),
    email: event.email || event.user?.email || '',
    role: Array.isArray(roleValue) ? formatRoles(roleValue) : String(roleValue || ''),
    tokenHash: hashToken(event.token),
    ip: event.requestMeta?.ip || '',
    userAgent: event.requestMeta?.userAgent || '',
    message: event.message || '',
  }

  if (event.user?.id) {
    payload.user = event.user.id
  }

  return payload
}

async function writeSessionAudit(event = {}) {
  try {
    const client = await getAdminPocketBase()

    await client
      .collection(env.POCKETBASE_SESSION_AUDITS_COLLECTION || 'session_audits')
      .create(buildAuditPayload(event))
  } catch (error) {
    console.warn('No se pudo registrar auditoría de sesión:', {
      action: event.action,
      message: error.message,
      status: error.status,
    })
  }
}

module.exports = {
  getRequestMeta,
  hashToken,
  writeSessionAudit,
}
