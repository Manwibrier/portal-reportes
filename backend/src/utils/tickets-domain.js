const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

const DEFAULT_TEXT_FALLBACK = 'SIN DATO'
const DEFAULT_REASON_FALLBACK = 'SIN MOTIVO'
const MS_PER_HOUR = 3600000
const MS_PER_DAY = 86400000

const STATUS_ALIASES = new Map([
  ['APROBADO POR EL SUPERVISOR', 'APROBADO'],
  ['APROBADO POR SUPERVISOR', 'APROBADO'],
  ['POR APROBACION DEL SUPERVISOR', 'POR APROBAR'],
  ['POR APROBACIÓN DEL SUPERVISOR', 'POR APROBAR'],
])

const CLOSED_STATUS_MARKERS = ['CERRADO', 'RESUELTO', 'FINALIZADO']

const EMPTY_REASON_MARKERS = new Set([
  '',
  '-',
  'N/A',
  'NA',
  'NO APLICA',
  'NO APLICA.',
  'NINGUNO',
  'NINGUNA',
  'NULL',
  'SIN DATO',
  'SIN MOTIVO',
])

const TRUE_MARKERS = new Set(['TRUE', 'T', '1', 'SI', 'SÍ', 'YES', 'Y'])
const FALSE_MARKERS = new Set(['FALSE', 'F', '0', 'NO', 'N', ''])

function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Normaliza un texto para comparaciones técnicas:
 * sin acentos, sin espacios repetidos y en mayúsculas.
 *
 * @param {unknown} value Valor origen.
 * @param {string} [fallback=''] Valor por defecto.
 * @returns {string}
 */
function normalizeCompare(value, fallback = '') {
  const normalized = normalizeWhitespace(stripDiacritics(value)).toUpperCase()
  return normalized || fallback
}

/**
 * Normaliza texto libre a un valor consistente.
 *
 * @param {unknown} value Valor origen.
 * @param {string} [fallback='SIN DATO'] Valor por defecto.
 * @returns {string}
 */
function normalizeText(value, fallback = DEFAULT_TEXT_FALLBACK) {
  const text = normalizeWhitespace(value)
  return text || fallback
}

/**
 * Estandariza algunos estatus equivalentes.
 *
 * @param {unknown} value Estatus original.
 * @returns {string}
 */
function normalizeStatus(value) {
  const status = normalizeCompare(value, DEFAULT_TEXT_FALLBACK)
  return STATUS_ALIASES.get(status) || status
}

/**
 * Determina si un ticket está cerrado según la convención de negocio.
 *
 * @param {unknown} status Estatus del ticket.
 * @returns {boolean}
 */
function isClosedStatus(status) {
  const normalized = normalizeStatus(status)
  return CLOSED_STATUS_MARKERS.some((marker) => normalized.includes(marker))
}

/**
 * Indica si una instancia es una fecha válida.
 *
 * @param {unknown} value Valor a validar.
 * @returns {boolean}
 */
function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

/**
 * Convierte un valor a Date válida.
 *
 * @param {unknown} value Fecha en cualquier formato soportado por Date.
 * @returns {Date | null}
 */
function toDate(value) {
  if (value === undefined || value === null || value === '') return null

  if (isValidDate(value)) {
    return new Date(value.getTime())
  }

  const date = new Date(value)
  return isValidDate(date) ? date : null
}

/**
 * Lleva una fecha al inicio del día.
 *
 * @param {Date | string | number | null} date Fecha origen.
 * @returns {Date | null}
 */
function toStartOfDay(date) {
  const resolved = toDate(date)
  if (!resolved) return null

  resolved.setHours(0, 0, 0, 0)
  return resolved
}

/**
 * Lleva una fecha al final del día.
 *
 * @param {Date | string | number | null} date Fecha origen.
 * @returns {Date | null}
 */
function toEndOfDay(date) {
  const resolved = toStartOfDay(date)
  if (!resolved) return null

  resolved.setHours(23, 59, 59, 999)
  return resolved
}

/**
 * Obtiene el primer instante del mes de una fecha.
 *
 * @param {Date | string | number | null} date Fecha origen.
 * @returns {Date | null}
 */
function getMonthStart(date) {
  const resolved = toDate(date)
  if (!resolved) return null

  return new Date(resolved.getFullYear(), resolved.getMonth(), 1)
}

/**
 * Obtiene el límite exclusivo del mes de una fecha.
 *
 * @param {Date | string | number | null} date Fecha origen.
 * @returns {Date | null}
 */
function getMonthEndExclusive(date) {
  const monthStart = getMonthStart(date)
  if (!monthStart) return null

  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
}

/**
 * Calcula horas entre dos fechas válidas.
 *
 * @param {Date | string | number | null} start Fecha inicial.
 * @param {Date | string | number | null} end Fecha final.
 * @returns {number}
 */
function diffInHours(start, end) {
  const resolvedStart = toDate(start)
  const resolvedEnd = toDate(end)

  if (!resolvedStart || !resolvedEnd || resolvedEnd < resolvedStart) return 0

  return (resolvedEnd.getTime() - resolvedStart.getTime()) / MS_PER_HOUR
}

/**
 * Redondea a la cantidad indicada de decimales.
 *
 * @param {number} value Número a redondear.
 * @param {number} [decimals=2] Decimales.
 * @returns {number}
 */
function round(value, decimals = 2) {
  const numeric = Number(value)
  const resolvedDecimals = Number.isFinite(Number(decimals))
    ? Math.max(0, Math.trunc(Number(decimals)))
    : 2

  if (!Number.isFinite(numeric)) return 0

  return Number(numeric.toFixed(resolvedDecimals))
}

/**
 * Convierte un valor arbitrario a boolean de negocio.
 *
 * @param {unknown} value Valor origen.
 * @returns {boolean}
 */
function toBusinessBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  const normalized = normalizeCompare(value)

  if (TRUE_MARKERS.has(normalized)) return true
  if (FALSE_MARKERS.has(normalized)) return false

  return false
}

/**
 * Obtiene el primer valor no vacío de una lista.
 *
 * @param {unknown[]} values Lista ordenada de candidatos.
 * @param {string} [fallback='SIN DATO'] Valor por defecto.
 * @returns {string}
 */
function firstNonEmpty(values = [], fallback = DEFAULT_TEXT_FALLBACK) {
  for (const value of values) {
    const normalized = normalizeText(value, '')
    if (normalized) return normalized
  }

  return fallback
}

/**
 * Indica si el motivo de rechazo tiene valor semántico.
 *
 * @param {unknown} value Motivo de rechazo.
 * @returns {boolean}
 */
function hasRealReason(value) {
  const normalized = normalizeCompare(value)
  return Boolean(normalized) && !EMPTY_REASON_MARKERS.has(normalized)
}

/**
 * Normaliza un motivo de rechazo con fallback consistente.
 *
 * @param {unknown} value Motivo origen.
 * @param {string} [fallback='SIN MOTIVO'] Valor por defecto.
 * @returns {string}
 */
function normalizeReason(value, fallback = DEFAULT_REASON_FALLBACK) {
  if (!hasRealReason(value)) return fallback
  return normalizeText(value, fallback)
}

/**
 * Calcula diferencia entera de días entre dos fechas.
 * La comparación se hace al nivel de día calendario.
 *
 * @param {Date | string | number | null} start Fecha inicial.
 * @param {Date | string | number | null} end Fecha final.
 * @returns {number}
 */
function diffInDays(start, end) {
  const resolvedStart = toStartOfDay(start)
  const resolvedEnd = toStartOfDay(end)

  if (!resolvedStart || !resolvedEnd || resolvedEnd < resolvedStart) return 0

  return Math.floor((resolvedEnd.getTime() - resolvedStart.getTime()) / MS_PER_DAY)
}

/**
 * Devuelve el índice de mes YYYY-MM para una fecha.
 *
 * @param {Date | string | number} date Fecha origen.
 * @returns {string}
 */
function getMonthKey(date) {
  const resolved = toDate(date)
  if (!resolved) return ''

  const year = resolved.getFullYear()
  const month = String(resolved.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Devuelve una etiqueta corta de mes en español.
 *
 * @param {Date | string | number} date Fecha origen.
 * @returns {string}
 */
function getMonthLabel(date) {
  const resolved = toDate(date)
  if (!resolved) return ''

  return `${MONTHS_SHORT[resolved.getMonth()]} ${resolved.getFullYear()}`
}

/**
 * Construye una serie de meses hacia atrás incluyendo el mes actual.
 *
 * @param {number} months Cantidad de meses.
 * @param {Date | string | number} [baseDate=new Date()] Fecha base opcional.
 * @returns {Array<{ key: string, label: string, start: Date, endExclusive: Date }>}
 */
function createMonthSeries(months, baseDate = new Date()) {
  const resolvedMonths = Math.max(1, Math.trunc(Number(months) || 0))
  const referenceDate = toDate(baseDate) || new Date()
  const currentMonthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
  )

  const result = []

  for (let index = resolvedMonths - 1; index >= 0; index -= 1) {
    const start = new Date(
      currentMonthStart.getFullYear(),
      currentMonthStart.getMonth() - index,
      1,
    )
    const endExclusive = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      1,
    )

    result.push({
      key: getMonthKey(start),
      label: getMonthLabel(start),
      start,
      endExclusive,
    })
  }

  return result
}

module.exports = {
  stripDiacritics,
  normalizeCompare,
  normalizeText,
  normalizeStatus,
  isClosedStatus,
  isValidDate,
  toDate,
  toStartOfDay,
  toEndOfDay,
  getMonthStart,
  getMonthEndExclusive,
  diffInHours,
  diffInDays,
  round,
  toBusinessBoolean,
  firstNonEmpty,
  hasRealReason,
  normalizeReason,
  getMonthKey,
  getMonthLabel,
  createMonthSeries,
}
