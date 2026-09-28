// src/services/operaciones-smartolt.service.js

const axios = require('axios')
const { env } = require('../config/env')

const CACHE_TTL_MS = 90 * 1000
const DEFAULT_LIMIT = 5000
const MAX_LIMIT = 20000
const DEFAULT_TIMEOUT_MS = 15000
const SELECTED_OLT_ROW_TOLERANCE = 1.35

const smartOltCache = new Map()

const ARRAY_KEYS = [
  'response',
  'data',
  'onus',
  'onu',
  'items',
  'results',
  'rows',
  'records',
  'list',
]

const STATUS_FIELD_CANDIDATES = [
  'status',
  'estado',
  'estatus',
  'onu_status',
  'onuStatus',
  'onuStatusName',
  'onu_status_name',
  'last_status',
  'lastStatus',
  'phase_state',
  'phaseState',
  'oper_status',
  'operStatus',
  'operational_status',
  'operationalStatus',
  'state',
]

const SIGNAL_FIELD_CANDIDATES = [
  'signal',
  'rx',
  'rxPower',
  'rx_power',
  'rxSignal',
  'rx_signal',
  'rxPowerDbm',
  'rx_power_dbm',
  'onu_signal',
  'onuSignal',
  'onuRx',
  'onu_rx',
  'onuRxPower',
  'onu_rx_power',
  'onuRxSignal',
  'onu_rx_signal',
  'onu_signal_1490',
  'signal_1490',
  'rx_1490',
  'power',
  'potencia',
  'optical_power',
  'received_power',
  'fiber_signal',
  'dbm',
]

const SERIAL_FIELD_CANDIDATES = [
  'serial',
  'serialNumber',
  'serial_number',
  'onuSerial',
  'onu_serial',
  'onu_sn',
  'sn',
]

const CLIENT_NAME_FIELD_CANDIDATES = [
  'name',
  'nombre',
  'clientName',
  'client_name',
  'customer',
  'customer_name',
  'cliente',
  'unique_external_id',
  'uniqueExternalId',
  'description',
  'address',
  'direccion',
]

const OLT_DETAIL_ID_FIELD_CANDIDATES = [
  'oltId',
  'olt_id',
  'idOlt',
  'id_olt',
  'olt',
  'olt.id',
  'olt_info.id',
  'oltInfo.id',
]

const OLT_DETAIL_NAME_FIELD_CANDIDATES = [
  'oltName',
  'olt_name',
  'oltLabel',
  'olt_label',
  'oltDisplayName',
  'olt_display_name',
  'oltDescription',
  'olt_description',
  'oltFullName',
  'olt_full_name',
  'olt.name',
  'olt.label',
  'olt.description',
  'olt_info.name',
  'olt_info.label',
  'olt_info.description',
  'oltInfo.name',
  'oltInfo.label',
  'oltInfo.description',
]

const OLT_CATALOG_ID_FIELD_CANDIDATES = [
  'id',
  'oltId',
  'olt_id',
  'idOlt',
  'id_olt',
  'olt',
]

const OLT_CATALOG_NAME_FIELD_CANDIDATES = [
  'name',
  'label',
  'description',
  'oltName',
  'olt_name',
  'oltLabel',
  'olt_label',
  'oltDisplayName',
  'olt_display_name',
  'oltDescription',
  'olt_description',
  'oltFullName',
  'olt_full_name',
]

const ONU_ID_FIELD_CANDIDATES = [
  'onuId',
  'onu_id',
  'onu',
  'idOnu',
  'id_onu',
  'id',
]

const SLOT_FIELD_CANDIDATES = [
  'slot',
  'tarjeta',
  'board',
  'card',
  'board_id',
  'boardId',
  'slot_id',
  'slotId',
]

const PORT_FIELD_CANDIDATES = [
  'port',
  'puerto',
  'pon',
  'pon_port',
  'ponPort',
  'port_id',
  'portId',
]

const OLT_LIST_PATH_CANDIDATES = [
  process.env.SMARTOLT_OLTS_PATH,
  env.SMARTOLT_OLTS_PATH,
  'api/system/get_olts',
  'api/olt/get_olts',
  'api/olt/get_all',
].filter(Boolean)

const OLT_REQUEST_PARAM_CANDIDATES = [
  'olt_id',
  'olt',
  'id_olt',
  'oltId',
  'idOlt',
]

const PLACEHOLDER_VALUES = new Set([
  'N/D',
  'SIN OLT',
  'SIN NOMBRE',
  'NO REPORTADO',
  'NULL',
  'UNDEFINED',
])

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeCompare(value = '') {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function toSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function clampLimit(value, fallback = DEFAULT_LIMIT) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return fallback

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(numericValue)))
}

function getNestedField(source = {}, path = '') {
  if (!path) return undefined

  return String(path)
    .split('.')
    .reduce((current, key) => {
      if (!current || typeof current !== 'object') return undefined
      return current[key]
    }, source)
}

function getFirstField(row = {}, candidates = []) {
  for (const candidate of candidates) {
    const value = getNestedField(row, candidate)

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function normalizeOltNumber(value = '') {
  const text = normalizeText(value)

  if (/^\d+$/.test(text)) return text

  const match = text.match(/^OLT[\s-]*(\d+)$/i)

  return match?.[1] || ''
}

function normalizeOltIdValue(value = '') {
  const numberValue = normalizeOltNumber(value)
  return numberValue || normalizeText(value)
}

function parseSignalValue(value) {
  if (value === undefined || value === null || value === '') return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const numericText = String(value)
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '')
    .trim()

  if (!numericText) return null

  const numericValue = Number(numericText)

  return Number.isFinite(numericValue) ? numericValue : null
}

function classifySignalBand(signal) {
  const numericSignal = parseSignalValue(signal)

  if (!Number.isFinite(numericSignal)) return 'all'
  if (numericSignal >= -25) return 'very-good'
  if (numericSignal >= -28) return 'warning'

  return 'critical'
}

function normalizeSignalBand(value = 'all') {
  const normalized = normalizeCompare(value)

  if (
    normalized === 'VERY-GOOD' ||
    normalized === 'VERY GOOD' ||
    normalized === 'MUY BUENA' ||
    normalized === 'BUENA'
  ) {
    return 'very-good'
  }

  if (normalized === 'WARNING' || normalized === 'ADVERTENCIA') {
    return 'warning'
  }

  if (
    normalized === 'CRITICAL' ||
    normalized === 'CRITICA' ||
    normalized === 'CRÍTICA' ||
    normalized === 'MALA'
  ) {
    return 'critical'
  }

  return 'all'
}

function normalizeStatus(value, fallback = 'No reportado') {
  const normalized = normalizeCompare(value)

  if (!normalized || normalized === 'NULL' || normalized === 'NULO') {
    return fallback
  }

  if (normalized === 'LOS') return 'LOS'

  if (normalized.includes('POWER') && normalized.includes('FAIL')) {
    return 'Power Fail'
  }

  if (normalized.includes('OFFLINE')) return 'Offline'
  if (normalized.includes('ONLINE')) return 'Online'
  if (normalized.includes('ACTIVE') || normalized.includes('ACTIVO')) return 'Activo'
  if (normalized.includes('INACTIVE') || normalized.includes('INACTIVO')) return 'Inactivo'

  return normalizeText(value, fallback)
}

function isUsefulValue(value) {
  const text = normalizeText(value)
  const normalized = normalizeCompare(text)

  return Boolean(text && !PLACEHOLDER_VALUES.has(normalized))
}

function valuesMatchSelectedOlt(values = [], selectedOlt = '') {
  const selectedText = normalizeText(selectedOlt)
  const selectedKey = normalizeCompare(selectedText)
  const selectedNumber = normalizeOltNumber(selectedText)

  if (!selectedKey) return true

  return toSafeArray(values).some((value) => {
    const valueText = normalizeText(value)
    const valueKey = normalizeCompare(valueText)
    const valueNumber = normalizeOltNumber(valueText)

    if (valueKey === selectedKey) return true

    return Boolean(
      selectedNumber &&
        valueNumber &&
        selectedNumber === valueNumber,
    )
  })
}

function collectOltValues(row = {}) {
  return [
    ...OLT_DETAIL_ID_FIELD_CANDIDATES,
    ...OLT_DETAIL_NAME_FIELD_CANDIDATES,
  ]
    .map((field) => getNestedField(row, field))
    .map((value) => normalizeText(value))
    .filter(Boolean)
}

function collectRealOltValues(row = {}) {
  return collectOltValues(row).filter(isUsefulValue)
}

function rowHasExplicitOlt(row = {}) {
  return collectRealOltValues(row).length > 0
}

function rowMatchesSelectedOlt(row = {}, selectedOlt = '') {
  const selected = normalizeText(selectedOlt)

  if (!selected) return true

  const values = collectRealOltValues(row)

  if (values.length === 0) return false

  return valuesMatchSelectedOlt(values, selected)
}

function buildSmartOltUrl(path = '') {
  const baseUrl = normalizeText(env.SMARTOLT_BASE_URL)
  const cleanPath = normalizeText(path)

  if (!baseUrl || !cleanPath) return ''

  return `${baseUrl.replace(/\/+$/, '')}/${cleanPath.replace(/^\/+/, '')}`
}

function buildAuthHeaders() {
  const token = normalizeText(env.SMARTOLT_API_TOKEN)
  const headerName = normalizeText(env.SMARTOLT_AUTH_HEADER, 'X-Token')
  const authScheme = normalizeText(env.SMARTOLT_AUTH_SCHEME)

  if (!token) return {}

  return {
    [headerName]: authScheme ? `${authScheme} ${token}` : token,
  }
}

function getTimeoutMs() {
  const timeout = Number(env.SMARTOLT_TIMEOUT_MS)
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload

  const source = toSafeObject(payload)

  for (const key of ARRAY_KEYS) {
    const value = source[key]

    if (Array.isArray(value)) return value

    if (isPlainObject(value)) {
      for (const nestedKey of ARRAY_KEYS) {
        const nestedValue = value[nestedKey]

        if (Array.isArray(nestedValue)) return nestedValue
      }
    }
  }

  const values = Object.values(source)

  if (
    values.length > 0 &&
    values.every((value) => isPlainObject(value) || typeof value !== 'object')
  ) {
    return Object.entries(source)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([id, value]) => {
        if (isPlainObject(value)) {
          return {
            id,
            ...value,
          }
        }

        return {
          id,
          value,
        }
      })
  }

  return []
}

function buildCacheKey(path = '', params = {}) {
  return JSON.stringify({
    path,
    params: Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key]
        return acc
      }, {}),
  })
}

function getCached(cacheKey) {
  const entry = smartOltCache.get(cacheKey)

  if (!entry) return null

  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    smartOltCache.delete(cacheKey)
    return null
  }

  return entry.value
}

function setCached(cacheKey, value) {
  smartOltCache.set(cacheKey, {
    createdAt: Date.now(),
    value,
  })
}

async function requestJson(path, params = {}) {
  const url = buildSmartOltUrl(path)

  if (!url) return null

  const cacheKey = buildCacheKey(path, params)
  const cached = getCached(cacheKey)

  if (cached) return cached

  const response = await axios.get(url, {
    headers: buildAuthHeaders(),
    timeout: getTimeoutMs(),
    params,
  })

  setCached(cacheKey, response.data)

  return response.data
}

async function requestRows(path, params = {}) {
  if (!path) return []

  const payload = await requestJson(path, params)
  return extractRows(payload)
}

async function safeRequestSource(path, source, params = {}) {
  try {
    const rows = await requestRows(path, params)

    return {
      source,
      rows: rows.map((row) => ({
        ...toSafeObject(row),
        source,
      })),
      warning: null,
    }
  } catch (error) {
    const status = error?.response?.status
    const statusText = error?.response?.statusText
    const message = status
      ? `SmartOLT ${source} respondió HTTP ${status}${statusText ? ` ${statusText}` : ''}.`
      : error?.message || `No se pudo consultar SmartOLT ${source}.`

    console.error(`Error consultando SmartOLT ${source}:`, message)

    return {
      source,
      rows: [],
      warning: {
        source,
        message,
      },
    }
  }
}

function findSignalValue(row = {}) {
  const directValue = getFirstField(row, SIGNAL_FIELD_CANDIDATES)
  const directSignal = parseSignalValue(directValue)

  if (Number.isFinite(directSignal)) return directSignal

  for (const [key, value] of Object.entries(row || {})) {
    if (isPlainObject(value)) continue

    const normalizedKey = normalizeCompare(key)

    const looksLikeSignal =
      normalizedKey.includes('SIGNAL') ||
      normalizedKey.includes('RX') ||
      normalizedKey.includes('POWER') ||
      normalizedKey.includes('DBM') ||
      normalizedKey.includes('POTENCIA')

    if (!looksLikeSignal) continue

    const parsed = parseSignalValue(value)

    if (Number.isFinite(parsed)) return parsed
  }

  return null
}

function normalizeCatalogOltOption(row = {}, index = 0) {
  const oltId = normalizeOltIdValue(
    getFirstField(row, OLT_CATALOG_ID_FIELD_CANDIDATES),
  ) || `olt-${index + 1}`

  const oltLabel = normalizeText(
    getFirstField(row, OLT_CATALOG_NAME_FIELD_CANDIDATES),
    oltId ? `OLT ${oltId}` : `OLT ${index + 1}`,
  )

  return {
    id: oltId,
    value: oltId,
    label: oltLabel,
    name: oltLabel,
    oltId,
    oltName: oltLabel,
    oltLabel,
    totalOnus: Number(row.totalOnus ?? row.total_onus ?? row.count ?? 0) || 0,
  }
}

function normalizeSmartOltRow(row = {}, index = 0, context = {}) {
  const signal = findSignalValue(row)
  const signalBand = normalizeSignalBand(
    row.signalBand ??
      row.signal_band ??
      row.powerBucket ??
      row.power_bucket ??
      row.band,
  )

  const resolvedSignalBand =
    signalBand !== 'all'
      ? signalBand
      : classifySignalBand(signal)

  const contextOltId = normalizeText(context.oltId)
  const contextOltLabel = normalizeText(context.oltLabel ?? context.oltName)

  const directOltId = normalizeOltIdValue(
    getFirstField(row, OLT_DETAIL_ID_FIELD_CANDIDATES),
  )

  const directOltName = normalizeText(
    getFirstField(row, OLT_DETAIL_NAME_FIELD_CANDIDATES),
  )

  const oltId = isUsefulValue(directOltId) ? directOltId : contextOltId
  const oltLabel =
    directOltName ||
    normalizeText(row.oltLabel ?? row.olt_label) ||
    contextOltLabel ||
    (oltId ? `OLT ${oltId}` : 'SIN OLT')

  const serial = normalizeText(
    getFirstField(row, SERIAL_FIELD_CANDIDATES),
    'N/D',
  )

  const onuId = normalizeText(
    getFirstField(row, ONU_ID_FIELD_CANDIDATES),
    'N/D',
  )

  const slot = normalizeText(
    getFirstField(row, SLOT_FIELD_CANDIDATES),
    'N/D',
  )

  const port = normalizeText(
    getFirstField(row, PORT_FIELD_CANDIDATES),
    'N/D',
  )

  const status = normalizeStatus(
    getFirstField(row, STATUS_FIELD_CANDIDATES),
    'No reportado',
  )

  return {
    ...row,

    id: normalizeText(row.id ?? row.key, `smartolt-${index}`),
    key: normalizeText(row.key) || buildMergeKey(row, index),

    oltId,
    olt_id: oltId,
    oltName: directOltName || contextOltLabel || oltLabel,
    olt_name: directOltName || contextOltLabel || oltLabel,
    oltLabel,
    olt_label: oltLabel,
    olt: oltLabel,

    onuId,
    onu_id: onuId,

    serial,
    serialNumber: serial,

    name: normalizeText(
      getFirstField(row, CLIENT_NAME_FIELD_CANDIDATES),
      'SIN NOMBRE',
    ),

    status,
    estado: status,

    signal,
    rxPower: signal,
    signalBand: resolvedSignalBand,
    signal_band: resolvedSignalBand,

    slot,
    tarjeta: slot,
    port,
    puerto: port,

    lastStatusChange:
      row.lastStatusChange ??
      row.last_status_change ??
      row.updatedAt ??
      row.updated_at ??
      row.fechaActualizacion ??
      row.fecha_actualizacion ??
      null,

    source: normalizeText(row.source, 'smartolt'),
    rawKeys: Array.from(
      new Set([
        ...toSafeArray(row.rawKeys),
        ...Object.keys(toSafeObject(row)),
      ]),
    ),
  }
}

function buildMergeKey(row = {}, index = 0) {
  const serial = normalizeText(getFirstField(row, SERIAL_FIELD_CANDIDATES))

  if (serial && normalizeCompare(serial) !== 'N/D') {
    return `SERIAL::${normalizeCompare(serial)}`
  }

  const oltId = normalizeOltIdValue(
    getFirstField(row, OLT_DETAIL_ID_FIELD_CANDIDATES),
  )

  const onuId = normalizeText(getFirstField(row, ONU_ID_FIELD_CANDIDATES))
  const slot = normalizeText(getFirstField(row, SLOT_FIELD_CANDIDATES))
  const port = normalizeText(getFirstField(row, PORT_FIELD_CANDIDATES))

  if (oltId && slot && port && onuId) {
    return `PON_ONU::${normalizeCompare(oltId)}::${normalizeCompare(slot)}::${normalizeCompare(port)}::${normalizeCompare(onuId)}`
  }

  if (oltId && onuId) {
    return `OLT_ONU::${normalizeCompare(oltId)}::${normalizeCompare(onuId)}`
  }

  return `ROW::${normalizeText(row.source, 'smartolt')}::${index}`
}

function preferValue(current, next) {
  if (isUsefulValue(next)) return next
  if (isUsefulValue(current)) return current
  return next || current
}

function preferSignal(current, next) {
  if (Number.isFinite(Number(next))) return next
  if (Number.isFinite(Number(current))) return current
  return null
}

function mergeRows(current = {}, next = {}) {
  const signal = preferSignal(current.signal, next.signal)
  const signalBand = Number.isFinite(Number(signal))
    ? classifySignalBand(signal)
    : preferValue(current.signalBand, next.signalBand) || 'all'

  return {
    ...current,
    ...next,

    key: current.key || next.key,
    id: preferValue(current.id, next.id),

    oltId: preferValue(current.oltId, next.oltId),
    olt_id: preferValue(current.olt_id, next.olt_id),
    oltName: preferValue(current.oltName, next.oltName),
    olt_name: preferValue(current.olt_name, next.olt_name),
    oltLabel: preferValue(current.oltLabel, next.oltLabel),
    olt_label: preferValue(current.olt_label, next.olt_label),
    olt: preferValue(current.olt, next.olt),

    onuId: preferValue(current.onuId, next.onuId),
    onu_id: preferValue(current.onu_id, next.onu_id),

    serial: preferValue(current.serial, next.serial),
    serialNumber: preferValue(current.serialNumber, next.serialNumber),

    name: preferValue(current.name, next.name),

    status: preferValue(current.status, next.status) || 'No reportado',
    estado: preferValue(current.estado, next.estado) || 'No reportado',

    signal,
    rxPower: signal,
    signalBand,
    signal_band: signalBand,

    slot: preferValue(current.slot, next.slot),
    tarjeta: preferValue(current.tarjeta, next.tarjeta),
    port: preferValue(current.port, next.port),
    puerto: preferValue(current.puerto, next.puerto),

    source: Array.from(
      new Set([current.source, next.source].filter(Boolean)),
    ).join('+'),

    rawKeys: Array.from(
      new Set([
        ...toSafeArray(current.rawKeys),
        ...toSafeArray(next.rawKeys),
      ]),
    ),
  }
}

function consolidateRows(sourceRows = [], context = {}) {
  const buckets = new Map()

  sourceRows.flat().forEach((row, index) => {
    const normalized = normalizeSmartOltRow(row, index, context)
    const key = buildMergeKey(normalized, index)
    const current = buckets.get(key)

    buckets.set(key, current ? mergeRows(current, normalized) : normalized)
  })

  return Array.from(buckets.values()).map((row, index) =>
    normalizeSmartOltRow(row, index, context),
  )
}

function getUniqueSerialCount(rows = []) {
  const serials = new Set()

  rows.forEach((row) => {
    const serial = normalizeText(row.serial)

    if (serial && normalizeCompare(serial) !== 'N/D') {
      serials.add(normalizeCompare(serial))
    }
  })

  return serials.size
}

function buildOltCatalogFromRows(rows = []) {
  const buckets = new Map()

  rows.forEach((row) => {
    const oltValues = collectRealOltValues(row)

    if (oltValues.length === 0) return

    const oltId = normalizeOltIdValue(row.oltId ?? row.olt_id ?? oltValues[0])
    const oltLabel = normalizeText(
      row.oltLabel ?? row.olt_label ?? row.oltName ?? row.olt_name ?? row.olt,
      oltId ? `OLT ${oltId}` : 'SIN OLT',
    )

    if (!isUsefulValue(oltId) && !isUsefulValue(oltLabel)) return

    const key = normalizeCompare(oltId || oltLabel)

    if (!key) return

    const current = buckets.get(key) || {
      id: oltId || oltLabel,
      value: oltId || oltLabel,
      label: oltLabel,
      name: oltLabel,
      oltId: oltId || oltLabel,
      oltName: oltLabel,
      oltLabel,
      totalOnus: 0,
    }

    current.totalOnus += 1
    buckets.set(key, current)
  })

  return Array.from(buckets.values()).sort((left, right) =>
    left.label.localeCompare(right.label, 'es', {
      sensitivity: 'base',
    }),
  )
}

function filterRowsBySelectedOlt(rows = [], selectedOlt = '') {
  const selected = normalizeText(selectedOlt)

  if (!selected) return []

  return rows.filter((row) => rowHasExplicitOlt(row) && rowMatchesSelectedOlt(row, selected))
}

function getStatusKey(status = '') {
  const normalized = normalizeCompare(status)

  if (normalized === 'ONLINE' || normalized === 'ACTIVO') return 'online'
  if (normalized === 'OFFLINE') return 'offline'
  if (normalized === 'LOS') return 'los'
  if (normalized.includes('POWER') && normalized.includes('FAIL')) return 'powerFail'
  if (normalized === 'NO REPORTADO' || normalized === 'NULL' || !normalized) return 'noReportado'

  return 'otros'
}

function buildSelectedMeta(rows = []) {
  const slots = new Set()
  const ports = new Set()

  const counters = rows.reduce(
    (acc, row) => {
      const statusKey = getStatusKey(row.status)
      const signalBand = normalizeSignalBand(row.signalBand)

      acc.status[statusKey] = (acc.status[statusKey] || 0) + 1
      acc.signal[signalBand] = (acc.signal[signalBand] || 0) + 1

      const slot = normalizeText(row.slot)
      const port = normalizeText(row.port)

      if (slot && slot !== 'N/D') slots.add(slot)
      if (slot && port && slot !== 'N/D' && port !== 'N/D') {
        ports.add(`${slot}::${port}`)
      }

      return acc
    },
    {
      status: {
        online: 0,
        offline: 0,
        powerFail: 0,
        los: 0,
        noReportado: 0,
        otros: 0,
      },
      signal: {
        'very-good': 0,
        warning: 0,
        critical: 0,
        all: 0,
      },
    },
  )

  return {
    selectedOltRows: rows.length,
    selectedOltUniqueSerials: getUniqueSerialCount(rows),
    selectedOltSlots: slots.size,
    selectedOltPorts: ports.size,
    status: counters.status,
    signal: counters.signal,
  }
}

function matchesStatusFilter(row = {}, statusFilter = '') {
  const filter = normalizeCompare(statusFilter)

  if (!filter) return true

  return normalizeCompare(row.status) === filter
}

function matchesSignalBandFilter(row = {}, signalBandFilter = 'all') {
  const filter = normalizeSignalBand(signalBandFilter)

  if (!filter || filter === 'all') return true

  return normalizeSignalBand(row.signalBand) === filter
}

function findOltOption(olts = [], selectedOlt = '') {
  const selected = normalizeText(selectedOlt)

  if (!selected) return null

  return toSafeArray(olts).find((option) => {
    const values = [
      option.value,
      option.id,
      option.oltId,
      option.olt_id,
      option.oltName,
      option.olt_name,
      option.oltLabel,
      option.olt_label,
      option.label,
      option.name,
    ]

    return valuesMatchSelectedOlt(values, selected)
  }) || null
}

function buildSelectedContext(selectedOlt = '', option = {}) {
  const safeOption = toSafeObject(option)
  const oltId = normalizeText(
    safeOption.oltId ?? safeOption.olt_id ?? safeOption.value ?? safeOption.id,
    normalizeOltIdValue(selectedOlt),
  )

  const oltLabel = normalizeText(
    safeOption.oltLabel ??
      safeOption.olt_label ??
      safeOption.oltName ??
      safeOption.olt_name ??
      safeOption.label ??
      safeOption.name,
    oltId ? `OLT ${oltId}` : 'SIN OLT',
  )

  return {
    oltId,
    oltName: oltLabel,
    oltLabel,
    expectedRows: Number(safeOption.totalOnus ?? safeOption.total ?? safeOption.count ?? 0) || 0,
  }
}

function attachSelectedContext(row = {}, context = {}) {
  return normalizeSmartOltRow(
    {
      ...toSafeObject(row),
      oltId: row.oltId ?? row.olt_id ?? context.oltId,
      olt_id: row.olt_id ?? row.oltId ?? context.oltId,
      oltName: row.oltName ?? row.olt_name ?? context.oltName,
      olt_name: row.olt_name ?? row.oltName ?? context.oltName,
      oltLabel: row.oltLabel ?? row.olt_label ?? context.oltLabel,
      olt_label: row.olt_label ?? row.oltLabel ?? context.oltLabel,
      olt: isUsefulValue(row.olt) ? row.olt : context.oltLabel,
    },
    0,
    context,
  )
}

function filterScopedRows(rows = [], selectedOlt = '', context = {}) {
  const normalizedRows = toSafeArray(rows).map((row, index) =>
    normalizeSmartOltRow(row, index),
  )

  const explicitRows = normalizedRows.filter(rowHasExplicitOlt)

  if (explicitRows.length > 0) {
    return explicitRows
      .filter((row) => rowMatchesSelectedOlt(row, selectedOlt))
      .map((row) => attachSelectedContext(row, context))
  }

  const expectedRows = Number(context.expectedRows || 0)

  if (
    expectedRows > 0 &&
    normalizedRows.length > Math.ceil(expectedRows * SELECTED_OLT_ROW_TOLERANCE)
  ) {
    return []
  }

  return normalizedRows.map((row) => attachSelectedContext(row, context))
}

function buildSelectedRequestParams(filters = {}, paramName = 'olt_id') {
  const params = {
    [paramName]: filters.olt,
  }

  if (filters.status) params.status = filters.status
  if (filters.limit) params.limit = filters.limit

  return params
}

async function requestSelectedSource(path, source, filters = {}, context = {}) {
  if (!path || !filters.olt) {
    return {
      source,
      rows: [],
      warning: null,
    }
  }

  const warnings = []

  for (const paramName of OLT_REQUEST_PARAM_CANDIDATES) {
    try {
      const rawRows = await requestRows(
        path,
        buildSelectedRequestParams(filters, paramName),
      )

      const rows = filterScopedRows(rawRows, filters.olt, context)

      if (rows.length > 0) {
        return {
          source,
          rows: rows.map((row) => ({
            ...row,
            source,
          })),
          warning: null,
        }
      }
    } catch (error) {
      const status = error?.response?.status
      const statusText = error?.response?.statusText
      const message = status
        ? `SmartOLT ${source} respondió HTTP ${status}${statusText ? ` ${statusText}` : ''} usando ${paramName}.`
        : error?.message || `No se pudo consultar SmartOLT ${source} usando ${paramName}.`

      warnings.push(message)
    }
  }

  const message = warnings[0] || `SmartOLT ${source} no devolvió filas para la OLT ${filters.olt}.`

  if (warnings.length > 0) {
    console.warn(`SmartOLT ${source}:`, message)
  }

  return {
    source,
    rows: [],
    warning: {
      source,
      message,
    },
  }
}

function buildAllowedKeySet(rows = []) {
  const keys = new Set()

  rows.forEach((row, index) => {
    const normalized = normalizeSmartOltRow(row, index)
    const key = buildMergeKey(normalized, index)

    if (key) keys.add(key)
  })

  return keys
}

function mergeRowsByKey(sourceRows = [], context = {}, allowedKeys = null) {
  const buckets = new Map()

  sourceRows.flat().forEach((row, index) => {
    const normalized = normalizeSmartOltRow(row, index, context)
    const key = buildMergeKey(normalized, index)

    if (allowedKeys && !allowedKeys.has(key)) return

    const current = buckets.get(key)
    buckets.set(key, current ? mergeRows(current, normalized) : normalized)
  })

  return Array.from(buckets.values()).map((row, index) =>
    normalizeSmartOltRow(row, index, context),
  )
}

async function getConsolidatedSmartOltDataset() {
  const [detailsResult, statusResult, signalsResult] = await Promise.all([
    safeRequestSource(env.SMARTOLT_DETAILS_PATH, 'details'),
    safeRequestSource(env.SMARTOLT_STATUS_PATH, 'status'),
    safeRequestSource(env.SMARTOLT_SIGNALS_PATH, 'signals'),
  ])

  const allRows = consolidateRows([
    detailsResult.rows,
    statusResult.rows,
    signalsResult.rows,
  ])

  const warnings = [detailsResult, statusResult, signalsResult]
    .map((result) => result.warning)
    .filter(Boolean)

  return {
    rows: allRows,
    sourceCounts: {
      details: detailsResult.rows.length,
      status: statusResult.rows.length,
      signals: signalsResult.rows.length,
      merged: allRows.length,
    },
    warnings,
  }
}

async function getCatalogFromSmartOltEndpoint() {
  const collected = []

  for (const path of OLT_LIST_PATH_CANDIDATES) {
    try {
      const rows = await requestRows(path)

      if (rows.length > 0) {
        collected.push(...rows.map(normalizeCatalogOltOption))
        break
      }
    } catch (error) {
      console.warn(`No se pudo consultar catálogo OLT en ${path}:`, error.message)
    }
  }

  return collected
}

function dedupeOltOptions(options = []) {
  const buckets = new Map()

  options.forEach((option) => {
    const value = normalizeText(option.value ?? option.oltId ?? option.id)
    const label = normalizeText(option.label ?? option.oltLabel ?? option.oltName)

    if (!value || !label) return

    const key = normalizeCompare(value)

    const current = buckets.get(key)

    if (!current) {
      buckets.set(key, {
        ...option,
        id: value,
        value,
        label,
        name: label,
        oltId: option.oltId || value,
        oltName: option.oltName || label,
        oltLabel: option.oltLabel || label,
        totalOnus: Number(option.totalOnus ?? 0) || 0,
      })
      return
    }

    buckets.set(key, {
      ...current,
      totalOnus: Math.max(
        Number(current.totalOnus ?? 0) || 0,
        Number(option.totalOnus ?? 0) || 0,
      ),
    })
  })

  return Array.from(buckets.values()).sort((left, right) =>
    left.label.localeCompare(right.label, 'es', {
      sensitivity: 'base',
    }),
  )
}

function normalizeFilters(filters = {}) {
  return {
    olt: normalizeText(filters.olt),
    status: normalizeText(filters.status),
    signalBand: normalizeSignalBand(filters.signalBand || 'all'),
    limit: clampLimit(filters.limit, DEFAULT_LIMIT),
  }
}

async function getSmartOltOlts() {
  const [catalogRows, dataset] = await Promise.all([
    getCatalogFromSmartOltEndpoint(),
    getConsolidatedSmartOltDataset(),
  ])

  const computedCatalog = buildOltCatalogFromRows(dataset.rows)

  return dedupeOltOptions([
    ...catalogRows,
    ...computedCatalog,
  ])
}

async function getSelectedOltRows(normalizedFilters = {}, olts = []) {
  const selectedOption = findOltOption(olts, normalizedFilters.olt)
  const context = buildSelectedContext(normalizedFilters.olt, selectedOption)

  const [detailsResult, statusResult, signalsResult] = await Promise.all([
    requestSelectedSource(env.SMARTOLT_DETAILS_PATH, 'details', normalizedFilters, context),
    requestSelectedSource(env.SMARTOLT_STATUS_PATH, 'status', normalizedFilters, context),
    requestSelectedSource(env.SMARTOLT_SIGNALS_PATH, 'signals', normalizedFilters, context),
  ])

  const detailRows = toSafeArray(detailsResult.rows)
  const allowedKeys = detailRows.length > 0 ? buildAllowedKeySet(detailRows) : null

  const rows = mergeRowsByKey(
    [
      detailRows,
      toSafeArray(statusResult.rows),
      toSafeArray(signalsResult.rows),
    ],
    context,
    allowedKeys,
  )

  const warnings = [detailsResult, statusResult, signalsResult]
    .map((result) => result.warning)
    .filter(Boolean)

  return {
    rows,
    warnings,
    context,
  }
}

async function getSmartOltDashboard(filters = {}) {
  const normalizedFilters = normalizeFilters(filters)

  if (!normalizedFilters.olt) {
    return {
      rows: [],
      olts: await getSmartOltOlts(),
      meta: {
        generatedAt: new Date().toISOString(),
        selectedOlt: '',
        limit: normalizedFilters.limit,
        limitApplied: normalizedFilters.limit,
        truncated: false,
        visibleRows: 0,
        filteredRows: 0,
        totalMergedRows: 0,
        distinctOlts: 0,
        sourceCounts: {},
        warnings: [],
      },
    }
  }

  const dataset = await getConsolidatedSmartOltDataset()
  const computedOlts = buildOltCatalogFromRows(dataset.rows)
  const catalogRows = await getCatalogFromSmartOltEndpoint()
  const olts = dedupeOltOptions([
    ...catalogRows,
    ...computedOlts,
  ])

  const selectedRowsFromDataset = filterRowsBySelectedOlt(
    dataset.rows,
    normalizedFilters.olt,
  )

  let selectedRowsRaw = selectedRowsFromDataset
  let scopedWarnings = []
  let scopedContext = buildSelectedContext(
    normalizedFilters.olt,
    findOltOption(olts, normalizedFilters.olt),
  )

  if (selectedRowsRaw.length === 0) {
    const selectedResult = await getSelectedOltRows(normalizedFilters, olts)
    selectedRowsRaw = selectedResult.rows
    scopedWarnings = selectedResult.warnings
    scopedContext = selectedResult.context
  }

  const selectedRows = selectedRowsRaw.map((row, index) =>
    normalizeSmartOltRow(row, index, scopedContext),
  )

  const selectedMeta = buildSelectedMeta(selectedRows)

  const filteredRows = selectedRows
    .filter((row) => matchesStatusFilter(row, normalizedFilters.status))
    .filter((row) => matchesSignalBandFilter(row, normalizedFilters.signalBand))

  const limitedRows = filteredRows.slice(0, normalizedFilters.limit)
  const truncated = filteredRows.length > limitedRows.length
  const warnings = [
    ...toSafeArray(dataset.warnings),
    ...toSafeArray(scopedWarnings),
  ]

  return {
    rows: limitedRows,
    olts,
    meta: {
      generatedAt: new Date().toISOString(),
      selectedOlt: normalizedFilters.olt,
      selectedOltLabel: scopedContext.oltLabel,
      limit: normalizedFilters.limit,
      limitApplied: normalizedFilters.limit,
      truncated,
      visibleRows: limitedRows.length,
      filteredRows: filteredRows.length,
      totalMergedRows: dataset.rows.length,
      distinctOlts: olts.length,
      sourceCounts: dataset.sourceCounts,
      warnings,
      ...selectedMeta,
    },
  }
}

module.exports = {
  getSmartOltDashboard,
  getSmartOltOlts,
}