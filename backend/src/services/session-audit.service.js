const crypto = require('crypto')
const { query } = require('../config/database')
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
    action: event.action || '',
    success: Boolean(event.success),
    email: event.email || event.user?.email || '',
    role: Array.isArray(roleValue) ? formatRoles(roleValue) : String(roleValue || ''),
    tokenHash: hashToken(event.token),
    ip: event.requestMeta?.ip || '',
    userAgent: event.requestMeta?.userAgent || '',
    message: event.message || '',
    userId: event.user?.id || null,
  }
}

async function writeSessionAudit(event = {}) {
  try {
    const payload = buildAuditPayload(event)

    await query(
      `
        INSERT INTO portal_auth.session_audits
          (user_id, action, success, email, role, token_hash, ip, user_agent, message)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `,
      [
        payload.userId,
        payload.action,
        payload.success,
        payload.email,
        payload.role,
        payload.tokenHash,
        payload.ip,
        payload.userAgent,
        payload.message,
      ]
    )
  } catch (error) {
    console.warn('No se pudo registrar auditoría de sesión:', {
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
