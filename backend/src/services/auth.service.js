const { env } = require('../config/env')
const { createPocketBaseClient } = require('../config/pocketbase')
const { AppError } = require('../utils/app-error')
const { normalizeRoles, formatRoles } = require('../utils/roles')
const { writeSessionAudit } = require('./session-audit.service')

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeEmail(value = '') {
  return normalizeText(value).toLowerCase()
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

function normalizePocketBaseError(error, fallbackMessage, statusCode = 500) {
  const status = Number(error?.status || error?.response?.code || statusCode)
  const safeStatus = status >= 400 && status <= 599 ? status : statusCode

  return new AppError(
    error?.response?.message || error?.message || fallbackMessage,
    safeStatus,
    safeStatus === 401 || safeStatus === 403
      ? 'UNAUTHORIZED'
      : 'POCKETBASE_AUTH_ERROR',
    error?.response?.data || undefined
  )
}

async function loginWithPassword(payload = {}, requestMeta = {}) {
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')
  const client = await createPocketBaseClient()

  try {
    const authData = await client
      .collection(env.POCKETBASE_USERS_COLLECTION)
      .authWithPassword(email, password)

    const token = authData.token || client.authStore.token
    const user = normalizeUser(authData.record || client.authStore.record)

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
  } catch (error) {
    await writeSessionAudit({
      action: 'login',
      success: false,
      email,
      requestMeta,
      message: error?.response?.message || error.message || 'Login fallido',
    })

    throw normalizePocketBaseError(
      error,
      'Credenciales inválidas o usuario no disponible.',
      401
    )
  }
}

async function resolveSessionFromToken(token) {
  const cleanToken = normalizeText(token)

  if (!cleanToken) return null

  const client = await createPocketBaseClient()
  client.authStore.save(cleanToken, null)

  try {
    const authData = await client
      .collection(env.POCKETBASE_USERS_COLLECTION)
      .authRefresh()

    return {
      token: authData.token || client.authStore.token || cleanToken,
      user: normalizeUser(authData.record || client.authStore.record),
    }
  } catch (_error) {
    client.authStore.clear()
    return null
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
  loginWithPassword,
  logoutSession,
  normalizeUser,
  resolveSessionFromToken,
}
