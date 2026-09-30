const crypto = require('crypto')
const { env } = require('../config/env')
const { query } = require('../config/database')
const { AppError } = require('../utils/app-error')
const { normalizeRoles, formatRoles } = require('../utils/roles')
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

function hashPassword(password = '') {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password = '', storedHash = '') {
  const [scheme, salt, hash] = String(storedHash || '').split('$')

  if (scheme !== 'scrypt' || !salt || !hash) {
    return false
  }

  const candidate = crypto.scryptSync(String(password), salt, 64)
  const expected = Buffer.from(hash, 'hex')

  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate)
}

function normalizeUser(record = {}) {
  const roles = normalizeRoles(record.role || record.roles)

  return {
    id: record.id,
    name: record.name || record.nombre || record.email || 'Usuario',
    email: record.email || '',
    role: roles,
    roles,
  }
}

async function findActiveUserByEmail(email = '') {
  const result = await query(
    `
      SELECT id, name, email, password_hash, roles
      FROM portal_auth.users
      WHERE LOWER(email) = LOWER($1)
        AND is_active = TRUE
      LIMIT 1;
    `,
    [email]
  )

  return result.rows[0] || null
}

async function loginWithPassword(payload = {}, requestMeta = {}) {
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')

  const userRecord = await findActiveUserByEmail(email)

  if (!userRecord || !verifyPassword(password, userRecord.password_hash)) {
    await writeSessionAudit({
      action: 'login',
      success: false,
      email,
      requestMeta,
      message: 'Login fallido',
    })

    throw new AppError(
      'Credenciales inválidas o usuario no disponible.',
      401,
      'UNAUTHORIZED'
    )
  }

  const token = createAccessToken()
  const tokenHash = hashToken(token)
  const user = normalizeUser(userRecord)

  await query(
    `
      INSERT INTO portal_auth.sessions (user_id, token_hash, expires_at, last_seen_at)
      VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 hour'), NOW());
    `,
    [user.id, tokenHash, env.AUTH_SESSION_TTL_HOURS]
  )

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

  return {
    token,
    user,
  }
}

async function resolveSessionFromToken(token) {
  const cleanToken = normalizeText(token)

  if (!cleanToken) return null

  const tokenHash = hashToken(cleanToken)

  const result = await query(
    `
      SELECT
        s.id AS session_id,
        s.token_hash,
        u.id,
        u.name,
        u.email,
        u.roles
      FROM portal_auth.sessions s
      JOIN portal_auth.users u
        ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1;
    `,
    [tokenHash]
  )

  const row = result.rows[0]

  if (!row) return null

  await query(
    `
      UPDATE portal_auth.sessions
      SET last_seen_at = NOW()
      WHERE id = $1;
    `,
    [row.session_id]
  )

  return {
    token: cleanToken,
    user: normalizeUser(row),
  }
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
    message: session?.user ? 'Token válido' : 'Token inválido',
  })
}

async function logoutSession(token, requestMeta = {}) {
  const session = await resolveSessionFromToken(token)
  const tokenHash = hashToken(token)

  if (tokenHash) {
    await query(
      `
        UPDATE portal_auth.sessions
        SET revoked_at = NOW()
        WHERE token_hash = $1
          AND revoked_at IS NULL;
      `,
      [tokenHash]
    )
  }

  await writeSessionAudit({
    action: 'logout',
    success: Boolean(session?.user),
    user: session?.user,
    email: session?.user?.email,
    role: formatRoles(session?.user?.role),
    token,
    requestMeta,
    message: session?.user ? 'Logout registrado' : 'Logout sin sesión activa',
  })

  return {
    ok: true,
  }
}

module.exports = {
  auditTokenValidation,
  hashPassword,
  loginWithPassword,
  logoutSession,
  normalizeUser,
  resolveSessionFromToken,
}
