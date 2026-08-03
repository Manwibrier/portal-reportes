import { apiGet } from '../../../core/services/api'
import {
  normalizeGerencialSummary,
  normalizeOperationalSummary,
} from '../utils/tickets.metrics'

const MONTHS_SHORT = {
  1: 'Ene',
  2: 'Feb',
  3: 'Mar',
  4: 'Abr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dic',
}

function ensureArray(data) {
  return Array.isArray(data) ? data : []
}


function parseNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function splitRequestOptions(options = {}) {
  const {
    force,
    cache,
    signal,
    headers,
    ...query
  } = options

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

function mapGroupedSeries(data = [], labelKey = 'motivo') {
  return ensureArray(data).map((item) => {
    const label =
      item?.[labelKey] && String(item[labelKey]).trim()
        ? String(item[labelKey]).trim()
        : 'SIN DATO'

    const value = parseNumber(item?.cantidad ?? item?.value ?? 0)

    return {
      label,
      name: label,
      departamento: label,
      cantidad: value,
      value,
    }
  })
}

export async function getTickets(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const data = await apiGet(withQueryString('/api/tickets', query), request)

  return ensureArray(data).map((item) => ({
    ...item,
    avance: parseNumber(item?.avance),
  }))
}

export async function getTicketsMensuales(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const data = await apiGet(withQueryString('/api/tickets/mensuales', query), request)
  return ensureArray(data)
}

export function formatTicketsMensuales(data = []) {
  return ensureArray(data).map((item) => {
    const mes = parseNumber(item?.mes_num ?? item?.mes)
    const anio = item?.anio || ''
    const periodoBase = item?.periodo || MONTHS_SHORT[mes] || `Mes ${mes || ''}`

    return {
      ...item,
      periodo:
        anio && !String(periodoBase).includes(String(anio))
          ? `${periodoBase} ${anio}`
          : periodoBase,
      total: parseNumber(item?.total ?? item?.cantidad ?? item?.value),
    }
  })
}

export async function getTicketsMensualesFormateados(options = {}) {
  const data = await getTicketsMensuales(options)
  return formatTicketsMensuales(data)
}

export async function getTicketsOperacionalResumen(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const endpoint = withQueryString('/api/tickets/operacional-resumen', query)
  const data = await apiGet(endpoint, request)

  return normalizeOperationalSummary(data)
}

export async function getTicketsOperacionalCriticos(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const endpoint = withQueryString('/api/tickets/operacional-criticos', query)
  const data = await apiGet(endpoint, request)

  return ensureArray(data).map((item) => ({
    ...item,
    avance: parseNumber(item?.avance),
    dias_para_vencimiento: parseNumber(item?.dias_para_vencimiento),
  }))
}

export async function getTicketsGerencialResumen(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const endpoint = withQueryString('/api/tickets/gerencial-resumen', query)
  const data = await apiGet(endpoint, request)

  return normalizeGerencialSummary(data)
}

export function formatBacklogMensual(data = []) {
  return ensureArray(data).map((item) => {
    const mes = parseNumber(item?.mes_num ?? item?.mes)
    const anio = item?.anio || ''
    const periodoBase = item?.periodo || MONTHS_SHORT[mes] || `Mes ${mes || ''}`

    return {
      ...item,
      periodo:
        anio && !String(periodoBase).includes(String(anio))
          ? `${periodoBase} ${anio}`
          : periodoBase,
      entradas: parseNumber(item?.entradas),
      cerrados: parseNumber(item?.cerrados),
      backlog: parseNumber(item?.backlog),
    }
  })
}

export async function getTicketsBacklogMensual(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const data = await apiGet(withQueryString('/api/tickets/backlog-mensual', query), request)

  return formatBacklogMensual(data)
}

export async function getTicketsRechazos(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const data = await apiGet(withQueryString('/api/tickets/rechazos', query), request)
  return mapGroupedSeries(data, 'motivo')
}

export async function getOperationalDashboard(options = {}) {
  return getTicketsOperacionalResumen(options)
}

export async function getGerencialDashboard(options = {}) {
  return getTicketsGerencialResumen(options)
}