// backend/src/services/operaciones-ordenes.service.js

const { totalnetQuery } = require('../config/database')

const SUMMARY_VIEW = 'powerbi.resumen_ordenes_servicio'
const DETAIL_VIEW = 'powerbi.ordenes_servicio'

const CACHE_TTL_MS = 60 * 1000
// El payload sigue siendo grande (miles de filas de detalle): pocas entradas
// en memoria es la diferencia entre Cache-Control razonable y un OOM.
const CACHE_MAX_ENTRIES = 4
const MAX_DETAIL_ROWS = 5000

const OPEN_STATUSES = new Set([
  'PENDIENTE',
  'ASIGNADA',
  'POR ACTIVAR',
])

const cache = new Map()

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeComparable(value = '') {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function round(value, decimals = 2) {
  const number = normalizeNumber(value)
  const factor = 10 ** decimals
  return Math.round(number * factor) / factor
}

function pct(numerator, denominator) {
  const total = normalizeNumber(denominator)

  if (total <= 0) {
    return 0
  }

  return round((normalizeNumber(numerator) / total) * 100, 2)
}

function toDateOnly(value) {
  if (!value) {
    return ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const text = String(value).trim()

  if (!text) {
    return ''
  }

  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)

  return match ? match[1] : text
}

function dateToUtc(value) {
  const dateText = toDateOnly(value)

  if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return null
  }

  const [year, month, day] = dateText.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return Number.isNaN(date.getTime()) ? null : date
}

function diffDays(startValue, endValue) {
  const start = dateToUtc(startValue)
  const end = dateToUtc(endValue)

  if (!start || !end) {
    return null
  }

  const difference = Math.round(
    (end.getTime() - start.getTime()) / 86400000,
  )

  return difference >= 0 ? difference : null
}

function average(values = []) {
  const valid = values.filter((value) => Number.isFinite(value))

  if (!valid.length) {
    return 0
  }

  return round(
    valid.reduce((total, value) => total + value, 0) / valid.length,
    2,
  )
}

function isOpenStatus(status) {
  return OPEN_STATUSES.has(normalizeComparable(status))
}

function isFinalizedStatus(status) {
  return normalizeComparable(status) === 'FINALIZADA'
}

function isCancelledStatus(status) {
  return normalizeComparable(status) === 'CANCELADA'
}

function normalizeFilters(filters = {}) {
  return {
    zona: normalizeText(filters.zona),
    franquicia: normalizeText(filters.franquicia),
    servicio: normalizeText(filters.servicio),
    tipoServicio: normalizeText(
      filters.tipoServicio ?? filters.tipo_servicio,
    ),
    tipoOrden: normalizeText(
      filters.tipoOrden ?? filters.tipo_orden,
    ),
    limit: Math.min(
      Math.max(normalizeNumber(filters.limit, MAX_DETAIL_ROWS), 1),
      MAX_DETAIL_ROWS,
    ),
  }
}

function buildCacheKey(filters) {
  return JSON.stringify(filters)
}

function getDatabaseErrorInfo(error) {
  return {
    code: String(error?.code || ''),
    message: String(error?.message || 'Error desconocido'),
  }
}

function isOptionalDetailDatabaseError(error) {
  const code = String(error?.code || '')

  return [
    '42P01',
    '42501',
    '42703',
    '3F000',
  ].includes(code)
}

function pruneCache() {
  const now = Date.now()

  for (const [key, entry] of cache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      cache.delete(key)
    }
  }

  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value

    if (!oldestKey) {
      break
    }

    cache.delete(oldestKey)
  }
}

function getCached(key) {
  pruneCache()

  const entry = cache.get(key)

  return entry ? entry.value : null
}

// Sin copia profunda: la respuesta se serializa tal cual y nadie la muta.
// Clonar el payload entero por peticion era lo que tumbaba el contenedor.
function setCached(key, value) {
  pruneCache()

  cache.set(key, {
    createdAt: Date.now(),
    value,
  })
}

function buildFilterSql(alias, filters, params) {
  const conditions = []

  const addTextFilter = (value, columnName) => {
    if (!value) {
      return
    }

    params.push(value)

    conditions.push(
      `COALESCE(NULLIF(TRIM(${alias}.${columnName}::text), ''), '') = $${params.length}`,
    )
  }

  addTextFilter(filters.zona, 'zona')
  addTextFilter(filters.franquicia, 'franquicia')
  addTextFilter(filters.servicio, 'servicio')
  addTextFilter(filters.tipoServicio, 'tipo_servicio')
  addTextFilter(filters.tipoOrden, 'tipo_orden')

  return conditions
}

async function fetchSummaryRows(filters) {
  const params = []
  const conditions = buildFilterSql('r', filters, params)

  const whereSql = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : ''

  const result = await totalnetQuery(
    `
      SELECT
        r.fecha,
        r.fecha_registro,
        r.fecha_asignacion,
        r.fecha_finalizacion,
        r.zona,
        r.franquicia,
        r.servicio,
        r.tipo_servicio,
        r.tipo_orden,
        r.pendientes_meses_anteriores,
        r.finalizadas_meses_anteriores,
        r.canceladas_meses_anteriores,
        r.generadas_mes_actual,
        r.pendienes_mes_actual,
        r.finalizadas_mes_actual,
        r.canceladas_mes_actual,
        r.ordenes_servicio,
        r.contratos
      FROM ${SUMMARY_VIEW} r
      ${whereSql}
      ORDER BY
        r.fecha NULLS LAST,
        r.zona NULLS LAST,
        r.franquicia NULLS LAST,
        r.servicio NULLS LAST,
        r.tipo_servicio NULLS LAST,
        r.tipo_orden NULLS LAST;
    `,
    params,
  )

  return result.rows
}

async function fetchDetailRows(filters) {
  const params = []
  const conditions = buildFilterSql('o', filters, params)

  /*
   * El detalle tecnico se limita al universo operacional relevante:
   *
   * 1. Ordenes registradas durante el mes actual.
   * 2. Ordenes finalizadas durante el mes actual.
   * 3. Backlog que continua abierto.
   *
   * Esto evita traer historico completo innecesariamente y reproduce
   * la logica operativa del PBIX sin alterar las vistas de Power BI.
   */
  conditions.push(`
    (
      (
        o.fecha_registro >= DATE_TRUNC('month', CURRENT_DATE)::date
        AND o.fecha_registro < (
          DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        )::date
      )
      OR
      (
        o.fecha_finalizacion >= DATE_TRUNC('month', CURRENT_DATE)::date
        AND o.fecha_finalizacion < (
          DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        )::date
      )
      OR
      UPPER(TRIM(COALESCE(o.estatus_orden_servicio::text, '')))
        IN ('PENDIENTE', 'ASIGNADA', 'POR ACTIVAR')
    )
  `)

  params.push(filters.limit)

  const result = await totalnetQuery(
    `
      SELECT
        o.id_orden_servicio,
        o.zona,
        o.franquicia,
        o.servicio,
        o.tipo_servicio,
        o.tipo_orden,
        o.contrato,
        o.rif,
        o.sector,
        o.estatus_contrato,
        o.estatus_orden_servicio,
        o.fecha_registro,
        o.fecha_asignacion,
        o.fecha_finalizacion,
        o.fecha_ultimo_estatus,
        o.usuario_creador,
        o.tecnico,
        o.actividad_realizada
      FROM ${DETAIL_VIEW} o
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        COALESCE(
          o.fecha_finalizacion,
          o.fecha_asignacion,
          o.fecha_registro
        ) DESC NULLS LAST,
        o.id_orden_servicio DESC
      LIMIT $${params.length};
    `,
    params,
  )

  return result.rows
}

async function fetchDetailRowsSafe(filters) {
  try {
    const rows = await fetchDetailRows(filters)

    return {
      rows,
      warning: null,
    }
  } catch (error) {
    const info = getDatabaseErrorInfo(error)

    console.error(
      '[OPERACIONES][ORDENES] No fue posible consultar powerbi.ordenes_servicio:',
      info,
    )

    /*
     * El detalle / tecnicos es una ampliacion del modulo.
     *
     * Nunca debe impedir que carguen los KPI oficiales provenientes
     * de powerbi.resumen_ordenes_servicio.
     */
    if (isOptionalDetailDatabaseError(error)) {
      return {
        rows: [],
        warning: info,
      }
    }

    /*
     * Tambien hacemos fallback para otros errores SQL de la vista
     * complementaria. El problema queda visible en meta.detailWarning
     * y en el log del backend, pero NO tumba el modulo principal.
     */
    return {
      rows: [],
      warning: info,
    }
  }
}
async function fetchCatalogs() {
  const result = await totalnetQuery(
    `
      SELECT
        ARRAY(
          SELECT DISTINCT TRIM(zona::text)
          FROM ${SUMMARY_VIEW}
          WHERE NULLIF(TRIM(zona::text), '') IS NOT NULL
          ORDER BY 1
        ) AS zonas,

        ARRAY(
          SELECT DISTINCT TRIM(franquicia::text)
          FROM ${SUMMARY_VIEW}
          WHERE NULLIF(TRIM(franquicia::text), '') IS NOT NULL
          ORDER BY 1
        ) AS franquicias,

        ARRAY(
          SELECT DISTINCT TRIM(servicio::text)
          FROM ${SUMMARY_VIEW}
          WHERE NULLIF(TRIM(servicio::text), '') IS NOT NULL
          ORDER BY 1
        ) AS servicios,

        ARRAY(
          SELECT DISTINCT TRIM(tipo_servicio::text)
          FROM ${SUMMARY_VIEW}
          WHERE NULLIF(TRIM(tipo_servicio::text), '') IS NOT NULL
          ORDER BY 1
        ) AS tipos_servicio,

        ARRAY(
          SELECT DISTINCT TRIM(tipo_orden::text)
          FROM ${SUMMARY_VIEW}
          WHERE NULLIF(TRIM(tipo_orden::text), '') IS NOT NULL
          ORDER BY 1
        ) AS tipos_orden;
    `,
  )

  const row = result.rows[0] || {}

  return {
    zonas: Array.isArray(row.zonas) ? row.zonas : [],
    franquicias: Array.isArray(row.franquicias)
      ? row.franquicias
      : [],
    servicios: Array.isArray(row.servicios)
      ? row.servicios
      : [],
    tiposServicio: Array.isArray(row.tipos_servicio)
      ? row.tipos_servicio
      : [],
    tiposOrden: Array.isArray(row.tipos_orden)
      ? row.tipos_orden
      : [],
  }
}

async function fetchCatalogsSafe() {
  try {
    return await fetchCatalogs()
  } catch (error) {
    console.error(
      '[OPERACIONES][ORDENES] No fue posible cargar catalogos:',
      getDatabaseErrorInfo(error),
    )

    return {
      zonas: [],
      franquicias: [],
      servicios: [],
      tiposServicio: [],
      tiposOrden: [],
    }
  }
}
function splitIds(value) {
  return normalizeText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeSummaryRow(row = {}, index = 0) {
  const pendientesMesesAnteriores = normalizeNumber(
    row.pendientes_meses_anteriores,
  )
  const finalizadasMesesAnteriores = normalizeNumber(
    row.finalizadas_meses_anteriores,
  )
  const canceladasMesesAnteriores = normalizeNumber(
    row.canceladas_meses_anteriores,
  )
  const generadasMesActual = normalizeNumber(
    row.generadas_mes_actual,
  )
  const pendientesMesActual = normalizeNumber(
    row.pendienes_mes_actual,
  )
  const finalizadasMesActual = normalizeNumber(
    row.finalizadas_mes_actual,
  )
  const canceladasMesActual = normalizeNumber(
    row.canceladas_mes_actual,
  )

  return {
    id: `summary-${index}`,
    fecha: toDateOnly(row.fecha),
    fechaRegistro: toDateOnly(row.fecha_registro),
    fechaAsignacion: toDateOnly(row.fecha_asignacion),
    fechaFinalizacion: toDateOnly(row.fecha_finalizacion),

    zona: normalizeText(row.zona, 'SIN ZONA'),
    franquicia: normalizeText(
      row.franquicia,
      'SIN FRANQUICIA',
    ),
    servicio: normalizeText(
      row.servicio,
      'SIN SERVICIO',
    ),
    tipoServicio: normalizeText(
      row.tipo_servicio,
      'SIN TIPO SERVICIO',
    ),
    tipoOrden: normalizeText(
      row.tipo_orden,
      'SIN TIPO ORDEN',
    ),

    pendientesMesesAnteriores,
    finalizadasMesesAnteriores,
    canceladasMesesAnteriores,

    generadasMesActual,
    pendientesMesActual,
    finalizadasMesActual,
    canceladasMesActual,

    ordenesServicio: splitIds(row.ordenes_servicio),
    contratos: splitIds(row.contratos),
  }
}

function normalizeDetailRow(row = {}) {
  const estatus = normalizeText(
    row.estatus_orden_servicio,
    'SIN ESTATUS',
  )

  const fechaRegistro = toDateOnly(row.fecha_registro)
  const fechaAsignacion = toDateOnly(row.fecha_asignacion)
  const fechaFinalizacion = toDateOnly(row.fecha_finalizacion)

  return {
    idOrdenServicio: row.id_orden_servicio,
    zona: normalizeText(row.zona, 'SIN ZONA'),
    franquicia: normalizeText(
      row.franquicia,
      'SIN FRANQUICIA',
    ),
    servicio: normalizeText(
      row.servicio,
      'SIN SERVICIO',
    ),
    tipoServicio: normalizeText(
      row.tipo_servicio,
      'SIN TIPO SERVICIO',
    ),
    tipoOrden: normalizeText(
      row.tipo_orden,
      'SIN TIPO ORDEN',
    ),
    contrato: row.contrato,
    rif: normalizeText(row.rif),
    sector: normalizeText(row.sector, 'SIN SECTOR'),
    estatusContrato: normalizeText(
      row.estatus_contrato,
      'SIN ESTATUS',
    ),
    estatusOrdenServicio: estatus,
    fechaRegistro,
    fechaAsignacion,
    fechaFinalizacion,
    fechaUltimoEstatus: toDateOnly(row.fecha_ultimo_estatus),
    usuarioCreador: normalizeText(row.usuario_creador),
    tecnico: normalizeText(row.tecnico),
    actividadRealizada: normalizeText(row.actividad_realizada),

    esPendiente: isOpenStatus(estatus),
    esFinalizada: isFinalizedStatus(estatus),
    esCancelada: isCancelledStatus(estatus),

    diasRegistroAsignacion: diffDays(
      fechaRegistro,
      fechaAsignacion,
    ),
    diasAsignacionFinalizacion: diffDays(
      fechaAsignacion,
      fechaFinalizacion,
    ),
    diasRegistroFinalizacion: diffDays(
      fechaRegistro,
      fechaFinalizacion,
    ),
  }
}

function sumRows(rows, key) {
  return rows.reduce(
    (total, row) => total + normalizeNumber(row[key]),
    0,
  )
}

function buildOperationalKpis(rows) {
  const pendientesMesesAnteriores = sumRows(
    rows,
    'pendientesMesesAnteriores',
  )
  const finalizadasMesesAnteriores = sumRows(
    rows,
    'finalizadasMesesAnteriores',
  )
  const canceladasMesesAnteriores = sumRows(
    rows,
    'canceladasMesesAnteriores',
  )

  const generadasMesActual = sumRows(
    rows,
    'generadasMesActual',
  )
  const pendientesMesActual = sumRows(
    rows,
    'pendientesMesActual',
  )
  const finalizadasMesActual = sumRows(
    rows,
    'finalizadasMesActual',
  )
  const canceladasMesActual = sumRows(
    rows,
    'canceladasMesActual',
  )

  const totalMesesAnteriores =
    pendientesMesesAnteriores +
    finalizadasMesesAnteriores +
    canceladasMesesAnteriores

  const totalOperativo =
    totalMesesAnteriores +
    generadasMesActual

  return {
    mesActual: {
      total: generadasMesActual,
      generadas: generadasMesActual,
      pendientes: pendientesMesActual,
      finalizadas: finalizadasMesActual,
      canceladas: canceladasMesActual,

      pctPendientes: pct(
        pendientesMesActual,
        generadasMesActual,
      ),
      pctFinalizadas: pct(
        finalizadasMesActual,
        generadasMesActual,
      ),
      pctCanceladas: pct(
        canceladasMesActual,
        generadasMesActual,
      ),
    },

    mesesAnteriores: {
      total: totalMesesAnteriores,
      pendientes: pendientesMesesAnteriores,
      finalizadas: finalizadasMesesAnteriores,
      canceladas: canceladasMesesAnteriores,

      pctGestionado: pct(
        finalizadasMesesAnteriores +
          canceladasMesesAnteriores,
        totalMesesAnteriores,
      ),
    },

    totalOperativo: {
      total: totalOperativo,
      pendientes:
        pendientesMesesAnteriores +
        pendientesMesActual,
      finalizadas:
        finalizadasMesesAnteriores +
        finalizadasMesActual,
      canceladas:
        canceladasMesesAnteriores +
        canceladasMesActual,
    },
  }
}

function buildOperationalMonthlyHistory(rows = []) {
  const buckets = new Map()

  rows.forEach((row) => {
    const fecha = String(row.fecha || '').trim()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return
    }

    const year = Number(fecha.slice(0, 4))
    const month = Number(fecha.slice(5, 7))

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return
    }

    const key =
      `${year}-${String(month).padStart(2, '0')}`

    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        year,
        month,

        pendientesAnteriores: 0,
        canceladasAnteriores: 0,
        finalizadasAnteriores: 0,

        generadas: 0,
        finalizadas: 0,
        pendientes: 0,
        canceladas: 0,
      })
    }

    const item = buckets.get(key)

    item.pendientesAnteriores +=
      normalizeNumber(
        row.pendientesMesesAnteriores,
      )

    item.canceladasAnteriores +=
      normalizeNumber(
        row.canceladasMesesAnteriores,
      )

    item.finalizadasAnteriores +=
      normalizeNumber(
        row.finalizadasMesesAnteriores,
      )

    item.generadas +=
      normalizeNumber(
        row.generadasMesActual,
      )

    item.finalizadas +=
      normalizeNumber(
        row.finalizadasMesActual,
      )

    item.pendientes +=
      normalizeNumber(
        row.pendientesMesActual,
      )

    item.canceladas +=
      normalizeNumber(
        row.canceladasMesActual,
      )
  })

  return Array.from(
    buckets.values(),
  ).sort(
    (left, right) =>
      left.key.localeCompare(
        right.key,
      ),
  )
}
function buildOperationalEvolution(rows) {
  const buckets = new Map()

  rows.forEach((row) => {
    const key = row.fecha || 'SIN FECHA'

    if (!buckets.has(key)) {
      buckets.set(key, {
        fecha: key,
        generadas: 0,
        pendientes: 0,
        finalizadas: 0,
        canceladas: 0,
        pendientesAnteriores: 0,
        finalizadasAnteriores: 0,
        canceladasAnteriores: 0,
      })
    }

    const item = buckets.get(key)

    item.generadas += row.generadasMesActual
    item.pendientes += row.pendientesMesActual
    item.finalizadas += row.finalizadasMesActual
    item.canceladas += row.canceladasMesActual

    item.pendientesAnteriores +=
      row.pendientesMesesAnteriores
    item.finalizadasAnteriores +=
      row.finalizadasMesesAnteriores
    item.canceladasAnteriores +=
      row.canceladasMesesAnteriores
  })

  return Array.from(buckets.values())
    .filter((item) => item.fecha !== 'SIN FECHA')
    .sort((left, right) =>
      left.fecha.localeCompare(right.fecha),
    )
}

function buildExecutionAggregation(rows, keyName, limit = 14) {
  const buckets = new Map()

  rows.forEach((row) => {
    const label = normalizeText(
      row[keyName],
      'SIN CLASIFICAR',
    )

    if (!buckets.has(label)) {
      buckets.set(label, {
        label,
        ejecutadas: 0,
        pendientes: 0,
        canceladas: 0,
        total: 0,
      })
    }

    const item = buckets.get(label)

    if (row.esFinalizada) {
      item.ejecutadas += 1
    }

    if (row.esPendiente) {
      item.pendientes += 1
    }

    if (row.esCancelada) {
      item.canceladas += 1
    }

    item.total += 1
  })

  return Array.from(buckets.values())
    .filter(
      (item) =>
        item.ejecutadas > 0 ||
        item.pendientes > 0 ||
        item.canceladas > 0,
    )
    .sort((left, right) => {
      if (
        right.pendientes !==
        left.pendientes
      ) {
        return (
          right.pendientes -
          left.pendientes
        )
      }

      if (
        right.ejecutadas !==
        left.ejecutadas
      ) {
        return (
          right.ejecutadas -
          left.ejecutadas
        )
      }

      return left.label.localeCompare(
        right.label,
        'es',
        { sensitivity: 'base' },
      )
    })
    .slice(0, limit)
}

function buildTechnicians(rows) {
  const buckets = new Map()

  let ordenesSinTecnico = 0

  rows.forEach((row) => {
    const tecnico = normalizeText(row.tecnico)

    if (!tecnico) {
      ordenesSinTecnico += 1
      return
    }

    if (!buckets.has(tecnico)) {
      buckets.set(tecnico, {
        tecnico,
        asignadas: 0,
        finalizadas: 0,
        enEjecucion: 0,
        canceladas: 0,
        diasAsignacion: [],
        diasEjecucion: [],
        diasTotal: [],
      })
    }

    const item = buckets.get(tecnico)

    item.asignadas += 1

    if (row.esFinalizada) {
      item.finalizadas += 1
    }

    if (row.esPendiente) {
      item.enEjecucion += 1
    }

    if (row.esCancelada) {
      item.canceladas += 1
    }

    if (Number.isFinite(row.diasRegistroAsignacion)) {
      item.diasAsignacion.push(
        row.diasRegistroAsignacion,
      )
    }

    if (Number.isFinite(row.diasAsignacionFinalizacion)) {
      item.diasEjecucion.push(
        row.diasAsignacionFinalizacion,
      )
    }

    if (Number.isFinite(row.diasRegistroFinalizacion)) {
      item.diasTotal.push(
        row.diasRegistroFinalizacion,
      )
    }
  })

  const ranking = Array.from(buckets.values())
    .map((item) => ({
      tecnico: item.tecnico,
      asignadas: item.asignadas,
      finalizadas: item.finalizadas,
      enEjecucion: item.enEjecucion,
      canceladas: item.canceladas,

      pctFinalizacion: pct(
        item.finalizadas,
        item.asignadas,
      ),

      promedioAsignacionDias: average(
        item.diasAsignacion,
      ),
      promedioEjecucionDias: average(
        item.diasEjecucion,
      ),
      promedioTotalDias: average(
        item.diasTotal,
      ),
    }))
    .sort((left, right) => {
      if (right.finalizadas !== left.finalizadas) {
        return right.finalizadas - left.finalizadas
      }

      if (
        right.pctFinalizacion !== left.pctFinalizacion
      ) {
        return (
          right.pctFinalizacion -
          left.pctFinalizacion
        )
      }

      return left.tecnico.localeCompare(
        right.tecnico,
        'es',
        { sensitivity: 'base' },
      )
    })

  const allAssignmentDays = rows
    .map((row) => row.diasRegistroAsignacion)
    .filter(Number.isFinite)

  const allExecutionDays = rows
    .map((row) => row.diasAsignacionFinalizacion)
    .filter(Number.isFinite)

  const allTotalDays = rows
    .map((row) => row.diasRegistroFinalizacion)
    .filter(Number.isFinite)

  return {
    kpis: {
      tecnicosActivos: ranking.length,
      ordenesAsignadas: ranking.reduce(
        (total, row) => total + row.asignadas,
        0,
      ),
      finalizadas: ranking.reduce(
        (total, row) => total + row.finalizadas,
        0,
      ),
      enEjecucion: ranking.reduce(
        (total, row) => total + row.enEjecucion,
        0,
      ),
      canceladas: ranking.reduce(
        (total, row) => total + row.canceladas,
        0,
      ),
      ordenesSinTecnico,
      promedioAsignacionDias: average(
        allAssignmentDays,
      ),
      promedioEjecucionDias: average(
        allExecutionDays,
      ),
      promedioTotalDias: average(
        allTotalDays,
      ),
    },

    ranking,

    chart: ranking.slice(0, 12).map((row) => ({
      label: row.tecnico,
      finalizadas: row.finalizadas,
      enEjecucion: row.enEjecucion,
      pctFinalizacion: row.pctFinalizacion,
    })),
  }
}

function buildDistributions(rows) {
  return {
    porZona: buildExecutionAggregation(
      rows,
      'zona',
      14,
    ),
    porFranquicia: buildExecutionAggregation(
      rows,
      'franquicia',
      16,
    ),
    porServicio: buildExecutionAggregation(
      rows,
      'servicio',
      12,
    ),
    porTipoOrden: buildExecutionAggregation(
      rows,
      'tipoOrden',
      14,
    ),
  }
}

function normalizeOrderTypeKey(value = '') {
  return normalizeComparable(value)
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function buildOrderTypeBlock(summaryRows, detailRows, tipoOrden) {
  const summaryFiltered = summaryRows.filter(
    (row) =>
      normalizeComparable(row.tipoOrden) ===
      normalizeComparable(tipoOrden),
  )

  const detailFiltered = detailRows.filter(
    (row) =>
      normalizeComparable(row.tipoOrden) ===
      normalizeComparable(tipoOrden),
  )

  const operational =
    buildOperationalKpis(
      summaryFiltered,
    )

  const distributions =
    detailFiltered.length
      ? buildDistributions(detailFiltered)
      : {
          porZona: [],
          porFranquicia: [],
          porServicio: [],
          porTipoOrden: [],
        }

  return {
    key:
      normalizeOrderTypeKey(
        tipoOrden,
      ),

    tipoOrden,

    kpis:
      operational,

    charts: {
      historicoMensual:
        buildOperationalMonthlyHistory(
          summaryFiltered,
        ),

      porZona:
        distributions.porZona,

      porFranquicia:
        distributions.porFranquicia,
    },

    meta: {
      summaryRows:
        summaryFiltered.length,

      detailRows:
        detailFiltered.length,
    },
  }
}

function buildOrderTypeBlocks(
  summaryRows = [],
  detailRows = [],
) {
  const desiredOrder = [
    'CAMBIO DE EQUIPO',
    'CAMBIO DE TECNOLOGIA',
    'INSTALACION',
    'VISITA TECNICA',
    'VISITA TECNICA GARANTIA',
  ]

  const available = new Map()

  summaryRows.forEach((row) => {
    const tipo =
      normalizeText(
        row.tipoOrden,
      )

    const normalized =
      normalizeComparable(
        tipo,
      )

    if (
      normalized &&
      !available.has(normalized)
    ) {
      available.set(
        normalized,
        tipo,
      )
    }
  })

  return desiredOrder
    .map(
      (normalized) =>
        available.get(
          normalized,
        ),
    )
    .filter(Boolean)
    .map(
      (tipoOrden) =>
        buildOrderTypeBlock(
          summaryRows,
          detailRows,
          tipoOrden,
        ),
    )
}
function buildAppliedFilters(filters) {
  return {
    zona: filters.zona,
    franquicia: filters.franquicia,
    servicio: filters.servicio,
    tipoServicio: filters.tipoServicio,
    tipoOrden: filters.tipoOrden,
  }
}

async function getOrdenesServicioSummary(options = {}) {
  const filters = normalizeFilters(options)
  const cacheKey = buildCacheKey(filters)
  const cached = getCached(cacheKey)

  if (cached) {
    return cached
  }

  /*
   * PRIMERA REGLA:
   *
   * powerbi.resumen_ordenes_servicio es la fuente oficial y obligatoria
   * de los KPI operacionales.
   *
   * Si esta consulta falla, SI corresponde devolver error.
   */
  const rawSummaryRows = await fetchSummaryRows(filters)

  const summaryRows = rawSummaryRows.map(
    normalizeSummaryRow,
  )

  const kpis = buildOperationalKpis(
    summaryRows,
  )

  /*
   * SEGUNDA REGLA:
   *
   * powerbi.ordenes_servicio es complementaria.
   * Alimenta tecnicos y detalle, pero su falla NO puede tumbar
   * los KPI oficiales del modulo.
   */
  const [
    detailResult,
    catalogs,
  ] = await Promise.all([
    fetchDetailRowsSafe(filters),
    fetchCatalogsSafe(),
  ])

  const detailRows =
    detailResult.rows.map(
      normalizeDetailRow,
    )

  const technicians =
    buildTechnicians(
      detailRows,
    )

  /*
   * Los graficos operacionales deben seguir pudiendo mostrarse
   * aun cuando el detalle no este disponible.
   *
   * Si hay detalle, usamos una fila por O.S.
   * Si no lo hay, devolvemos arrays vacios para esos graficos
   * complementarios sin afectar los KPI.
   */
  const distributions =
    detailRows.length > 0
      ? buildDistributions(detailRows)
      : {
          porZona: [],
          porFranquicia: [],
          porServicio: [],
          porTipoOrden: [],
        }

  const orderTypeBlocks =
    buildOrderTypeBlocks(
      summaryRows,
      detailRows,
    )

  const response = {
    kpis,

    orderTypeBlocks,

    charts: {
      historicoMensual:
        buildOperationalMonthlyHistory(
          summaryRows,
        ),

      porZona:
        distributions.porZona,

      porFranquicia:
        distributions.porFranquicia,

      porServicio:
        distributions.porServicio,

      porTipoOrden:
        distributions.porTipoOrden,

      tecnicos:
        technicians.chart,
    },

    technicians,

    // No se vuelcan las filas crudas del resumen: son ~460k filas con listas de
    // IDs anidadas (26 MB solo en texto) y ningun consumidor las lee.
    // El total sigue disponible en meta.summaryRows.
    tables: {
      detalleOrdenes:
        detailRows,

      tecnicos:
        technicians.ranking,
    },

    filters: {
      ...catalogs,

      applied:
        buildAppliedFilters(
          filters,
        ),
    },

    meta: {
      generatedAt:
        new Date().toISOString(),

      sources: [
        SUMMARY_VIEW,
        DETAIL_VIEW,
      ],

      sourceMode:
        'totalnet-readonly',

      summaryRows:
        summaryRows.length,

      detailRows:
        detailRows.length,

      detailAvailable:
        !detailResult.warning,

      detailWarning:
        detailResult.warning
          ? {
              code:
                detailResult.warning.code,

              message:
                detailResult.warning.message,
            }
          : null,

      currentPeriodControlledByDatabase:
        true,

      sla: {
        available: false,

        reason:
          'La regla oficial SLA+/SLA- no esta definida en las vistas suministradas. No se infiere ningun umbral.',
      },

      notes: [
        'Los KPI principales proceden de powerbi.resumen_ordenes_servicio.',
        'La vista resumen calcula el mes actual usando CURRENT_DATE en PostgreSQL.',
        'Las estadisticas de tecnicos usan powerbi.ordenes_servicio cuando la vista esta disponible.',
        'Una falla de la vista de detalle no bloquea los KPI oficiales del modulo.',
        'SLA no se calcula hasta disponer de la regla operacional oficial.',
      ],
    },
  }

  setCached(
    cacheKey,
    response,
  )

  return response
}

module.exports = {
  getOrdenesServicioSummary,

  // Alias conservado para compatibilidad.
  getOrdenesServicio: getOrdenesServicioSummary,
}
