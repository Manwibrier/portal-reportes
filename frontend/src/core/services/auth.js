const STORAGE_KEY = 'portal-reportes-session'

const RUNTIME_API_BASE_URL =
  typeof window !== 'undefined'
    ? window.__PORTAL_CONFIG__?.API_BASE_URL?.trim()
    : ''

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim()

const RAW_API_BASE_URL = RUNTIME_API_BASE_URL || ENV_API_BASE_URL || ''

const API_BASE_URL = RAW_API_BASE_URL === '/'
  ? ''
  : RAW_API_BASE_URL.replace(/\/+$/, '')

function normalizeRoleValue(value = '') {
  return String(value || '').trim().toLowerCase()
}

function normalizeRoles(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeRoleValue).filter(Boolean)))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

    return trimmed.includes(',')
      ? Array.from(new Set(trimmed.split(',').map(normalizeRoleValue).filter(Boolean)))
      : [normalizeRoleValue(trimmed)]
  }

  return []
}

function normalizeSession(session) {
  if (!session || typeof session !== 'object') {
    return null
  }

  const token = String(session.token || '').trim()
  const user = session.user

  if (!token || !user || typeof user !== 'object') {
    return null
  }

  const roles = normalizeRoles(user.role || user.roles)

  if (!roles.length) {
    return null
  }

  return {
    token,
    user: {
      ...user,
      name: String(user.name || user.email || 'Usuario'),
      role: roles,
      roles,
    },
  }
}

function isValidSession(value) {
  return Boolean(normalizeSession(value))
}

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)

    return normalizeSession(parsed)
  } catch (error) {
    console.warn('No se pudo leer la sesión persistida:', error)
    return null
  }
}

function persistSession(session) {
  const normalizedSession = normalizeSession(session)

  if (!normalizedSession) {
    return null
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession))

  return normalizedSession
}

async function authRequest(endpoint, options = {}) {
  const { token, ...requestOptions } = options

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(requestOptions.headers || {}),
    },
  })

  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Error HTTP ${response.status}`
    )
  }

  return payload
}

export function getCurrentSession() {
  if (typeof window === 'undefined') {
    return null
  }

  return readStoredSession()
}

export function getAccessToken() {
  return getCurrentSession()?.token || ''
}

export function getCurrentUser() {
  return getCurrentSession()?.user || null
}

export function setCurrentSession(session) {
  return persistSession(session)
}

export function clearCurrentSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

export async function loginWithCredentials(credentials = {}) {
  const session = await authRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  })

  return setCurrentSession(session)
}

export async function logoutCurrentSession() {
  const token = getAccessToken()

  clearCurrentSession()

  try {
    if (token) {
      await authRequest('/api/auth/logout', {
        method: 'POST',
        token,
      })
    }
  } catch (error) {
    console.warn('No se pudo cerrar la sesión en el backend:', error)
  }
}

export async function refreshCurrentSession() {
  const token = getAccessToken()

  if (!token) {
    return null
  }

  const session = await authRequest('/api/auth/me', {
    method: 'GET',
    token,
  })

  return setCurrentSession(session)
}

export { isValidSession, normalizeRoles }
