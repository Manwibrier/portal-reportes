// src/modules/operaciones/services/operaciones.service.js

import { apiGet } from '../../../core/services/api.js'
import {
  createEmptyDashboard,
  normalizeOperacionesDashboard,
} from '../constants/index.js'
import {
  buildDashboard,
  transformOrdenesServicio,
  transformSmartOlt,
} from '../utils/operaciones.transformers.js'

const DEFAULT_SMARTOLT_LIMIT = 5000

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumberFilterValue(value, fallback = '') {
  const numericValue = Number(value)

  return Number.isInteger(numericValue) && numericValue > 0
    ? String(numericValue)
    : fallback
}

function splitRequestOptions(options = {}) {
  const {
    force,
    cache,
    signal,
    headers,
    ...query
  } = ensureObject(options)

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

  Object.entries(ensureObject(params)).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()

  return queryString ? `${endpoint}?${queryString}` : endpoint
}

function buildOperacionesQuery(params = {}) {
  return {
    olt: normalizeText(params?.olt),
    status: normalizeText(params?.status),
    signalBand: normalizeText(params?.signalBand),
    ordenStatus: normalizeText(params?.ordenStatus),
    zona: normalizeText(params?.zona),
    franquicia: normalizeText(params?.franquicia),
    servicio: normalizeText(params?.servicio),
    limit: normalizeNumberFilterValue(params?.limit),
  }
}

function buildSmartOltOltsQuery(params = {}) {
  return {
    search: normalizeText(params?.search),
  }
}

function buildSmartOltDetailQuery(params = {}) {
  return {
    olt: normalizeText(params?.olt),
    status: normalizeText(params?.status),
    signalBand: normalizeText(params?.signalBand),
    limit: normalizeNumberFilterValue(
      params?.limit,
      String(DEFAULT_SMARTOLT_LIMIT),
    ),
  }
}

function extractSmartOltRows(data) {
  if (Array.isArray(data)) return data

  const source = ensureObject(data)

  return ensureArray(
    source?.tables?.detalleSmartOLT ??
      source?.tables?.smartolt ??
      source?.tables?.smartOlt ??
      source?.rows ??
      source?.data ??
      source?.response,
  )
}

function extractOrdenesRows(data) {
  if (Array.isArray(data)) return data

  const source = ensureObject(data)

  return ensureArray(
    source?.tables?.detalleOrdenes ??
      source?.tables?.ordenesServicio ??
      source?.tables?.ordenesServicioRelacionadas ??
      source?.rows ??
      source?.data ??
      source?.response,
  )
}

function normalizeOltOption(row = {}, index = 0) {
  const source = ensureObject(row)

  const value = normalizeText(
    source.value ??
      source.oltId ??
      source.olt_id ??
      source.id ??
      source.olt,
    `olt-${index + 1}`,
  )

  const label = normalizeText(
    source.label ??
      source.oltLabel ??
      source.olt_label ??
      source.oltName ??
      source.olt_name ??
      source.name,
    value,
  )

  return {
    ...source,
    id: normalizeText(source.id, value),
    value,
    label,
    name: label,
    oltId: normalizeText(source.oltId ?? source.olt_id, value),
    oltName: normalizeText(source.oltName ?? source.olt_name, label),
    oltLabel: normalizeText(source.oltLabel ?? source.olt_label, label),
    totalOnus: Number(source.totalOnus ?? source.total ?? source.count ?? 0) || 0,
  }
}

function normalizeOltOptions(rows = []) {
  const seen = new Set()
  const options = []

  ensureArray(rows).forEach((row, index) => {
    const option = normalizeOltOption(row, index)
    const key = option.value.toLowerCase()

    if (!key || seen.has(key)) return

    seen.add(key)
    options.push(option)
  })

  return options.sort((left, right) =>
    left.label.localeCompare(right.label, 'es', {
      sensitivity: 'base',
    }),
  )
}

/**
 * Obtiene el dashboard consolidado de Operaciones.
 * Carga TotalNet, catálogo de OLTs y, si se envía `olt`, detalle SmartOLT
 * bajo demanda para esa OLT.
 *
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function getOperacionesDashboard(options = {}) {
  const { query, request } = splitRequestOptions(options)

  try {
    const data = await apiGet(
      withQueryString(
        '/api/operaciones/dashboard',
        buildOperacionesQuery(query),
      ),
      request,
    )

    const normalized = normalizeOperacionesDashboard(data)

    return {
      ...normalized,
      tables: {
        ...normalized.tables,
        detalleTecnico: buildDashboard(normalized.tables.detalleTecnico),
        detalleOrdenes: transformOrdenesServicio(
          extractOrdenesRows(normalized),
        ),
        detalleSmartOLT: transformSmartOlt(
          extractSmartOltRows(normalized),
        ),
      },
      filters: {
        ...normalized.filters,
        olts: normalizeOltOptions(normalized.filters?.olts),
      },
    }
  } catch (err) {
    console.error('Error obteniendo dashboard de Operaciones:', err)
    return createEmptyDashboard()
  }
}

/**
 * Obtiene solo el catálogo liviano de OLTs desde SmartOLT.
 * No consulta ONUs ni señales.
 *
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getOperacionesSmartOLTs(options = {}) {
  const { query, request } = splitRequestOptions(options)

  try {
    const data = await apiGet(
      withQueryString(
        '/api/operaciones/smartolt/olts',
        buildSmartOltOltsQuery(query),
      ),
      request,
    )

    return normalizeOltOptions(data)
  } catch (err) {
    console.error('Error obteniendo catálogo de OLTs de Operaciones:', err)
    return []
  }
}

/**
 * Alias tolerante por si algún archivo usa camelCase con "Olts".
 *
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getOperacionesSmartOlts(options = {}) {
  return getOperacionesSmartOLTs(options)
}

/**
 * Obtiene el detalle SmartOLT solo para una OLT seleccionada.
 * Si no se envía `olt`, no consulta el backend para evitar cargas pesadas.
 *
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getOperacionesSmartOLT(options = {}) {
  const { query, request } = splitRequestOptions(options)
  const smartOltQuery = buildSmartOltDetailQuery(query)

  if (!smartOltQuery.olt) {
    return []
  }

  try {
    const data = await apiGet(
      withQueryString('/api/operaciones/smartolt', smartOltQuery),
      request,
    )

    return transformSmartOlt(extractSmartOltRows(data))
  } catch (err) {
    console.error('Error obteniendo SmartOLT de Operaciones:', err)
    return []
  }
}

/**
 * Obtiene las órdenes de servicio desde TotalNet.
 *
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getOperacionesOrdenesServicio(options = {}) {
  const { query, request } = splitRequestOptions(options)

  try {
    const data = await apiGet(
      withQueryString(
        '/api/operaciones/ordenes-servicio',
        buildOperacionesQuery(query),
      ),
      request,
    )
  return transformOrdenesServicio(extractOrdenesRows(data))
  } catch (err) {
    console.error('Error obteniendo Órdenes de Servicio de Operaciones:', err)
    return []
  }
}