// src/modules/operaciones/utils/operaciones.helpers.js

const DEFAULT_LOCALE = 'es-VE'
const DEFAULT_TEXT_FALLBACK = ''

function hasOwnProperty(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key)
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

export function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

export function normalizeText(value, fallback = DEFAULT_TEXT_FALLBACK) {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function normalizeCompare(value, fallback = '') {
  return normalizeText(value, fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

export function normalizeInteger(value, fallback = 0) {
  const numericValue = normalizeNumber(value, fallback)
  return Number.isFinite(numericValue) ? Math.trunc(numericValue) : fallback
}

export function formatNumber(value, options = {}) {
  const {
    locale = DEFAULT_LOCALE,
    fallback = 0,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(normalizeNumber(value, fallback))
}

export function formatDecimal(value, decimals = 2, options = {}) {
  const resolvedDecimals = Math.max(0, normalizeInteger(decimals, 2))

  return formatNumber(value, {
    ...options,
    minimumFractionDigits: resolvedDecimals,
    maximumFractionDigits: resolvedDecimals,
  })
}

export function formatDateTime(value, fallback = 'SIN FECHA') {
  if (!value) return fallback

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function round(value, decimals = 2) {
  const numericValue = normalizeNumber(value, 0)
  const resolvedDecimals = Math.max(0, normalizeInteger(decimals, 2))
  const factor = 10 ** resolvedDecimals

  return Math.round(numericValue * factor) / factor
}

export function calculatePercentage(numerator, denominator, decimals = 2) {
  const safeNumerator = normalizeNumber(numerator, 0)
  const safeDenominator = normalizeNumber(denominator, 0)

  if (safeDenominator <= 0) return 0

  return round((safeNumerator / safeDenominator) * 100, decimals)
}

export function cloneValue(value) {
  if (value === undefined || value === null) return value

  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

export function unwrapRows(payload = []) {
  if (Array.isArray(payload)) return payload

  const source = ensureObject(payload)

  if (Array.isArray(source.data)) return source.data
  if (Array.isArray(source.items)) return source.items
  if (Array.isArray(source.results)) return source.results
  if (Array.isArray(source.rows)) return source.rows

  return []
}

export function getField(row = {}, candidates = [], fallback = undefined) {
  const source = ensureObject(row)

  for (const candidate of ensureArray(candidates)) {
    if (!hasOwnProperty(source, candidate)) continue

    const value = source[candidate]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return fallback
}

export function normalizeStatus(status, fallback = 'SIN DATO') {
  const normalized = normalizeCompare(status)

  if (!normalized) return fallback

  if (normalized === 'LOS') return 'LOS'

  if (normalized.includes('POWER') && normalized.includes('FAIL')) {
    return 'Power Fail'
  }

  if (normalized.includes('OFFLINE')) return 'Offline'
  if (normalized.includes('ONLINE')) return 'Online'

  if (['ACTIVO', 'ACTIVE'].includes(normalized)) return 'ACTIVO'
  if (['CORTE', 'CORTADO', 'CUT'].includes(normalized)) return 'CORTE'
  if (['SUSPENDIDO', 'SUSPENDED'].includes(normalized)) return 'SUSPENDIDO'
  if (['PENDIENTE', 'PENDING'].includes(normalized)) return 'PENDIENTE'
  if (['FINALIZADO', 'COMPLETADO', 'CERRADO'].includes(normalized)) {
    return 'FINALIZADO'
  }

  return normalizeText(status, fallback)
}

export function normalizeSignalBand(value) {
  const band = normalizeCompare(value)

  if (band === 'VERY-GOOD' || band === 'VERY GOOD' || band === 'MUY BUENA') {
    return 'very-good'
  }

  if (band === 'WARNING' || band === 'ADVERTENCIA') {
    return 'warning'
  }

  if (band === 'CRITICAL' || band === 'CRITICA' || band === 'CRÍTICA') {
    return 'critical'
  }

  return 'all'
}

export function classifySignalBand(signal) {
  const value = normalizeNumber(signal, Number.NaN)

  if (!Number.isFinite(value)) {
    return 'all'
  }

  if (value >= -25) return 'very-good'
  if (value >= -28) return 'warning'

  return 'critical'
}

export function buildSmartOltKey(row = {}) {
  const serial = normalizeText(
    getField(row, ['serial', 'serial_number', 'onu_sn', 'sn']),
  )

  if (serial) {
    return `SERIAL::${normalizeCompare(serial)}`
  }

  const olt = normalizeText(getField(row, ['olt', 'olt_name', 'name']))
  const slot = normalizeText(getField(row, ['slot', 'tarjeta', 'board', 'card']))
  const port = normalizeText(getField(row, ['port', 'pon', 'pon_port', 'puerto']))
  const onuId = normalizeText(getField(row, ['onu_id', 'onu', 'id', 'onuId']))

  return `ONU::${normalizeCompare(olt)}::${normalizeCompare(slot)}::${normalizeCompare(port)}::${normalizeCompare(onuId)}`
}