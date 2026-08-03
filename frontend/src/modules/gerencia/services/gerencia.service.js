import { apiGet } from '../../../core/services/api'
import { normalizeGerenciaDashboard } from '../constants'

function normalizeFilterValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildDashboardEndpoint(params = {}) {
  const searchParams = new URLSearchParams()
  const zona = normalizeFilterValue(params?.zona)
  const franquicia = normalizeFilterValue(params?.franquicia)
  const periodo = normalizeFilterValue(params?.periodo)
  const segmento = normalizeFilterValue(params?.segmento)

  if (zona) searchParams.set('zona', zona)
  if (franquicia) searchParams.set('franquicia', franquicia)
  if (periodo) searchParams.set('periodo', periodo)
  if (segmento) searchParams.set('segmento', segmento)

  const queryString = searchParams.toString()

  return queryString
    ? `/api/gerencia/dashboard?${queryString}`
    : '/api/gerencia/dashboard'
}

export async function getGerenciaDashboard(params = {}) {
  const response = await apiGet(buildDashboardEndpoint(params), {
    force: params?.force,
    cache: params?.cache,
  })

  return normalizeGerenciaDashboard(response)
}
