import { clearCurrentSession, getAccessToken } from './auth'

const RUNTIME_API_BASE_URL =
  typeof window !== 'undefined'
    ? window.__PORTAL_CONFIG__?.API_BASE_URL?.trim()
    : ''

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim()

const RAW_API_BASE_URL = RUNTIME_API_BASE_URL || ENV_API_BASE_URL || ''

const API_BASE_URL = RAW_API_BASE_URL === '/'
  ? ''
  : RAW_API_BASE_URL.replace(/\/+$/, '')

const pendingRequests = new Map()

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function buildApiUrl(endpoint = '') {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }

  const normalizedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`

  return `${API_BASE_URL}${normalizedEndpoint}`
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    rawBody,
    signal,
    force = false,
    cache = method === 'GET',
    ...fetchOptions
  } = options

  const url = buildApiUrl(endpoint)
  const token = getAccessToken()
  const requestKey = `${method.toUpperCase()}::${url}::${token}`
  const cacheable = cache && !signal && method.toUpperCase() === 'GET'

  if (cacheable && !force && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)
  }

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  let requestBody = rawBody ?? null

  if (rawBody == null && body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  const request = fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
    signal,
    ...fetchOptions,
  })
    .then(async (response) => {
      const payload = await parseResponse(response)

      if (!response.ok) {
        if (response.status === 401) {
          clearCurrentSession()
        }

        const message =
          typeof payload === 'object' && payload !== null
            ? payload.error || payload.message
            : payload

        throw new ApiError(
          message || `Error ${response.status}`,
          response.status,
          payload
        )
      }

      return payload
    })
    .finally(() => {
      if (cacheable) {
        pendingRequests.delete(requestKey)
      }
    })

  if (cacheable) {
    pendingRequests.set(requestKey, request)
  }

  return request
}

export function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'GET',
  })
}

export function apiPost(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body,
    cache: false,
  })
}

export function apiPut(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body,
    cache: false,
  })
}

export function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'DELETE',
    cache: false,
  })
}

export { API_BASE_URL, buildApiUrl }
