const { query } = require('../config/database')

const MONTH_MIN = 1
const MONTH_MAX = 12
const YEAR_MIN = 2000
const YEAR_MAX = 2100
const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX_ENTRIES = 64

const cierreMensualCache = new Map()

const CIERRE_MENSUAL_FILTERS_QUERY = `
  WITH base AS (
    SELECT
      TRIM(COALESCE(iom.zona, '')) AS zona,
      TRIM(COALESCE(iom.franquicia, '')) AS franquicia,
      CASE
        WHEN TRIM(COALESCE(iom.anio::text, '')) ~ '^[0-9]{4}$'
          THEN TRIM(iom.anio::text)::int
        ELSE NULL
      END AS anio_num,
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
      END AS mes_num
    FROM powerbi.indicadores_operacionales_mes iom
  ),
  base_valida AS (
    SELECT
      zona,
      franquicia,
      anio_num,
      mes_num
    FROM base
    WHERE anio_num IS NOT NULL
      AND mes_num BETWEEN 1 AND 12
  ),
  anios_disponibles AS (
    SELECT COALESCE(array_agg(anio_num ORDER BY anio_num DESC), ARRAY[]::int[]) AS items
    FROM (
      SELECT DISTINCT anio_num
      FROM base_valida
    ) anios
  ),
  anio_resuelto AS (
    SELECT CASE
      WHEN $3 BETWEEN ${YEAR_MIN} AND ${YEAR_MAX}
        AND EXISTS (
          SELECT 1
          FROM base_valida
          WHERE anio_num = $3
        )
        THEN $3
      ELSE COALESCE(
        (
          SELECT MAX(anio_num)
          FROM base_valida
        ),
        EXTRACT(YEAR FROM CURRENT_DATE)::int
      )
    END AS anio
  ),
  meses_disponibles AS (
    SELECT COALESCE(array_agg(mes_num ORDER BY mes_num), ARRAY[]::int[]) AS items
    FROM (
      SELECT DISTINCT b.mes_num
      FROM base_valida b
      CROSS JOIN anio_resuelto ar
      WHERE b.anio_num = ar.anio
    ) meses
  ),
  mes_resuelto AS (
    SELECT CASE
      WHEN $4 BETWEEN ${MONTH_MIN} AND ${MONTH_MAX}
        AND EXISTS (
          SELECT 1
          FROM base_valida b
          CROSS JOIN anio_resuelto ar
          WHERE b.anio_num = ar.anio
            AND b.mes_num = $4
        )
        THEN $4
      ELSE COALESCE(
        (
          SELECT MAX(b.mes_num)
          FROM base_valida b
          CROSS JOIN anio_resuelto ar
          WHERE b.anio_num = ar.anio
        ),
        EXTRACT(MONTH FROM CURRENT_DATE)::int
      )
    END AS mes
  ),
  zona_resuelta AS (
    SELECT CASE
      WHEN $1 <> '' AND EXISTS (
        SELECT 1
        FROM base_valida b
        CROSS JOIN anio_resuelto ar
        CROSS JOIN mes_resuelto mr
        WHERE b.zona = $1
          AND b.anio_num = ar.anio
          AND b.mes_num = mr.mes
      ) THEN $1
      ELSE ''
    END AS zona
  ),
  zonas_disponibles AS (
    SELECT COALESCE(array_agg(zona ORDER BY zona), ARRAY[]::text[]) AS items
    FROM (
      SELECT DISTINCT b.zona
      FROM base_valida b
      CROSS JOIN anio_resuelto ar
      CROSS JOIN mes_resuelto mr
      WHERE b.zona <> ''
        AND b.anio_num = ar.anio
        AND b.mes_num = mr.mes
    ) zonas
  ),
  franquicias_disponibles AS (
    SELECT COALESCE(array_agg(franquicia ORDER BY franquicia), ARRAY[]::text[]) AS items
    FROM (
      SELECT DISTINCT b.franquicia
      FROM base_valida b
      CROSS JOIN anio_resuelto ar
      CROSS JOIN mes_resuelto mr
      CROSS JOIN zona_resuelta zr
      WHERE b.franquicia <> ''
        AND b.anio_num = ar.anio
        AND b.mes_num = mr.mes
        AND (zr.zona = '' OR b.zona = zr.zona)
    ) franquicias
  ),
  franquicia_resuelta AS (
    SELECT CASE
      WHEN $2 <> '' AND EXISTS (
        SELECT 1
        FROM base_valida b
        CROSS JOIN anio_resuelto ar
        CROSS JOIN mes_resuelto mr
        CROSS JOIN zona_resuelta zr
        WHERE b.franquicia = $2
          AND b.anio_num = ar.anio
          AND b.mes_num = mr.mes
          AND (zr.zona = '' OR b.zona = zr.zona)
      ) THEN $2
      ELSE ''
    END AS franquicia
  )
  SELECT
    (SELECT items FROM zonas_disponibles) AS zonas,
    (SELECT items FROM franquicias_disponibles) AS franquicias,
    (SELECT items FROM anios_disponibles) AS anios,
    (SELECT items FROM meses_disponibles) AS meses,
    (SELECT zona FROM zona_resuelta) AS zona_aplicada,
    (SELECT franquicia FROM franquicia_resuelta) AS franquicia_aplicada,
    (SELECT anio FROM anio_resuelto) AS anio_aplicado,
    (SELECT mes FROM mes_resuelto) AS mes_aplicado;
`

const CIERRE_MENSUAL_DATA_QUERY = `
  WITH normalizado AS (
    SELECT
      CASE
        WHEN TRIM(COALESCE(iom.anio::text, '')) ~ '^[0-9]{4}$'
          THEN TRIM(iom.anio::text)::int
        ELSE NULL
      END AS anio_num,
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
      TRIM(COALESCE(iom.zona, '')) AS zona,
      TRIM(COALESCE(iom.franquicia, '')) AS franquicia,
      UPPER(TRIM(COALESCE(iom.servicio, 'SIN DATO'))) AS servicio,
      COALESCE(iom.total_clientes_activos, 0) AS total_clientes_activos,
      COALESCE(iom.total_clientes_cortados, 0) AS total_clientes_cortados,
      COALESCE(iom.total_clientes_por_cortar, 0) AS total_clientes_por_cortar,
      COALESCE(iom.total_clientes_exonerados, 0) AS total_clientes_exonerados,
      COALESCE(iom.total_venta, 0) AS total_venta,
      COALESCE(iom.total_instalaciones_finalizadas, 0) AS total_instalaciones_finalizadas,
      COALESCE(iom.total_instalaciones_pendientes, 0) AS total_instalaciones_pendientes,
      COALESCE(iom.total_reclamos_finalizados, 0) AS total_reclamos_finalizados
    FROM powerbi.indicadores_operacionales_mes iom
  )
  SELECT
    n.servicio,
    n.zona,
    n.franquicia,
    SUM(n.total_clientes_activos)::int AS total_clientes_activos,
    SUM(n.total_clientes_cortados)::int AS total_clientes_cortados,
    SUM(n.total_clientes_por_cortar)::int AS total_clientes_por_cortar,
    SUM(n.total_clientes_exonerados)::int AS total_clientes_exonerados,
    SUM(n.total_venta)::int AS total_venta,
    SUM(n.total_instalaciones_finalizadas)::int AS total_instalaciones_finalizadas,
    SUM(n.total_instalaciones_pendientes)::int AS total_instalaciones_pendientes,
    SUM(n.total_reclamos_finalizados)::int AS total_reclamos_finalizados
  FROM normalizado n
  WHERE n.anio_num = $3
    AND n.mes_num = $4
    AND ($1 = '' OR n.zona = $1)
    AND ($2 = '' OR n.franquicia = $2)
  GROUP BY n.servicio, n.zona, n.franquicia
  ORDER BY n.servicio, n.zona, n.franquicia;
`

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toSafeNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function toSafeArray(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean)
    : []
}

function toSafeNumberArray(value) {
  return Array.isArray(value)
    ? value
        .map((item) => toSafeNumber(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : []
}

function round(value, decimals = 2) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0

  const factor = 10 ** decimals
  return Math.round(numericValue * factor) / factor
}

function calculatePercentage(numerator, denominator, decimals = 2) {
  const safeNumerator = toSafeNumber(numerator)
  const safeDenominator = toSafeNumber(denominator)

  if (safeDenominator <= 0) return 0
  return round((safeNumerator / safeDenominator) * 100, decimals)
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function pruneCache() {
  const now = Date.now()

  for (const [key, entry] of cierreMensualCache.entries()) {
    if (now - entry.createdAt >= CACHE_TTL_MS) {
      cierreMensualCache.delete(key)
    }
  }

  while (cierreMensualCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cierreMensualCache.keys().next().value
    if (!oldestKey) break
    cierreMensualCache.delete(oldestKey)
  }
}

function getCachedValue(cacheKey) {
  pruneCache()

  const entry = cierreMensualCache.get(cacheKey)
  if (!entry) return null

  return cloneValue(entry.value)
}

function setCachedValue(cacheKey, value) {
  pruneCache()

  cierreMensualCache.set(cacheKey, {
    createdAt: Date.now(),
    value: cloneValue(value),
  })
}

function normalizeMonth(value) {
  const month = toSafeNumber(value)
  if (month < MONTH_MIN || month > MONTH_MAX) return 0
  return month
}

function normalizeYear(value) {
  const year = toSafeNumber(value)
  if (year < YEAR_MIN || year > YEAR_MAX) return 0
  return year
}

function buildCacheKey(filters = {}) {
  return JSON.stringify({
    zona: normalizeText(filters?.zona),
    franquicia: normalizeText(filters?.franquicia),
    mes: normalizeMonth(filters?.mes),
    anio: normalizeYear(filters?.anio),
  })
}

function getMonthLabel(month) {
  const labels = [
    '',
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  return labels[toSafeNumber(month)] || ''
}

function createEmptyDetalleRow({
  servicio = '',
  zona = '',
  franquicia = '',
} = {}) {
  return {
    servicio: normalizeText(servicio, 'SIN DATO'),
    zona: normalizeText(zona),
    franquicia: normalizeText(franquicia),
    totalClientesActivos: 0,
    totalClientesCortados: 0,
    totalClientesPorCortar: 0,
    totalClientesExonerados: 0,
    totalVenta: 0,
    totalInstalacionesFinalizadas: 0,
    totalInstalacionesPendientes: 0,
    totalReclamosFinalizados: 0,
    efectividadInstalacionPct: 0,
    tasaCortePct: 0,
    churnRateOperacionalPct: 0,
  }
}

function normalizeDetalleRow(row = {}) {
  const totalClientesActivos = toSafeNumber(row.total_clientes_activos)
  const totalClientesCortados = toSafeNumber(row.total_clientes_cortados)
  const totalClientesPorCortar = toSafeNumber(row.total_clientes_por_cortar)
  const totalClientesExonerados = toSafeNumber(row.total_clientes_exonerados)
  const totalVenta = toSafeNumber(row.total_venta)
  const totalInstalacionesFinalizadas = toSafeNumber(
    row.total_instalaciones_finalizadas,
  )
  const totalInstalacionesPendientes = toSafeNumber(
    row.total_instalaciones_pendientes,
  )
  const totalReclamosFinalizados = toSafeNumber(
    row.total_reclamos_finalizados,
  )

  const baseClientes =
    totalClientesActivos +
    totalClientesCortados +
    totalClientesPorCortar +
    totalClientesExonerados

  const totalInstalaciones =
    totalInstalacionesFinalizadas + totalInstalacionesPendientes

  return {
    ...createEmptyDetalleRow({
      servicio: row.servicio,
      zona: row.zona,
      franquicia: row.franquicia,
    }),
    totalClientesActivos,
    totalClientesCortados,
    totalClientesPorCortar,
    totalClientesExonerados,
    totalVenta,
    totalInstalacionesFinalizadas,
    totalInstalacionesPendientes,
    totalReclamosFinalizados,
    efectividadInstalacionPct: calculatePercentage(
      totalInstalacionesFinalizadas,
      totalInstalaciones,
    ),
    tasaCortePct: calculatePercentage(totalClientesCortados, baseClientes),
    churnRateOperacionalPct: calculatePercentage(
      totalClientesCortados + totalClientesPorCortar,
      baseClientes,
    ),
  }
}

function buildDetallePorServicio(rows = []) {
  return rows.map((row) => normalizeDetalleRow(row))
}

function aggregateRows(rows = [], dimension) {
  const buckets = new Map()

  rows.forEach((row) => {
    const source = normalizeDetalleRow(row)
    const key = normalizeText(source[dimension], 'SIN DATO')
    const current = buckets.get(key) || createEmptyDetalleRow({ [dimension]: key })

    current.totalClientesActivos += source.totalClientesActivos
    current.totalClientesCortados += source.totalClientesCortados
    current.totalClientesPorCortar += source.totalClientesPorCortar
    current.totalClientesExonerados += source.totalClientesExonerados
    current.totalVenta += source.totalVenta
    current.totalInstalacionesFinalizadas += source.totalInstalacionesFinalizadas
    current.totalInstalacionesPendientes += source.totalInstalacionesPendientes
    current.totalReclamosFinalizados += source.totalReclamosFinalizados

    if (dimension === 'zona') {
      current.zona = key
    }

    if (dimension === 'franquicia') {
      current.franquicia = key
    }

    if (dimension === 'servicio') {
      current.servicio = key
    }

    buckets.set(key, current)
  })

  return Array.from(buckets.values())
    .map((row) => normalizeDetalleRow(row))
    .sort((left, right) => {
      const leftKey = normalizeText(left[dimension], 'SIN DATO')
      const rightKey = normalizeText(right[dimension], 'SIN DATO')

      return leftKey.localeCompare(rightKey, 'es', {
        sensitivity: 'base',
      })
    })
}

function buildKpis(rows = []) {
  const totals = rows.reduce(
    (acc, row) => {
      const source = normalizeDetalleRow(row)

      acc.totalClientesActivos += source.totalClientesActivos
      acc.totalClientesCortados += source.totalClientesCortados
      acc.totalClientesPorCortar += source.totalClientesPorCortar
      acc.totalClientesExonerados += source.totalClientesExonerados
      acc.totalVenta += source.totalVenta
      acc.totalInstalacionesFinalizadas += source.totalInstalacionesFinalizadas
      acc.totalInstalacionesPendientes += source.totalInstalacionesPendientes
      acc.totalReclamosFinalizados += source.totalReclamosFinalizados

      return acc
    },
    {
      totalClientesActivos: 0,
      totalClientesCortados: 0,
      totalClientesPorCortar: 0,
      totalClientesExonerados: 0,
      totalVenta: 0,
      totalInstalacionesFinalizadas: 0,
      totalInstalacionesPendientes: 0,
      totalReclamosFinalizados: 0,
    },
  )

  const baseClientes =
    totals.totalClientesActivos +
    totals.totalClientesCortados +
    totals.totalClientesPorCortar +
    totals.totalClientesExonerados

  const totalInstalaciones =
    totals.totalInstalacionesFinalizadas + totals.totalInstalacionesPendientes

  return {
    totalClientesActivos: totals.totalClientesActivos,
    totalClientesCortados: totals.totalClientesCortados,
    totalClientesPorCortar: totals.totalClientesPorCortar,
    totalClientesExonerados: totals.totalClientesExonerados,
    totalVenta: totals.totalVenta,
    totalInstalacionesFinalizadas: totals.totalInstalacionesFinalizadas,
    totalInstalacionesPendientes: totals.totalInstalacionesPendientes,
    totalReclamosFinalizados: totals.totalReclamosFinalizados,
    baseTotalClientes: baseClientes,
    totalInstalaciones,
    efectividadInstalacionPct: calculatePercentage(
      totals.totalInstalacionesFinalizadas,
      totalInstalaciones,
    ),
    backlogInstalacionPct: calculatePercentage(
      totals.totalInstalacionesPendientes,
      totalInstalaciones,
    ),
    tasaCortePct: calculatePercentage(
      totals.totalClientesCortados,
      baseClientes,
    ),
    churnRateOperacionalPct: calculatePercentage(
      totals.totalClientesCortados + totals.totalClientesPorCortar,
      baseClientes,
    ),
    clientesPorCortarPct: calculatePercentage(
      totals.totalClientesPorCortar,
      baseClientes,
    ),
    clientesExoneradosPct: calculatePercentage(
      totals.totalClientesExonerados,
      baseClientes,
    ),
    ventasSobreBasePct: calculatePercentage(
      totals.totalVenta,
      baseClientes,
    ),
    conversionVentaInstalacionPct: calculatePercentage(
      totals.totalInstalacionesFinalizadas,
      totals.totalVenta,
    ),
    pendienteSobreVentaPct: calculatePercentage(
      totals.totalInstalacionesPendientes,
      totals.totalVenta,
    ),
  }
}

async function getCierreMensualSummary(filters = {}) {
  const requestedFilters = {
    zona: normalizeText(filters?.zona),
    franquicia: normalizeText(filters?.franquicia),
    mes: normalizeMonth(filters?.mes),
    anio: normalizeYear(filters?.anio),
  }

  const cacheKey = buildCacheKey(requestedFilters)
  const cachedSummary = getCachedValue(cacheKey)

  if (cachedSummary) {
    return cachedSummary
  }

  const filtersResult = await query(CIERRE_MENSUAL_FILTERS_QUERY, [
    requestedFilters.zona,
    requestedFilters.franquicia,
    requestedFilters.anio,
    requestedFilters.mes,
  ])

  const filterRow = filtersResult?.rows?.[0] || {}

  const resolvedFilters = {
    zona: normalizeText(filterRow.zona_aplicada),
    franquicia: normalizeText(filterRow.franquicia_aplicada),
    anio: toSafeNumber(filterRow.anio_aplicado),
    mes: toSafeNumber(filterRow.mes_aplicado),
  }

  const dataResult = await query(CIERRE_MENSUAL_DATA_QUERY, [
    resolvedFilters.zona,
    resolvedFilters.franquicia,
    resolvedFilters.anio,
    resolvedFilters.mes,
  ])

  const sourceRows = Array.isArray(dataResult?.rows) ? dataResult.rows : []
  const detallePorServicio = buildDetallePorServicio(sourceRows)

  const response = {
    kpis: buildKpis(detallePorServicio),
    filtrosDisponibles: {
      zonas: toSafeArray(filterRow.zonas),
      franquicias: toSafeArray(filterRow.franquicias),
      meses: toSafeNumberArray(filterRow.meses),
      anios: toSafeNumberArray(filterRow.anios),
    },
    filtrosAplicados: {
      zona: resolvedFilters.zona,
      franquicia: resolvedFilters.franquicia,
      mes: resolvedFilters.mes,
      anio: resolvedFilters.anio,
      mesNombre: getMonthLabel(resolvedFilters.mes),
    },
    tablas: {
      porServicio: detallePorServicio,
      porZona: aggregateRows(detallePorServicio, 'zona'),
      porFranquicia: aggregateRows(detallePorServicio, 'franquicia'),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      totalRegistros: detallePorServicio.length,
    },
  }

  setCachedValue(cacheKey, response)

  return cloneValue(response)
}

module.exports = {
  getCierreMensualSummary,
}