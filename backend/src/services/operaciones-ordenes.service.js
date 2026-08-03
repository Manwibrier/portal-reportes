// src/services/operaciones-ordenes.service.js

const { query } = require('../config/database')

const VIEW_NAME = 'powerbi.resumen_ordenes_servicio'

const SUMMARY_COLUMNS = [
  'pendientes_meses_anteriores',
  'finalizadas_meses_anteriores',
  'canceladas_meses_anteriores',
  'generadas_mes_actual',
  'pendienes_mes_actual',
  'finalizadas_mes_actual',
  'canceladas_mes_actual',
]

const TEXT_FILTERS = [
  ['zona', "COALESCE(NULLIF(TRIM(zona::text), ''), 'SIN ZONA')"],
  ['franquicia', "COALESCE(NULLIF(TRIM(franquicia::text), ''), 'SIN FRANQUICIA')"],
  ['servicio', "COALESCE(NULLIF(TRIM(servicio::text), ''), 'SIN SERVICIO')"],
  ['tipoServicio', "COALESCE(NULLIF(TRIM(tipo_servicio::text), ''), 'SIN TIPO SERVICIO')"],
  ['tipo_servicio', "COALESCE(NULLIF(TRIM(tipo_servicio::text), ''), 'SIN TIPO SERVICIO')"],
  ['tipoOrden', "COALESCE(NULLIF(TRIM(tipo_orden::text), ''), 'SIN TIPO ORDEN')"],
  ['tipo_orden', "COALESCE(NULLIF(TRIM(tipo_orden::text), ''), 'SIN TIPO ORDEN')"],
]

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function round(value, decimals = 2) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return 0

  const factor = 10 ** decimals
  return Math.round(numericValue * factor) / factor
}

function calculatePercentage(numerator, denominator, decimals = 2) {
  const safeNumerator = normalizeNumber(numerator)
  const safeDenominator = normalizeNumber(denominator)

  if (safeDenominator <= 0) return 0

  return round((safeNumerator / safeDenominator) * 100, decimals)
}

function normalizeCompare(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function toDateOnly(value) {
  if (!value) return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const text = normalizeText(value)

  if (!text) return null

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const veMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (veMatch) return `${veMatch[3]}-${veMatch[2]}-${veMatch[1]}`

  const parsed = new Date(text)

  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

function isValidDate(value) {
  return Boolean(toDateOnly(value))
}

function getCurrentPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getPeriodFromFilters(filters = {}) {
  const periodo = normalizeText(filters.periodo)

  if (/^\d{4}-\d{2}$/.test(periodo)) return periodo

  return getCurrentPeriod()
}

function getMetricSumExpression(alias = '') {
  const prefix = alias ? `${alias}.` : ''

  return SUMMARY_COLUMNS.map((column) => `COALESCE(${prefix}${column}, 0)`).join(
    ' + ',
  )
}

function shouldApplyFilter(value) {
  const text = normalizeText(value)
  const compare = normalizeCompare(text)

  if (!text) return false

  return ![
    'TODAS',
    'TODOS',
    'ALL',
    'TODAS LAS ZONAS',
    'TODAS LAS FRANQUICIAS',
    'TODOS LOS SERVICIOS',
    'TODOS LOS TIPOS',
  ].includes(compare)
}

function addDateFilters(where, params, filters = {}) {
  const fechaDesde = toDateOnly(filters.fechaDesde)
  const fechaHasta = toDateOnly(filters.fechaHasta)

  if (fechaDesde) {
    params.push(fechaDesde)
    where.push(`fecha::date >= $${params.length}::date`)
  }

  if (fechaHasta) {
    params.push(fechaHasta)
    where.push(`fecha::date <= $${params.length}::date`)
  }

  if (!fechaDesde && !fechaHasta && /^\d{4}-\d{2}$/.test(normalizeText(filters.periodo))) {
    params.push(`${filters.periodo}-01`)
    where.push(`fecha::date >= $${params.length}::date`)

    params.push(`${filters.periodo}-01`)
    where.push(`fecha::date < ($${params.length}::date + INTERVAL '1 month')`)
  }
}

function buildWhereClause(filters = {}) {
  const where = [`(${getMetricSumExpression()}) > 0`]
  const params = []

  TEXT_FILTERS.forEach(([filterKey, expression]) => {
    const value = filters[filterKey]

    if (!shouldApplyFilter(value)) return

    params.push(normalizeText(value))
    where.push(
      `UPPER(TRIM(${expression})) = UPPER(TRIM($${params.length}::text))`,
    )
  })

  addDateFilters(where, params, filters)

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  }
}

async function fetchResumenRows(filters = {}) {
  const { clause, params } = buildWhereClause(filters)

  const sql = `
    SELECT
      fecha::date AS fecha,
      fecha_registro,
      fecha_asignacion,
      fecha_finalizacion,
      COALESCE(NULLIF(TRIM(zona::text), ''), 'SIN ZONA') AS zona,
      COALESCE(NULLIF(TRIM(franquicia::text), ''), 'SIN FRANQUICIA') AS franquicia,
      COALESCE(NULLIF(TRIM(servicio::text), ''), 'SIN SERVICIO') AS servicio,
      COALESCE(NULLIF(TRIM(tipo_servicio::text), ''), 'SIN TIPO SERVICIO') AS tipo_servicio,
      COALESCE(NULLIF(TRIM(tipo_orden::text), ''), 'SIN TIPO ORDEN') AS tipo_orden,
      COALESCE(pendientes_meses_anteriores, 0)::bigint AS pendientes_meses_anteriores,
      COALESCE(finalizadas_meses_anteriores, 0)::bigint AS finalizadas_meses_anteriores,
      COALESCE(canceladas_meses_anteriores, 0)::bigint AS canceladas_meses_anteriores,
      COALESCE(generadas_mes_actual, 0)::bigint AS generadas_mes_actual,
      COALESCE(pendienes_mes_actual, 0)::bigint AS pendienes_mes_actual,
      COALESCE(finalizadas_mes_actual, 0)::bigint AS finalizadas_mes_actual,
      COALESCE(canceladas_mes_actual, 0)::bigint AS canceladas_mes_actual,
      COALESCE(ordenes_servicio, '') AS ordenes_servicio,
      COALESCE(contratos, '') AS contratos
    FROM ${VIEW_NAME}
    ${clause}
    ORDER BY fecha NULLS LAST, zona, franquicia, servicio, tipo_servicio, tipo_orden
  `

  const result = await query(sql, params)

  return Array.isArray(result?.rows) ? result.rows : []
}

async function fetchCatalogs() {
  const metricExpression = getMetricSumExpression('base')

  const sql = `
    WITH base AS (
      SELECT
        COALESCE(NULLIF(TRIM(zona::text), ''), 'SIN ZONA') AS zona,
        COALESCE(NULLIF(TRIM(franquicia::text), ''), 'SIN FRANQUICIA') AS franquicia,
        COALESCE(NULLIF(TRIM(servicio::text), ''), 'SIN SERVICIO') AS servicio,
        COALESCE(NULLIF(TRIM(tipo_servicio::text), ''), 'SIN TIPO SERVICIO') AS tipo_servicio,
        COALESCE(NULLIF(TRIM(tipo_orden::text), ''), 'SIN TIPO ORDEN') AS tipo_orden,
        pendientes_meses_anteriores,
        finalizadas_meses_anteriores,
        canceladas_meses_anteriores,
        generadas_mes_actual,
        pendienes_mes_actual,
        finalizadas_mes_actual,
        canceladas_mes_actual
      FROM ${VIEW_NAME} base
      WHERE (${metricExpression}) > 0
    )
    SELECT
      (
        SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
        FROM (SELECT DISTINCT zona AS value FROM base WHERE zona <> '') catalog
      ) AS zonas,
      (
        SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
        FROM (SELECT DISTINCT franquicia AS value FROM base WHERE franquicia <> '') catalog
      ) AS franquicias,
      (
        SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
        FROM (SELECT DISTINCT servicio AS value FROM base WHERE servicio <> '') catalog
      ) AS servicios,
      (
        SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
        FROM (SELECT DISTINCT tipo_servicio AS value FROM base WHERE tipo_servicio <> '') catalog
      ) AS tipos_servicio,
      (
        SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
        FROM (SELECT DISTINCT tipo_orden AS value FROM base WHERE tipo_orden <> '') catalog
      ) AS tipos_orden
  `

  const result = await query(sql)
  const row = result?.rows?.[0] || {}

  return {
    zonas: Array.isArray(row.zonas) ? row.zonas : [],
    franquicias: Array.isArray(row.franquicias) ? row.franquicias : [],
    servicios: Array.isArray(row.servicios) ? row.servicios : [],
    tiposServicio: Array.isArray(row.tipos_servicio) ? row.tipos_servicio : [],
    tiposOrden: Array.isArray(row.tipos_orden) ? row.tipos_orden : [],
  }
}

function splitList(value) {
  return normalizeText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeResumenRow(row = {}, index = 0) {
  const pendientesMesesAnteriores = normalizeNumber(
    row.pendientes_meses_anteriores,
  )
  const finalizadasMesesAnteriores = normalizeNumber(
    row.finalizadas_meses_anteriores,
  )
  const canceladasMesesAnteriores = normalizeNumber(
    row.canceladas_meses_anteriores,
  )
  const generadasMesActual = normalizeNumber(row.generadas_mes_actual)
  const pendientesMesActual = normalizeNumber(row.pendienes_mes_actual)
  const finalizadasMesActual = normalizeNumber(row.finalizadas_mes_actual)
  const canceladasMesActual = normalizeNumber(row.canceladas_mes_actual)
  const ordenesServicio = splitList(row.ordenes_servicio)
  const contratos = splitList(row.contratos)
  const fecha = toDateOnly(row.fecha)

  return {
    id: [
      fecha || 'sin-fecha',
      normalizeText(row.zona, 'SIN ZONA'),
      normalizeText(row.franquicia, 'SIN FRANQUICIA'),
      normalizeText(row.servicio, 'SIN SERVICIO'),
      normalizeText(row.tipo_servicio, 'SIN TIPO SERVICIO'),
      normalizeText(row.tipo_orden, 'SIN TIPO ORDEN'),
      index,
    ].join('|'),

    fecha,
    fechaRegistro: toDateOnly(row.fecha_registro),
    fechaAsignacion: toDateOnly(row.fecha_asignacion),
    fechaFinalizacion: toDateOnly(row.fecha_finalizacion),

    zona: normalizeText(row.zona, 'SIN ZONA'),
    franquicia: normalizeText(row.franquicia, 'SIN FRANQUICIA'),
    servicio: normalizeText(row.servicio, 'SIN SERVICIO'),
    tipoServicio: normalizeText(row.tipo_servicio, 'SIN TIPO SERVICIO'),
    tipoOrden: normalizeText(row.tipo_orden, 'SIN TIPO ORDEN'),

    pendientesMesesAnteriores,
    finalizadasMesesAnteriores,
    canceladasMesesAnteriores,
    generadasMesActual,
    pendientesMesActual,
    finalizadasMesActual,
    canceladasMesActual,

    totalPendientes: pendientesMesesAnteriores + pendientesMesActual,
    totalFinalizadas: finalizadasMesesAnteriores + finalizadasMesActual,
    totalCanceladas: canceladasMesesAnteriores + canceladasMesActual,
    backlogAnteriorGestionado:
      pendientesMesesAnteriores +
      finalizadasMesesAnteriores +
      canceladasMesesAnteriores,
    baseOperativa:
      pendientesMesesAnteriores +
      finalizadasMesesAnteriores +
      canceladasMesesAnteriores +
      generadasMesActual,

    ordenesServicio,
    ordenesServicioTexto: normalizeText(row.ordenes_servicio),
    ordenesServicioCantidad: ordenesServicio.length,
    contratos,
    contratosTexto: normalizeText(row.contratos),
    contratosCantidad: contratos.length,
  }
}

function sumRows(rows = [], key) {
  return rows.reduce((total, row) => total + normalizeNumber(row[key]), 0)
}

function buildKpis(rows = []) {
  const pendientesMesesAnteriores = sumRows(rows, 'pendientesMesesAnteriores')
  const finalizadasMesesAnteriores = sumRows(rows, 'finalizadasMesesAnteriores')
  const canceladasMesesAnteriores = sumRows(rows, 'canceladasMesesAnteriores')
  const generadasMesActual = sumRows(rows, 'generadasMesActual')
  const pendientesMesActual = sumRows(rows, 'pendientesMesActual')
  const finalizadasMesActual = sumRows(rows, 'finalizadasMesActual')
  const canceladasMesActual = sumRows(rows, 'canceladasMesActual')

  const totalPendientes = pendientesMesesAnteriores + pendientesMesActual
  const totalFinalizadas = finalizadasMesesAnteriores + finalizadasMesActual
  const totalCanceladas = canceladasMesesAnteriores + canceladasMesActual
  const backlogAnteriorGestionado =
    pendientesMesesAnteriores +
    finalizadasMesesAnteriores +
    canceladasMesesAnteriores
  const baseOperativa = backlogAnteriorGestionado + generadasMesActual
  const cierreMesActual =
    pendientesMesActual + finalizadasMesActual + canceladasMesActual

  return {
    pendientesMesesAnteriores,
    finalizadasMesesAnteriores,
    canceladasMesesAnteriores,
    generadasMesActual,
    pendientesMesActual,
    finalizadasMesActual,
    canceladasMesActual,

    totalPendientes,
    totalFinalizadas,
    totalCanceladas,
    backlogAnteriorGestionado,
    baseOperativa,
    cierreMesActual,

    tasaFinalizacionMesActualPct: calculatePercentage(
      finalizadasMesActual,
      generadasMesActual,
    ),
    tasaCancelacionMesActualPct: calculatePercentage(
      canceladasMesActual,
      generadasMesActual,
    ),
    tasaPendienteMesActualPct: calculatePercentage(
      pendientesMesActual,
      generadasMesActual,
    ),
    tasaDepuracionBacklogPct: calculatePercentage(
      finalizadasMesesAnteriores + canceladasMesesAnteriores,
      backlogAnteriorGestionado,
    ),
    tasaFinalizacionTotalPct: calculatePercentage(totalFinalizadas, baseOperativa),

    totalRegistros: rows.length,
  }
}

function makeGroupKey(value, fallback = 'SIN CLASIFICAR') {
  return normalizeText(value, fallback)
}

function buildAggregation(rows = [], labelGetter, options = {}) {
  const map = new Map()
  const limit = normalizeNumber(options.limit, 20)
  const sortKey = normalizeText(options.sortKey, 'total')

  rows.forEach((row) => {
    const label = makeGroupKey(labelGetter(row))
    const key = normalizeCompare(label)

    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        pendientesMesesAnteriores: 0,
        finalizadasMesesAnteriores: 0,
        canceladasMesesAnteriores: 0,
        generadasMesActual: 0,
        pendientesMesActual: 0,
        finalizadasMesActual: 0,
        canceladasMesActual: 0,
        totalPendientes: 0,
        totalFinalizadas: 0,
        totalCanceladas: 0,
        baseOperativa: 0,
        total: 0,
      })
    }

    const target = map.get(key)

    target.pendientesMesesAnteriores += normalizeNumber(
      row.pendientesMesesAnteriores,
    )
    target.finalizadasMesesAnteriores += normalizeNumber(
      row.finalizadasMesesAnteriores,
    )
    target.canceladasMesesAnteriores += normalizeNumber(
      row.canceladasMesesAnteriores,
    )
    target.generadasMesActual += normalizeNumber(row.generadasMesActual)
    target.pendientesMesActual += normalizeNumber(row.pendientesMesActual)
    target.finalizadasMesActual += normalizeNumber(row.finalizadasMesActual)
    target.canceladasMesActual += normalizeNumber(row.canceladasMesActual)
    target.totalPendientes += normalizeNumber(row.totalPendientes)
    target.totalFinalizadas += normalizeNumber(row.totalFinalizadas)
    target.totalCanceladas += normalizeNumber(row.totalCanceladas)
    target.baseOperativa += normalizeNumber(row.baseOperativa)
    target.total += normalizeNumber(row.baseOperativa)
  })

  return Array.from(map.values())
    .sort((left, right) => {
      const byValue = normalizeNumber(right[sortKey]) - normalizeNumber(left[sortKey])
      if (byValue !== 0) return byValue
      return left.label.localeCompare(right.label, 'es', { sensitivity: 'base' })
    })
    .slice(0, limit)
}

function buildDailySeries(rows = []) {
  return buildAggregation(rows, (row) => row.fecha || 'SIN FECHA', {
    limit: 62,
    sortKey: 'baseOperativa',
  }).sort((left, right) => left.label.localeCompare(right.label))
}

function buildCharts(rows = []) {
  return {
    evolucionOperativaPorFecha: buildDailySeries(rows),
    pendientesPorZona: buildAggregation(rows, (row) => row.zona, {
      limit: 20,
      sortKey: 'totalPendientes',
    }),
    pendientesPorFranquicia: buildAggregation(rows, (row) => row.franquicia, {
      limit: 20,
      sortKey: 'totalPendientes',
    }),
    ordenesPorTipoOrden: buildAggregation(rows, (row) => row.tipoOrden, {
      limit: 24,
      sortKey: 'baseOperativa',
    }),
    ordenesPorServicio: buildAggregation(rows, (row) => row.servicio, {
      limit: 20,
      sortKey: 'baseOperativa',
    }),
    ordenesPorTipoServicio: buildAggregation(rows, (row) => row.tipoServicio, {
      limit: 20,
      sortKey: 'baseOperativa',
    }),
  }
}

function buildAppliedFilters(filters = {}) {
  return {
    periodo: getPeriodFromFilters(filters),
    fechaDesde: isValidDate(filters.fechaDesde) ? toDateOnly(filters.fechaDesde) : '',
    fechaHasta: isValidDate(filters.fechaHasta) ? toDateOnly(filters.fechaHasta) : '',
    zona: normalizeText(filters.zona),
    franquicia: normalizeText(filters.franquicia),
    servicio: normalizeText(filters.servicio),
    tipoServicio: normalizeText(filters.tipoServicio ?? filters.tipo_servicio),
    tipoOrden: normalizeText(filters.tipoOrden ?? filters.tipo_orden),
  }
}

async function getOrdenesServicioSummary(filters = {}) {
  const [rawRows, catalogs] = await Promise.all([
    fetchResumenRows(filters),
    fetchCatalogs(),
  ])

  const rows = rawRows.map((row, index) => normalizeResumenRow(row, index))
  const kpis = buildKpis(rows)
  const charts = buildCharts(rows)

  return {
    rows,
    kpis,
    charts,
    tables: {
      resumenOrdenesServicio: rows,
      ordenesServicio: rows,
      detalleOrdenes: rows,
    },
    filters: {
      zonas: catalogs.zonas,
      franquicias: catalogs.franquicias,
      servicios: catalogs.servicios,
      tiposServicio: catalogs.tiposServicio,
      tiposOrden: catalogs.tiposOrden,
      applied: buildAppliedFilters(filters),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      source: VIEW_NAME,
      viewMode: 'operativo_agregado_mes_actual',
      period: getPeriodFromFilters(filters),
      totalRows: rows.length,
      filteredRows: rows.length,
      warnings: [
        'La vista powerbi.resumen_ordenes_servicio calcula el mes actual usando CURRENT_DATE en PostgreSQL.',
        'La columna original pendienes_mes_actual se normaliza como pendientesMesActual en la API.',
        'La vista es agregada: ordenes_servicio y contratos se entregan como listas concatenadas por grupo.',
      ],
    },
  }
}

module.exports = {
  getOrdenesServicioSummary,

  // Alias conservado por compatibilidad con controladores/importaciones previas.
  getOrdenesServicio: getOrdenesServicioSummary,
}
