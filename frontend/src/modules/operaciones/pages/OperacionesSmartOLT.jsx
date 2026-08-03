// src/modules/operaciones/pages/OperacionesSmartOLT.jsx

import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../../components/ModulePage'
import {
  OperacionesCapacityChart,
  OperacionesStatusDonut,
} from '../components'
import {
  getOperacionesSmartOLT,
  getOperacionesSmartOLTs,
} from '../services/operaciones.service.js'

const DEFAULT_TEXT = 'N/D'
const DEFAULT_LOCALE = 'es-VE'
const DEFAULT_SMARTOLT_LIMIT = 5000

const SIGNAL_BANDS = {
  VERY_GOOD: 'very-good',
  WARNING: 'warning',
  CRITICAL: 'critical',
  WITHOUT_SIGNAL: 'without-signal',
}

const STATUS_LABELS = {
  online: 'Online',
  offline: 'Offline',
  powerFail: 'Power Fail',
  los: 'LOS',
  noReportado: 'No reportado',
  otros: 'Otros',
}

const SIGNAL_LABELS = {
  veryGood: 'Muy buena',
  warning: 'Advertencia',
  critical: 'Crítica',
  withoutSignal: 'Sin lectura',
}

const EXPORT_MIME_TYPE = 'application/vnd.ms-excel;charset=utf-8;'

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

function normalizeCompare(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function toSafeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const normalizedValue = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '')
    .trim()

  if (!normalizedValue) return fallback

  const numericValue = Number(normalizedValue)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalizedValue = String(value)
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '')
    .trim()

  if (!normalizedValue) return null

  const numericValue = Number(normalizedValue)

  return Number.isFinite(numericValue) ? numericValue : null
}

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(toSafeNumber(value))
}

function formatNullableNumber(value, decimals = 2) {
  const numericValue = toNullableNumber(value)

  if (numericValue === null) return DEFAULT_TEXT

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue)
}

function sortNatural(leftValue, rightValue) {
  const leftNumber = Number(leftValue)
  const rightNumber = Number(rightValue)

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber
  }

  return normalizeText(leftValue).localeCompare(normalizeText(rightValue), 'es', {
    numeric: true,
    sensitivity: 'base',
  })
}

function buildRowKey(row = {}, index = 0) {
  const source = ensureObject(row)

  return normalizeText(
    source.key ??
      source.id ??
      `${source.olt || 'olt'}-${source.slot || 'slot'}-${source.port || 'port'}-${source.onuId || source.onu || index}`,
    `smartolt-row-${index}`,
  )
}

function getRowOltValue(row = {}) {
  return normalizeText(
    row.oltId ??
      row.olt_id ??
      row.olt ??
      row.oltName ??
      row.olt_name ??
      row.oltLabel ??
      row.olt_label ??
      row.name,
  )
}

function getRowOltLabel(row = {}) {
  return normalizeText(
    row.oltLabel ??
      row.olt_label ??
      row.oltName ??
      row.olt_name ??
      row.olt ??
      row.name ??
      row.label,
    DEFAULT_TEXT,
  )
}

function getRowSlot(row = {}) {
  return normalizeText(
    row.slot ??
      row.tarjeta ??
      row.board ??
      row.card ??
      row.pon_card,
    DEFAULT_TEXT,
  )
}

function getRowPort(row = {}) {
  return normalizeText(
    row.port ??
      row.puerto ??
      row.pon ??
      row.ponPort ??
      row.pon_port,
    DEFAULT_TEXT,
  )
}

function getRowOnuId(row = {}) {
  return normalizeText(
    row.onuId ??
      row.onu_id ??
      row.onu ??
      row.id ??
      row.onuIndex ??
      row.onu_index,
    DEFAULT_TEXT,
  )
}

function getRowSerial(row = {}) {
  return normalizeText(
    row.serial ??
      row.serialNumber ??
      row.serial_number ??
      row.onuSn ??
      row.onu_sn ??
      row.sn,
    DEFAULT_TEXT,
  )
}

function getRowClient(row = {}) {
  return normalizeText(
    row.cliente ??
      row.clientName ??
      row.client_name ??
      row.customerName ??
      row.customer_name ??
      row.name ??
      row.description,
    DEFAULT_TEXT,
  )
}

function getRowStatus(row = {}) {
  return normalizeText(
    row.status ??
      row.estado ??
      row.operationalStatus ??
      row.operational_status ??
      row.onuStatus ??
      row.onu_status,
    DEFAULT_TEXT,
  )
}

function getRowSignal(row = {}) {
  return toNullableNumber(
    row.signal ??
      row.rxPower ??
      row.rx_power ??
      row.power ??
      row.opticalPower ??
      row.optical_power,
  )
}

function normalizeStatusKey(value = '') {
  const status = normalizeCompare(value)

  if (!status || status === 'N/D' || status === 'NULL' || status === 'SIN DATO') {
    return 'noReportado'
  }

  if (status.includes('ONLINE')) return 'online'
  if (status.includes('OFFLINE')) return 'offline'
  if (status.includes('POWER')) return 'powerFail'
  if (status === 'LOS' || status.includes('LOS')) return 'los'

  return 'otros'
}

function classifySignalBand(value) {
  const signal = toNullableNumber(value)

  if (signal === null) return SIGNAL_BANDS.WITHOUT_SIGNAL
  if (signal <= -28) return SIGNAL_BANDS.CRITICAL
  if (signal <= -25) return SIGNAL_BANDS.WARNING

  return SIGNAL_BANDS.VERY_GOOD
}

function getSignalQualityLabel(value) {
  const band = classifySignalBand(value)

  if (band === SIGNAL_BANDS.CRITICAL) return 'Crítica'
  if (band === SIGNAL_BANDS.WARNING) return 'Advertencia'
  if (band === SIGNAL_BANDS.VERY_GOOD) return 'Muy buena'

  return 'Sin lectura'
}

function getSignalQualityTone(value) {
  const band = classifySignalBand(value)

  if (band === SIGNAL_BANDS.CRITICAL) return 'danger'
  if (band === SIGNAL_BANDS.WARNING) return 'warning'
  if (band === SIGNAL_BANDS.VERY_GOOD) return 'success'

  return 'neutral'
}

function signalSortRank(row = {}) {
  const signal = getRowSignal(row)
  const band = classifySignalBand(signal)

  if (band === SIGNAL_BANDS.CRITICAL) return 1
  if (band === SIGNAL_BANDS.WARNING) return 2
  if (band === SIGNAL_BANDS.WITHOUT_SIGNAL) return 3

  return 4
}

function filterRowsByOlt(rows = [], selectedOlt = '') {
  const normalizedSelected = normalizeCompare(selectedOlt)

  if (!normalizedSelected) {
    return ensureArray(rows)
  }

  return ensureArray(rows).filter((row) => {
    const oltValues = [
      row.oltId,
      row.olt_id,
      row.olt,
      row.oltName,
      row.olt_name,
      row.oltLabel,
      row.olt_label,
      row.name,
      row.label,
      row.value,
    ]

    return oltValues.some((value) => normalizeCompare(value) === normalizedSelected)
  })
}

function normalizeOltOption(row = {}, index = 0) {
  const source = ensureObject(row)

  const value = normalizeText(
    source.value ??
      source.oltId ??
      source.olt_id ??
      source.id ??
      source.olt ??
      source.name,
    `olt-${index + 1}`,
  )

  const label = normalizeText(
    source.label ??
      source.oltLabel ??
      source.olt_label ??
      source.oltName ??
      source.olt_name ??
      source.name ??
      source.olt,
    value,
  )

  const count = toSafeNumber(
    source.totalOnus ??
      source.total_onus ??
      source.total ??
      source.count ??
      source.onus,
  )

  return {
    ...source,
    id: normalizeText(source.id, value),
    value,
    label,
    name: label,
    count,
    oltId: normalizeText(source.oltId ?? source.olt_id ?? source.value, value),
    oltName: normalizeText(source.oltName ?? source.olt_name, label),
    oltLabel: normalizeText(source.oltLabel ?? source.olt_label, label),
  }
}

function normalizeOltOptions(rows = []) {
  const seen = new Set()
  const options = []

  ensureArray(rows).forEach((row, index) => {
    const option = normalizeOltOption(row, index)
    const key = normalizeCompare(option.value)

    if (!key || seen.has(key)) return

    seen.add(key)
    options.push(option)
  })

  return options.sort((left, right) =>
    left.label.localeCompare(right.label, 'es', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

function normalizeDistributionRows(rows = []) {
  return ensureArray(rows)
    .map((row, index) => {
      const name = normalizeText(row.name ?? row.label, `Segmento ${index + 1}`)

      return {
        ...row,
        id: normalizeText(row.id ?? row.key, `distribution-${index}`),
        name,
        label: name,
        value: toSafeNumber(row.value ?? row.count ?? row.total),
        colorToken: row.colorToken || 'neutral',
      }
    })
    .filter((item) => item.value > 0)
}

function buildSignalSummary(rows = []) {
  return ensureArray(rows).reduce(
    (acc, row) => {
      const signal = getRowSignal(row)
      const band = classifySignalBand(signal)

      if (band === SIGNAL_BANDS.CRITICAL) {
        acc.critical += 1
      } else if (band === SIGNAL_BANDS.WARNING) {
        acc.warning += 1
      } else if (band === SIGNAL_BANDS.VERY_GOOD) {
        acc.veryGood += 1
      } else {
        acc.withoutSignal += 1
      }

      if (signal !== null) {
        acc.signalTotal += signal
        acc.signalCount += 1
      }

      return acc
    },
    {
      veryGood: 0,
      warning: 0,
      critical: 0,
      withoutSignal: 0,
      signalTotal: 0,
      signalCount: 0,
    },
  )
}

function buildOperationalStatusSummary(rows = []) {
  return ensureArray(rows).reduce(
    (acc, row) => {
      const statusKey = normalizeStatusKey(getRowStatus(row))

      acc[statusKey] = toSafeNumber(acc[statusKey]) + 1

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

function buildSlotPortOccupancy(rows = []) {
  const grouped = new Map()

  ensureArray(rows).forEach((row) => {
    const slot = getRowSlot(row)
    const port = getRowPort(row)
    const key = `${slot}::${port}`

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        slot,
        tarjeta: slot,
        port,
        puerto: port,
        label: `T${slot} / P${port}`,
        onus: 0,
        online: 0,
        offline: 0,
        powerFail: 0,
        los: 0,
        critical: 0,
        signalTotal: 0,
        signalCount: 0,
        averageSignal: null,
      })
    }

    const item = grouped.get(key)
    const statusKey = normalizeStatusKey(getRowStatus(row))
    const signal = getRowSignal(row)

    item.onus += 1

    if (statusKey === 'online') item.online += 1
    if (statusKey === 'offline') item.offline += 1
    if (statusKey === 'powerFail') item.powerFail += 1
    if (statusKey === 'los') item.los += 1

    if (classifySignalBand(signal) === SIGNAL_BANDS.CRITICAL) {
      item.critical += 1
    }

    if (signal !== null) {
      item.signalTotal += signal
      item.signalCount += 1
      item.averageSignal = item.signalTotal / item.signalCount
    }
  })

  return [...grouped.values()].sort((left, right) => {
    const slotSort = sortNatural(left.slot, right.slot)

    if (slotSort !== 0) return slotSort

    return sortNatural(left.port, right.port)
  })
}

function buildOltSummary(rows = [], selectedOlt = '') {
  const oltRows = filterRowsByOlt(rows, selectedOlt)
  const signalSummary = buildSignalSummary(oltRows)
  const operationalStatus = buildOperationalStatusSummary(oltRows)
  const occupancyBySlotPort = buildSlotPortOccupancy(oltRows)

  const tarjetas = new Set(
    oltRows
      .map((row) => getRowSlot(row))
      .filter((slot) => slot && slot !== DEFAULT_TEXT),
  )

  const puertos = new Set(
    oltRows
      .map((row) => {
        const slot = getRowSlot(row)
        const port = getRowPort(row)

        if (!slot || !port || slot === DEFAULT_TEXT || port === DEFAULT_TEXT) {
          return ''
        }

        return `${slot}/${port}`
      })
      .filter(Boolean),
  )

  const selectedRow = oltRows[0] || {}
  const averageSignal =
    signalSummary.signalCount > 0
      ? signalSummary.signalTotal / signalSummary.signalCount
      : null

  const statusCards = [
    {
      key: 'online',
      label: STATUS_LABELS.online,
      value: operationalStatus.online,
      tone: 'success',
    },
    {
      key: 'offline',
      label: STATUS_LABELS.offline,
      value: operationalStatus.offline,
      tone: 'danger',
    },
    {
      key: 'powerFail',
      label: STATUS_LABELS.powerFail,
      value: operationalStatus.powerFail,
      tone: 'warning',
    },
    {
      key: 'los',
      label: STATUS_LABELS.los,
      value: operationalStatus.los,
      tone: 'danger',
    },
    {
      key: 'noReportado',
      label: STATUS_LABELS.noReportado,
      value: operationalStatus.noReportado,
      tone: 'neutral',
    },
  ]

  const signalCards = [
    {
      key: 'veryGood',
      label: SIGNAL_LABELS.veryGood,
      value: signalSummary.veryGood,
      tone: 'success',
    },
    {
      key: 'warning',
      label: SIGNAL_LABELS.warning,
      value: signalSummary.warning,
      tone: 'warning',
    },
    {
      key: 'critical',
      label: SIGNAL_LABELS.critical,
      value: signalSummary.critical,
      tone: 'danger',
    },
    {
      key: 'withoutSignal',
      label: SIGNAL_LABELS.withoutSignal,
      value: signalSummary.withoutSignal,
      tone: 'neutral',
    },
  ]

  return {
    oltId: normalizeText(selectedOlt || getRowOltValue(selectedRow), DEFAULT_TEXT),
    oltName: getRowOltLabel(selectedRow),
    oltLabel: getRowOltLabel(selectedRow),
    totalOnus: oltRows.length,
    tarjetas: tarjetas.size,
    puertos: puertos.size,
    averageSignal,
    veryGood: signalSummary.veryGood,
    warning: signalSummary.warning,
    critical: signalSummary.critical,
    withoutSignal: signalSummary.withoutSignal,
    online: operationalStatus.online,
    offline: operationalStatus.offline,
    powerFail: operationalStatus.powerFail,
    los: operationalStatus.los,
    noReportado: operationalStatus.noReportado,
    otros: operationalStatus.otros,
    statusCards,
    signalCards,
    occupancyBySlotPort,
    statusDistribution: [
      {
        id: 'online',
        key: 'online',
        label: STATUS_LABELS.online,
        name: STATUS_LABELS.online,
        value: operationalStatus.online,
        colorToken: 'success',
      },
      {
        id: 'offline',
        key: 'offline',
        label: STATUS_LABELS.offline,
        name: STATUS_LABELS.offline,
        value: operationalStatus.offline,
        colorToken: 'danger',
      },
      {
        id: 'powerFail',
        key: 'powerFail',
        label: STATUS_LABELS.powerFail,
        name: STATUS_LABELS.powerFail,
        value: operationalStatus.powerFail,
        colorToken: 'warning',
      },
      {
        id: 'los',
        key: 'los',
        label: STATUS_LABELS.los,
        name: STATUS_LABELS.los,
        value: operationalStatus.los,
        colorToken: 'danger',
      },
      {
        id: 'noReportado',
        key: 'noReportado',
        label: STATUS_LABELS.noReportado,
        name: STATUS_LABELS.noReportado,
        value: operationalStatus.noReportado,
        colorToken: 'neutral',
      },
    ],
    signalBandDistribution: [
      {
        id: 'veryGood',
        key: 'veryGood',
        label: SIGNAL_LABELS.veryGood,
        name: SIGNAL_LABELS.veryGood,
        value: signalSummary.veryGood,
        colorToken: 'success',
      },
      {
        id: 'warning',
        key: 'warning',
        label: SIGNAL_LABELS.warning,
        name: SIGNAL_LABELS.warning,
        value: signalSummary.warning,
        colorToken: 'warning',
      },
      {
        id: 'critical',
        key: 'critical',
        label: SIGNAL_LABELS.critical,
        name: SIGNAL_LABELS.critical,
        value: signalSummary.critical,
        colorToken: 'danger',
      },
      {
        id: 'withoutSignal',
        key: 'withoutSignal',
        label: SIGNAL_LABELS.withoutSignal,
        name: SIGNAL_LABELS.withoutSignal,
        value: signalSummary.withoutSignal,
        colorToken: 'neutral',
      },
    ],
  }
}

function getSelectClassName(isActive = false) {
  return [
    'tickets-filter-select__input',
    isActive ? 'tickets-filter-select__input--active' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function getPillClassName(tone = 'neutral') {
  return [
    'operaciones-pill',
    tone === 'success' ? 'operaciones-pill--success' : '',
    tone === 'warning' ? 'operaciones-pill--warning' : '',
    tone === 'danger' ? 'operaciones-pill--danger' : '',
    !['success', 'warning', 'danger'].includes(tone)
      ? 'operaciones-pill--neutral'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function sanitizeFileName(value = 'smartolt') {
  return normalizeText(value, 'smartolt')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildExcelHtml({ title, subtitle = '', columns = [], rows = [] }) {
  const headers = columns
    .map(
      (column) =>
        `<th style="background:#f3f7fc;color:#003d91;border:1px solid #dbe4ee;padding:8px;text-align:left;">${escapeHtml(column.header)}</th>`,
    )
    .join('')

  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value =
            typeof column.value === 'function'
              ? column.value(row)
              : row[column.key]

          return `<td style="border:1px solid #dbe4ee;padding:8px;">${escapeHtml(value)}</td>`
        })
        .join('')

      return `<tr>${cells}</tr>`
    })
    .join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="${columns.length}" style="font-size:18px;color:#003d91;text-align:left;padding:10px;">
                ${escapeHtml(title)}
              </th>
            </tr>
            ${
              subtitle
                ? `<tr><th colspan="${columns.length}" style="font-size:12px;color:#64748b;text-align:left;padding:8px;">${escapeHtml(subtitle)}</th></tr>`
                : ''
            }
            <tr>${headers}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `
}

function downloadExcelFile({
  filename = 'smartolt.xls',
  title,
  subtitle = '',
  columns = [],
  rows = [],
}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const html = buildExcelHtml({
    title,
    subtitle,
    columns,
    rows,
  })

  const blob = new Blob([html], {
    type: EXPORT_MIME_TYPE,
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${sanitizeFileName(filename).replace(/\.xls$/i, '')}.xls`
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

function ExportButton({ disabled = false, onClick }) {
  return (
    <button
      type="button"
      className="portal-filter-action portal-filter-action--primary portal-filter-action--compact"
      disabled={disabled}
      onClick={onClick}
    >
      Exportar Excel
    </button>
  )
}

function LoadingState({ message = 'Cargando información...' }) {
  return (
    <div className="portal-feedback portal-feedback--loading">
      {message}
    </div>
  )
}

function ErrorState({ message = 'No se pudo cargar la información.' }) {
  return (
    <div className="portal-feedback portal-feedback--error">
      {message}
    </div>
  )
}

function SmartOltFilterCard({
  oltOptions = [],
  selectedOlt = '',
  totalVisible = 0,
  detailLoading = false,
  onOltChange,
}) {
  const hasOptions = oltOptions.length > 0
  const hasSelectedOlt = normalizeText(selectedOlt) !== ''

  return (
    <section className="portal-card operaciones-smartolt-filter-card">
      <div className="portal-card__body">
        <div className="portal-filter-grid operaciones-smartolt-filter-grid operaciones-smartolt-filter-grid--simple">
          <article className="tickets-filter-panel tickets-filter-panel--summary">
            <span className="tickets-filter-panel__title">
              ONUs visibles
            </span>
            <strong className="tickets-filter-panel__value">
              {detailLoading ? '...' : formatNumber(totalVisible)}
            </strong>
          </article>

          <div className="tickets-filter-panel tickets-filter-panel--select operaciones-smartolt-filter-grid__olt">
            <label
              htmlFor="smartolt-olt-filter"
              className="tickets-filter-panel__title"
            >
              OLT
            </label>

            <div className="tickets-filter-select__control">
              <select
                id="smartolt-olt-filter"
                className={getSelectClassName(hasSelectedOlt)}
                value={selectedOlt}
                disabled={!hasOptions || detailLoading}
                onChange={(event) => onOltChange?.(event.target.value)}
              >
                {!hasOptions ? (
                  <option value="">SIN OLT DISPONIBLES</option>
                ) : null}

                {oltOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.count > 0
                      ? `${option.label} (${formatNumber(option.count)})`
                      : option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function OltHeader({ summary, loading = false }) {
  return (
    <section className="portal-card operaciones-olt-title-card">
      <div>
        <span className="operaciones-olt-title-card__eyebrow">
          Reporte por OLT
        </span>

        <h2 className="operaciones-olt-title-card__title">
          {loading
            ? 'Cargando detalle de OLT...'
            : summary.oltLabel || summary.oltName || 'Seleccione una OLT'}
        </h2>
      </div>

      <div className="operaciones-olt-title-card__meta">
        <span>ID: {summary.oltId || DEFAULT_TEXT}</span>
        <span>ONUs: {formatNumber(summary.totalOnus || 0)}</span>
      </div>
    </section>
  )
}

function InventoryKpiStrip({ summary }) {
  const items = [
    {
      key: 'onus',
      label: 'ONUs monitoreadas',
      value: summary.totalOnus,
    },
    {
      key: 'tarjetas',
      label: 'Tarjetas activas',
      value: summary.tarjetas,
    },
    {
      key: 'puertos',
      label: 'Puertos ocupados',
      value: summary.puertos,
    },
    {
      key: 'signal',
      label: 'Señal promedio',
      value:
        summary.averageSignal === null
          ? DEFAULT_TEXT
          : `${formatNullableNumber(summary.averageSignal, 2)} dBm`,
    },
    {
      key: 'critical',
      label: 'Señales críticas',
      value: summary.critical,
      tone: 'danger',
    },
  ]

  return (
    <section className="operaciones-olt-kpi-strip operaciones-olt-kpi-strip--inventory">
      {items.map((item) => (
        <article
          key={item.key}
          className={[
            'portal-card',
            'operaciones-olt-kpi',
            item.tone ? `operaciones-olt-kpi--${item.tone}` : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="operaciones-olt-kpi__label">{item.label}</span>

          <strong className="operaciones-olt-kpi__value">
            {typeof item.value === 'number'
              ? formatNumber(item.value)
              : item.value}
          </strong>
        </article>
      ))}
    </section>
  )
}

function SummaryMetricGrid({ title, subtitle, items = [] }) {
  const safeItems = ensureArray(items)

  return (
    <section className="portal-card operaciones-summary-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">{title}</h3>
          {subtitle ? (
            <p className="portal-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <div className="portal-card__body">
        <div className="operaciones-summary-grid">
          {safeItems.map((item) => (
            <article
              key={item.key}
              className={[
                'operaciones-summary-metric',
                item.tone ? `operaciones-summary-metric--${item.tone}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="operaciones-summary-metric__label">
                {item.label}
              </span>

              <strong className="operaciones-summary-metric__value">
                {formatNumber(item.value)}
              </strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function OccupancyTable({
  rows = [],
  title = 'Puertos por tarjeta',
  subtitle = 'Consolidado de ONUs por tarjeta y puerto.',
}) {
  const safeRows = ensureArray(rows)
  const hasRows = safeRows.length > 0

  const columns = [
    { header: 'Tarjeta', value: (row) => row.slot },
    { header: 'Puerto', value: (row) => row.port },
    { header: 'ONUs', value: (row) => row.onus },
    { header: 'Online', value: (row) => row.online },
    { header: 'Offline', value: (row) => row.offline },
    { header: 'Power Fail', value: (row) => row.powerFail },
    { header: 'LOS', value: (row) => row.los },
    { header: 'Crítica', value: (row) => row.critical },
    {
      header: 'Señal prom.',
      value: (row) =>
        row.averageSignal === null
          ? DEFAULT_TEXT
          : `${formatNullableNumber(row.averageSignal, 2)} dBm`,
    },
  ]

  function handleExport() {
    downloadExcelFile({
      filename: 'smartolt-puertos-por-tarjeta.xls',
      title,
      subtitle,
      columns,
      rows: safeRows,
    })
  }

  return (
    <section className="portal-card operaciones-occupancy-table-card">
      <header className="portal-card__header">
        <div className="portal-card__header-row">
          <div className="portal-card__heading">
            <h3 className="portal-card__title">{title}</h3>
            <p className="portal-card__subtitle">{subtitle}</p>
          </div>

          <div className="portal-card__actions">
            <ExportButton disabled={!hasRows} onClick={handleExport} />
          </div>
        </div>
      </header>

      <div className="portal-card__body">
        {!hasRows ? (
          <div className="tickets-empty-state">
            No hay puertos disponibles para la OLT seleccionada.
          </div>
        ) : (
          <div className="portal-table-responsive operaciones-table operaciones-table--bounded operaciones-table--occupancy">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Tarjeta</th>
                  <th>Puerto</th>
                  <th>ONUs</th>
                  <th>Online</th>
                  <th>Offline</th>
                  <th>Power Fail</th>
                  <th>LOS</th>
                  <th>Crítica</th>
                  <th>Señal prom.</th>
                </tr>
              </thead>

              <tbody>
                {safeRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.slot}</td>
                    <td>{row.port}</td>
                    <td className="operaciones-table__primary">
                      {formatNumber(row.onus)}
                    </td>
                    <td>{formatNumber(row.online)}</td>
                    <td>{formatNumber(row.offline)}</td>
                    <td>{formatNumber(row.powerFail)}</td>
                    <td>{formatNumber(row.los)}</td>
                    <td>{formatNumber(row.critical)}</td>
                    <td>
                      {row.averageSignal === null
                        ? DEFAULT_TEXT
                        : `${formatNullableNumber(row.averageSignal, 2)} dBm`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function normalizeDetailRows(rows = []) {
  return ensureArray(rows)
    .map((row, index) => {
      const signal = getRowSignal(row)

      return {
        ...row,
        id: buildRowKey(row, index),
        onuId: getRowOnuId(row),
        serial: getRowSerial(row),
        cliente: getRowClient(row),
        status: getRowStatus(row),
        signal,
        signalLabel: signal === null ? DEFAULT_TEXT : `${formatNullableNumber(signal, 2)} dBm`,
        signalQuality: getSignalQualityLabel(signal),
        signalTone: getSignalQualityTone(signal),
        slot: getRowSlot(row),
        port: getRowPort(row),
      }
    })
    .sort((left, right) => {
      const rankSort = signalSortRank(left) - signalSortRank(right)

      if (rankSort !== 0) return rankSort

      const leftSignal = getRowSignal(left)
      const rightSignal = getRowSignal(right)

      if (leftSignal !== null && rightSignal !== null && leftSignal !== rightSignal) {
        return leftSignal - rightSignal
      }

      const slotSort = sortNatural(left.slot, right.slot)

      if (slotSort !== 0) return slotSort

      return sortNatural(left.port, right.port)
    })
}

function SmartOltDetailTable({
  rows = [],
  title = 'Detalle SmartOLT',
  subtitle = '',
}) {
  const safeRows = normalizeDetailRows(rows)
  const hasRows = safeRows.length > 0

  const columns = [
    { header: 'ONU ID', value: (row) => row.onuId },
    { header: 'Serial', value: (row) => row.serial },
    { header: 'Cliente / Nombre', value: (row) => row.cliente },
    { header: 'Estado operativo', value: (row) => row.status },
    { header: 'Señal', value: (row) => row.signalLabel },
    { header: 'Calidad señal', value: (row) => row.signalQuality },
    { header: 'Tarjeta', value: (row) => row.slot },
    { header: 'Puerto', value: (row) => row.port },
  ]

  function handleExport() {
    downloadExcelFile({
      filename: 'smartolt-detalle.xls',
      title,
      subtitle: subtitle || `ONUs cargadas en tabla: ${formatNumber(safeRows.length)}`,
      columns,
      rows: safeRows,
    })
  }

  return (
    <section className="portal-card operaciones-table-card">
      <header className="portal-card__header">
        <div className="portal-card__header-row">
          <div className="portal-card__heading">
            <h3 className="portal-card__title">{title}</h3>

            <p className="portal-card__subtitle">
              {subtitle || `ONUs cargadas en tabla: ${formatNumber(safeRows.length)}`}
            </p>
          </div>

          <div className="portal-card__actions">
            <ExportButton disabled={!hasRows} onClick={handleExport} />
          </div>
        </div>
      </header>

      <div className="portal-card__body">
        {!hasRows ? (
          <div className="tickets-empty-state">
            No hay detalle SmartOLT para la OLT seleccionada.
          </div>
        ) : (
          <div className="portal-table-responsive operaciones-table operaciones-table--bounded operaciones-table--smartolt-detail">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>ONU ID</th>
                  <th>Serial</th>
                  <th>Cliente / Nombre</th>
                  <th>Estado operativo</th>
                  <th>Señal</th>
                  <th>Calidad señal</th>
                  <th>Tarjeta</th>
                  <th>Puerto</th>
                </tr>
              </thead>

              <tbody>
                {safeRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.onuId}</td>
                    <td className="operaciones-table__primary">{row.serial}</td>
                    <td>{row.cliente}</td>
                    <td>
                      <span className={getPillClassName(
                        normalizeStatusKey(row.status) === 'online'
                          ? 'success'
                          : normalizeStatusKey(row.status) === 'offline' ||
                              normalizeStatusKey(row.status) === 'los'
                            ? 'danger'
                            : normalizeStatusKey(row.status) === 'powerFail'
                              ? 'warning'
                              : 'neutral',
                      )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.signalLabel}</td>
                    <td>
                      <span className={getPillClassName(row.signalTone)}>
                        {row.signalQuality}
                      </span>
                    </td>
                    <td>{row.slot}</td>
                    <td>{row.port}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function OperacionesSmartOLT() {
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [oltOptions, setOltOptions] = useState([])
  const [selectedOlt, setSelectedOlt] = useState('')
  const [rows, setRows] = useState([])
  const [discardedRows, setDiscardedRows] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function fetchOltCatalog() {
      try {
        setCatalogLoading(true)
        setError('')

        const data = await getOperacionesSmartOLTs({
          force: true,
          cache: false,
        })

        if (!isMounted) return

        const options = normalizeOltOptions(data)

        setOltOptions(options)

        setSelectedOlt((currentSelectedOlt) => {
          if (normalizeText(currentSelectedOlt) || options.length === 0) {
            return currentSelectedOlt
          }

          return options[0].value
        })
      } catch (requestError) {
        console.error('Error cargando catálogo de OLTs:', requestError)

        if (!isMounted) return

        setOltOptions([])
        setRows([])
        setError(
          requestError?.message ||
            'No se pudo cargar el catálogo de OLTs de SmartOLT.',
        )
      } finally {
        if (isMounted) {
          setCatalogLoading(false)
        }
      }
    }

    fetchOltCatalog()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedOlt) {
      setRows([])
      setDiscardedRows(0)
      return undefined
    }

    let isMounted = true

    async function fetchOltDetail() {
      try {
        setDetailLoading(true)
        setError('')

        const data = await getOperacionesSmartOLT({
          olt: selectedOlt,
          limit: DEFAULT_SMARTOLT_LIMIT,
          force: true,
          cache: false,
        })

        const normalizedRows = ensureArray(data)
        const filteredRows = filterRowsByOlt(normalizedRows, selectedOlt)
        const nextRows = filteredRows.length > 0 ? filteredRows : normalizedRows
        const discarded = Math.max(normalizedRows.length - nextRows.length, 0)

        if (!isMounted) return

        setRows(nextRows)
        setDiscardedRows(discarded)
      } catch (requestError) {
        console.error('Error cargando detalle SmartOLT:', requestError)

        if (!isMounted) return

        setRows([])
        setDiscardedRows(0)
        setError(
          requestError?.message ||
            'No se pudo cargar el detalle SmartOLT de la OLT seleccionada.',
        )
      } finally {
        if (isMounted) {
          setDetailLoading(false)
        }
      }
    }

    fetchOltDetail()

    return () => {
      isMounted = false
    }
  }, [selectedOlt])

  const selectedOltOption = useMemo(() => {
    return oltOptions.find((option) => option.value === selectedOlt)
  }, [oltOptions, selectedOlt])

  const summary = useMemo(() => {
    return buildOltSummary(rows, selectedOlt)
  }, [rows, selectedOlt])

  const resolvedSummary = useMemo(() => {
    const selectedLabel =
      selectedOltOption?.oltLabel ||
      selectedOltOption?.label ||
      selectedOltOption?.name ||
      selectedOlt ||
      summary.oltLabel

    const selectedId =
      selectedOltOption?.oltId ||
      selectedOltOption?.value ||
      selectedOlt ||
      summary.oltId

    const selectedName =
      selectedOltOption?.oltName ||
      selectedOltOption?.label ||
      selectedLabel

    return {
      ...summary,
      oltId: selectedId,
      oltName: selectedName,
      oltLabel: selectedLabel,
    }
  }, [summary, selectedOlt, selectedOltOption])

  const statusDistribution = useMemo(() => {
    return normalizeDistributionRows(summary.statusDistribution)
  }, [summary.statusDistribution])

  const signalBandDistribution = useMemo(() => {
    return normalizeDistributionRows(summary.signalBandDistribution)
  }, [summary.signalBandDistribution])

  function handleSelectOlt(value) {
    setSelectedOlt(value)
    setRows([])
    setDiscardedRows(0)
  }

  if (catalogLoading) {
    return (
      <ModulePage
        title="SmartOLT Operaciones"
        description="Reporte consolidado de ocupación, estado operativo y calidad de señal por OLT."
      >
        <div className="operaciones-smartolt-loading-shell">
          <LoadingState message="Cargando catálogo de OLTs..." />
        </div>
      </ModulePage>
    )
  }

  if (error && oltOptions.length === 0) {
    return (
      <ModulePage
        title="SmartOLT Operaciones"
        description="Reporte consolidado de ocupación, estado operativo y calidad de señal por OLT."
      >
        <ErrorState message={error} />
      </ModulePage>
    )
  }

  return (
    <ModulePage
      title="SmartOLT Operaciones"
      description="Reporte consolidado de ocupación, estado operativo y calidad de señal por OLT."
    >
      <div className="operaciones-olt-report operaciones-olt-report--single">
        <div className="operaciones-olt-report__main">
          <SmartOltFilterCard
            oltOptions={oltOptions}
            selectedOlt={selectedOlt}
            totalVisible={rows.length}
            detailLoading={detailLoading}
            onOltChange={handleSelectOlt}
          />

          {error ? (
            <div className="operaciones-warning-strip">{error}</div>
          ) : null}

          {discardedRows > 0 ? (
            <div className="operaciones-warning-strip">
              Se descartaron {formatNumber(discardedRows)} registros porque no
              correspondían a la OLT seleccionada.
            </div>
          ) : null}

          <OltHeader summary={resolvedSummary} loading={detailLoading} />

          {detailLoading ? (
            <div className="operaciones-smartolt-detail-shell">
              <LoadingState message="Cargando detalle de la OLT seleccionada..." />
            </div>
          ) : (
            <>
              <InventoryKpiStrip summary={summary} />

              <div className="operaciones-summary-two-column">
                <SummaryMetricGrid
                  title="Estado operativo"
                  subtitle="Distribución por estado reportado por SmartOLT."
                  items={summary.statusCards}
                />

                <SummaryMetricGrid
                  title="Calidad de señal"
                  subtitle="Clasificación por potencia óptica recibida."
                  items={summary.signalCards}
                />
              </div>

              <div className="operaciones-dashboard-grid">
                <OperacionesStatusDonut
                  data={statusDistribution}
                  title="Distribución por estado operativo"
                  subtitle="Online, Offline, Power Fail, LOS y no reportados."
                  valueLabel="ONUs"
                  emptyMessage="No hay estados disponibles para graficar."
                />

                <OperacionesStatusDonut
                  data={signalBandDistribution}
                  title="Distribución por calidad de señal"
                  subtitle="Muy buena, advertencia, crítica y sin lectura."
                  valueLabel="ONUs"
                  emptyMessage="No hay señales disponibles para graficar."
                />
              </div>

              <OperacionesCapacityChart
                data={summary.occupancyBySlotPort}
                title="Ocupación por tarjetas y puertos"
                subtitle="ONUs por puerto, estado operativo y señales críticas."
              />

              <OccupancyTable rows={summary.occupancyBySlotPort} />

              <SmartOltDetailTable rows={rows} />
            </>
          )}
        </div>
      </div>
    </ModulePage>
  )
}

export default OperacionesSmartOLT
