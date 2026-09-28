// src/utils/operaciones-domain.js

const DEFAULT_LIMIT = 5000
const MAX_LIMIT = 5000

const STATUS_OPTIONS = Object.freeze([
  'all',
  'Null',
  'LOS',
  'Offline',
  'Online',
  'Power Fail',
  'No reportado',
  'Activo',
  'Inactivo',
])

const SIGNAL_BAND_OPTIONS = Object.freeze([
  'all',
  'very-good',
  'warning',
  'critical',
])

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeCompare(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function toSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function cloneValue(value) {
  if (value === undefined || value === null) return value

  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

function clampLimit(value, fallback = DEFAULT_LIMIT) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(Math.max(Math.trunc(numericValue), 1), MAX_LIMIT)
}

function parseDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoString(value) {
  const date = value instanceof Date ? value : parseDate(value)

  return date ? date.toISOString() : null
}

function unwrapRows(payload) {
  if (Array.isArray(payload)) return payload

  const source = toSafeObject(payload)

  if (Array.isArray(source.data)) return source.data
  if (Array.isArray(source.items)) return source.items
  if (Array.isArray(source.results)) return source.results
  if (Array.isArray(source.rows)) return source.rows
  if (Array.isArray(source.response)) return source.response
  if (Array.isArray(source.onus)) return source.onus
  if (Array.isArray(source.onu)) return source.onu
  if (Array.isArray(source.records)) return source.records
  if (Array.isArray(source.list)) return source.list

  return []
}

function getField(row, candidates = [], fallback = undefined) {
  const source = toSafeObject(row)

  for (const candidate of toSafeArray(candidates)) {
    if (!Object.prototype.hasOwnProperty.call(source, candidate)) continue

    const value = source[candidate]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return fallback
}

function getNestedField(row, candidates = [], fallback = undefined) {
  const source = toSafeObject(row)

  for (const candidate of toSafeArray(candidates)) {
    const path = normalizeText(candidate)

    if (!path) continue

    if (!path.includes('.')) {
      const value = getField(source, [path])

      if (value !== undefined && value !== null && value !== '') {
        return value
      }

      continue
    }

    const value = path.split('.').reduce((current, key) => {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined
      }

      return current[key]
    }, source)

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return fallback
}

function normalizeStatus(status, fallback = 'No reportado') {
  const normalized = normalizeCompare(status)

  if (!normalized || normalized === 'NULL' || normalized === 'NULO') {
    return fallback
  }

  if (normalized === 'LOS') return 'LOS'

  if (normalized.includes('POWER') && normalized.includes('FAIL')) {
    return 'Power Fail'
  }

  if (normalized.includes('OFFLINE')) return 'Offline'
  if (normalized.includes('ONLINE')) return 'Online'

  if (normalized.includes('ACTIVE') || normalized.includes('ACTIVO')) {
    return 'Activo'
  }

  if (normalized.includes('INACTIVE') || normalized.includes('INACTIVO')) {
    return 'Inactivo'
  }

  if (['CORTE', 'CORTADO', 'CUT'].includes(normalized)) return 'CORTE'
  if (['SUSPENDIDO', 'SUSPENDED'].includes(normalized)) return 'SUSPENDIDO'
  if (['PENDIENTE', 'PENDING'].includes(normalized)) return 'PENDIENTE'

  if (['FINALIZADO', 'COMPLETADO', 'CERRADO'].includes(normalized)) {
    return 'FINALIZADO'
  }

  return normalizeText(status, fallback)
}

function normalizeSignalBand(value) {
  const band = normalizeCompare(value)

  if (
    band === 'VERY-GOOD' ||
    band === 'VERY GOOD' ||
    band === 'MUY BUENA' ||
    band === 'BUENA'
  ) {
    return 'very-good'
  }

  if (band === 'WARNING' || band === 'ADVERTENCIA') {
    return 'warning'
  }

  if (
    band === 'CRITICAL' ||
    band === 'CRITICA' ||
    band === 'CRÍTICA' ||
    band === 'MALA'
  ) {
    return 'critical'
  }

  return 'all'
}

function classifySignalBand(signal) {
  const value = toSafeNumber(signal, Number.NaN)

  if (!Number.isFinite(value)) {
    return 'all'
  }

  if (value >= -25) return 'very-good'
  if (value >= -28) return 'warning'

  return 'critical'
}

function buildSmartOltKey(row = {}) {
  const serial = normalizeText(
    getNestedField(row, [
      'serial',
      'serialNumber',
      'serial_number',
      'onuSerial',
      'onu_serial',
      'onu_sn',
      'sn',
    ]),
  )

  if (serial && normalizeCompare(serial) !== 'N/D') {
    return `SERIAL::${normalizeCompare(serial)}`
  }

  const olt = normalizeText(
    getNestedField(row, [
      'oltId',
      'olt_id',
      'olt',
      'oltName',
      'olt_name',
      'oltLabel',
      'olt_label',
      'olt.id',
      'olt.name',
      'olt_info.id',
      'olt_info.name',
      'oltInfo.id',
      'oltInfo.name',
    ]),
  )

  const slot = normalizeText(
    getNestedField(row, [
      'slot',
      'tarjeta',
      'board',
      'card',
      'board_id',
      'boardId',
      'slot_id',
      'slotId',
    ]),
  )

  const port = normalizeText(
    getNestedField(row, [
      'port',
      'pon',
      'pon_port',
      'ponPort',
      'puerto',
      'port_id',
      'portId',
    ]),
  )

  const onuId = normalizeText(
    getNestedField(row, [
      'onu_id',
      'onuId',
      'onu',
      'id',
      'idOnu',
      'id_onu',
    ]),
  )

  return `ONU::${normalizeCompare(olt)}::${normalizeCompare(slot)}::${normalizeCompare(port)}::${normalizeCompare(onuId)}`
}

function isValidSqlIdentifier(value) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(normalizeText(value))
}

function matchesStatus(row = {}, status = '') {
  const filter = normalizeCompare(status)

  if (!filter || filter === 'ALL') return true

  const rowStatus = normalizeStatus(
    row.status ?? row.estado ?? row.estatus,
  )

  if (filter === 'NULL' || filter === 'NO REPORTADO') {
    const normalizedStatus = normalizeCompare(rowStatus)
    return normalizedStatus === 'NO REPORTADO' || normalizedStatus === 'NULL'
  }

  return normalizeCompare(rowStatus) === filter
}

function matchesSignalBand(row = {}, signalBand = 'all') {
  const filter = normalizeSignalBand(signalBand)

  if (!filter || filter === 'all') return true

  return normalizeSignalBand(row.signalBand ?? row.signal_band) === filter
}

function matchesOlt(row = {}, olt = '') {
  const filter = normalizeCompare(olt)

  if (!filter) return true

  return [
    row.olt,
    row.oltId,
    row.olt_id,
    row.oltName,
    row.olt_name,
    row.oltLabel,
    row.olt_label,
  ].some((value) => normalizeCompare(value) === filter)
}

function createEmptyOperacionesDashboard(filters = {}) {
  const appliedFilters = {
    olt: normalizeText(filters?.olt),
    status: normalizeText(filters?.status),
    signalBand: normalizeSignalBand(filters?.signalBand),
    ordenStatus: normalizeText(filters?.ordenStatus),
    zona: normalizeText(filters?.zona),
    franquicia: normalizeText(filters?.franquicia),
    servicio: normalizeText(filters?.servicio),
    limit: clampLimit(filters?.limit),
  }

  return {
    kpis: [],
    charts: {
      smartOltStatus: [],
      smartOltSignalBand: [],
      ordenesPorEstatus: [],
      capacidadPorTarjetaPuerto: [],
      potencias: [],
      estadoPorStatus: [],
      ordenesPorEstado: [],
    },
    tables: {
      detalleTecnico: [],
      detalleSmartOLT: [],
      detalleOrdenes: [],
      ordenesServicio: [],
    },
    filters: {
      olts: [],
      zonas: [],
      franquicias: [],
      servicios: [],
      status: [...STATUS_OPTIONS],
      signalBands: [...SIGNAL_BAND_OPTIONS],
      applied: appliedFilters,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      appliedFilters,
      warnings: [],
      smartolt: {
        statusRows: 0,
        detailsRows: 0,
        signalRows: 0,
        mergedRows: 0,
        rows: 0,
      },
      totalnet: {
        rows: 0,
        table: '',
      },
      ordenesServicio: {
        rows: 0,
      },
    },
  }
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  STATUS_OPTIONS,
  SIGNAL_BAND_OPTIONS,

  normalizeText,
  normalizeCompare,
  toSafeNumber,
  toSafeArray,
  toSafeObject,
  cloneValue,
  clampLimit,
  parseDate,
  toIsoString,
  unwrapRows,
  getField,
  getNestedField,

  normalizeStatus,
  normalizeSignalBand,
  classifySignalBand,
  buildSmartOltKey,
  isValidSqlIdentifier,

  matchesStatus,
  matchesSignalBand,
  matchesOlt,

  createEmptyOperacionesDashboard,
}