import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import ModulePage from '../../../components/ModulePage'
import {
  apiGet,
} from '../../../core/services/api.js'
import {
  CobranzaChartCard,
  CobranzaStatus,
  TornadoChart,
  ensureArray,
  ensureObject,
  formatMoney,
  formatNumber,
  normalizeNumber,
} from '../components/CobranzaShared'

const DEFAULT_ZONA = 'ANDES'
const MAX_RANKING_ROWS = 18


function getDefaultPeriodValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return year + '-' + month
}

function formatPeriodDisplayLabel(period = '') {
  const value = period || getDefaultPeriodValue()
  const parts = String(value).split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 'PERIODO'
  }

  return new Intl.DateTimeFormat('es-VE', {
    month: 'long',
    year: 'numeric',
  })
    .format(new Date(year, month - 1, 1))
    .toUpperCase()
}


function normalizeComparable(value = '') {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function cleanText(value, fallback = 'SIN DATO') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function isInvalidZone(value = '') {
  const normalized = normalizeComparable(value)

  return (
    !normalized ||
    normalized === 'SIN ZONA' ||
    normalized === 'SINZONA' ||
    normalized === 'SIN DATO' ||
    normalized === 'SINDATO' ||
    normalized === 'NO DEFINIDA' ||
    normalized === 'NODEFINIDA' ||
    normalized === 'N/A' ||
    normalized === 'NA' ||
    normalized === '--' ||
    normalized === 'NULL' ||
    normalized === 'UNDEFINED'
  )
}

function isInvalidFranquicia(value = '') {
  const normalized = normalizeComparable(value)

  return (
    !normalized ||
    normalized === 'SIN FRANQUICIA' ||
    normalized === 'SINFRANQUICIA' ||
    normalized === 'SIN DATO' ||
    normalized === 'SINDATO' ||
    normalized === 'N/A' ||
    normalized === 'NA' ||
    normalized === '--' ||
    normalized === 'NULL' ||
    normalized === 'UNDEFINED'
  )
}

function isPrueba(value = '') {
  const normalized = normalizeComparable(value)
  return normalized === 'PRUEBA' || normalized.includes('FRANQUICIA PRUEBA')
}

function pickNumber(row, keys = []) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return normalizeNumber(row[key])
    }
  }

  return 0
}

function pickText(row, keys = [], fallback = 'SIN DATO') {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
      return cleanText(row[key], fallback)
    }
  }

  return fallback
}

function getRowsFromPayload(data) {
  const payload = ensureObject(data)

  if (Array.isArray(payload.rows)) return payload.rows
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.franquicias)) return payload.franquicias
  if (Array.isArray(payload.regiones)) return payload.regiones
  if (Array.isArray(payload?.tablas?.franquicias)) return payload.tablas.franquicias
  if (Array.isArray(payload?.charts?.franquicias)) return payload.charts.franquicias
  if (Array.isArray(payload?.charts?.topFranquicias)) return payload.charts.topFranquicias
  if (Array.isArray(payload?.charts?.topRegiones)) return payload.charts.topRegiones

  return []
}

function normalizeRegionRows(data) {
  return getRowsFromPayload(data)
    .map((row) => {
      const source = ensureObject(row)
      const zona = pickText(source, ['zona', 'region', 'nombreZona', 'name', 'label'], '')

      return {
        key: normalizeComparable(zona),
        label: zona,
        cargos: pickNumber(source, ['totalCargos', 'cargos', 'total']),
        cobrado: pickNumber(source, ['totalCobrado', 'cobrado', 'clientesCobrados']),
        porCobrar: pickNumber(source, [
          'totalXCobrar',
          'totalXcobrar',
          'porCobrar',
          'clientesPorCobrar',
          'clientesXCobrar',
        ]),
        montoCargos: pickNumber(source, ['montoCargosUsd', 'montoCargos', 'montoFacturado']),
        montoCobrado: pickNumber(source, ['montoCobradoUsd', 'montoCobrado']),
        montoPorCobrar: pickNumber(source, [
          'montoXCobrarUsd',
          'montoXcobrarUsd',
          'montoPorCobrar',
          'saldoPendienteUsd',
        ]),
      }
    })
    .filter((row) => row.key && !isInvalidZone(row.label))
    .sort((left, right) => {
      const amountDiff =
        normalizeNumber(right.montoPorCobrar) - normalizeNumber(left.montoPorCobrar)

      if (amountDiff !== 0) return amountDiff

      return left.label.localeCompare(right.label, 'es', { sensitivity: 'base' })
    })
}

function normalizeFranquiciaRows(data, forcedZona = '') {
  const forcedZonaText = cleanText(forcedZona, '')

  return getRowsFromPayload(data)
    .map((row) => {
      const source = ensureObject(row)

      const zona = pickText(
        source,
        ['zona', 'region', 'nombreZona', 'zonaNombre'],
        forcedZonaText,
      )

      const franquicia = pickText(
        source,
        ['franquicia', 'nombreFranquicia', 'nombre_franquicia', 'name', 'label'],
        '',
      )

      const cargos = pickNumber(source, ['totalCargos', 'cargos', 'total'])
      const cobrado = pickNumber(source, ['totalCobrado', 'cobrado', 'clientesCobrados'])
      const porCobrar = pickNumber(source, [
        'totalXCobrar',
        'totalXcobrar',
        'porCobrar',
        'clientesPorCobrar',
        'clientesXCobrar',
        'xCobrar',
      ])

      const montoCargos = pickNumber(source, [
        'montoCargosUsd',
        'montoCargos',
        'monto_cargos',
        'montoFacturado',
      ])

      const montoCobrado = pickNumber(source, [
        'montoCobradoUsd',
        'montoCobrado',
        'monto_cobrado',
      ])

      const montoPorCobrar = pickNumber(source, [
        'montoXCobrarUsd',
        'montoXcobrarUsd',
        'montoPorCobrar',
        'monto_x_cobrar',
        'saldoPendienteUsd',
      ])

      const descuento = pickNumber(source, [
        'descuento',
        'montoDescuento',
        'montoDescuentoUsd',
      ])

      const montoPosteriorAjuste = pickNumber(source, [
        'montoPosteriorAjusteUsd',
        'montoPosteriorAjuste',
      ])

      const cargosPosteriores = pickNumber(source, [
        'totalPosterior',
        'cargosPosteriores',
      ])

      const montoPosterior = pickNumber(source, [
        'montoPosteriorUsd',
        'montoPosterior',
      ])

      const posteriorCobrado = pickNumber(source, [
        'totalPosteriorCobrado',
        'cargosPosterioresCobrados',
      ])

      const montoPosteriorCobrado = pickNumber(source, [
        'montoPosteriorCobradoUsd',
        'montoPosteriorCobrado',
      ])

      const posteriorPorCobrar = pickNumber(source, [
        'totalPosteriorXCobrar',
        'cargosPosterioresPorCobrar',
      ])

      const montoPosteriorPorCobrar = pickNumber(source, [
        'montoPosteriorXCobrarUsd',
        'montoPosteriorPorCobrar',
      ])

      const recuperados = pickNumber(source, [
        'totalRecuperado',
        'cargosRecuperados',
      ])

      const montoRecuperado = pickNumber(source, [
        'montoRecuperadoUsd',
        'montoRecuperado',
      ])

      return {
        ...source,
        zona,
        zonaKey: normalizeComparable(zona),
        franquicia,
        franquiciaKey: normalizeComparable(franquicia),
        name: franquicia,
        cargos,
        montoCargos,
        cobrado,
        montoCobrado,
        descuento,
        porCobrar,
        montoPorCobrar,
        montoPosteriorAjuste,
        cargosPosteriores,
        montoPosterior,
        posteriorCobrado,
        montoPosteriorCobrado,
        posteriorPorCobrar,
        montoPosteriorPorCobrar,
        recuperados,
        montoRecuperado,
      }
    })
    .filter((row) => !isInvalidZone(row.zona))
    .filter((row) => !isInvalidFranquicia(row.franquicia))
    .filter((row) => !isPrueba(row.franquicia))
    .filter((row) => {
      return (
        normalizeNumber(row.cargos) > 0 ||
        normalizeNumber(row.porCobrar) > 0 ||
        normalizeNumber(row.montoPorCobrar) > 0
      )
    })
    .sort((left, right) => {
      const pendingDiff = normalizeNumber(right.porCobrar) - normalizeNumber(left.porCobrar)

      if (pendingDiff !== 0) return pendingDiff

      return normalizeNumber(right.montoPorCobrar) - normalizeNumber(left.montoPorCobrar)
    })
}

function buildHierarchy(rows = []) {
  const zones = new Map()

  rows.forEach((row) => {
    if (isInvalidZone(row.zona)) {
      return
    }

    if (!zones.has(row.zonaKey)) {
      zones.set(row.zonaKey, {
        key: row.zonaKey,
        label: row.zona,
        cargos: 0,
        cobrado: 0,
        porCobrar: 0,
        montoCargos: 0,
        montoCobrado: 0,
        montoPorCobrar: 0,
        offices: [],
      })
    }

    const zone = zones.get(row.zonaKey)

    zone.cargos += normalizeNumber(row.cargos)
    zone.cobrado += normalizeNumber(row.cobrado)
    zone.porCobrar += normalizeNumber(row.porCobrar)
    zone.montoCargos += normalizeNumber(row.montoCargos)
    zone.montoCobrado += normalizeNumber(row.montoCobrado)
    zone.montoPorCobrar += normalizeNumber(row.montoPorCobrar)
    zone.offices.push({
      key: row.franquiciaKey,
      name: row.franquicia,
      zona: row.zona,
      zonaKey: row.zonaKey,
      franquicia: row.franquicia,
      franquiciaKey: row.franquiciaKey,
      cargos: row.cargos,
      cobrado: row.cobrado,
      porCobrar: row.porCobrar,
      montoCargos: row.montoCargos,
      montoCobrado: row.montoCobrado,
      montoPorCobrar: row.montoPorCobrar,
    })
  })

  return Array.from(zones.values())
    .filter((zone) => zone.porCobrar > 0 || zone.montoPorCobrar > 0)
    .map((zone) => ({
      ...zone,
      offices: zone.offices
        .slice()
        .sort((left, right) => {
          const clientsDiff = normalizeNumber(right.porCobrar) - normalizeNumber(left.porCobrar)

          if (clientsDiff !== 0) return clientsDiff

          return normalizeNumber(right.montoPorCobrar) - normalizeNumber(left.montoPorCobrar)
        }),
    }))
    .sort((left, right) => {
      const amountDiff =
        normalizeNumber(right.montoPorCobrar) - normalizeNumber(left.montoPorCobrar)

      if (amountDiff !== 0) return amountDiff

      return left.label.localeCompare(right.label, 'es', { sensitivity: 'base' })
    })
}

function buildSummary(rows = []) {
  return rows.reduce(
    (acc, row) => {
      acc.franquicias += 1
      acc.cargos += normalizeNumber(row.cargos)
      acc.cobrado += normalizeNumber(row.cobrado)
      acc.porCobrar += normalizeNumber(row.porCobrar)
      acc.montoCargos += normalizeNumber(row.montoCargos)
      acc.montoCobrado += normalizeNumber(row.montoCobrado)
      acc.montoPorCobrar += normalizeNumber(row.montoPorCobrar)
      return acc
    },
    {
      franquicias: 0,
      cargos: 0,
      cobrado: 0,
      porCobrar: 0,
      montoCargos: 0,
      montoCobrado: 0,
      montoPorCobrar: 0,
    },
  )
}

function getDefaultZoneKey(hierarchy = []) {
  const andes = hierarchy.find((zone) => normalizeComparable(zone.label) === DEFAULT_ZONA)
  return andes?.key || hierarchy[0]?.key || ''
}

function toRadians(angle) {
  return (angle * Math.PI) / 180
}

function toPolarPoint(centerX, centerY, angleDeg, radius) {
  const angle = toRadians(angleDeg)

  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  }
}

function scaleRadius(value, maxValue, minRadius, maxRadius) {
  const safeMax = Math.max(normalizeNumber(maxValue), 1)
  const safeValue = Math.max(normalizeNumber(value), 0)
  const ratio = Math.sqrt(Math.min(safeValue / safeMax, 1))

  return minRadius + (maxRadius - minRadius) * ratio
}

function buildZoneAngle(index, count) {
  const safeCount = Math.max(count, 1)
  const step = 360 / safeCount

  // Distribucion deterministica y completamente dinamica.
  // Si aparece una nueva zona, todas conservan separacion uniforme.
  return -90 + index * step
}

function buildZoneLayout(hierarchy = []) {
  const width = 880
  const count = Math.max(hierarchy.length, 1)
  const maxAmount = Math.max(...hierarchy.map((zone) => zone.montoPorCobrar), 1)

  const minRadius = 44
  const maxRadius = 68
  const nodePadding = 18

  // Radio minimo necesario para que dos burbujas maximas no se monten.
  // Crece automaticamente al aumentar la cantidad de zonas.
  const halfStep = Math.PI / count
  const safeSin = Math.max(Math.sin(halfStep), 0.12)
  const requiredOrbit =
    (maxRadius * 2 + nodePadding) / (2 * safeSin)

  const orbitRadius = Math.max(164, Math.ceil(requiredOrbit))
  const outerPadding = maxRadius + 30
  const height = Math.max(440, Math.ceil((orbitRadius + outerPadding) * 2))

  const center = {
    x: width / 2,
    y: height / 2,
  }

  const zones = hierarchy.map((zone, index) => {
    const angle = buildZoneAngle(index, count)
    const position = toPolarPoint(center.x, center.y, angle, orbitRadius)
    const radius = scaleRadius(
      zone.montoPorCobrar,
      maxAmount,
      minRadius,
      maxRadius,
    )

    return {
      ...zone,
      x: position.x,
      y: position.y,
      r: radius,
      angle,
    }
  })

  return {
    width,
    height,
    center,
    zones,
  }
}








// FRQ_ANALYTICS_COMPONENTS_BEGIN

function frqMetricNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (value === undefined || value === null || value === '') {
    return 0
  }

  let raw = String(value).trim()

  if (raw.includes('.') && raw.includes(',')) {
    raw = raw.replace(/\./g, '').replace(',', '.')
  } else if (raw.includes(',') && !raw.includes('.')) {
    raw = raw.replace(',', '.')
  }

  raw = raw.replace(/[^\d.-]/g, '')

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function frqPick(row, keys = []) {
  for (const key of keys) {
    const value = row?.[key]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return ''
}

function frqNumber(value, decimals = 0) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(frqMetricNumber(value))
}

function frqMoney(value) {
  return 'US$ ' + frqNumber(value, 2)
}

function frqPercent(value) {
  return frqNumber(value, 2) + '%'
}

function frqRowName(row = {}) {
  return String(
    frqPick(row, [
      'franquicia',
      'nombreFranquicia',
      'nombre_franquicia',
      'name',
      'label',
      'oficina',
    ]) || 'SIN FRANQUICIA',
  )
}

function frqRowZone(row = {}) {
  return String(
    frqPick(row, [
      'zona',
      'region',
      'nombreZona',
      'zonaNombre',
      'zona_label',
    ]) || '',
  )
}

function frqNormalizeKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function frqIsExcludedRow(row = {}) {
  const franchise = frqNormalizeKey(frqRowName(row))
  const zone = frqNormalizeKey(frqRowZone(row))

  return (
    !franchise ||
    franchise === 'PRUEBA' ||
    franchise.includes('FRANQUICIA PRUEBA') ||
    franchise === 'SIN FRANQUICIA' ||
    franchise === 'SINFRANQUICIA' ||
    franchise === 'SIN DATO' ||
    franchise === 'SINDATO' ||
    zone === 'SIN ZONA' ||
    zone === 'SINZONA'
  )
}

function frqRowMetrics(row = {}) {
  const cargos = frqMetricNumber(
    frqPick(row, [
      'totalCargos',
      'cargos',
      'total_cargos',
      'total',
    ]),
  )

  const cobrados = frqMetricNumber(
    frqPick(row, [
      'totalCobrado',
      'totalCobrados',
      'cobrado',
      'cobrados',
      'total_cobrado',
    ]),
  )

  const xCobrarDirect = frqMetricNumber(
    frqPick(row, [
      'totalXCobrar',
      'totalXcobrar',
      'xCobrar',
      'porCobrar',
      'por_cobrar',
      'pendientes',
    ]),
  )

  const montoCargos = frqMetricNumber(
    frqPick(row, [
      'montoCargosUsd',
      'montoCargos',
      'monto_cargos',
      'monto_total_cargos',
    ]),
  )

  const montoCobrado = frqMetricNumber(
    frqPick(row, [
      'montoCobradoUsd',
      'montoCobrado',
      'monto_cobrado',
      'total_monto_cobrado',
    ]),
  )

  const montoXCobrarDirect = frqMetricNumber(
    frqPick(row, [
      'montoXCobrarUsd',
      'montoXcobrarUsd',
      'montoPorCobrar',
      'monto_por_cobrar',
      'mto_x_cobrar',
      'saldoPendienteUsd',
    ]),
  )

  const xCobrar = xCobrarDirect || Math.max(cargos - cobrados, 0)
  const montoXCobrar = montoXCobrarDirect || Math.max(montoCargos - montoCobrado, 0)

  const montoPosteriorAjuste = frqMetricNumber(
    frqPick(row, ['montoPosteriorAjusteUsd', 'montoPosteriorAjuste']),
  )
  const cargosPosteriores = frqMetricNumber(
    frqPick(row, ['totalPosterior', 'cargosPosteriores']),
  )
  const montoPosterior = frqMetricNumber(
    frqPick(row, ['montoPosteriorUsd', 'montoPosterior']),
  )
  const posteriorCobrado = frqMetricNumber(
    frqPick(row, ['totalPosteriorCobrado', 'cargosPosterioresCobrados']),
  )
  const montoPosteriorCobrado = frqMetricNumber(
    frqPick(row, ['montoPosteriorCobradoUsd', 'montoPosteriorCobrado']),
  )
  const posteriorPorCobrar = frqMetricNumber(
    frqPick(row, ['totalPosteriorXCobrar', 'cargosPosterioresPorCobrar']),
  )
  const montoPosteriorPorCobrar = frqMetricNumber(
    frqPick(row, ['montoPosteriorXCobrarUsd', 'montoPosteriorPorCobrar']),
  )
  const recuperados = frqMetricNumber(
    frqPick(row, ['totalRecuperado', 'cargosRecuperados']),
  )
  const montoRecuperado = frqMetricNumber(
    frqPick(row, ['montoRecuperadoUsd', 'montoRecuperado']),
  )

  return {
    cargos,
    cobrados,
    xCobrar,
    montoCargos,
    montoCobrado,
    montoXCobrar,
    montoPosteriorAjuste,
    cargosPosteriores,
    montoPosterior,
    posteriorCobrado,
    montoPosteriorCobrado,
    posteriorPorCobrar,
    montoPosteriorPorCobrar,
    recuperados,
    montoRecuperado,
    pctCobrado: cargos > 0 ? (cobrados / cargos) * 100 : 0,
    pctXCobrar: cargos > 0 ? (xCobrar / cargos) * 100 : 0,
  }
}

function frqCleanRows(rows = []) {
  return Array.isArray(rows)
    ? rows.filter((row) => !frqIsExcludedRow(row))
    : []
}

function frqSummary(rows = []) {
  return frqCleanRows(rows).reduce(
    (acc, row) => {
      const metrics = frqRowMetrics(row)

      acc.cargos += metrics.cargos
      acc.cobrados += metrics.cobrados
      acc.xCobrar += metrics.xCobrar
      acc.montoCargos += metrics.montoCargos
      acc.montoCobrado += metrics.montoCobrado
      acc.montoXCobrar += metrics.montoXCobrar
      acc.montoPosteriorAjuste += metrics.montoPosteriorAjuste
      acc.cargosPosteriores += metrics.cargosPosteriores
      acc.montoPosterior += metrics.montoPosterior
      acc.posteriorCobrado += metrics.posteriorCobrado
      acc.montoPosteriorCobrado += metrics.montoPosteriorCobrado
      acc.posteriorPorCobrar += metrics.posteriorPorCobrar
      acc.montoPosteriorPorCobrar += metrics.montoPosteriorPorCobrar
      acc.recuperados += metrics.recuperados
      acc.montoRecuperado += metrics.montoRecuperado

      return acc
    },
    {
      cargos: 0,
      cobrados: 0,
      xCobrar: 0,
      montoCargos: 0,
      montoCobrado: 0,
      montoXCobrar: 0,
      montoPosteriorAjuste: 0,
      cargosPosteriores: 0,
      montoPosterior: 0,
      posteriorCobrado: 0,
      montoPosteriorCobrado: 0,
      posteriorPorCobrar: 0,
      montoPosteriorPorCobrar: 0,
      recuperados: 0,
      montoRecuperado: 0,
    },
  )
}




function FranquiciasPieSummary({ rows = [] }) {
  const summary = frqSummary(rows)
  const pctCobrado = summary.cargos > 0 ? (summary.cobrados / summary.cargos) * 100 : 0
  const pctXCobrar = summary.cargos > 0 ? (summary.xCobrar / summary.cargos) * 100 : 0

  const pieStyle = {
    background: 'conic-gradient(var(--norte-blue) 0 ' + pctCobrado + '%, var(--norte-orange) ' + pctCobrado + '% 100%)',
  }

  return (
    <div className="frq-analytics-pie frq-analytics-pie--legend-standard">
      <div className="frq-analytics-pie__visual" style={pieStyle}>
        <div className="frq-analytics-pie__center">
          <strong>{frqNumber(summary.cargos)}</strong>
          <span>cargos</span>
        </div>
      </div>

      <div className="frq-analytics-pie__legend">
        <div className="frq-analytics-pie__item">
          <span className="frq-analytics-pie__dot frq-analytics-pie__dot--blue" />
          <div>
            <strong>Cobrado {frqPercent(pctCobrado)}</strong>
            <small>{frqNumber(summary.cobrados)} cargos</small>
          </div>
        </div>

        <div className="frq-analytics-pie__item">
          <span className="frq-analytics-pie__dot frq-analytics-pie__dot--orange" />
          <div>
            <strong>X Cobrar {frqPercent(pctXCobrar)}</strong>
            <small>{frqNumber(summary.xCobrar)} cargos</small>
          </div>
        </div>
      </div>
    </div>
  )
}







function FranquiciasIntegratedComparison({ rows = [] }) {
  const chartRows = frqCleanRows(rows)
    .slice()
    .sort((left, right) => {
      const leftMetrics = frqRowMetrics(left)
      const rightMetrics = frqRowMetrics(right)

      if (rightMetrics.xCobrar !== leftMetrics.xCobrar) {
        return rightMetrics.xCobrar - leftMetrics.xCobrar
      }

      return rightMetrics.montoXCobrar - leftMetrics.montoXCobrar
    })

  if (!chartRows.length) {
    return (
      <div className="portal-feedback">
        Sin registros para mostrar.
      </div>
    )
  }

  return (
    <div className="frq-integrated-chart">
      <div className="frq-integrated-chart__head">
        <span>Franquicia</span>
        <span>X Cobrar</span>
        <span>Mto. X Cobrar</span>
        <span>% X Cobrar / % Cobrado</span>
        <span>Cobrados</span>
        <span>Mto. Cobrado</span>
      </div>

      <div className="frq-integrated-chart__list">
        {chartRows.map((row, index) => {
          const metrics = frqRowMetrics(row)
          const pendingBasis = Math.max(metrics.pctXCobrar, 0.001)
          const paidBasis = Math.max(metrics.pctCobrado, 0.001)

          return (
            <article
              className="frq-integrated-chart__row"
              key={frqRowZone(row) + '-' + frqRowName(row) + '-' + index}
            >
              <div className="frq-integrated-chart__name">
                <strong>{frqRowName(row)}</strong>
                <small>{frqRowZone(row)}</small>
              </div>

              <div className="frq-integrated-chart__metric frq-integrated-chart__metric--pending">
                <strong>{frqNumber(metrics.xCobrar)}</strong>
              </div>

              <div className="frq-integrated-chart__metric frq-integrated-chart__metric--pending">
                <strong>{frqMoney(metrics.montoXCobrar)}</strong>
              </div>

              <div className="frq-integrated-chart__bar-block">
                <div className="frq-integrated-chart__bar-meta">
                  <span>{frqPercent(metrics.pctXCobrar)}</span>
                  <span>{frqPercent(metrics.pctCobrado)}</span>
                </div>

                <div
                  className="frq-integrated-chart__bar"
                  style={{ gridTemplateColumns: pendingBasis + 'fr 10px ' + paidBasis + 'fr' }}
                >
                  <span className="frq-integrated-chart__bar-pending" />
                  <span className="frq-integrated-chart__bar-divider" />
                  <span className="frq-integrated-chart__bar-paid" />
                </div>
              </div>

              <div className="frq-integrated-chart__metric frq-integrated-chart__metric--paid">
                <strong>{frqNumber(metrics.cobrados)}</strong>
              </div>

              <div className="frq-integrated-chart__metric frq-integrated-chart__metric--paid">
                <strong>{frqMoney(metrics.montoCobrado)}</strong>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function FranquiciasPostChargeSummary({ rows = [] }) {
  const summary = frqSummary(rows)
  const groups = [
    {
      title: 'Cargos posteriores',
      tone: 'primary',
      metrics: [
        { label: 'Cantidad', value: frqNumber(summary.cargosPosteriores) },
        { label: 'Monto total', value: frqMoney(summary.montoPosterior) },
        { label: 'Descuentos / ajustes', value: frqMoney(summary.montoPosteriorAjuste) },
      ],
    },
    {
      title: 'Cobrados',
      tone: 'paid',
      metrics: [
        { label: 'Cantidad', value: frqNumber(summary.posteriorCobrado) },
        { label: 'Monto cobrado', value: frqMoney(summary.montoPosteriorCobrado) },
      ],
    },
    {
      title: 'Por cobrar',
      tone: 'pending',
      metrics: [
        { label: 'Cantidad', value: frqNumber(summary.posteriorPorCobrar) },
        { label: 'Monto pendiente', value: frqMoney(summary.montoPosteriorPorCobrar) },
      ],
    },
    {
      title: 'Recuperados',
      tone: 'recovered',
      metrics: [
        { label: 'Cantidad', value: frqNumber(summary.recuperados) },
        { label: 'Monto recuperado', value: frqMoney(summary.montoRecuperado) },
      ],
    },
  ]

  const reconciledAmount =
    summary.montoPosteriorCobrado +
    summary.montoPosteriorPorCobrar +
    summary.montoPosteriorAjuste
  const reconciliationOk = Math.abs(summary.montoPosterior - reconciledAmount) < 0.01

  return (
    <section className="portal-card frq-post-summary">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">Cargos posteriores y recuperación</h3>
          <p className="portal-card__subtitle">
            Cantidades y montos organizados por estado después de la carga masiva.
          </p>
        </div>
      </header>

      <div className="portal-card__body">
        <div className="frq-post-summary__groups">
          {groups.map((group) => (
            <article
              className={'frq-post-group frq-post-group--' + group.tone}
              key={group.title}
            >
              <h4>{group.title}</h4>
              <div className="frq-post-group__metrics">
                {group.metrics.map((metric) => (
                  <div className="frq-post-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div
          className={
            'frq-post-reconciliation ' +
            (reconciliationOk
              ? 'frq-post-reconciliation--ok'
              : 'frq-post-reconciliation--warning')
          }
        >
          <span>Conciliación del monto posterior</span>
          <strong>
            {frqMoney(summary.montoPosterior)} = {frqMoney(summary.montoPosteriorCobrado)} +{' '}
            {frqMoney(summary.montoPosteriorPorCobrar)} + {frqMoney(summary.montoPosteriorAjuste)}
          </strong>
        </div>
      </div>
    </section>
  )
}

// FRQ_ANALYTICS_COMPONENTS_END

function CobranzaFranquiciasFilters({ filters, loading, onApply }) {
  const resolvedPeriod = filters?.periodo || getDefaultPeriodValue()
  const [draftPeriod, setDraftPeriod] = useState(resolvedPeriod)

  useEffect(() => {
    setDraftPeriod(filters?.periodo || getDefaultPeriodValue())
  }, [filters?.periodo])

  const periodLabel = useMemo(
    () => formatPeriodDisplayLabel(draftPeriod),
    [draftPeriod],
  )

  const handleSubmit = (event) => {
    event.preventDefault()

    onApply({
      periodo: draftPeriod || getDefaultPeriodValue(),
      zona: '',
      franquicia: '',
    })
  }

  return (
    <form className="cobranza-franquicias-period-dashboard" onSubmit={handleSubmit}>
      <div className="cobranza-franquicias-period-dashboard__head">
        <span>PERIODO</span>
        <strong>{periodLabel}</strong>
      </div>

      <div className="cobranza-franquicias-period-dashboard__body">
        <label className="cobranza-franquicias-period-dashboard__input-wrap">
          <span className="cobranza-franquicias-period-dashboard__calendar" aria-hidden="true">
            📅
          </span>
          <input
            type="month"
            name="periodo"
            value={draftPeriod}
            onChange={(event) => setDraftPeriod(event.target.value)}
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          className="portal-filter-action portal-filter-action--primary cobranza-franquicias-period-dashboard__button"
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Cargar'}
        </button>
      </div>
    </form>
  )
}











function ZoneRadialSelector({
  hierarchy = [],
  selectedZoneKey = '',
  onSelectZone,
  summary = null,
}) {
  const layout = useMemo(() => buildZoneLayout(hierarchy), [hierarchy])

  const totalPendingAmount = hierarchy.reduce(
    (sum, zone) => sum + normalizeNumber(zone.montoPorCobrar),
    0,
  )
  const totalPendingClients = hierarchy.reduce(
    (sum, zone) => sum + normalizeNumber(zone.porCobrar),
    0,
  )

  const fallbackSummary = {
    franquicias: hierarchy.reduce((sum, zone) => sum + ensureArray(zone.offices).length, 0),
    cargos: hierarchy.reduce((sum, zone) => sum + normalizeNumber(zone.cargos), 0),
    cobrado: hierarchy.reduce((sum, zone) => sum + normalizeNumber(zone.cobrado), 0),
    porCobrar: hierarchy.reduce((sum, zone) => sum + normalizeNumber(zone.porCobrar), 0),
    montoCargos: hierarchy.reduce((sum, zone) => sum + normalizeNumber(zone.montoCargos), 0),
    montoCobrado: hierarchy.reduce((sum, zone) => sum + normalizeNumber(zone.montoCobrado), 0),
    montoPorCobrar: hierarchy.reduce((sum, zone) => sum + normalizeNumber(zone.montoPorCobrar), 0),
  }

  const metricSummary = summary || fallbackSummary
  const totalCargos = normalizeNumber(metricSummary.cargos)
  const cargosCobrados = normalizeNumber(metricSummary.cobrado)
  const cargosPorCobrar = normalizeNumber(metricSummary.porCobrar)

  const pctCobrados = totalCargos > 0 ? cargosCobrados / totalCargos : 0
  const pctPorCobrar = totalCargos > 0 ? cargosPorCobrar / totalCargos : 0

  const formatMetricPercent = (value) =>
    new Intl.NumberFormat('es-VE', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0)

  if (!hierarchy.length) {
    return (
      <div className="portal-feedback">
        Sin datos válidos por zona para construir el selector.
      </div>
    )
  }

  return (
    <div className="cobranza-zone-radial cobranza-zone-radial--with-metrics">
      <div className="cobranza-zone-radial__main">
        <div className="cobranza-zone-radial__canvas">
          <svg
            className="cobranza-zone-radial__svg"
            viewBox={'0 0 ' + layout.width + ' ' + layout.height}
            role="img"
            aria-label="Selector radial de zonas con total por cobrar"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="cobranza-zone-core-gradient" cx="50%" cy="44%" r="62%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="100%" stopColor="rgba(237,244,252,0.98)" />
              </radialGradient>

              <filter id="cobranza-zone-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow
                  dx="0"
                  dy="10"
                  stdDeviation="10"
                  floodColor="rgba(15, 61, 130, 0.15)"
                />
              </filter>
            </defs>

            {[...Array(40)].map((_, index) => (
              <line
                key={'grid-x-' + index}
                x1={50 + index * 30}
                y1="28"
                x2={50 + index * 30}
                y2="412"
                className="cobranza-zone-radial__grid-line"
              />
            ))}

            {[...Array(13)].map((_, index) => (
              <line
                key={'grid-y-' + index}
                x1="50"
                y1={28 + index * 30}
                x2="1230"
                y2={28 + index * 30}
                className="cobranza-zone-radial__grid-line"
              />
            ))}

            {layout.zones.map((zone) => {
              const selected = selectedZoneKey === zone.key
              const muted = Boolean(selectedZoneKey) && !selected

              return (
                <line
                  key={'branch-' + zone.key}
                  x1={layout.center.x}
                  y1={layout.center.y}
                  x2={zone.x}
                  y2={zone.y}
                  className={[
                    'cobranza-zone-radial__branch',
                    selected ? 'is-selected' : '',
                    muted ? 'is-muted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )
            })}

            <circle
              cx={layout.center.x}
              cy={layout.center.y}
              r="96"
              className={[
                'cobranza-zone-radial__core-halo',
                !selectedZoneKey ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectZone('')}
            />

            <circle
              cx={layout.center.x}
              cy={layout.center.y}
              r="76"
              fill="url(#cobranza-zone-core-gradient)"
              className={[
                'cobranza-zone-radial__core',
                !selectedZoneKey ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              filter="url(#cobranza-zone-shadow)"
              onClick={() => onSelectZone('')}
            />

            <text
              x={layout.center.x}
              y={layout.center.y - 18}
              textAnchor="middle"
              className="cobranza-zone-radial__core-title"
            >
              TOTAL POR
            </text>
            <text
              x={layout.center.x}
              y={layout.center.y + 4}
              textAnchor="middle"
              className="cobranza-zone-radial__core-title"
            >
              COBRAR
            </text>
            <text
              x={layout.center.x}
              y={layout.center.y + 34}
              textAnchor="middle"
              className="cobranza-zone-radial__core-value"
            >
              {formatMoney(totalPendingAmount)}
            </text>
            <text
              x={layout.center.x}
              y={layout.center.y + 55}
              textAnchor="middle"
              className="cobranza-zone-radial__core-meta"
            >
              {formatNumber(totalPendingClients)} clientes
            </text>

            {layout.zones.map((zone) => {
              const selected = selectedZoneKey === zone.key
              const muted = Boolean(selectedZoneKey) && !selected

              return (
                <g
                  key={'zone-' + zone.key}
                  className={[
                    'cobranza-zone-radial__zone',
                    selected ? 'is-selected' : '',
                    muted ? 'is-muted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    onSelectZone(selected ? '' : zone.key)
                  }}
                >
                  <title>
                    {zone.label} · {formatMoney(zone.montoPorCobrar)} · {formatNumber(zone.porCobrar)} clientes por cobrar
                  </title>

                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r={zone.r + 10}
                    className="cobranza-zone-radial__zone-halo"
                  />

                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r={zone.r}
                    className="cobranza-zone-radial__zone-node"
                    filter="url(#cobranza-zone-shadow)"
                  />

                  <text
                    x={zone.x}
                    y={zone.y - 15}
                    textAnchor="middle"
                    className="cobranza-zone-radial__zone-title"
                  >
                    {zone.label}
                  </text>

                  <text
                    x={zone.x}
                    y={zone.y + 9}
                    textAnchor="middle"
                    className="cobranza-zone-radial__zone-amount"
                  >
                    {formatMoney(zone.montoPorCobrar)}
                  </text>

                  <text
                    x={zone.x}
                    y={zone.y + 29}
                    textAnchor="middle"
                    className="cobranza-zone-radial__zone-meta"
                  >
                    {formatNumber(zone.porCobrar)} clientes
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="cobranza-zone-radial__footer">
          <span>
            Zonas visibles: <strong>{formatNumber(hierarchy.length)}</strong>
          </span>
          <span>
            Tamaño burbuja: <strong>monto por cobrar</strong>
          </span>
          <span>
            Click en zona: <strong>filtra los comparativos</strong>
          </span>
        </div>
      </div>

      <aside className="cobranza-zone-radial__metrics" aria-label="Resumen del contexto seleccionado">
        <div className="cobranza-zone-radial__metric-top">
          <article className="kpi-card cobranza-zone-context-card cobranza-zone-context-card--total">
            <span className="kpi-card__title">Total franquicias</span>
            <strong className="kpi-card__value">{formatNumber(metricSummary.franquicias)}</strong>
          </article>

          <article className="kpi-card cobranza-zone-context-card cobranza-zone-context-card--total">
            <span className="kpi-card__title">Total cargos</span>
            <strong className="kpi-card__value">{formatNumber(metricSummary.cargos)}</strong>
          </article>

          <article className="kpi-card cobranza-zone-context-card cobranza-zone-context-card--total">
            <span className="kpi-card__title">Total Mto. cargos</span>
            <strong className="kpi-card__value">{formatMoney(metricSummary.montoCargos)}</strong>
          </article>
        </div>

        <div className="cobranza-zone-radial__metric-split">
          <div className="cobranza-zone-radial__metric-column cobranza-zone-radial__metric-column--paid">
            <article className="kpi-card cobranza-zone-context-card">
              <span className="kpi-card__title">Cargos cobrados</span>
              <strong className="kpi-card__value">{formatNumber(metricSummary.cobrado)}</strong>
            </article>

            <article className="kpi-card cobranza-zone-context-card">
              <span className="kpi-card__title">% cargos cobrados</span>
              <strong className="kpi-card__value">{formatMetricPercent(pctCobrados)}</strong>
            </article>

            <article className="kpi-card cobranza-zone-context-card">
              <span className="kpi-card__title">Mto. cargos cobrados</span>
              <strong className="kpi-card__value">{formatMoney(metricSummary.montoCobrado)}</strong>
            </article>
          </div>

          <div className="cobranza-zone-radial__metric-column cobranza-zone-radial__metric-column--pending">
            <article className="kpi-card cobranza-zone-context-card">
              <span className="kpi-card__title">Cargos por cobrar</span>
              <strong className="kpi-card__value">{formatNumber(metricSummary.porCobrar)}</strong>
            </article>

            <article className="kpi-card cobranza-zone-context-card">
              <span className="kpi-card__title">% cargos por cobrar</span>
              <strong className="kpi-card__value">{formatMetricPercent(pctPorCobrar)}</strong>
            </article>

            <article className="kpi-card cobranza-zone-context-card">
              <span className="kpi-card__title">Monto cargos por cobrar</span>
              <strong className="kpi-card__value">{formatMoney(metricSummary.montoPorCobrar)}</strong>
            </article>
          </div>
        </div>
      </aside>
    </div>
  )
}








function CobranzaFranquicias() {
  const [filters, setFilters] = useState(() => ({
    periodo: getDefaultPeriodValue(),
    zona: '',
    franquicia: '',
  }))
  const [visualFilter, setVisualFilter] = useState({
    zoneKey: '',
    officeKey: '',
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const baseParams = new URLSearchParams()
        baseParams.set('limit', '5000')

        if (filters.periodo) baseParams.set('periodo', filters.periodo)
        if (filters.franquicia) baseParams.set('franquicia', filters.franquicia)

        const regionParams = new URLSearchParams(baseParams)

        if (filters.zona) {
          regionParams.set('zona', filters.zona)
        }

        const regionesResponse = await apiGet(`/api/cobranza/regiones?${regionParams.toString()}`)
        const regiones = normalizeRegionRows(regionesResponse)

        const zonasParaCargar = regiones.length
          ? regiones
          : filters.zona
            ? [{ key: normalizeComparable(filters.zona), label: filters.zona }]
            : []

        let franquicias = []

        if (zonasParaCargar.length) {
          const franquiciasPorZona = await Promise.all(
            zonasParaCargar.map(async (zona) => {
              const params = new URLSearchParams(baseParams)
              params.set('zona', zona.label)

              const response = await apiGet(`/api/cobranza/franquicias?${params.toString()}`)

              return normalizeFranquiciaRows(response, zona.label)
            }),
          )

          franquicias = franquiciasPorZona.flat()
        }

        if (!franquicias.length) {
          const fallbackParams = new URLSearchParams(baseParams)

          if (filters.zona) {
            fallbackParams.set('zona', filters.zona)
          }

          const fallbackResponse = await apiGet(`/api/cobranza/franquicias?${fallbackParams.toString()}`)
          franquicias = normalizeFranquiciaRows(fallbackResponse, filters.zona || '')
        }

        if (!cancelled) {
          setData({
            rows: franquicias,
            regiones,
            meta: {
              totalRegistros: franquicias.length,
              totalZonas: regiones.length,
            },
          })
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'No fue posible cargar la información de franquicias.')
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [filters.periodo, filters.zona, filters.franquicia])

  const aggregateRows = useMemo(() => normalizeFranquiciaRows(data), [data])
  const hierarchy = useMemo(() => buildHierarchy(aggregateRows), [aggregateRows])

  const selectedZoneKey = visualFilter.zoneKey

  const displayRows = useMemo(() => {
    let rows = ensureArray(aggregateRows)

    if (visualFilter.zoneKey) {
      rows = rows.filter((row) => row.zonaKey === visualFilter.zoneKey)
    }

    if (visualFilter.officeKey) {
      rows = rows.filter((row) => row.franquiciaKey === visualFilter.officeKey)
    }

    return rows
  }, [aggregateRows, visualFilter.zoneKey, visualFilter.officeKey])

  const summary = useMemo(() => buildSummary(displayRows), [displayRows])

  const handleApplyFilters = (nextFilters) => {
    setFilters(nextFilters)
    setVisualFilter({
      zoneKey: '',
      officeKey: '',
    })
  }

  const handleSelectZone = (zoneKey) => {
    setVisualFilter((current) => {
      if (!zoneKey) {
        return {
          zoneKey: '',
          officeKey: '',
        }
      }

      if (current.zoneKey === zoneKey && !current.officeKey) {
        return {
          zoneKey: '',
          officeKey: '',
        }
      }

      return {
        zoneKey,
        officeKey: '',
      }
    })
  }

  const handleSelectOffice = (officeKey) => {
    setVisualFilter((current) => ({
      ...current,
      officeKey,
    }))
  }

  return (
    <ModulePage
      title="Cobranza · Franquicias"
      description="Vista consolidada por franquicia para seguimiento operativo de cobranza."
    >
      <div className="cobranza-franquicias-page">

        <div className="cobranza-franquicias-page__header">
<div className="cobranza-franquicias-page__period-slot">
            <CobranzaFranquiciasFilters
              filters={filters}
              loading={loading}
              onApply={handleApplyFilters}
            />
          </div>
        </div>
        <CobranzaStatus loading={loading} error={error} />

        {!loading && !error ? (
          <>
            <div className="cobranza-franquicias-kpis">
              <article className="kpi-card">
                <span className="kpi-card__title">Franquicias</span>
                <strong className="kpi-card__value">{formatNumber(summary.franquicias)}</strong>
              </article>

              <article className="kpi-card">
                <span className="kpi-card__title">Cargos</span>
                <strong className="kpi-card__value">{formatNumber(summary.cargos)}</strong>
              </article>

              <article className="kpi-card">
                <span className="kpi-card__title">Por cobrar</span>
                <strong className="kpi-card__value">{formatNumber(summary.porCobrar)}</strong>
              </article>

              <article className="kpi-card">
                <span className="kpi-card__title">Monto por cobrar</span>
                <strong className="kpi-card__value">{formatMoney(summary.montoPorCobrar)}</strong>
              </article>
            </div>

            <CobranzaChartCard
              title="Total por cobrar por zona"
              subtitle="Selector radial por zona. El tamaño de la burbuja representa monto por cobrar; clic filtra los comparativos."
            >
              <ZoneRadialSelector
                summary={summary}
                hierarchy={hierarchy}
                selectedZoneKey={visualFilter.zoneKey}
                onSelectZone={handleSelectZone}
              />
            </CobranzaChartCard>

            

            
            <div className="cobranza-franquicias-analytics-grid">
              <CobranzaChartCard
                title="% Cobrado y % X Cobrar"
                subtitle="Distribucion de contratos cobrados contra contratos pendientes."
              >
                <FranquiciasPieSummary rows={displayRows} />
              </CobranzaChartCard>

              <CobranzaChartCard
                title="Clientes por cobrar vs cobrados por franquicia"
                subtitle="Vista integrada: franquicia, X cobrar, monto, porcentaje, cobrados y monto cobrado."
              >
                <FranquiciasIntegratedComparison rows={displayRows} />
              </CobranzaChartCard>
            </div>

            <FranquiciasPostChargeSummary rows={displayRows} />
          </>
        ) : null}
      </div>
    </ModulePage>
  )
}

export default CobranzaFranquicias
