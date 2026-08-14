const { env } = require('./env')
const { AppError } = require('../utils/app-error')

let superuserToken = ''
let superuserAuthPromise = null

function quoteFilterValue(value = '') {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')

  return `"${escaped}"`
}

function recordsPath(collection, recordId = '') {
  const base = `/api/collections/${encodeURIComponent(collection)}/records`
  return recordId ? `${base}/${encodeURIComponent(recordId)}` : base
}

function buildUrl(pathname, query = {}) {
  const base = env.POCKETBASE_URL.endsWith('/')
    ? env.POCKETBASE_URL
    : `${env.POCKETBASE_URL}/`
  const url = new URL(String(pathname || '').replace(/^\//, ''), base)

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  return url
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (_) {
    return { message: text.slice(0, 1000) }
  }
}

function pocketBaseHttpError(response, payload) {
  const status = Number(response.status || 500)
  const clientStatus = status >= 500 ? 502 : status
  const message = payload?.message || 'PocketBase rechazo la solicitud.'

  return new AppError(message, clientStatus, 'POCKETBASE_REQUEST_FAILED', {
    pocketbaseStatus: status,
    data: payload?.data || null,
  })
}

async function pocketBaseRequest(pathname, options = {}) {
  const {
    method = 'GET',
    body,
    token = '',
    query,
  } = options

  const headers = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = token
  }

  let response

  try {
    response = await fetch(buildUrl(pathname, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(env.POCKETBASE_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AppError(
      'PocketBase no esta disponible.',
      502,
      'POCKETBASE_UNAVAILABLE',
      { cause: error.name || 'network_error' }
    )
  }

  const payload = await parseResponse(response)

  if (!response.ok) {
    throw pocketBaseHttpError(response, payload)
  }

  return payload
}

async function authenticateSuperuser() {
  if (superuserToken) return superuserToken
  if (superuserAuthPromise) return superuserAuthPromise

  superuserAuthPromise = pocketBaseRequest(
    '/api/collections/_superusers/auth-with-password',
    {
      method: 'POST',
      body: {
        identity: env.POCKETBASE_ADMIN_EMAIL,
        password: env.POCKETBASE_ADMIN_PASSWORD,
      },
    }
  )
    .then((payload) => {
      const token = String(payload?.token || '').trim()

      if (!token) {
        throw new AppError(
          'PocketBase no devolvio un token de superusuario.',
          502,
          'POCKETBASE_ADMIN_AUTH_FAILED'
        )
      }

      superuserToken = token
      return token
    })
    .finally(() => {
      superuserAuthPromise = null
    })

  return superuserAuthPromise
}

async function adminPocketBaseRequest(pathname, options = {}) {
  let token = await authenticateSuperuser()

  try {
    return await pocketBaseRequest(pathname, { ...options, token })
  } catch (error) {
    const pbStatus = Number(error?.details?.pocketbaseStatus || 0)

    if (pbStatus !== 401) throw error

    superuserToken = ''
    token = await authenticateSuperuser()
    return pocketBaseRequest(pathname, { ...options, token })
  }
}

async function getPocketBaseHealth() {
  return pocketBaseRequest('/api/health')
}

module.exports = {
  adminPocketBaseRequest,
  getPocketBaseHealth,
  pocketBaseRequest,
  quoteFilterValue,
  recordsPath,
}
