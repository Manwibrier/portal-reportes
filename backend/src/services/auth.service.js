const crypto = require('crypto')
const { db } = require('../config/auth-database')
const { env } = require('../config/env')
const { AppError } = require('../utils/app-error')
const { normalizeRoles, formatRoles } = require('../utils/roles')
const { verifyPassword } = require('../utils/password')
const { writeSessionAudit } = require('./session-audit.service')

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeEmail(value = '') {
  return normalizeText(value).toLowerCase()
}

function hashToken(token = '') {
  const value = normalizeText(token)
  if (!value) return ''
  return crypto.createHash('sha256').update(value).digest('hex')
}

function createAccessToken() {
  return crypto.randomBytes(48).toString('base64url')
}

function parseRoles(value) {
  try {
    return normalizeRoles(JSON.parse(String(value || '[]')))
  } catch (_error) {
    return []
  }
}

function normalizeUser(record = {}) {
  const roles = parseRoles(record.roles_json ?? record.roles)

  return {
    id: record.id,
    name: record.name || record.email || 'Usuario',
    email: record.email || '',
    role: roles,
    roles,
  }
}

function findActiveUserByEmail(email) {
  return db.prepare(`
    SELECT id, name, email, password_hash, roles_json
    FROM users
    WHERE email = ? COLLATE NOCASE AND active = 1
    LIMIT 1
  `).get(email)
}

function createSession(user) {
  const token = createAccessToken()
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + env.AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000
  )

  db.prepare(`
    INSERT INTO sessions (
      id, user_id, token_hash, expires_at, last_seen_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    user.id,
    tokenHash,
    expiresAt.toISOString(),
    now.toISOString(),
    now.toISOString()
  )

  return token
}

function findSessionRecord(token) {
  const tokenHash = hashToken(token)
  if (!tokenHash) return null

  return db.prepare(`
    SELECT
      s.id AS session_id,
      s.user_id,
      s.expires_at,
      s.revoked_at,
      u.id,
      u.name,
      u.email,
      u.roles_json,
      u.active
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
    LIMIT 1
  `).get(tokenHash)
}

async function loginWithPassword(payload = {}, requestMeta = {}) {
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')
  const record = findActiveUserByEmail(email)
  const validPassword = record
    ? await verifyPassword(password, record.password_hash)
    : false

  if (!record || !validPassword) {
    await writeSessionAudit({
      action: 'login',
      success: false,
      email,
      requestMeta,
      message: 'Login fallido',
    })

    throw new AppError(
      'Credenciales invalidas o usuario no disponible.',
      401,
      'UNAUTHORIZED'
    )
  }

  const user = normalizeUser(record)

  if (user.roles.length === 0) {
    await writeSessionAudit({
      action: 'login',
      success: false,
      user,
      email,
      requestMeta,
      message: 'Usuario sin permisos configurados',
    })

    throw new AppError(
      'El usuario no tiene permisos configurados.',
      403,
      'USER_ROLE_REQUIRED'
    )
  }

  const token = createSession(user)

  await writeSessionAudit({
    action: 'login',
    success: true,
    user,
    email,
    role: formatRoles(user.role),
    token,
    requestMeta,
    message: 'Login correcto',
  })

  return { token, user }
}

async function resolveSessionFromToken(token) {
  const cleanToken = normalizeText(token)
  if (!cleanToken) return null

  const record = findSessionRecord(cleanToken)
  if (!record || record.revoked_at || Number(record.active) !== 1) return null

  const expiresAt = new Date(record.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return null
  }

  const user = normalizeUser(record)
  if (user.roles.length === 0) return null

  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
    .run(new Date().toISOString(), record.session_id)

  return { token: cleanToken, user }
}

async function auditTokenValidation(session, requestMeta = {}) {
  await writeSessionAudit({
    action: 'token_validation',
    success: Boolean(session?.user),
    user: session?.user,
    email: session?.user?.email,
    role: formatRoles(session?.user?.role),
    token: session?.token,
    requestMeta,
    message: session?.user ? 'Token valido' : 'Token invalido',
  })
}

async function logoutSession(token, requestMeta = {}) {
  const cleanToken = normalizeText(token)
  const record = findSessionRecord(cleanToken)
  let user = null

  if (record) {
    user = normalizeUser(record)

    if (!record.revoked_at) {
      db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
        .run(new Date().toISOString(), record.session_id)
    }
  }

  await writeSessionAudit({
    action: 'logout',
    success: Boolean(user?.id),
    user: user?.id ? user : null,
    email: user?.email,
    role: formatRoles(user?.role),
    token: cleanToken,
    requestMeta,
    message: user?.id ? 'Logout registrado' : 'Logout sin sesion activa',
  })

  return { ok: true }
}

module.exports = {
  auditTokenValidation,
  loginWithPassword,
  logoutSession,
  normalizeUser,
  resolveSessionFromToken,
}
