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
const DEFAULT_SEGMENT = 'HOGAR'
const DEFAULT_SEGMENTS = Object.freeze(['HOGAR', 'JURIDICO', 'GOBIERNO'])
const MS_PER_DAY = 86400000

const SEGMENT_ALIASES = new Map([
  ['HOGAR', 'HOGAR'],
  ['RESIDENCIAL', 'HOGAR'],
  ['PERSONA NATURAL', 'HOGAR'],

  ['JURIDICO', 'JURIDICO'],
  ['JURIDICA', 'JURIDICO'],
  ['JURIDICAS', 'JURIDICO'],
  ['PYMES', 'JURIDICO'],
  ['PYME', 'JURIDICO'],
  ['EMPRESA', 'JURIDICO'],
  ['EMPRESAS', 'JURIDICO'],
  ['CORPORATIVO', 'JURIDICO'],
  ['CORPORATIVOS', 'JURIDICO'],
  ['CORPORACION', 'JURIDICO'],
  ['CORPORACIONES', 'JURIDICO'],
  ['NEGOCIO', 'JURIDICO'],
  ['NEGOCIOS', 'JURIDICO'],

  ['GOBIERNO', 'GOBIERNO'],
  ['GUBERNAMENTAL', 'GOBIERNO'],
  ['PUBLICO', 'GOBIERNO'],
  ['PUBLICA', 'GOBIERNO'],
  ['SECTOR PUBLICO', 'GOBIERNO'],
])

function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeCompare(value, fallback = '') {
  const normalized = normalizeWhitespace(stripDiacritics(value)).toUpperCase()
  return normalized || fallback
}

function normalizeText(value, fallback = DEFAULT_TEXT_FALLBACK) {
  const text = normalizeWhitespace(value)
  return text || fallback
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function round(value, decimals = 2) {
  const number = Number(value)
  const resolvedDecimals = Number.isFinite(Number(decimals))
    ? Math.max(0, Math.trunc(Number(decimals)))
    : 2

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(number.toFixed(resolvedDecimals))
}

function firstNonEmpty(values = [], fallback = '') {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (normalized) return normalized
  }

  return fallback
}

function isValidDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(date.getTime())
}

function toDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getTime()) : null
  }

  const date = new Date(value)
  return isValidDate(date) ? date : null
}

function toStartOfDay(value) {
  const date = toDate(value)
  if (!date) return null

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getMonthStart(value) {
  const date = toDate(value)
  if (!date) return null

  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getMonthEndExclusive(value) {
  const monthStart = getMonthStart(value)
  if (!monthStart) return null

  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
}

function diffInDays(start, end) {
  const startDate = toStartOfDay(start)
  const endDate = toStartOfDay(end)

  if (!startDate || !endDate) return 0

  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY)
}

function getMonthKey(date) {
  const resolved = getMonthStart(date)
  if (!resolved) return ''

  const year = resolved.getFullYear()
  const month = String(resolved.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function getMonthLabel(date) {
  const resolved = getMonthStart(date)
  if (!resolved) return ''

  return `${MONTHS_SHORT[resolved.getMonth()]} ${resolved.getFullYear()}`
}

function createMonthSeries(months, baseDate = new Date()) {
  const resolvedMonths = Math.max(1, Math.trunc(Number(months) || 0))
  const referenceDate = getMonthStart(baseDate) || getMonthStart(new Date())
  const result = []

  for (let index = resolvedMonths - 1; index >= 0; index -= 1) {
    const start = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - index,
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

function normalizePeriod(value, fallback = '') {
  if (!value) return fallback

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return trimmed
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed.slice(0, 7)
    }
  }

  const date = toDate(value)
  return date ? getMonthKey(date) : fallback
}

function resolvePeriodFromRow(
  row = {},
  {
    periodKeys = ['periodo', 'period', 'mes'],
    yearKeys = ['anio', 'year'],
    monthKeys = ['mes_num', 'mesNumero', 'month'],
    dateKeys = ['fecha', 'date', 'fecha_pago', 'fecha_creacion'],
  } = {},
) {
  const explicitPeriod = firstNonEmpty(periodKeys.map((key) => row?.[key]))
  const normalizedExplicitPeriod = normalizePeriod(explicitPeriod)

  if (normalizedExplicitPeriod) {
    return normalizedExplicitPeriod
  }

  const year = toSafeNumber(firstNonEmpty(yearKeys.map((key) => row?.[key])), 0)
  const month = toSafeNumber(firstNonEmpty(monthKeys.map((key) => row?.[key])), 0)

  if (year > 0 && month >= 1 && month <= 12) {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  const sourceDate = firstNonEmpty(dateKeys.map((key) => row?.[key]))
  return normalizePeriod(sourceDate)
}

function normalizeSegment(value, fallback = DEFAULT_SEGMENT) {
  const normalized = normalizeCompare(value)

  if (!normalized) {
    return fallback
  }

  return SEGMENT_ALIASES.get(normalized) || fallback
}

function normalizeSegmentList(values = [], includeDefaults = true) {
  const source = Array.isArray(values) ? values : []
  const result = []
  const seen = new Set()

  source.forEach((value) => {
    const normalized = normalizeSegment(value, '')

    if (!normalized || seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    result.push(normalized)
  })

  if (includeDefaults) {
    DEFAULT_SEGMENTS.forEach((segment) => {
      if (seen.has(segment)) return
      seen.add(segment)
      result.push(segment)
    })
  }

  return result
}

function resolveRowSegment(
  row = {},
  fieldNames = [
    'segmento_cliente',
    'segmento',
    'segmentoCliente',
    'tipo_cliente',
    'tipoCliente',
  ],
) {
  const rawSegment = firstNonEmpty(fieldNames.map((key) => row?.[key]), '')
  return normalizeSegment(rawSegment, DEFAULT_SEGMENT)
}

function matchesSegment(rowOrSegment, requestedSegment = DEFAULT_SEGMENT) {
  const requested = normalizeSegment(requestedSegment, DEFAULT_SEGMENT)
  const resolved =
    rowOrSegment && typeof rowOrSegment === 'object'
      ? resolveRowSegment(rowOrSegment)
      : normalizeSegment(rowOrSegment, DEFAULT_SEGMENT)

  return resolved === requested
}

function filterRowsBySegment(
  rows = [],
  segment = DEFAULT_SEGMENT,
  fieldNames,
) {
  const requested = normalizeSegment(segment, DEFAULT_SEGMENT)
  const source = Array.isArray(rows) ? rows : []

  return source.filter((row) => {
    const resolved = fieldNames
      ? resolveRowSegment(row, fieldNames)
      : resolveRowSegment(row)

    return resolved === requested
  })
}

function sumValues(rows = [], selector) {
  const source = Array.isArray(rows) ? rows : []

  return source.reduce((acc, row, index) => {
    const rawValue =
      typeof selector === 'function' ? selector(row, index) : row?.[selector]

    return acc + toSafeNumber(rawValue, 0)
  }, 0)
}

function calculateGrowthTarget(baseValue, rate = 0.2, decimals = 2) {
  const base = toSafeNumber(baseValue, 0)
  const growthRate = toSafeNumber(rate, 0)

  return round(base * (1 + growthRate), decimals)
}

function calculateGrowthPct(currentValue, previousValue, decimals = 2) {
  const current = toSafeNumber(currentValue, 0)
  const previous = toSafeNumber(previousValue, 0)

  if (previous <= 0) {
    return 0
  }

  return round(((current - previous) / previous) * 100, decimals)
}

function buildPeriodCatalog(rows = [], options = {}) {
  const source = Array.isArray(rows) ? rows : []
  const seen = new Set()

  source.forEach((row) => {
    const periodKey = resolvePeriodFromRow(row, options)
    if (periodKey) {
      seen.add(periodKey)
    }
  })

  return [...seen].sort((left, right) => right.localeCompare(left, 'es'))
}

function buildMonthlyMetricSeries(
  rows = [],
  {
    months = 12,
    baseDate = new Date(),
    valueSelector = 'total',
    periodOptions = {},
    decimals = 2,
  } = {},
) {
  const source = Array.isArray(rows) ? rows : []
  const series = createMonthSeries(months, baseDate)
  const totals = new Map(series.map((month) => [month.key, 0]))

  source.forEach((row, index) => {
    const periodKey = resolvePeriodFromRow(row, periodOptions)

    if (!periodKey || !totals.has(periodKey)) {
      return
    }

    const rawValue =
      typeof valueSelector === 'function'
        ? valueSelector(row, index)
        : row?.[valueSelector]

    totals.set(periodKey, totals.get(periodKey) + toSafeNumber(rawValue, 0))
  })

  return series.map((month) => ({
    anio: month.start.getFullYear(),
    mes_num: month.start.getMonth() + 1,
    mes: MONTHS_SHORT[month.start.getMonth()],
    periodo: month.label,
    label: month.label,
    total: round(totals.get(month.key), decimals),
    cantidad: round(totals.get(month.key), decimals),
    value: round(totals.get(month.key), decimals),
  }))
}

function buildDistributionData(
  rows = [],
  {
    labelSelector = 'label',
    valueSelector = 'total',
    fallbackLabel = DEFAULT_TEXT_FALLBACK,
    decimals = 2,
  } = {},
) {
  const source = Array.isArray(rows) ? rows : []
  const grouped = new Map()

  source.forEach((row, index) => {
    const rawLabel =
      typeof labelSelector === 'function'
        ? labelSelector(row, index)
        : row?.[labelSelector]

    const label = normalizeText(rawLabel, fallbackLabel)
    const rawValue =
      typeof valueSelector === 'function'
        ? valueSelector(row, index)
        : row?.[valueSelector]

    grouped.set(label, (grouped.get(label) || 0) + toSafeNumber(rawValue, 0))
  })

  return [...grouped.entries()]
    .map(([label, total]) => ({
      label,
      name: label,
      total: round(total, decimals),
      cantidad: round(total, decimals),
      value: round(total, decimals),
    }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value
      }

      return left.label.localeCompare(right.label, 'es', {
        sensitivity: 'base',
      })
    })
}

module.exports = {
  MONTHS_SHORT,
  DEFAULT_SEGMENT,
  DEFAULT_SEGMENTS,
  stripDiacritics,
  normalizeCompare,
  normalizeText,
  toSafeNumber,
  round,
  firstNonEmpty,
  isValidDate,
  toDate,
  toStartOfDay,
  getMonthStart,
  getMonthEndExclusive,
  diffInDays,
  getMonthKey,
  getMonthLabel,
  createMonthSeries,
  normalizePeriod,
  resolvePeriodFromRow,
  normalizeSegment,
  normalizeSegmentList,
  resolveRowSegment,
  matchesSegment,
  filterRowsBySegment,
  sumValues,
  calculateGrowthTarget,
  calculateGrowthPct,
  buildPeriodCatalog,
  buildMonthlyMetricSeries,
  buildDistributionData,
}