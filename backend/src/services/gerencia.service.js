const { query } = require('../config/database')
const { env } = require('../config/env')
const {
  DEFAULT_SEGMENT,
  DEFAULT_SEGMENTS,
  buildDistributionData,
  calculateGrowthPct,
  calculateGrowthTarget,
  createMonthSeries,
  getMonthKey,
  getMonthLabel,
  normalizeSegment,
  normalizeText,
  round,
  toDate,
  toSafeNumber,
} = require('../utils/gerencia-domain')

const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX_ENTRIES = 64
const DEFAULT_WINDOW_MONTHS = Number(env.DEFAULT_WINDOW_MONTHS || 12)
const MIN_WINDOW_MONTHS = 1
const MAX_WINDOW_MONTHS = 24

const dashboardCache = new Map()

const FILTERS_QUERY = `
  WITH base AS (
    SELECT
      TRIM(COALESCE(zona, '')) AS zona,
      TRIM(COALESCE(franquicia, '')) AS franquicia
    FROM powerbi.cliente
  ),
  zonas_disponibles AS (
    SELECT COALESCE(array_agg(zona ORDER BY zona), ARRAY[]::text[]) AS items
    FROM (
      SELECT DISTINCT zona
      FROM base
      WHERE zona <> ''
    ) zonas
  ),
  zona_resuelta AS (
    SELECT CASE
      WHEN $1 <> '' AND EXISTS (
        SELECT 1
        FROM base
        WHERE zona = $1
      ) THEN $1
      ELSE ''
    END AS zona
  ),
  franquicias_disponibles AS (
    SELECT COALESCE(array_agg(franquicia ORDER BY franquicia), ARRAY[]::text[]) AS items
    FROM (
      SELECT DISTINCT b.franquicia
      FROM base b
      CROSS JOIN zona_resuelta zr
      WHERE b.franquicia <> ''
        AND (zr.zona = '' OR b.zona = zr.zona)
    ) franquicias
  ),
  franquicia_resuelta AS (
    SELECT CASE
      WHEN $2 <> '' AND EXISTS (
        SELECT 1
        FROM base b
        CROSS JOIN zona_resuelta zr
        WHERE b.franquicia = $2
          AND (zr.zona = '' OR b.zona = zr.zona)
      ) THEN $2
      ELSE ''
    END AS franquicia
  )
  SELECT
    (SELECT items FROM zonas_disponibles) AS zonas,
    (SELECT items FROM franquicias_disponibles) AS franquicias,
    (SELECT zona FROM zona_resuelta) AS zona_aplicada,
    (SELECT franquicia FROM franquicia_resuelta) AS franquicia_aplicada;
`

const CLIENTES_QUERY = `
  WITH base AS (
    SELECT
      TRIM(COALESCE(zona, '')) AS zona,
      TRIM(COALESCE(franquicia, '')) AS franquicia,
      UPPER(TRIM(COALESCE(servicio, 'SIN DATO'))) AS servicio,
      UPPER(TRIM(COALESCE(estatus, 'SIN DATO'))) AS estatus,
      CASE
        WHEN UPPER(TRIM(COALESCE(segmento_cliente, ''))) = 'HOGAR' THEN 'HOGAR'
        WHEN UPPER(TRIM(COALESCE(segmento_cliente, ''))) = 'GOBIERNO' THEN 'GOBIERNO'
        ELSE 'JURIDICO'
      END AS segmento
    FROM powerbi.cliente
  ),
  zona_resuelta AS (
    SELECT CASE
      WHEN $1 <> '' AND EXISTS (
        SELECT 1
        FROM base
        WHERE zona = $1
      ) THEN $1
      ELSE ''
    END AS zona
  ),
  franquicia_resuelta AS (
    SELECT CASE
      WHEN $2 <> '' AND EXISTS (
        SELECT 1
        FROM base b
        CROSS JOIN zona_resuelta zr
        WHERE b.franquicia = $2
          AND (zr.zona = '' OR b.zona = zr.zona)
      ) THEN $2
      ELSE ''
    END AS franquicia
  )
  SELECT
    b.segmento,
    b.servicio,
    b.estatus,
    COUNT(*)::int AS total
  FROM base b
  CROSS JOIN zona_resuelta zr
  CROSS JOIN franquicia_resuelta fr
  WHERE (zr.zona = '' OR b.zona = zr.zona)
    AND (fr.franquicia = '' OR b.franquicia = fr.franquicia)
  GROUP BY b.segmento, b.servicio, b.estatus
  ORDER BY b.segmento, b.servicio, b.estatus;
`

const OPERACIONES_QUERY = `
  WITH normalizado AS (
    SELECT
      CASE
        WHEN TRIM(COALESCE(iom.anio::text, '')) ~ '^[0-9]{4}$'
          THEN TRIM(iom.anio::text)::int
        ELSE NULL
      END AS anio,
      CASE
        WHEN TRIM(COALESCE(iom.mes::text, '')) ~ '^[0-9]{1,2}$'
          THEN TRIM(iom.mes::text)::int
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('ENE', 'ENERO') THEN 1
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('FEB', 'FEBRERO') THEN 2
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('MAR', 'MARZO') THEN 3
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('ABR', 'ABRIL') THEN 4
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('MAY', 'MAYO') THEN 5
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('JUN', 'JUNIO') THEN 6
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('JUL', 'JULIO') THEN 7
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('AGO', 'AGOSTO') THEN 8
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('SEP', 'SEPT', 'SEPTIEMBRE') THEN 9
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('OCT', 'OCTUBRE') THEN 10
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('NOV', 'NOVIEMBRE') THEN 11
        WHEN UPPER(TRIM(COALESCE(iom.mes::text, ''))) IN ('DIC', 'DICIEMBRE') THEN 12
        ELSE NULL
      END AS mes_num,
      UPPER(TRIM(COALESCE(iom.servicio, 'SIN DATO'))) AS servicio,
      TRIM(COALESCE(iom.zona, '')) AS zona,
      TRIM(COALESCE(iom.franquicia, '')) AS franquicia,
      COALESCE(iom.total_clientes_activos, 0) AS total_clientes_activos,
      COALESCE(iom.total_clientes_cortados, 0) AS total_clientes_cortados,
      COALESCE(iom.total_clientes_por_cortar, 0) AS total_clientes_por_cortar,
      COALESCE(iom.total_clientes_exonerados, 0) AS total_clientes_exonerados,
      COALESCE(iom.total_venta, 0) AS total_venta,
      COALESCE(iom.total_instalaciones_finalizadas, 0) AS total_instalaciones_finalizadas,
      COALESCE(iom.total_instalaciones_pendientes, 0) AS total_instalaciones_pendientes,
      COALESCE(iom.total_reclamos_finalizados, 0) AS total_reclamos_finalizados
    FROM powerbi.indicadores_operacionales_mes iom
    WHERE ($1 = '' OR TRIM(COALESCE(iom.zona, '')) = $1)
      AND ($2 = '' OR TRIM(COALESCE(iom.franquicia, '')) = $2)
  )
  SELECT
    n.anio,
    n.mes_num,
    n.servicio,
    SUM(n.total_clientes_activos)::int AS total_clientes_activos,
    SUM(n.total_clientes_cortados)::int AS total_clientes_cortados,
    SUM(n.total_clientes_por_cortar)::int AS total_clientes_por_cortar,
    SUM(n.total_clientes_exonerados)::int AS total_clientes_exonerados,
    SUM(n.total_venta)::int AS total_venta,
    SUM(n.total_instalaciones_finalizadas)::int AS total_instalaciones_finalizadas,
    SUM(n.total_instalaciones_pendientes)::int AS total_instalaciones_pendientes,
    SUM(n.total_reclamos_finalizados)::int AS total_reclamos_finalizados
  FROM normalizado n
  WHERE n.anio IS NOT NULL
    AND n.mes_num BETWEEN 1 AND 12
    AND make_date(n.anio, n.mes_num, 1) >= (
      date_trunc('month', CURRENT_DATE) - (($3::int - 1) * INTERVAL '1 month')
    )::date
  GROUP BY n.anio, n.mes_num, n.servicio
  ORDER BY n.anio, n.mes_num, n.servicio;
`

const FACTURACION_QUERY = `
  WITH segmentos AS (
    SELECT
      c.id_cliente,
      CASE
        WHEN UPPER(TRIM(COALESCE(c.segmento_cliente, ''))) = 'HOGAR' THEN 'HOGAR'
        WHEN UPPER(TRIM(COALESCE(c.segmento_cliente, ''))) = 'GOBIERNO' THEN 'GOBIERNO'
        ELSE 'JURIDICO'
      END AS segmento
    FROM powerbi.cliente c
    GROUP BY
      c.id_cliente,
      CASE
        WHEN UPPER(TRIM(COALESCE(c.segmento_cliente, ''))) = 'HOGAR' THEN 'HOGAR'
        WHEN UPPER(TRIM(COALESCE(c.segmento_cliente, ''))) = 'GOBIERNO' THEN 'GOBIERNO'
        ELSE 'JURIDICO'
      END
  )
  SELECT
    date_trunc('month', f.fecha_creacion::date)::date AS periodo_fecha,
    s.segmento,
    UPPER(TRIM(COALESCE(f.servicio, 'SIN DATO'))) AS servicio,
    COUNT(DISTINCT f.id_cargo_cliente)::int AS cargos_emitidos,
    SUM(COALESCE(f.monto_tarifa_usd, 0))::numeric(100,2) AS facturacion_bruta,
    0::numeric(100,2) AS descuento,
    SUM(COALESCE(f.monto_tarifa_usd, 0))::numeric(100,2) AS facturacion_neta
  FROM powerbi.cargos_mensualidad_ingreso_mes f
  JOIN segmentos s
    ON s.id_cliente = f.id_cliente
  WHERE f.fecha_creacion::date >= (
      date_trunc('month', CURRENT_DATE) - (($3::int - 1) * INTERVAL '1 month')
    )::date
    AND ($1 = '' OR TRIM(COALESCE(f.zona, '')) = $1)
    AND ($2 = '' OR TRIM(COALESCE(f.nombre_franquicia, '')) = $2)
  GROUP BY
    date_trunc('month', f.fecha_creacion::date)::date,
    s.segmento,
    UPPER(TRIM(COALESCE(f.servicio, 'SIN DATO')))
  ORDER BY periodo_fecha, segmento, servicio;
`

const RECAUDO_QUERY = `
  SELECT
    date_trunc('month', ic.fecha::date)::date AS periodo_fecha,
    SUM(COALESCE(ic.monto_dolares, 0))::numeric(100,2) AS recaudo
  FROM powerbi.ingreso_consolidado ic
  WHERE ic.fecha::date >= (
      date_trunc('month', CURRENT_DATE) - (($3::int - 1) * INTERVAL '1 month')
    )::date
    AND ($1 = '' OR TRIM(COALESCE(ic.zona, '')) = $1)
    AND ($2 = '' OR TRIM(COALESCE(ic.franquicia, '')) = $2)
  GROUP BY date_trunc('month', ic.fecha::date)::date
  ORDER BY periodo_fecha;
`

function clampInteger(value, fallback, min, max) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(Math.max(Math.trunc(numericValue), min), max)
}

function resolveWindowMonths(value, fallback = DEFAULT_WINDOW_MONTHS) {
  return clampInteger(value, fallback, MIN_WINDOW_MONTHS, MAX_WINDOW_MONTHS)
}

function normalizeFilterValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function pruneCache() {
  const now = Date.now()

  for (const [key, entry] of dashboardCache.entries()) {
    if (now - entry.createdAt >= CACHE_TTL_MS) {
      dashboardCache.delete(key)
    }
  }

  while (dashboardCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = dashboardCache.keys().next().value
    if (!oldestKey) break
    dashboardCache.delete(oldestKey)
  }
}

function getCachedDashboard(cacheKey) {
  pruneCache()

  const entry = dashboardCache.get(cacheKey)
  if (!entry) return null

  return cloneValue(entry.value)
}

function setCachedDashboard(cacheKey, value) {
  pruneCache()

  dashboardCache.set(cacheKey, {
    createdAt: Date.now(),
    value: cloneValue(value),
  })
}

function buildCacheKey(filters = {}) {
  return [
    normalizeFilterValue(filters?.zona),
    normalizeFilterValue(filters?.franquicia),
    normalizeSegment(filters?.segmento || DEFAULT_SEGMENT),
    normalizeFilterValue(filters?.periodo),
    resolveWindowMonths(filters?.windowMonths),
  ].join('::')
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function calculateReductionTarget(baseValue, rate = 0.2, decimals = 0) {
  const base = toSafeNumber(baseValue, 0)
  if (base <= 0) return 0

  return round(base * (1 - rate), decimals)
}

function createMonthBuckets(windowMonths) {
  return createMonthSeries(windowMonths).map((month) => ({
    key: month.key,
    anio: month.start.getFullYear(),
    mes_num: month.start.getMonth() + 1,
    periodo: month.label,
    label: month.label,
  }))
}

async function executeQuery(label, sql, params, options = {}) {
  const { critical = false } = options

  console.time(label)

  try {
    const result = await query(sql, params)
    console.timeEnd(label)

    const rows = ensureArray(result?.rows)
    console.log(`${label} -> ${rows.length} filas`)

    return {
      rows,
      warning: '',
    }
  } catch (error) {
    console.timeEnd(label)

    console.error(`${label} falló:`, {
      message: error?.message,
      code: error?.code,
    })

    if (critical) {
      throw error
    }

    return {
      rows: [],
      warning: `${label} no disponible: ${error?.message || 'error desconocido'}`,
    }
  }
}

function buildClientesSummary(rows = []) {
  const safeRows = ensureArray(rows)

  const totalsByStatus = safeRows.reduce((acc, row) => {
    const status = normalizeText(row?.estatus, 'SIN DATO').toUpperCase()
    acc[status] = (acc[status] || 0) + toSafeNumber(row?.total, 0)
    return acc
  }, {})

  const totalClientes = Object.values(totalsByStatus).reduce(
    (acc, value) => acc + toSafeNumber(value, 0),
    0,
  )

  const clientesActivos =
    toSafeNumber(totalsByStatus.ACTIVO) + toSafeNumber(totalsByStatus.EXONERADO)

  const clientesCortados = toSafeNumber(totalsByStatus.CORTADO)
  const clientesPorCortar = toSafeNumber(totalsByStatus['POR CORTAR'])
  const clientesExonerados = toSafeNumber(totalsByStatus.EXONERADO)

  const groupedByService = safeRows.reduce((acc, row) => {
    const servicio = normalizeText(row?.servicio, 'SIN DATO')
    const total = toSafeNumber(row?.total, 0)

    if (!acc[servicio]) {
      acc[servicio] = {
        servicio,
        total: 0,
        activos: 0,
        cortados: 0,
        porCortar: 0,
        exonerados: 0,
      }
    }

    acc[servicio].total += total

    switch (normalizeText(row?.estatus, 'SIN DATO').toUpperCase()) {
      case 'ACTIVO':
        acc[servicio].activos += total
        break
      case 'EXONERADO':
        acc[servicio].activos += total
        acc[servicio].exonerados += total
        break
      case 'CORTADO':
        acc[servicio].cortados += total
        break
      case 'POR CORTAR':
        acc[servicio].porCortar += total
        break
      default:
        break
    }

    return acc
  }, {})

  const groupedBySegment = safeRows.reduce(
    (acc, row) => {
      const segmento = normalizeText(row?.segmento, 'JURIDICO').toUpperCase()
      const status = normalizeText(row?.estatus, 'SIN DATO').toUpperCase()
      const total = toSafeNumber(row?.total, 0)

      if (!['ACTIVO', 'EXONERADO'].includes(status)) {
        return acc
      }

      if (segmento === 'HOGAR') {
        acc.hogar += total
        return acc
      }

      if (segmento === 'GOBIERNO') {
        acc.gobierno += total
        return acc
      }

      acc.juridico += total
      return acc
    },
    { hogar: 0, juridico: 0, gobierno: 0 },
  )

  const distribucionServicios = Object.values(groupedByService)
    .map((item) => ({
      label: item.servicio,
      name: item.servicio,
      total: item.total,
      value: item.total,
      cantidad: item.total,
      activos: item.activos,
      cortados: item.cortados,
      porCortar: item.porCortar,
      exonerados: item.exonerados,
    }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value
      }

      return left.label.localeCompare(right.label, 'es', {
        sensitivity: 'base',
      })
    })

  const estatusClientes = [
    {
      label: 'Activos',
      name: 'Activos',
      value: clientesActivos,
      cantidad: clientesActivos,
    },
    {
      label: 'Cortados',
      name: 'Cortados',
      value: clientesCortados,
      cantidad: clientesCortados,
    },
    {
      label: 'Por cortar',
      name: 'Por cortar',
      value: clientesPorCortar,
      cantidad: clientesPorCortar,
    },
  ].filter((item) => item.value > 0)

  return {
    totalClientes,
    clientesActivos,
    clientesCortados,
    clientesPorCortar,
    clientesExonerados,
    distribucionServicios,
    estatusClientes,
    clientesHogar: groupedBySegment.hogar,
    clientesJuridico: groupedBySegment.juridico,
    clientesGobierno: groupedBySegment.gobierno,
  }
}

function buildOperationalMonthlySeries(
  rows = [],
  windowMonths = DEFAULT_WINDOW_MONTHS,
) {
  const buckets = createMonthBuckets(windowMonths).reduce((acc, month) => {
    acc.set(month.key, {
      ...month,
      clientesActivos: 0,
      clientesCortados: 0,
      clientesPorCortar: 0,
      clientesExonerados: 0,
      ventas: 0,
      instalacionesFinalizadas: 0,
      instalacionesPendientes: 0,
      reclamosFinalizados: 0,
    })
    return acc
  }, new Map())

  ensureArray(rows).forEach((row) => {
    const monthDate = new Date(
      toSafeNumber(row?.anio, 0),
      Math.max(toSafeNumber(row?.mes_num, 1) - 1, 0),
      1,
    )

    const key = getMonthKey(monthDate)
    const bucket = buckets.get(key)

    if (!bucket) return

    bucket.clientesActivos += toSafeNumber(row?.total_clientes_activos, 0)
    bucket.clientesCortados += toSafeNumber(row?.total_clientes_cortados, 0)
    bucket.clientesPorCortar += toSafeNumber(row?.total_clientes_por_cortar, 0)
    bucket.clientesExonerados += toSafeNumber(row?.total_clientes_exonerados, 0)
    bucket.ventas += toSafeNumber(row?.total_venta, 0)
    bucket.instalacionesFinalizadas += toSafeNumber(
      row?.total_instalaciones_finalizadas,
      0,
    )
    bucket.instalacionesPendientes += toSafeNumber(
      row?.total_instalaciones_pendientes,
      0,
    )
    bucket.reclamosFinalizados += toSafeNumber(
      row?.total_reclamos_finalizados,
      0,
    )
  })

  return [...buckets.values()].sort((left, right) => {
    if (left.anio !== right.anio) {
      return left.anio - right.anio
    }

    return left.mes_num - right.mes_num
  })
}

function buildFacturacionMonthlySeries(
  rows = [],
  windowMonths = DEFAULT_WINDOW_MONTHS,
) {
  const buckets = createMonthBuckets(windowMonths).reduce((acc, month) => {
    acc.set(month.key, {
      ...month,
      facturacionBruta: 0,
      descuentos: 0,
      facturacionNeta: 0,
    })
    return acc
  }, new Map())

  ensureArray(rows).forEach((row) => {
    const periodDate = toDate(row?.periodo_fecha)
    const key = periodDate ? getMonthKey(periodDate) : ''
    const bucket = buckets.get(key)

    if (!bucket) return

    bucket.facturacionBruta += toSafeNumber(row?.facturacion_bruta, 0)
    bucket.descuentos += toSafeNumber(row?.descuento, 0)
    bucket.facturacionNeta += toSafeNumber(row?.facturacion_neta, 0)
  })

  return [...buckets.values()].map((item) => ({
    ...item,
    facturacionBruta: round(item.facturacionBruta, 2),
    descuentos: round(item.descuentos, 2),
    facturacionNeta: round(item.facturacionNeta, 2),
  }))
}

function buildRecaudoMonthlySeries(
  rows = [],
  windowMonths = DEFAULT_WINDOW_MONTHS,
) {
  const buckets = createMonthBuckets(windowMonths).reduce((acc, month) => {
    acc.set(month.key, {
      ...month,
      recaudo: 0,
    })
    return acc
  }, new Map())

  ensureArray(rows).forEach((row) => {
    const periodDate = toDate(row?.periodo_fecha)
    const key = periodDate ? getMonthKey(periodDate) : ''
    const bucket = buckets.get(key)

    if (!bucket) return

    bucket.recaudo += toSafeNumber(row?.recaudo, 0)
  })

  return [...buckets.values()].map((item) => ({
    ...item,
    recaudo: round(item.recaudo, 2),
  }))
}

function buildFacturacionDistribucion(rows = []) {
  return buildDistributionData(rows, {
    labelSelector: (row) => row?.servicio,
    valueSelector: (row) => row?.facturacion_neta,
    decimals: 2,
  })
}

function buildRecaudoDistribucion(rows = []) {
  return buildDistributionData(rows, {
    labelSelector: () => 'Recaudo',
    valueSelector: (row) => row?.recaudo,
    decimals: 2,
  })
}

function buildFacturacionBySegment(rows = [], periodKey = '') {
  return ensureArray(rows).reduce(
    (acc, row) => {
      const periodDate = toDate(row?.periodo_fecha)
      const rowKey = periodDate ? getMonthKey(periodDate) : ''

      if (!rowKey || rowKey !== periodKey) {
        return acc
      }

      const segmento = normalizeText(row?.segmento, 'JURIDICO').toUpperCase()
      const value = toSafeNumber(row?.facturacion_neta, 0)

      if (segmento === 'HOGAR') {
        acc.hogar += value
        return acc
      }

      if (segmento === 'GOBIERNO') {
        acc.gobierno += value
        return acc
      }

      acc.juridico += value
      return acc
    },
    { hogar: 0, juridico: 0, gobierno: 0 },
  )
}

function findPeriodEntry(series = [], periodKey = '') {
  return ensureArray(series).find((item) => item.key === periodKey) || null
}

function getLatestNonEmptyPeriod(seriesCollection = []) {
  const allKeys = []

  seriesCollection.forEach((series) => {
    ensureArray(series).forEach((item) => {
      if (item?.key) {
        allKeys.push(item.key)
      }
    })
  })

  return allKeys.sort((left, right) => right.localeCompare(left, 'es'))[0] || ''
}

function getPreviousPeriodKey(periodKey = '') {
  const date = toDate(`${periodKey}-01`)
  if (!date) return ''

  return getMonthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1))
}

function getClosedPeriodKeys(baseDate = new Date()) {
  const currentClosedDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() - 1,
    1,
  )

  const previousClosedDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() - 2,
    1,
  )

  return {
    currentClosedPeriod: getMonthKey(currentClosedDate),
    previousClosedPeriod: getMonthKey(previousClosedDate),
  }
}

function buildKpiMeta() {
  return {
    totalClientes: {
      title: 'Base instalada',
      description: 'Total del universo comercial filtrado.',
      format: 'number',
      decimals: 0,
    },
    clientesActivos: {
      title: 'Clientes activos',
      description: 'Activos + exonerados dentro del universo visible.',
      format: 'number',
      decimals: 0,
    },
    clientesCortados: {
      title: 'Clientes cortados',
      description: 'Clientes en estatus cortado.',
      format: 'number',
      decimals: 0,
    },
    clientesPorCortar: {
      title: 'Clientes por cortar',
      description: 'Base con riesgo inmediato de corte.',
      format: 'number',
      decimals: 0,
    },
    ventasMes: {
      title: 'Ventas del mes',
      description: 'Ventas consolidadas del período.',
      format: 'number',
      decimals: 0,
    },
    instalacionesFinalizadas: {
      title: 'Instalaciones finalizadas',
      description: 'Órdenes completadas en el período.',
      format: 'number',
      decimals: 0,
    },
    instalacionesPendientes: {
      title: 'Instalaciones pendientes',
      description: 'Órdenes aún no finalizadas.',
      format: 'number',
      decimals: 0,
    },
    reclamosFinalizados: {
      title: 'Reclamos finalizados',
      description: 'Reclamos cerrados en el período.',
      format: 'number',
      decimals: 0,
    },
    facturacionMes: {
      title: 'Facturación',
      description: 'Facturación bruta del período.',
      format: 'currency',
      decimals: 2,
      prefix: '$',
    },
    descuentosMes: {
      title: 'Descuentos',
      description: 'Descuentos registrados en la facturación del período.',
      format: 'currency',
      decimals: 2,
      prefix: '$',
    },
    facturacionNetaMes: {
      title: 'Facturación neta',
      description: 'Facturación bruta menos descuentos.',
      format: 'currency',
      decimals: 2,
      prefix: '$',
    },
    recaudoMes: {
      title: 'Recaudo',
      description: 'Ingreso cobrado del período.',
      format: 'currency',
      decimals: 2,
      prefix: '$',
    },
    recaudoVsFacturacionPct: {
      title: 'Recaudo / Facturación',
      description: 'Proporción de recaudo sobre facturación neta.',
      format: 'percent',
      decimals: 2,
    },
    metaFacturacion20Pct: {
      title: 'Meta facturación +20%',
      description: 'Meta proyectada sobre la base del período previo.',
      format: 'currency',
      decimals: 2,
      prefix: '$',
    },
    metaRecaudo20Pct: {
      title: 'Meta recaudo +15%',
      description: 'Meta proyectada sobre la base del período previo.',
      format: 'currency',
      decimals: 2,
      prefix: '$',
    },
    crecimientoFacturacionPct: {
      title: 'Crecimiento facturación',
      description: 'Variación vs mes anterior.',
      format: 'percent',
      decimals: 2,
    },
    crecimientoRecaudoPct: {
      title: 'Crecimiento recaudo',
      description: 'Variación vs mes anterior.',
      format: 'percent',
      decimals: 2,
    },
  }
}

function buildChartMeta() {
  return {
    estadoClientes: {
      title: 'Estado de la base',
      subtitle: 'Distribución actual por condición comercial.',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Clientes',
    },
    distribucionServicios: {
      title: 'Base por servicio',
      subtitle: 'Composición del universo comercial.',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Clientes',
      colorToken: 'primary',
    },
    operacionMensual: {
      title: 'Operación mensual',
      subtitle: 'Ventas, instalaciones y reclamos por período.',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Total',
    },
    facturacionMensual: {
      title: 'Facturación mensual',
      subtitle: 'Bruta, descuentos y neta.',
      metric: { format: 'currency', decimals: 2, prefix: '$' },
      valueLabel: 'Monto',
    },
    recaudoMensual: {
      title: 'Recaudo mensual',
      subtitle: 'Ingreso cobrado consolidado.',
      metric: { format: 'currency', decimals: 2, prefix: '$' },
      valueLabel: 'Monto',
      colorToken: 'success',
    },
    facturacionPorServicio: {
      title: 'Facturación por servicio',
      subtitle: 'Distribución de facturación del período.',
      metric: { format: 'currency', decimals: 2, prefix: '$' },
      valueLabel: 'Facturación',
      colorToken: 'secondary',
    },
    recaudoPorFormaPago: {
      title: 'Recaudo del período',
      subtitle: '',
      metric: { format: 'currency', decimals: 2, prefix: '$' },
      valueLabel: 'Recaudo',
      colorToken: 'success',
    },
  }
}

function buildUi() {
  return {
    kpiOrder: [
      'totalClientes',
      'clientesActivos',
      'clientesCortados',
      'clientesPorCortar',
      'ventasMes',
      'instalacionesFinalizadas',
      'instalacionesPendientes',
      'reclamosFinalizados',
      'facturacionMes',
      'descuentosMes',
      'facturacionNetaMes',
      'recaudoMes',
      'recaudoVsFacturacionPct',
      'metaFacturacion20Pct',
      'metaRecaudo20Pct',
      'crecimientoFacturacionPct',
      'crecimientoRecaudoPct',
    ],
    sections: [
      {
        id: 'core-kpis',
        charts: [
          'estadoClientes',
          'distribucionServicios',
          'operacionMensual',
          'facturacionMensual',
          'recaudoMensual',
          'facturacionPorServicio',
          'recaudoPorFormaPago',
        ],
      },
    ],
  }
}

async function getDashboardSummary(filters = {}) {
  const requestedFilters = {
    zona: normalizeFilterValue(filters?.zona),
    franquicia: normalizeFilterValue(filters?.franquicia),
    segmento: normalizeSegment(filters?.segmento || DEFAULT_SEGMENT),
    periodo: normalizeFilterValue(filters?.periodo),
    windowMonths: resolveWindowMonths(filters?.windowMonths),
  }

  const cacheKey = buildCacheKey(requestedFilters)
  const cachedDashboard = getCachedDashboard(cacheKey)

  if (cachedDashboard) {
    return cachedDashboard
  }

  const warnings = []

  const filtersResult = await executeQuery(
    'GERENCIA/FILTERS_QUERY',
    FILTERS_QUERY,
    [requestedFilters.zona, requestedFilters.franquicia],
    { critical: true },
  )

  const clientesResult = await executeQuery(
    'GERENCIA/CLIENTES_QUERY',
    CLIENTES_QUERY,
    [requestedFilters.zona, requestedFilters.franquicia],
    { critical: true },
  )

  const operacionesResult = await executeQuery(
    'GERENCIA/OPERACIONES_QUERY',
    OPERACIONES_QUERY,
    [
      requestedFilters.zona,
      requestedFilters.franquicia,
      requestedFilters.windowMonths,
    ],
    { critical: false },
  )

  if (operacionesResult.warning) {
    warnings.push(operacionesResult.warning)
  }

  const facturacionResult = await executeQuery(
    'GERENCIA/FACTURACION_QUERY',
    FACTURACION_QUERY,
    [
      requestedFilters.zona,
      requestedFilters.franquicia,
      requestedFilters.windowMonths,
    ],
    { critical: false },
  )

  if (facturacionResult.warning) {
    warnings.push(facturacionResult.warning)
  }

  const recaudoResult = await executeQuery(
    'GERENCIA/RECAUDO_QUERY',
    RECAUDO_QUERY,
    [
      requestedFilters.zona,
      requestedFilters.franquicia,
      requestedFilters.windowMonths,
    ],
    { critical: false },
  )

  if (recaudoResult.warning) {
    warnings.push(recaudoResult.warning)
  }

  const filtersRow = filtersResult?.rows?.[0] || {}
  const clientesRows = ensureArray(clientesResult?.rows)
  const operacionesRows = ensureArray(operacionesResult?.rows)
  const facturacionRows = ensureArray(facturacionResult?.rows)
  const recaudoRows = ensureArray(recaudoResult?.rows)

  const clientes = buildClientesSummary(clientesRows)
  const operacionMensual = buildOperationalMonthlySeries(
    operacionesRows,
    requestedFilters.windowMonths,
  )
  const facturacionMensual = buildFacturacionMonthlySeries(
    facturacionRows,
    requestedFilters.windowMonths,
  )
  const recaudoMensual = buildRecaudoMonthlySeries(
    recaudoRows,
    requestedFilters.windowMonths,
  )

  const { currentClosedPeriod, previousClosedPeriod } = getClosedPeriodKeys()

  const latestAvailablePeriod = getLatestNonEmptyPeriod([
    operacionMensual,
    facturacionMensual,
    recaudoMensual,
  ])

  const appliedPeriod =
    requestedFilters.periodo && requestedFilters.periodo.length === 7
      ? requestedFilters.periodo
      : currentClosedPeriod || latestAvailablePeriod

  const previousPeriod =
    requestedFilters.periodo && requestedFilters.periodo.length === 7
      ? getPreviousPeriodKey(appliedPeriod)
      : previousClosedPeriod

  const prePreviousPeriod = getPreviousPeriodKey(previousPeriod)

  const currentOperacion = findPeriodEntry(operacionMensual, appliedPeriod)
  const previousOperacion = findPeriodEntry(operacionMensual, previousPeriod)
  const prePreviousOperacion = findPeriodEntry(
    operacionMensual,
    prePreviousPeriod,
  )

  const currentFacturacion = findPeriodEntry(facturacionMensual, appliedPeriod)
  const previousFacturacion = findPeriodEntry(
    facturacionMensual,
    previousPeriod,
  )

  const currentRecaudo = findPeriodEntry(recaudoMensual, appliedPeriod)
  const previousRecaudo = findPeriodEntry(recaudoMensual, previousPeriod)

  const facturacionBrutaActual = round(
    toSafeNumber(currentFacturacion?.facturacionBruta, 0),
    2,
  )
  const descuentosActual = round(
    toSafeNumber(currentFacturacion?.descuentos, 0),
    2,
  )
  const facturacionNetaActual = round(
    toSafeNumber(currentFacturacion?.facturacionNeta, 0),
    2,
  )
  const recaudoActual = round(toSafeNumber(currentRecaudo?.recaudo, 0), 2)
  const recaudoMesAnterior = round(
    toSafeNumber(previousRecaudo?.recaudo, 0),
    2,
  )

  const currentCortados = toSafeNumber(currentOperacion?.clientesCortados, 0)
  const previousCortados = toSafeNumber(previousOperacion?.clientesCortados, 0)
  const currentVentas = toSafeNumber(currentOperacion?.ventas, 0)
  const previousVentas = toSafeNumber(previousOperacion?.ventas, 0)
  const currentReclamos = toSafeNumber(
    currentOperacion?.reclamosFinalizados,
    0,
  )
  const previousReclamos = toSafeNumber(
    previousOperacion?.reclamosFinalizados,
    0,
  )

  const previousActivosBase =
    toSafeNumber(previousOperacion?.clientesActivos, 0) +
    toSafeNumber(previousOperacion?.clientesExonerados, 0)

  const prePreviousActivosBase =
    toSafeNumber(prePreviousOperacion?.clientesActivos, 0) +
    toSafeNumber(prePreviousOperacion?.clientesExonerados, 0)

  const churnMes =
    previousActivosBase > 0
      ? round((currentCortados / previousActivosBase) * 100, 2)
      : 'N/D'

  const churnMesAnterior =
    prePreviousActivosBase > 0
      ? round((previousCortados / prePreviousActivosBase) * 100, 2)
      : 'N/D'

  const metaChurn =
    typeof churnMesAnterior === 'number'
      ? round(churnMesAnterior * 0.8, 2)
      : 'N/D'

  const baseFacturacionMeta =
    toSafeNumber(previousFacturacion?.facturacionNeta, 0) > 0
      ? toSafeNumber(previousFacturacion?.facturacionNeta, 0)
      : facturacionNetaActual

  const baseRecaudoMeta = recaudoMesAnterior > 0 ? recaudoMesAnterior : recaudoActual

  const facturacionSegmentos = buildFacturacionBySegment(
    facturacionRows,
    appliedPeriod,
  )

  const arpuHogar =
    clientes.clientesHogar > 0
      ? round(facturacionSegmentos.hogar / clientes.clientesHogar, 2)
      : 'N/D'

  const arpuJuridico =
    clientes.clientesJuridico > 0
      ? round(facturacionSegmentos.juridico / clientes.clientesJuridico, 2)
      : 'N/D'

  const arpuGobierno =
    clientes.clientesGobierno > 0
      ? round(facturacionSegmentos.gobierno / clientes.clientesGobierno, 2)
      : 'N/D'

  const kpis = {
    totalClientes: clientes.totalClientes,
    clientesActivos: clientes.clientesActivos,
    clientesCortados: clientes.clientesCortados,
    clientesPorCortar: clientes.clientesPorCortar,
    clientesExonerados: clientes.clientesExonerados,

    clientesHogar: clientes.clientesHogar,
    clientesJuridico: clientes.clientesJuridico,
    clientesGobierno: clientes.clientesGobierno,

    clientesRecuperados: 'N/D',
    cortadosMesAnterior: previousCortados,
    metaCorte: calculateReductionTarget(previousCortados, 0.2, 0),

    metaChurn,
    churnMes,
    churnMesAnterior,

    metaVentas:
      previousVentas > 0
        ? calculateGrowthTarget(previousVentas, 0.2, 0)
        : 'N/D',
    ventasMes: currentVentas,
    ventasMesAnterior: previousVentas,

    facturacionMes: facturacionBrutaActual,
    descuentosMes: descuentosActual,
    facturacionNetaMes: facturacionNetaActual,
    metaFacturacion20Pct: calculateGrowthTarget(baseFacturacionMeta, 0.2, 2),
    crecimientoFacturacionPct: calculateGrowthPct(
      facturacionNetaActual,
      toSafeNumber(previousFacturacion?.facturacionNeta, 0),
      2,
    ),

    recaudoMes: recaudoActual,
    recaudoMesAnterior,
    metaRecaudo20Pct: calculateGrowthTarget(baseRecaudoMeta, 0.15, 2),
    crecimientoRecaudoPct: calculateGrowthPct(
      recaudoActual,
      recaudoMesAnterior,
      2,
    ),
    recaudoVsFacturacionPct:
      facturacionNetaActual > 0
        ? round((recaudoActual / facturacionNetaActual) * 100, 2)
        : 0,

    arpuHogar,
    arpuJuridico,
    arpuGobierno,

    metaCmc15: 'N/D',
    cmc15Mes: 'N/D',
    cmc15MesAnterior: 'N/D',

    metaCalidadServicio:
      previousReclamos > 0
        ? calculateGrowthTarget(previousReclamos, 0.2, 0)
        : 'N/D',
    calidadServicioMes: currentReclamos,
    calidadServicioMesAnterior: previousReclamos,

    reclamosFinalizados: currentReclamos,
    reclamosEjecutados: currentReclamos,
    reclamosPendientes: 'N/D',
    reclamosEnSla: 'N/D',

    instalacionesFinalizadas: toSafeNumber(
      currentOperacion?.instalacionesFinalizadas,
      0,
    ),
    instalacionesPendientes: toSafeNumber(
      currentOperacion?.instalacionesPendientes,
      0,
    ),
    instalacionesEnSla: 'N/D',
  }

  const response = {
    kpis,
    kpiMeta: buildKpiMeta(),
    charts: {
      estadoClientes: clientes.estatusClientes,
      distribucionServicios: clientes.distribucionServicios,
      operacionMensual,
      facturacionMensual,
      recaudoMensual,
      facturacionPorServicio: buildFacturacionDistribucion(facturacionRows),
      recaudoPorFormaPago: buildRecaudoDistribucion(recaudoRows),
    },
    chartMeta: buildChartMeta(),
    filters: {
      zonas: ensureArray(filtersRow?.zonas)
        .map((item) => normalizeText(item, ''))
        .filter(Boolean),
      franquicias: ensureArray(filtersRow?.franquicias)
        .map((item) => normalizeText(item, ''))
        .filter(Boolean),
      segmentos: [...DEFAULT_SEGMENTS],
      periodos: createMonthSeries(requestedFilters.windowMonths)
        .map((month) => ({
          value: month.key,
          label: getMonthLabel(month.start),
        }))
        .sort((left, right) => right.value.localeCompare(left.value, 'es')),
      appliedFilters: {
        zona: normalizeText(filtersRow?.zona_aplicada, ''),
        franquicia: normalizeText(filtersRow?.franquicia_aplicada, ''),
        segmento: requestedFilters.segmento,
        periodo: appliedPeriod,
      },
    },
    meta: {
      windowMonths: requestedFilters.windowMonths,
      currentPeriod: appliedPeriod,
      previousPeriod,
      segmentScope: 'ALL',
      segmentCoverage: {
        clientes: true,
        facturacion: true,
        operaciones: true,
        recaudo: false,
      },
      notes: [
        'Corte: cierre mes = total_clientes_cortados del mes cerrado; cortados mes anterior = mismo indicador del mes previo; meta = mes anterior -20%.',
        'Churn: cálculo = clientes cortados del período / base activa del período previo.',
        'Ventas: resultado = total_venta del mes cerrado; mes anterior = total_venta del mes previo; meta = mes anterior +20%.',
        'Calidad de servicio: resultado = total_reclamos_finalizados del mes cerrado; mes anterior = mismo indicador del mes previo; meta = mes anterior +20%.',
        'Recaudo: cierre mes = suma de monto_dolares del mes calendario cerrado anterior; recaudo mes anterior = dos meses atrás; meta = recaudo mes anterior +15%.',
      ],
      warnings,
    },
    ui: buildUi(),
  }

  setCachedDashboard(cacheKey, response)

  return cloneValue(response)
}

module.exports = {
  getDashboardSummary,
}