import { apiGet } from '../../../core/services/api'
import { normalizeClientesDashboard } from '../constants'

function normalizeFilterValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNumberFilterValue(value) {
  const numericValue = Number(value)

  return Number.isInteger(numericValue) && numericValue > 0
    ? String(numericValue)
    : ''
}

function splitRequestOptions(options = {}) {
  const { force, cache, signal, headers, ...query } = options

  return {
    query,
    request: {
      force,
      cache,
      signal,
      headers,
    },
  }
}

function withQueryString(endpoint, params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()

  return queryString ? `${endpoint}?${queryString}` : endpoint
}

function buildDashboardQuery(params = {}) {
  return {
    zona: normalizeFilterValue(params?.zona),
    franquicia: normalizeFilterValue(params?.franquicia),
  }
}

function buildCierreMensualQuery(params = {}) {
  return {
    zona: normalizeFilterValue(params?.zona),
    franquicia: normalizeFilterValue(params?.franquicia),
    mes: normalizeNumberFilterValue(params?.mes),
    anio: normalizeNumberFilterValue(params?.anio),
  }
}

export async function getClientesDashboard(options = {}) {
  const { query, request } = splitRequestOptions(options)

  const data = await apiGet(
    withQueryString('/api/clientes/dashboard', buildDashboardQuery(query)),
    request,
  )

  return normalizeClientesDashboard(data)
}

export async function getClientesCierreMensual(options = {}) {
  const { query, request } = splitRequestOptions(options)

  const data = await apiGet(
    withQueryString(
      '/api/clientes/cierre-mensual',
      buildCierreMensualQuery(query),
    ),
    request,
  )

  return data
}