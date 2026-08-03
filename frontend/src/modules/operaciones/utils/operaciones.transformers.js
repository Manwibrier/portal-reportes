// src/modules/operaciones/utils/operaciones.transformers.js

import {
  buildSmartOltKey,
  classifySignalBand,
  ensureArray,
  getField,
  normalizeCompare,
  normalizeNumber,
  normalizeStatus,
  normalizeText,
} from './operaciones.helpers.js'

const DEFAULT_OLT_LABEL = 'SIN OLT'
const DEFAULT_STATUS = 'No reportado'
const DEFAULT_TEXT = 'N/D'

const STATUS_FIELD_CANDIDATES = [
  'status',
  'estado',
  'estatus',
  'onu_status',
  'onuStatus',
  'last_status',
  'lastStatus',
  'oper_status',
  'operStatus',
  'operational_status',
  'operationalStatus',
  'state',
]

const SIGNAL_FIELD_CANDIDATES = [
  'signal',
  'rxPower',
  'rx_power',
  'rxSignal',
  'rx_signal',
  'rx',
  'power',
  'potencia',
  'onu_signal',
  'onuSignal',
  'onuRx',
  'onu_rx',
  'onuRxPower',
  'onu_rx_power',
  'rxPowerDbm',
  'rx_power_dbm',
  'optical_power',
  'received_power',
  'fiber_signal',
  'dbm',
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

const OLT_NAME_FIELD_CANDIDATES = [
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

const OLT_FALLBACK_FIELD_CANDIDATES = [
  'oltLabel',
  'olt_label',
  'oltName',
  'olt_name',
  'olt',
  'oltId',
  'olt_id',
  'idOlt',
  'id_olt',
]

const ONU_ID_FIELD_CANDIDATES = [
  'onuId',
  'onu_id',
  'onu',
  'idOnu',
  'id_onu',
  'id',
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

const NAME_FIELD_CANDIDATES = [
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

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function getNestedValue(row = {}, path = '') {
  if (!path.includes('.')) {
    return getField(row, [path])
  }

  return path.split('.').reduce((current, key) => {
    if (!isPlainObject(current)) return undefined
    return current[key]
  }, row)
}

function getFirstField(row = {}, candidates = []) {
  for (const candidate of ensureArray(candidates)) {
    const value = getNestedValue(row, candidate)

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function parseSignalValue(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

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

function resolveSignalValue(row = {}) {
  const directValue = getFirstField(row, SIGNAL_FIELD_CANDIDATES)
  const parsedDirectValue = parseSignalValue(directValue)

  if (Number.isFinite(parsedDirectValue)) {
    return parsedDirectValue
  }

  for (const [key, value] of Object.entries(row || {})) {
    if (isPlainObject(value)) continue

    const normalizedKey = normalizeCompare(key)

    const looksLikeSignalField =
      normalizedKey.includes('SIGNAL') ||
      normalizedKey.includes('RX') ||
      normalizedKey.includes('POWER') ||
      normalizedKey.includes('DBM') ||
      normalizedKey.includes('POTENCIA')

    if (!looksLikeSignalField) continue

    const parsedValue = parseSignalValue(value)

    if (Number.isFinite(parsedValue)) {
      return parsedValue
    }
  }

  return null
}

function normalizeDisplayStatus(value) {
  const normalized = normalizeCompare(value)

  if (!normalized || normalized === 'NULL' || normalized === 'NULO') {
    return DEFAULT_STATUS
  }

  if (normalized === 'LOS') return 'LOS'

  if (normalized.includes('POWER') && normalized.includes('FAIL')) {
    return 'Power Fail'
  }

  if (normalized.includes('OFFLINE')) return 'Offline'
  if (normalized.includes('ONLINE')) return 'Online'
  if (normalized.includes('ACTIVE') || normalized.includes('ACTIVO')) return 'Activo'
  if (normalized.includes('INACTIVE') || normalized.includes('INACTIVO')) return 'Inactivo'

  return normalizeStatus(value, DEFAULT_STATUS)
}

function normalizeSignalBandValue(value, signal) {
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

  if (Number.isFinite(signal)) {
    return classifySignalBand(signal)
  }

  return 'all'
}

function normalizeOltNumber(value = '') {
  const text = normalizeText(value)

  if (/^\d+$/.test(text)) {
    return text
  }

  const oltNumberMatch = text.match(/^OLT[\s-]*(\d+)$/i)

  return oltNumberMatch?.[1] || ''
}

function normalizeOltIdValue(value = '') {
  const numberValue = normalizeOltNumber(value)

  return numberValue || normalizeText(value)
}

function collectFieldValues(row = {}, candidates = []) {
  return ensureArray(candidates)
    .map((candidate) => getNestedValue(row, candidate))
    .map((value) => normalizeText(value))
    .filter(Boolean)
}

function collectExplicitOltValues(row = {}) {
  return [
    ...collectFieldValues(row, OLT_DETAIL_ID_FIELD_CANDIDATES),
    ...collectFieldValues(row, OLT_NAME_FIELD_CANDIDATES),
  ]
}

function valuesMatchSelectedOlt(values = [], selectedOlt = '') {
  const selectedText = normalizeText(selectedOlt)
  const selectedKey = normalizeCompare(selectedText)
  const selectedNumber = normalizeOltNumber(selectedText)

  if (!selectedKey) return true

  return ensureArray(values).some((value) => {
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

function rawRowMatchesSelectedOlt(row = {}, selectedOlt = '') {
  const selected = normalizeText(selectedOlt)

  if (!selected) return true

  const explicitValues = collectExplicitOltValues(row)

  if (explicitValues.length === 0) {
    return true
  }

  return valuesMatchSelectedOlt(explicitValues, selected)
}

function filterRawRowsBySelectedOlt(rows = [], selectedOlt = '') {
  const selected = normalizeText(selectedOlt)

  if (!selected) return ensureArray(rows)

  return ensureArray(rows).filter((row) =>
    rawRowMatchesSelectedOlt(row, selected),
  )
}

export function normalizeSignalBandLabel(value = '') {
  const normalized = normalizeCompare(value)

  if (normalized === 'VERY-GOOD' || normalized === 'VERY GOOD') {
    return 'Muy buena'
  }

  if (normalized === 'WARNING') {
    return 'Advertencia'
  }

  if (normalized === 'CRITICAL') {
    return 'Crítica'
  }

  if (normalized === 'ALL' || !normalized) {
    return 'Sin lectura'
  }

  return normalizeText(value, 'Sin lectura')
}

function normalizeOltId(row = {}, fallbackOlt = '') {
  const directId = normalizeOltIdValue(
    getFirstField(row, OLT_DETAIL_ID_FIELD_CANDIDATES),
  )

  if (directId) return directId

  const fallback = normalizeOltIdValue(fallbackOlt)

  if (fallback) return fallback

  return ''
}

function normalizeOltName(row = {}, oltId = '') {
  const directName = normalizeText(getFirstField(row, OLT_NAME_FIELD_CANDIDATES))

  if (directName && directName !== oltId) {
    return directName
  }

  const fallback = normalizeText(getFirstField(row, OLT_FALLBACK_FIELD_CANDIDATES))

  if (fallback && fallback !== oltId && !/^\d+$/.test(fallback)) {
    return fallback
  }

  if (oltId) {
    return `OLT ${oltId}`
  }

  return DEFAULT_OLT_LABEL
}

function normalizeOltLabel(row = {}, oltId = '', oltName = '') {
  const directLabel = normalizeText(
    getFirstField(row, [
      'oltLabel',
      'olt_label',
      'oltDisplayName',
      'olt_display_name',
      'oltFullName',
      'olt_full_name',
      'olt.label',
      'olt_info.label',
      'oltInfo.label',
    ]),
  )

  if (directLabel) return directLabel
  if (oltName && oltName !== DEFAULT_OLT_LABEL) return oltName
  if (oltId) return `OLT ${oltId}`

  return DEFAULT_OLT_LABEL
}

export function normalizeOltKey(value = '') {
  return normalizeCompare(value)
}

function normalizeOltSelectionValue(row = {}) {
  return normalizeText(
    row.oltKey ??
      row.oltId ??
      row.olt_id ??
      row.oltLabel ??
      row.olt_label ??
      row.oltName ??
      row.olt_name ??
      row.olt,
  )
}

function matchesOlt(row = {}, selectedOlt = '') {
  const selected = normalizeText(selectedOlt)

  if (!selected) return true

  return valuesMatchSelectedOlt(
    [
      row.oltKey,
      row.oltId,
      row.olt_id,
      row.oltName,
      row.olt_name,
      row.oltLabel,
      row.olt_label,
      row.olt,
    ],
    selected,
  )
}

function normalizeDashboardRow(row = {}, index = 0) {
  const zona = normalizeText(row.zona, 'SIN ZONA')
  const franquicia = normalizeText(row.franquicia, 'SIN FRANQUICIA')
  const servicio = normalizeText(row.servicio, 'SIN SERVICIO')

  return {
    ...row,
    id: normalizeText(
      row.id ?? row.key ?? `${zona}-${franquicia}-${servicio}-${index}`,
      `dashboard-row-${index}`,
    ),
    zona,
    franquicia,
    servicio,
    totalClientesActivos: normalizeNumber(
      row.totalClientesActivos ?? row.total_clientes_activos,
    ),
    totalClientesCortados: normalizeNumber(
      row.totalClientesCortados ?? row.total_clientes_cortados,
    ),
    totalClientesPorCortar: normalizeNumber(
      row.totalClientesPorCortar ?? row.total_clientes_por_cortar,
    ),
    totalClientesExonerados: normalizeNumber(
      row.totalClientesExonerados ?? row.total_clientes_exonerados,
    ),
    totalVenta: normalizeNumber(row.totalVenta ?? row.total_venta),
    totalInstalacionesFinalizadas: normalizeNumber(
      row.totalInstalacionesFinalizadas ?? row.total_instalaciones_finalizadas,
    ),
    totalInstalacionesPendientes: normalizeNumber(
      row.totalInstalacionesPendientes ?? row.total_instalaciones_pendientes,
    ),
    totalReclamosFinalizados: normalizeNumber(
      row.totalReclamosFinalizados ?? row.total_reclamos_finalizados,
    ),
    efectividadInstalacionPct: normalizeNumber(
      row.efectividadInstalacionPct ?? row.efectividad_instalacion_pct,
    ),
    tasaCortePct: normalizeNumber(row.tasaCortePct ?? row.tasa_corte_pct),
    churnRateOperacionalPct: normalizeNumber(
      row.churnRateOperacionalPct ?? row.churn_rate_operacional_pct,
    ),
  }
}

export function buildDashboard(rows = []) {
  return ensureArray(rows).map(normalizeDashboardRow)
}

function normalizeSmartOltRow(row = {}, index = 0, fallbackOlt = '') {
  const signal = resolveSignalValue(row)
  const status = normalizeDisplayStatus(
    getFirstField(row, STATUS_FIELD_CANDIDATES) ?? row.status,
  )

  const signalBand = normalizeSignalBandValue(
    getFirstField(row, [
      'signalBand',
      'signal_band',
      'powerBucket',
      'power_bucket',
      'band',
    ]) ?? row.signalBand,
    signal,
  )

  const oltId = normalizeOltId(row, fallbackOlt)
  const oltName = normalizeOltName(row, oltId)
  const oltLabel = normalizeOltLabel(row, oltId, oltName)
  const oltKey = normalizeText(oltId || oltLabel || oltName || fallbackOlt)

  const serial = normalizeText(
    getFirstField(row, SERIAL_FIELD_CANDIDATES),
    DEFAULT_TEXT,
  )

  const onuId = normalizeText(
    getFirstField(row, ONU_ID_FIELD_CANDIDATES),
    DEFAULT_TEXT,
  )

  const slot = normalizeText(
    getFirstField(row, SLOT_FIELD_CANDIDATES),
    DEFAULT_TEXT,
  )

  const port = normalizeText(
    getFirstField(row, PORT_FIELD_CANDIDATES),
    DEFAULT_TEXT,
  )

  return {
    ...row,
    key: normalizeText(row.key) || buildSmartOltKey({
      ...row,
      serial,
      olt: oltLabel,
      onuId,
    }),
    id: normalizeText(row.id ?? row.key, `smartolt-${index}`),

    oltKey,
    oltId,
    olt_id: oltId,
    oltName,
    olt_name: oltName,
    oltLabel,
    olt_label: oltLabel,
    olt: oltLabel,

    onuId,
    onu_id: onuId,

    serial,
    serialNumber: serial,

    name: normalizeText(
      getFirstField(row, NAME_FIELD_CANDIDATES),
      'SIN NOMBRE',
    ),

    status,
    estado: status,

    signal,
    rxPower: signal,
    signalBand,
    signal_band: signalBand,
    signalBandLabel: normalizeSignalBandLabel(signalBand),

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

    rawKeys: ensureArray(row.rawKeys).length > 0
      ? row.rawKeys
      : Object.keys(row || {}),
  }
}

export function transformSmartOlt(rows = [], fallbackOlt = '') {
  const filteredRows = filterRawRowsBySelectedOlt(rows, fallbackOlt)

  return filteredRows.map((row, index) =>
    normalizeSmartOltRow(row, index, fallbackOlt),
  )
}

function normalizeOrdenServicioRow(row = {}, index = 0) {
  const id = normalizeText(
    getFirstField(row, ['id', 'idOrden', 'id_orden', 'ordenId', 'orden_id']),
    `ORD-${index + 1}`,
  )

  const estado = normalizeText(
    getFirstField(row, ['estado', 'estatus', 'status', 'ordenStatus', 'orden_status']),
    'SIN ESTADO',
  )

  const fechaCreacion =
    row.fechaCreacion ??
    row.fecha_creacion ??
    row.createdAt ??
    row.created_at ??
    null

  const fechaCompromiso =
    row.fechaCompromiso ??
    row.fecha_compromiso ??
    row.dueAt ??
    row.due_at ??
    row.fecha_vencimiento ??
    null

  return {
    ...row,
    id,
    idOrden: id,
    id_orden: id,
    estado,
    estatus: estado,
    status: estado,
    cliente: normalizeText(
      getFirstField(row, [
        'cliente',
        'nombreCliente',
        'nombre_cliente',
        'clientName',
        'name',
      ]),
      'SIN CLIENTE',
    ),
    serial: normalizeText(
      getFirstField(row, [
        'serial',
        'serialNumber',
        'serial_number',
        'onuSerial',
        'onu_serial',
        'sn',
      ]),
      DEFAULT_TEXT,
    ),
    olt: normalizeText(
      getFirstField(row, ['olt', 'oltName', 'olt_name']),
      DEFAULT_TEXT,
    ),
    tarjeta: normalizeText(
      getFirstField(row, ['tarjeta', 'slot', 'board', 'card']),
      DEFAULT_TEXT,
    ),
    puerto: normalizeText(
      getFirstField(row, ['puerto', 'port', 'pon', 'pon_port']),
      DEFAULT_TEXT,
    ),
    tecnico: normalizeText(
      getFirstField(row, ['tecnico', 'asignadoA', 'assignedTo', 'assigned_to']),
      'SIN ASIGNAR',
    ),
    zona: normalizeText(row.zona, 'SIN ZONA'),
    franquicia: normalizeText(row.franquicia, 'SIN FRANQUICIA'),
    servicio: normalizeText(row.servicio, 'SIN SERVICIO'),
    fechaCreacion,
    fecha_creacion: fechaCreacion,
    fechaCompromiso,
    fecha_compromiso: fechaCompromiso,
  }
}

export function transformOrdenesServicio(rows = []) {
  return ensureArray(rows).map(normalizeOrdenServicioRow)
}

function buildDistribution(rows = [], resolver, fallbackLabel = 'SIN DATO') {
  const buckets = new Map()

  ensureArray(rows).forEach((row) => {
    const label = normalizeText(resolver(row), fallbackLabel)
    const key = label.toLowerCase()

    const current = buckets.get(key) || {
      id: key || fallbackLabel.toLowerCase(),
      key: key || fallbackLabel.toLowerCase(),
      label,
      name: label,
      value: 0,
      count: 0,
      total: 0,
    }

    current.value += 1
    current.count += 1
    current.total += 1

    buckets.set(key, current)
  })

  return Array.from(buckets.values()).sort((left, right) => {
    if (right.value !== left.value) return right.value - left.value

    return left.label.localeCompare(right.label, 'es', {
      sensitivity: 'base',
    })
  })
}

export function buildStatusDistribution(rows = [], fieldName = 'status') {
  return buildDistribution(
    rows,
    (row) => row?.[fieldName] ?? row?.status ?? row?.estado ?? row?.estatus,
    DEFAULT_STATUS,
  )
}

export function buildOrderStatusDistribution(rows = []) {
  return buildDistribution(
    rows,
    (row) =>
      row?.estado ??
      row?.estatus ??
      row?.status ??
      row?.ordenStatus ??
      row?.orden_status,
    'SIN ESTADO',
  )
}

export function buildOltCatalog(rows = []) {
  const buckets = new Map()

  transformSmartOlt(rows).forEach((row) => {
    const value = normalizeOltSelectionValue(row)
    const key = normalizeOltKey(value)

    if (!key) return

    const current = buckets.get(key) || {
      key,
      id: row.oltId || value,
      value,
      label: row.oltLabel || row.oltName || value,
      name: row.oltLabel || row.oltName || value,
      oltId: row.oltId || value,
      oltName: row.oltName || row.oltLabel || value,
      oltLabel: row.oltLabel || row.oltName || value,
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

export function filterRowsByOlt(rows = [], selectedOlt = '') {
  const selected = normalizeText(selectedOlt)
  const transformedRows = transformSmartOlt(rows, selected)

  if (!selected) {
    return transformedRows
  }

  return transformedRows.filter((row) => matchesOlt(row, selected))
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

export function buildSlotPortOccupancy(rows = []) {
  const buckets = new Map()

  ensureArray(rows).forEach((row, index) => {
    const normalizedRow = normalizeSmartOltRow(row, index)
    const slot = normalizeText(normalizedRow.slot, DEFAULT_TEXT)
    const port = normalizeText(normalizedRow.port, DEFAULT_TEXT)
    const key = `${slot}::${port}`

    const current = buckets.get(key) || {
      id: key,
      key,
      slot,
      tarjeta: slot,
      port,
      puerto: port,
      name: `T${slot} / P${port}`,
      clientes: 0,
      onus: 0,
      value: 0,
      total: 0,
      online: 0,
      offline: 0,
      powerFail: 0,
      los: 0,
      noReportado: 0,
      critical: 0,
      warning: 0,
      veryGood: 0,
      withoutSignal: 0,
      averageSignal: null,
      signalTotal: 0,
      signalCount: 0,
      clients: [],
    }

    const statusKey = getStatusKey(normalizedRow.status)
    const signalBand = normalizedRow.signalBand

    current.clientes += 1
    current.onus += 1
    current.value += 1
    current.total += 1

    if (statusKey === 'online') current.online += 1
    else if (statusKey === 'offline') current.offline += 1
    else if (statusKey === 'powerFail') current.powerFail += 1
    else if (statusKey === 'los') current.los += 1
    else if (statusKey === 'noReportado') current.noReportado += 1

    if (signalBand === 'critical') current.critical += 1
    else if (signalBand === 'warning') current.warning += 1
    else if (signalBand === 'very-good') current.veryGood += 1
    else current.withoutSignal += 1

    if (Number.isFinite(normalizedRow.signal)) {
      current.signalTotal += normalizedRow.signal
      current.signalCount += 1
      current.averageSignal = current.signalTotal / current.signalCount
    }

    current.clients.push(normalizedRow)
    buckets.set(key, current)
  })

  return Array.from(buckets.values()).sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total

    const leftSlot = Number(left.slot)
    const rightSlot = Number(right.slot)

    if (Number.isFinite(leftSlot) && Number.isFinite(rightSlot) && leftSlot !== rightSlot) {
      return leftSlot - rightSlot
    }

    const leftPort = Number(left.port)
    const rightPort = Number(right.port)

    if (Number.isFinite(leftPort) && Number.isFinite(rightPort) && leftPort !== rightPort) {
      return leftPort - rightPort
    }

    return left.name.localeCompare(right.name, 'es', {
      sensitivity: 'base',
    })
  })
}

export function buildSignalSummary(rows = []) {
  const transformedRows = ensureArray(rows).map((row, index) =>
    normalizeSmartOltRow(row, index),
  )

  const validSignals = transformedRows
    .map((row) => row.signal)
    .filter((signal) => Number.isFinite(signal))

  const totalSignal = validSignals.reduce((acc, value) => acc + value, 0)
  const averageSignal = validSignals.length > 0
    ? totalSignal / validSignals.length
    : null

  const summary = transformedRows.reduce(
    (acc, row) => {
      if (row.signalBand === 'very-good') acc.veryGood += 1
      else if (row.signalBand === 'warning') acc.warning += 1
      else if (row.signalBand === 'critical') acc.critical += 1
      else acc.withoutSignal += 1

      return acc
    },
    {
      veryGood: 0,
      warning: 0,
      critical: 0,
      withoutSignal: 0,
    },
  )

  return {
    ...summary,
    averageSignal,
    validSignals: validSignals.length,
    totalOnus: transformedRows.length,
  }
}

export function buildOperationalStatusSummary(rows = []) {
  const transformedRows = ensureArray(rows).map((row, index) =>
    normalizeSmartOltRow(row, index),
  )

  return transformedRows.reduce(
    (acc, row) => {
      const key = getStatusKey(row.status)
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {
      online: 0,
      offline: 0,
      powerFail: 0,
      los: 0,
      noReportado: 0,
      otros: 0,
    },
  )
}

function buildClientAlertRows(rows = [], band, limit = 50) {
  return ensureArray(rows)
    .map((row, index) => normalizeSmartOltRow(row, index))
    .filter((row) => row.signalBand === band)
    .sort((left, right) => {
      const leftSignal = Number.isFinite(left.signal) ? left.signal : 999
      const rightSignal = Number.isFinite(right.signal) ? right.signal : 999

      return leftSignal - rightSignal
    })
    .slice(0, limit)
    .map((row, index) => ({
      id: row.key || `${band}-${index}`,
      name: row.name,
      cliente: row.name,
      serial: row.serial,
      olt: row.olt,
      oltId: row.oltId,
      oltName: row.oltName,
      oltLabel: row.oltLabel,
      onuId: row.onuId,
      slot: row.slot,
      port: row.port,
      status: row.status,
      signal: row.signal,
      signalBand: row.signalBand,
      label: `${row.name} - ${row.signal ?? 'N/D'} dBm`,
      raw: row,
    }))
}

export function buildCriticalClients(rows = [], limit = 50) {
  return buildClientAlertRows(rows, 'critical', limit)
}

export function buildWarningClients(rows = [], limit = 50) {
  return buildClientAlertRows(rows, 'warning', limit)
}

function buildStatusCards(statusSummary = {}) {
  return [
    {
      key: 'online',
      label: 'Online',
      value: statusSummary.online || 0,
      tone: 'success',
    },
    {
      key: 'offline',
      label: 'Offline',
      value: statusSummary.offline || 0,
      tone: 'danger',
    },
    {
      key: 'powerFail',
      label: 'Power Fail',
      value: statusSummary.powerFail || 0,
      tone: 'warning',
    },
    {
      key: 'los',
      label: 'LOS',
      value: statusSummary.los || 0,
      tone: 'danger',
    },
    {
      key: 'noReportado',
      label: 'No reportado',
      value: statusSummary.noReportado || 0,
      tone: 'neutral',
    },
  ]
}

function buildSignalCards(signalSummary = {}) {
  return [
    {
      key: 'veryGood',
      label: 'Muy buena',
      value: signalSummary.veryGood || 0,
      tone: 'success',
    },
    {
      key: 'warning',
      label: 'Advertencia',
      value: signalSummary.warning || 0,
      tone: 'warning',
    },
    {
      key: 'critical',
      label: 'Crítica',
      value: signalSummary.critical || 0,
      tone: 'danger',
    },
    {
      key: 'withoutSignal',
      label: 'Sin lectura',
      value: signalSummary.withoutSignal || 0,
      tone: 'neutral',
    },
  ]
}

export function buildOltSummary(rows = [], selectedOlt = '') {
  const selectedOltValue = normalizeText(selectedOlt)
  const oltRows = selectedOltValue
    ? filterRowsByOlt(rows, selectedOltValue)
    : transformSmartOlt(rows)

  const catalog = buildOltCatalog(oltRows)
  const selectedCatalogItem = catalog[0]

  const signalSummary = buildSignalSummary(oltRows)
  const operationalStatus = buildOperationalStatusSummary(oltRows)
  const occupancyBySlotPort = buildSlotPortOccupancy(oltRows)

  const statusDistribution = [
    {
      id: 'online',
      key: 'online',
      label: 'Online',
      name: 'Online',
      value: operationalStatus.online,
      colorToken: 'success',
    },
    {
      id: 'offline',
      key: 'offline',
      label: 'Offline',
      name: 'Offline',
      value: operationalStatus.offline,
      colorToken: 'danger',
    },
    {
      id: 'powerFail',
      key: 'powerFail',
      label: 'Power Fail',
      name: 'Power Fail',
      value: operationalStatus.powerFail,
      colorToken: 'warning',
    },
    {
      id: 'los',
      key: 'los',
      label: 'LOS',
      name: 'LOS',
      value: operationalStatus.los,
      colorToken: 'danger',
    },
    {
      id: 'noReportado',
      key: 'noReportado',
      label: 'No reportado',
      name: 'No reportado',
      value: operationalStatus.noReportado,
      colorToken: 'neutral',
    },
    {
      id: 'otros',
      key: 'otros',
      label: 'Otros',
      name: 'Otros',
      value: operationalStatus.otros,
      colorToken: 'neutral',
    },
  ].filter((item) => item.value > 0)

  const signalBandDistribution = [
    {
      id: 'veryGood',
      key: 'veryGood',
      label: 'Muy buena',
      name: 'Muy buena',
      value: signalSummary.veryGood,
      colorToken: 'success',
    },
    {
      id: 'warning',
      key: 'warning',
      label: 'Advertencia',
      name: 'Advertencia',
      value: signalSummary.warning,
      colorToken: 'warning',
    },
    {
      id: 'critical',
      key: 'critical',
      label: 'Crítica',
      name: 'Crítica',
      value: signalSummary.critical,
      colorToken: 'danger',
    },
    {
      id: 'withoutSignal',
      key: 'withoutSignal',
      label: 'Sin lectura',
      name: 'Sin lectura',
      value: signalSummary.withoutSignal,
      colorToken: 'neutral',
    },
  ].filter((item) => item.value > 0)

  const tarjetas = new Set(
    oltRows
      .map((row) => normalizeText(row.slot))
      .filter((slot) => slot && slot !== DEFAULT_TEXT),
  )

  const puertos = new Set(
    oltRows
      .map((row) => {
        const slot = normalizeText(row.slot)
        const port = normalizeText(row.port)

        if (!slot || !port || slot === DEFAULT_TEXT || port === DEFAULT_TEXT) {
          return ''
        }

        return `${slot}::${port}`
      })
      .filter(Boolean),
  )

  const firstRow = oltRows[0] || {}
  const resolvedOltId =
    selectedOltValue ||
    selectedCatalogItem?.oltId ||
    selectedCatalogItem?.value ||
    firstRow.oltId ||
    ''

  const resolvedOltLabel =
    selectedCatalogItem?.oltLabel ||
    selectedCatalogItem?.label ||
    firstRow.oltLabel ||
    firstRow.oltName ||
    (resolvedOltId ? `OLT ${resolvedOltId}` : DEFAULT_OLT_LABEL)

  const resolvedOltName =
    selectedCatalogItem?.oltName ||
    selectedCatalogItem?.label ||
    firstRow.oltName ||
    resolvedOltLabel

  return {
    oltKey: normalizeOltKey(resolvedOltId || resolvedOltLabel),
    oltId: resolvedOltId || DEFAULT_OLT_LABEL,
    oltName: resolvedOltName,
    oltLabel: resolvedOltLabel,

    totalOnus: oltRows.length,
    totalClientes: oltRows.length,

    tarjetas: tarjetas.size,
    puertos: puertos.size,

    online: operationalStatus.online || 0,
    offline: operationalStatus.offline || 0,
    powerFail: operationalStatus.powerFail || 0,
    los: operationalStatus.los || 0,
    noReportado: operationalStatus.noReportado || 0,
    otros: operationalStatus.otros || 0,

    veryGood: signalSummary.veryGood,
    warning: signalSummary.warning,
    critical: signalSummary.critical,
    withoutSignal: signalSummary.withoutSignal,
    averageSignal: signalSummary.averageSignal,
    validSignals: signalSummary.validSignals,

    operationalStatus,
    signalQuality: signalSummary,
    statusCards: buildStatusCards(operationalStatus),
    signalCards: buildSignalCards(signalSummary),

    occupancyBySlotPort,
    statusDistribution,
    signalBandDistribution,

    criticalClients: buildCriticalClients(oltRows),
    warningClients: buildWarningClients(oltRows),

    rows: oltRows,
    catalog,
  }
}