const crypto = require('crypto')
const { env } = require('../config/env')
const {
  adminPocketBaseRequest,
  pocketBaseRequest,
  quoteFilterValue,
  recordsPath,
} = require('../config/pocketbase')
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

function normalizeUser(record = {}) {
  const roles = normalizeRoles(record.role || record.roles)

  return {
    id: record.id,
    name: record.name || record.email || 'Usuario',
    email: record.email || '',
    role: roles,
    roles,
  }
}

function toDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)
    ? raw.replace(' ', 'T')
    : raw
  const parsed = new Date(normalized)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function authenticateUser(email, password) {
  return pocketBaseRequest(
    `/api/collections/${encodeURIComponent(env.POCKETBASE_USERS_COLLECTION)}/auth-with-password`,
    {
      method: 'POST',
      body: {
        identity: email,
        password,
      },
    }
  )
}

async function createSession(user) {
  const token = createAccessToken()
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + env.AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000
  )

  await adminPocketBaseRequest(
    recordsPath(env.POCKETBASE_SESSIONS_COLLECTION),
    {
      method: 'POST',
      body: {
        user: user.id,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
        lastSeenAt: now.toISOString(),
      },
    }
  )

  return token
}

async function findSessionRecord(token) {
  const tokenHash = hashToken(token)
  if (!tokenHash) return null

  const result = await adminPocketBaseRequest(
    recordsPath(env.POCKETBASE_SESSIONS_COLLECTION),
    {
      query: {
        page: 1,
        perPage: 1,
        filter: `tokenHash = ${quoteFilterValue(tokenHash)}`,
      },
    }
  )

  return result?.items?.[0] || null
}

async function getUserRecord(userId) {
  if (!userId) return null

  try {
    return await adminPocketBaseRequest(
      recordsPath(env.POCKETBASE_USERS_COLLECTION, userId)
    )
  } catch (error) {
    if (Number(error?.details?.pocketbaseStatus || 0) === 404) {
      return null
    }
    throw error
  }
}

async function loginWithPassword(payload = {}, requestMeta = {}) {
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')
  let authData

  try {
    authData = await authenticateUser(email, password)
  } catch (error) {
    const status = Number(error?.details?.pocketbaseStatus || error?.statusCode || 0)

    if (status === 400 || status === 401) {
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

    throw error
  }

  const user = normalizeUser(authData?.record || {})

  if (!user.id || user.roles.length === 0) {
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

  const token = await createSession(user)

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

  const sessionRecord = await findSessionRecord(cleanToken)
  if (!sessionRecord || sessionRecord.revokedAt) return null

  const expiresAt = toDate(sessionRecord.expiresAt)
  if (!expiresAt || expiresAt.getTime() <= Date.now()) return null

  const userRecord = await getUserRecord(sessionRecord.user)
  if (!userRecord) return null

  const user = normalizeUser(userRecord)
  if (user.roles.length === 0) return null

  await adminPocketBaseRequest(
    recordsPath(env.POCKETBASE_SESSIONS_COLLECTION, sessionRecord.id),
    {
      method: 'PATCH',
      body: {
        lastSeenAt: new Date().toISOString(),
      },
    }
  )

  return {
    token: cleanToken,
    user,
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
    message: session?.user ? 'Token valido' : 'Token invalido',
  })
}

async function logoutSession(token, requestMeta = {}) {
  const cleanToken = normalizeText(token)
  const sessionRecord = await findSessionRecord(cleanToken)
  let user = null

  if (sessionRecord) {
    user = normalizeUser(await getUserRecord(sessionRecord.user) || {})

    if (!sessionRecord.revokedAt) {
      await adminPocketBaseRequest(
        recordsPath(env.POCKETBASE_SESSIONS_COLLECTION, sessionRecord.id),
        {
          method: 'PATCH',
          body: {
            revokedAt: new Date().toISOString(),
          },
        }
      )
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
