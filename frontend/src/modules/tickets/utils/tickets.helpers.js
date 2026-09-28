const DEFAULT_TEXT_FALLBACK = 'SIN DATO'

const STATUS_ALIASES = new Map([
  ['APROBADO POR EL SUPERVISOR', 'APROBADO'],
  ['APROBADO POR SUPERVISOR', 'APROBADO'],
  ['POR APROBACION DEL SUPERVISOR', 'POR APROBAR'],
  ['POR APROBACIÓN DEL SUPERVISOR', 'POR APROBAR'],
])

function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

export function ensureArray(data) {
  return Array.isArray(data) ? data : []
}

export function ensureObject(data) {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export function ensureString(value, fallback = '') {
  const text = normalizeWhitespace(value)
  return text || fallback
}

export function normalizarTexto(value, fallback = DEFAULT_TEXT_FALLBACK) {
  const text = normalizeWhitespace(value)
  return text || fallback
}

export function normalizeCompare(value, fallback = '') {
  const normalized = normalizeWhitespace(stripDiacritics(value)).toUpperCase()
  return normalized || fallback
}

export function normalizeStatusName(name) {
  const status = normalizeCompare(name, DEFAULT_TEXT_FALLBACK)
  return STATUS_ALIASES.get(status) || status
}

export function round(value, decimals = 2) {
  const number = Number(value)
  const resolvedDecimals = Number.isFinite(Number(decimals))
    ? Math.max(0, Math.trunc(Number(decimals)))
    : 2

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(number.toFixed(resolvedDecimals))
}

export function parseNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function parseInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : fallback
}

export function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  const normalized = normalizeCompare(value)

  if (['TRUE', 'T', '1', 'SI', 'SÍ', 'YES', 'Y'].includes(normalized)) {
    return true
  }

  if (['FALSE', 'F', '0', 'NO', 'N', ''].includes(normalized)) {
    return false
  }

  return fallback
}

export function firstNonEmpty(values = [], fallback = DEFAULT_TEXT_FALLBACK) {
  for (const value of values) {
    const normalized = ensureString(value)
    if (normalized) return normalized
  }

  return fallback
}

export function formatBacklogDescription(summary = {}) {
  const delta = parseNumber(summary?.backlogDelta)
  const deltaPct = round(parseNumber(summary?.backlogDeltaPct), 2)

  if (delta > 0) {
    return `+${delta} vs mes anterior (${deltaPct}%)`
  }

  if (delta < 0) {
    return `${delta} vs mes anterior (${deltaPct}%)`
  }

  return 'Sin variación vs mes anterior'
}
