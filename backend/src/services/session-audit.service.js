const crypto = require('crypto')
const { db } = require('../config/auth-database')
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
    userId: event.user?.id || null,
    action: event.action || '',
    success: event.success ? 1 : 0,
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

    db.prepare(`
      INSERT INTO session_audits (
        user_id, action, success, email, role, token_hash,
        ip, user_agent, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.userId,
      payload.action,
      payload.success,
      payload.email,
      payload.role,
      payload.tokenHash,
      payload.ip,
      payload.userAgent,
      payload.message,
      new Date().toISOString()
    )
  } catch (error) {
    console.warn('No se pudo registrar auditoria de sesion local:', {
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
