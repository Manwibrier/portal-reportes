// src/services/clientes.service.js

const {
  getCierreMensualSummary,
} = require('./clientes-cierre-mensual.service')
const { query } = require('../config/database')

const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX_ENTRIES = 64

const dashboardCache = new Map()

const DASHBOARD_QUERY = `
  WITH base AS (
    SELECT
      TRIM(COALESCE(zona, '')) AS zona,
      TRIM(COALESCE(franquicia, '')) AS franquicia,
      UPPER(TRIM(COALESCE(servicio, ''))) AS servicio,
      UPPER(TRIM(COALESCE(estatus, ''))) AS estatus
    FROM powerbi.cliente
    WHERE UPPER(TRIM(COALESCE(franquicia, ''))) <> 'PRUEBA'
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
  ),
  filtrado AS (
    SELECT
      b.servicio,
      b.estatus,
      CASE
        WHEN b.servicio LIKE '%INT%' OR b.servicio LIKE '%INTERNET%'
          THEN TRUE
        ELSE FALSE
      END AS has_internet,
      CASE
        WHEN (
          b.servicio LIKE '%TV%'
          OR b.servicio LIKE '%TELEVISION%'
          OR b.servicio LIKE '%CABLE%'
        )
          THEN TRUE
        ELSE FALSE
      END AS has_tv
    FROM base b
    CROSS JOIN zona_resuelta zr
    CROSS JOIN franquicia_resuelta fr
    WHERE (zr.zona = '' OR b.zona = zr.zona)
      AND (fr.franquicia = '' OR b.franquicia = fr.franquicia)
  ),
  clasificado AS (
    SELECT
      estatus,
      has_internet,
      has_tv,
      (has_internet AND NOT has_tv) AS is_internet_only,
      (has_internet AND has_tv) AS is_internet_tv,
      (has_tv AND NOT has_internet) AS is_tv_only,
      -- Matriz oficial unica de clasificacion de estatus.
      -- Los KPI y segmentaciones deben consumir estatus_resuelto
      -- para evitar descuadres entre tarjetas, graficos y tablas.
      CASE
        WHEN estatus = 'ACTIVO'
          THEN 'ACTIVOS'
        WHEN estatus = 'EXONERADO'
          THEN 'EXONERADOS'
        WHEN estatus = 'POR CORTAR'
          THEN 'ACTIVOS'
        WHEN estatus = 'POR INSTALAR'
          THEN 'POR INSTALAR'
        WHEN estatus IN ('SUSPENDIDO', 'POR SUSPENDER')
          THEN 'SUSPENDIDOS'
        WHEN estatus IN ('CORTADO', 'POR RECONECTAR', 'POR REINSTALAR')
          THEN 'CORTADOS'
        ELSE 'OTROS'
      END AS estatus_resuelto
    FROM filtrado
  ),
  metricas AS (
    SELECT
      COUNT(*) FILTER (
        WHERE has_internet
      ) AS internet_total,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'ACTIVOS'
      ) AS internet_activos,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'EXONERADOS'
      ) AS internet_exonerados,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'POR INSTALAR'
      ) AS internet_por_instalar,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'SUSPENDIDOS'
      ) AS internet_suspendidos,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'CORTADOS'
      ) AS internet_cortados,

      COUNT(*) FILTER (
        WHERE is_tv_only
      ) AS television_total,
      COUNT(*) FILTER (
        WHERE is_tv_only
          AND estatus_resuelto = 'ACTIVOS'
      ) AS television_activos,
      COUNT(*) FILTER (
        WHERE is_tv_only
          AND estatus_resuelto = 'EXONERADOS'
      ) AS television_exonerados,
      COUNT(*) FILTER (
        WHERE is_tv_only
          AND estatus_resuelto = 'POR INSTALAR'
      ) AS television_por_instalar,
      COUNT(*) FILTER (
        WHERE is_tv_only
          AND estatus_resuelto = 'SUSPENDIDOS'
      ) AS television_suspendidos,
      COUNT(*) FILTER (
        WHERE is_tv_only
          AND estatus_resuelto = 'CORTADOS'
      ) AS television_cortados,

      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'ACTIVOS'
      ) AS segmentacion_estatus_activos,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'EXONERADOS'
      ) AS segmentacion_estatus_exonerados,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'POR INSTALAR'
      ) AS segmentacion_estatus_por_instalar,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'SUSPENDIDOS'
      ) AS segmentacion_estatus_suspendidos,
      COUNT(*) FILTER (
        WHERE has_internet
          AND estatus_resuelto = 'CORTADOS'
      ) AS segmentacion_estatus_cortados,

      COUNT(*) FILTER (
        WHERE is_internet_only
      ) AS segmentacion_producto_internet,
      COUNT(*) FILTER (
        WHERE is_internet_tv
      ) AS segmentacion_producto_internet_tv
    FROM clasificado
  )
  SELECT
    (SELECT items FROM zonas_disponibles) AS zonas,
    (SELECT items FROM franquicias_disponibles) AS franquicias,
    (SELECT zona FROM zona_resuelta) AS zona_aplicada,
    (SELECT franquicia FROM franquicia_resuelta) AS franquicia_aplicada,

    COALESCE(metricas.internet_total, 0) AS internet_total,
    COALESCE(metricas.internet_activos, 0) AS internet_activos,
    COALESCE(metricas.internet_exonerados, 0) AS internet_exonerados,
    COALESCE(metricas.internet_por_instalar, 0) AS internet_por_instalar,
    COALESCE(metricas.internet_suspendidos, 0) AS internet_suspendidos,
    COALESCE(metricas.internet_cortados, 0) AS internet_cortados,

    COALESCE(metricas.television_total, 0) AS television_total,
    COALESCE(metricas.television_activos, 0) AS television_activos,
    COALESCE(metricas.television_exonerados, 0) AS television_exonerados,
    COALESCE(metricas.television_por_instalar, 0) AS television_por_instalar,
    COALESCE(metricas.television_suspendidos, 0) AS television_suspendidos,
    COALESCE(metricas.television_cortados, 0) AS television_cortados,

    COALESCE(metricas.segmentacion_estatus_activos, 0) AS segmentacion_estatus_activos,
    COALESCE(metricas.segmentacion_estatus_exonerados, 0) AS segmentacion_estatus_exonerados,
    COALESCE(metricas.segmentacion_estatus_por_instalar, 0) AS segmentacion_estatus_por_instalar,
    COALESCE(metricas.segmentacion_estatus_suspendidos, 0) AS segmentacion_estatus_suspendidos,
    COALESCE(metricas.segmentacion_estatus_cortados, 0) AS segmentacion_estatus_cortados,

    COALESCE(metricas.segmentacion_producto_internet, 0) AS segmentacion_producto_internet,
    COALESCE(metricas.segmentacion_producto_internet_tv, 0) AS segmentacion_producto_internet_tv
  FROM metricas;
`

function normalizeText(value) {
  return String(value || '').trim()
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

function createSummaryBucket({
  total = 0,
  activos = 0,
  exonerados = 0,
  porInstalar = 0,
  suspendidos = 0,
  cortados = 0,
} = {}) {
  return {
    total: toSafeNumber(total),
    activos: toSafeNumber(activos),
    exonerados: toSafeNumber(exonerados),
    porInstalar: toSafeNumber(porInstalar),
    suspendidos: toSafeNumber(suspendidos),
    cortados: toSafeNumber(cortados),
  }
}

function createStatusSummary({
  activos = 0,
  exonerados = 0,
  porInstalar = 0,
  suspendidos = 0,
  cortados = 0,
} = {}) {
  const resolvedActivos = toSafeNumber(activos)
  const resolvedExonerados = toSafeNumber(exonerados)
  const resolvedPorInstalar = toSafeNumber(porInstalar)
  const resolvedSuspendidos = toSafeNumber(suspendidos)
  const resolvedCortados = toSafeNumber(cortados)

  return {
    activos: resolvedActivos,
    exonerados: resolvedExonerados,
    porInstalar: resolvedPorInstalar,
    suspendidos: resolvedSuspendidos,
    cortados: resolvedCortados,
    total:
      resolvedActivos +
      resolvedExonerados +
      resolvedPorInstalar +
      resolvedSuspendidos +
      resolvedCortados,
  }
}

function createProductSummary({
  internet = 0,
  internetTv = 0,
} = {}) {
  const resolvedInternet = toSafeNumber(internet)
  const resolvedInternetTv = toSafeNumber(internetTv)

  return {
    internet: resolvedInternet,
    internetTv: resolvedInternetTv,
    total: resolvedInternet + resolvedInternetTv,
  }
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function buildCacheKey(filters = {}) {
  const zona = normalizeText(filters?.zona)
  const franquicia = normalizeText(filters?.franquicia)
  return `${zona}::${franquicia}`
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

async function getDashboardSummary(filters = {}) {
  const requestedFilters = {
    zona: normalizeText(filters?.zona),
    franquicia: normalizeText(filters?.franquicia),
  }

  const cacheKey = buildCacheKey(requestedFilters)
  const cachedDashboard = getCachedDashboard(cacheKey)

  if (cachedDashboard) {
    return cachedDashboard
  }

  const result = await query(DASHBOARD_QUERY, [
    requestedFilters.zona,
    requestedFilters.franquicia,
  ])

  const row = result?.rows?.[0] || {}

  const response = {
    internet: createSummaryBucket({
      total: row.internet_total,
      activos: row.internet_activos,
      exonerados: row.internet_exonerados,
      porInstalar: row.internet_por_instalar,
      suspendidos: row.internet_suspendidos,
      cortados: row.internet_cortados,
    }),

    television: createSummaryBucket({
      total: row.television_total,
      activos: row.television_activos,
      exonerados: row.television_exonerados,
      porInstalar: row.television_por_instalar,
      suspendidos: row.television_suspendidos,
      cortados: row.television_cortados,
    }),

    segmentacionEstatus: createStatusSummary({
      activos: row.segmentacion_estatus_activos,
      exonerados: row.segmentacion_estatus_exonerados,
      porInstalar: row.segmentacion_estatus_por_instalar,
      suspendidos: row.segmentacion_estatus_suspendidos,
      cortados: row.segmentacion_estatus_cortados,
    }),

    segmentacionProducto: createProductSummary({
      internet: row.segmentacion_producto_internet,
      internetTv: row.segmentacion_producto_internet_tv,
    }),

    filtrosDisponibles: {
      zonas: toSafeArray(row.zonas),
      franquicias: toSafeArray(row.franquicias),
    },

    filtrosAplicados: {
      zona: normalizeText(row.zona_aplicada),
      franquicia: normalizeText(row.franquicia_aplicada),
    },
  }

  setCachedDashboard(cacheKey, response)

  return cloneValue(response)
}

module.exports = {
  getDashboardSummary,
  getCierreMensualSummary,
}