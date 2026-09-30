const { query } = require('../config/database')
const { env } = require('../config/env')
const {
  createMonthSeries,
  diffInDays,
  diffInHours,
  firstNonEmpty,
  hasRealReason,
  isClosedStatus,
  normalizeCompare,
  normalizeStatus,
  normalizeText,
  round,
  toBusinessBoolean,
  toDate,
  toEndOfDay,
  toStartOfDay,
} = require('../utils/tickets-domain')

const DEFAULT_WINDOW_MONTHS = Number(env.DEFAULT_WINDOW_MONTHS || 12)
const MIN_WINDOW_MONTHS = 1
const MAX_WINDOW_MONTHS = 24
const DEFAULT_TOP_LIMIT = 10
const DEFAULT_CRITICAL_LIMIT = 25
const MIN_LIST_LIMIT = 1
const MAX_LIST_LIMIT = 100
const MONTHLY_ENDPOINT_DEFAULT = 18

const BASE_TICKETS_QUERY = `
  SELECT
    nro_ticket,
    fecha_registro,
    fecha_inicio,
    fecha_finalizacion,
    fecha_requerido,
    COALESCE(departamento, 'SIN DATO') AS departamento,
    COALESCE(departamento_emite, 'SIN DATO') AS departamento_emite,
    COALESCE(estatus, 'SIN DATO') AS estatus,
    COALESCE(tipo_ticket, 'Sin tipo') AS tipo_ticket,
    COALESCE(prioridad, 'Sin prioridad') AS prioridad,
    COALESCE(categoria, 'Sin categoría') AS categoria,
    COALESCE(usuario_emite, 'SIN DATO') AS usuario_emite,
    COALESCE(trabajador_emite, 'SIN DATO') AS trabajador_emite,
    COALESCE(usuario_recibe, 'SIN DATO') AS usuario_recibe,
    COALESCE(trabajador_recibe, 'SIN DATO') AS trabajador_recibe,
    COALESCE(usuario_asignado, 'SIN DATO') AS usuario_asignado,
    COALESCE(trabajador_asignado, 'SIN DATO') AS trabajador_asignado,
    COALESCE(motivo_no_ejecutada, '') AS motivo_no_ejecutada,
    COALESCE(motivo_rechazo, '') AS motivo_rechazo,
    COALESCE(avance, 0) AS avance,
    ejecutada
  FROM powerbi.tickets
  WHERE fecha_eliminacion IS NULL
    AND fecha_registro >= CURRENT_DATE - ($1::int * INTERVAL '1 month')
  ORDER BY fecha_registro DESC, nro_ticket DESC
`

function metricMeta({
  title,
  description = '',
  format = 'number',
  decimals = 0,
  prefix = '',
  suffix = '',
  locale = 'es-VE',
}) {
  return {
    title,
    description,
    format,
    decimals,
    prefix,
    suffix,
    locale,
  }
}

function chartMetric({
  format = 'number',
  decimals = 0,
  prefix = '',
  suffix = '',
  locale = 'es-VE',
} = {}) {
  return {
    format,
    decimals,
    prefix,
    suffix,
    locale,
  }
}

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

function resolveLimit(value, fallback = DEFAULT_TOP_LIMIT) {
  return clampInteger(value, fallback, MIN_LIST_LIMIT, MAX_LIST_LIMIT)
}

function ensureRows(value) {
  return Array.isArray(value) ? value : []
}

function buildBacklogDeltaDescription(kpis = {}) {
  const delta = Number(kpis.backlogDelta || 0)
  const deltaPct = Number(kpis.backlogDeltaPct || 0)

  if (delta > 0) {
    return `+${delta} vs mes anterior (${deltaPct}%)`
  }

  if (delta < 0) {
    return `${delta} vs mes anterior (${deltaPct}%)`
  }

  return 'Sin variación vs mes anterior'
}

function sortByCountAndLabel(left, right, field = 'cantidad', labelField = 'departamento') {
  if (Number(right?.[field] || 0) !== Number(left?.[field] || 0)) {
    return Number(right?.[field] || 0) - Number(left?.[field] || 0)
  }

  return String(left?.[labelField] || '').localeCompare(
    String(right?.[labelField] || ''),
    'es',
    { sensitivity: 'base' },
  )
}

/**
 * Devuelve filas normalizadas del dominio tickets.
 * Permite inyectar `options.rows` para pruebas/offline sin tocar controller.
 */
async function getTicketRows(options = {}) {
  const windowMonths = resolveWindowMonths(options.windowMonths)
  const sourceRows = Array.isArray(options.rows)
    ? options.rows
    : ensureRows((await query(BASE_TICKETS_QUERY, [windowMonths]))?.rows)

  const todayStart = toStartOfDay(new Date())

  return sourceRows.map((row) => {
    const registrationDate = toDate(row.fecha_registro)
    const startDate = toDate(row.fecha_inicio)
    const endDate = toDate(row.fecha_finalizacion)
    const requiredDate = toDate(row.fecha_requerido)
    const dueEndOfDay = toEndOfDay(requiredDate)
    const requiredDayStart = toStartOfDay(requiredDate)
    const normalizedStatus = normalizeStatus(row.estatus)
    const isClosed = isClosedStatus(normalizedStatus)
    const isOpen = !isClosed
    const daysToDue =
      requiredDayStart && todayStart
        ? diffInDays(todayStart, requiredDayStart)
        : null
    const agingDays =
      isOpen && registrationDate
        ? diffInDays(toStartOfDay(registrationDate), todayStart)
        : 0
    const slaMet = Boolean(
      endDate &&
        dueEndOfDay &&
        requiredDate &&
        endDate <= dueEndOfDay,
    )

    const assignedTo = firstNonEmpty(
      [
        row.usuario_asignado,
        row.trabajador_asignado,
        row.trabajador_recibe,
        row.usuario_recibe,
      ],
      'SIN ASIGNAR',
    )

    const requesterName = firstNonEmpty(
      [row.trabajador_emite, row.usuario_emite],
      'SIN DATO',
    )

    const resolverName = firstNonEmpty(
      [row.trabajador_recibe, row.usuario_asignado, row.usuario_recibe],
      'SIN ASIGNAR',
    )

    return {
      ...row,
      nro_ticket: row.nro_ticket,
      avance: Math.min(Math.max(Number(row.avance || 0), 0), 100),
      estatus: normalizedStatus,
      departamento: normalizeText(row.departamento),
      departamento_emite: normalizeText(row.departamento_emite),
      prioridad: normalizeText(row.prioridad, 'Sin prioridad'),
      categoria: normalizeText(row.categoria, 'Sin categoría'),
      tipo_ticket: normalizeText(row.tipo_ticket, 'Sin tipo'),
      motivo_rechazo: String(row.motivo_rechazo || '').trim(),
      motivo_no_ejecutada: String(row.motivo_no_ejecutada || '').trim(),
      is_closed: isClosed,
      is_open: isOpen,
      sla_met: slaMet,
      aging_days: agingDays,
      days_to_due: daysToDue,
      is_overdue: Boolean(daysToDue != null && daysToDue < 0 && isOpen),
      assigned_to: assignedTo,
      requester_name: requesterName,
      resolver_name: resolverName,
      ejecutada: toBusinessBoolean(row.ejecutada),
      registration_date: registrationDate,
      start_date: startDate,
      end_date: endDate,
      required_date: requiredDate,
    }
  })
}

function filterRowsByDepartment(rows, department) {
  if (!department) return rows

  const normalizedDepartment = normalizeCompare(department)
  return rows.filter(
    (row) => normalizeCompare(row.departamento) === normalizedDepartment,
  )
}

function countUniqueDepartments(rows) {
  return new Set(
    rows
      .map((row) => normalizeText(row.departamento))
      .filter((value) => value !== 'SIN DATO'),
  ).size
}

function buildMonthlyTickets(rows, months = DEFAULT_WINDOW_MONTHS) {
  const series = createMonthSeries(resolveWindowMonths(months))

  return series.map((month) => {
    const total = rows.filter((row) => {
      if (!row.registration_date) return false

      return (
        row.registration_date >= month.start &&
        row.registration_date < month.endExclusive
      )
    }).length

    return {
      anio: month.start.getFullYear(),
      mes_num: month.start.getMonth() + 1,
      mes: month.label.split(' ')[0],
      periodo: month.label,
      label: month.label,
      total,
      cantidad: total,
      value: total,
    }
  })
}

function buildDepartmentFilter(rows) {
  const grouped = rows.reduce((acc, row) => {
    const department = normalizeText(row.departamento)
    acc[department] = (acc[department] || 0) + 1

    return acc
  }, {})

  const items = Object.entries(grouped)
    .map(([department, count]) => ({
      department,
      label: department,
      count,
      cantidad: count,
      value: count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.department.localeCompare(right.department, 'es', {
        sensitivity: 'base',
      })
    })

  return [
    {
      department: 'TOTAL',
      label: 'Total',
      count: rows.length,
      cantidad: rows.length,
      value: rows.length,
    },
    ...items,
  ]
}

function buildStatusBreakdown(rows, limit = DEFAULT_TOP_LIMIT) {
  const grouped = rows.reduce((acc, row) => {
    const status = normalizeStatus(row.estatus)
    acc[status] = (acc[status] || 0) + 1

    return acc
  }, {})

  return Object.entries(grouped)
    .map(([name, value]) => ({
      name,
      label: name,
      value,
      cantidad: value,
      departamento: name,
    }))
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value
      return left.name.localeCompare(right.name, 'es', {
        sensitivity: 'base',
      })
    })
    .slice(0, resolveLimit(limit, DEFAULT_TOP_LIMIT))
}

function buildTornadoData(rows, field, limit = DEFAULT_TOP_LIMIT) {
  const grouped = rows.reduce((acc, row) => {
    const key = normalizeText(row[field])

    if (!acc[key]) {
      acc[key] = {
        departamento: key,
        label: key,
        leftValue: 0,
        rightValue: 0,
        total: 0,
      }
    }

    acc[key].leftValue += 1

    if (row.is_closed) {
      acc[key].rightValue += 1
    }

    acc[key].total = acc[key].leftValue + acc[key].rightValue
    return acc
  }, {})

  return Object.values(grouped)
    .sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total
      if (right.leftValue !== left.leftValue) return right.leftValue - left.leftValue
      if (right.rightValue !== left.rightValue) {
        return right.rightValue - left.rightValue
      }

      return left.departamento.localeCompare(right.departamento, 'es', {
        sensitivity: 'base',
      })
    })
    .slice(0, resolveLimit(limit, DEFAULT_TOP_LIMIT))
}

function buildWorkloadData(rows, limit = DEFAULT_TOP_LIMIT) {
  const grouped = rows.reduce((acc, row) => {
    if (!row.is_open) return acc

    const key = normalizeText(row.assigned_to, 'SIN ASIGNAR')
    acc[key] = (acc[key] || 0) + 1

    return acc
  }, {})

  return Object.entries(grouped)
    .map(([departamento, cantidad]) => ({
      departamento,
      label: departamento,
      cantidad,
      value: cantidad,
    }))
    .sort((left, right) => sortByCountAndLabel(left, right))
    .slice(0, resolveLimit(limit, DEFAULT_TOP_LIMIT))
}

function buildAgingBucketsData(rows) {
  const buckets = [
    { departamento: '0-2 días', min: 0, max: 2, cantidad: 0 },
    { departamento: '3-5 días', min: 3, max: 5, cantidad: 0 },
    { departamento: '6-10 días', min: 6, max: 10, cantidad: 0 },
    { departamento: '11-20 días', min: 11, max: 20, cantidad: 0 },
    { departamento: '21+ días', min: 21, max: Infinity, cantidad: 0 },
  ]

  rows.forEach((row) => {
    if (!row.is_open) return

    const bucket = buckets.find(
      (item) => row.aging_days >= item.min && row.aging_days <= item.max,
    )

    if (bucket) {
      bucket.cantidad += 1
    }
  })

  return buckets.map((bucket) => ({
    departamento: bucket.departamento,
    label: bucket.departamento,
    cantidad: bucket.cantidad,
    value: bucket.cantidad,
  }))
}

function buildCriticalTickets(rows, limit = DEFAULT_CRITICAL_LIMIT) {
  return rows
    .filter(
      (row) =>
        row.is_open &&
        row.avance < 100 &&
        row.days_to_due != null &&
        row.days_to_due <= 3,
    )
    .map((row) => ({
      nroTicket: row.nro_ticket,
      departamento: row.departamento,
      departamentoEmite: row.departamento_emite,
      usuarioAsignado: row.assigned_to,
      estatus: row.estatus,
      prioridad: row.prioridad,
      categoria: row.categoria,
      tipoTicket: row.tipo_ticket,
      fechaRequerido: row.fecha_requerido,
      avance: row.avance,
      diasParaVencimiento: row.days_to_due,
      vencido: row.is_overdue,
    }))
    .sort((left, right) => {
      if (left.vencido !== right.vencido) return left.vencido ? -1 : 1
      if (left.diasParaVencimiento !== right.diasParaVencimiento) {
        return left.diasParaVencimiento - right.diasParaVencimiento
      }
      return left.avance - right.avance
    })
    .slice(0, resolveLimit(limit, DEFAULT_CRITICAL_LIMIT))
}

function buildBacklogMonthly(rows, months = DEFAULT_WINDOW_MONTHS) {
  const series = createMonthSeries(resolveWindowMonths(months))

  return series.map((month) => {
    const entradas = rows.filter((row) => {
      if (!row.registration_date) return false

      return (
        row.registration_date >= month.start &&
        row.registration_date < month.endExclusive
      )
    }).length

    const cerrados = rows.filter((row) => {
      if (!row.end_date) return false

      return row.end_date >= month.start && row.end_date < month.endExclusive
    }).length

    const backlog = rows.filter((row) => {
      if (!row.registration_date) return false

      const registeredBeforeMonthEnd =
        row.registration_date < month.endExclusive
      const notClosedBeforeMonthEnd =
        !row.end_date || row.end_date >= month.endExclusive

      return registeredBeforeMonthEnd && notClosedBeforeMonthEnd
    }).length

    return {
      anio: month.start.getFullYear(),
      mes_num: month.start.getMonth() + 1,
      mes: month.label.split(' ')[0],
      periodo: month.label,
      label: month.label,
      entradas,
      cerrados,
      backlog,
    }
  })
}

function buildMotivosRechazo(rows, limit = DEFAULT_TOP_LIMIT) {
  const grouped = rows.reduce((acc, row) => {
    if (!hasRealReason(row.motivo_rechazo)) return acc

    const reason = normalizeText(row.motivo_rechazo, 'SIN MOTIVO')
    acc[reason] = (acc[reason] || 0) + 1

    return acc
  }, {})

  return Object.entries(grouped)
    .map(([motivo, cantidad]) => ({
      motivo,
      name: motivo,
      label: motivo,
      cantidad,
      value: cantidad,
      departamento: motivo,
    }))
    .sort((left, right) => {
      if (right.cantidad !== left.cantidad) return right.cantidad - left.cantidad
      return left.motivo.localeCompare(right.motivo, 'es', {
        sensitivity: 'base',
      })
    })
    .slice(0, resolveLimit(limit, DEFAULT_TOP_LIMIT))
}

function buildExecutionSummary(rows) {
  const ejecutadas = rows.filter((row) => row.ejecutada).length
  const noEjecutadas = Math.max(rows.length - ejecutadas, 0)

  return {
    ejecutadas,
    noEjecutadas,
    donut: [
      {
        name: 'Ejecutadas',
        value: ejecutadas,
      },
      {
        name: 'No ejecutadas',
        value: noEjecutadas,
      },
    ],
  }
}

function buildPeopleRanking(rows, mode = 'requeridores', limit = DEFAULT_TOP_LIMIT) {
  const field = mode === 'resolutores' ? 'resolver_name' : 'requester_name'

  const grouped = rows.reduce((acc, row) => {
    const key = normalizeText(
      row[field],
      mode === 'resolutores' ? 'SIN ASIGNAR' : 'SIN DATO',
    )
    acc[key] = (acc[key] || 0) + 1

    return acc
  }, {})

  return Object.entries(grouped)
    .map(([label, value]) => ({
      label,
      value,
      cantidad: value,
    }))
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value
      return left.label.localeCompare(right.label, 'es', {
        sensitivity: 'base',
      })
    })
    .slice(0, resolveLimit(limit, DEFAULT_TOP_LIMIT))
}

function buildSlaByDepartment(rows, limit = DEFAULT_TOP_LIMIT) {
  const grouped = rows.reduce((acc, row) => {
    if (!row.is_closed || !row.required_date) return acc

    const department = normalizeText(row.departamento)

    if (!acc[department]) {
      acc[department] = {
        departamento: department,
        cerrados: 0,
        enSla: 0,
      }
    }

    acc[department].cerrados += 1

    if (row.sla_met) {
      acc[department].enSla += 1
    }

    return acc
  }, {})

  return Object.values(grouped)
    .filter((item) => item.cerrados > 0)
    .map((item) => {
      const porcentaje = round((item.enSla / item.cerrados) * 100, 2)

      return {
        departamento: item.departamento,
        label: item.departamento,
        cantidad: porcentaje,
        cerrados: item.cerrados,
        enSla: item.enSla,
        value: porcentaje,
      }
    })
    .sort((left, right) => {
      if (right.cantidad !== left.cantidad) return right.cantidad - left.cantidad
      return right.cerrados - left.cerrados
    })
    .slice(0, resolveLimit(limit, DEFAULT_TOP_LIMIT))
}

function buildOperationalKpiMeta() {
  return {
    totalTickets: metricMeta({
      title: 'Total de Tickets',
      description: 'Volumen total del conjunto filtrado.',
    }),
    totalDepartamentos: metricMeta({
      title: 'Departamentos',
      description: 'Cantidad de áreas con actividad en la ventana.',
    }),
    pendientesAbiertos: metricMeta({
      title: 'Pendientes',
      description: 'Tickets abiertos que aún no han cerrado ciclo.',
    }),
    vencidos: metricMeta({
      title: 'Vencidos',
      description: 'Tickets abiertos cuyo compromiso ya expiró.',
    }),
    porVencer72h: metricMeta({
      title: 'Por vencer en 72h',
      description: 'Tickets abiertos con vencimiento cercano.',
    }),
    agingPromedioDias: metricMeta({
      title: 'Aging promedio',
      description: 'Promedio de antigüedad de tickets abiertos.',
      decimals: 2,
      suffix: ' días',
    }),
  }
}

function buildOperationalChartMeta() {
  return {
    ticketsMensuales: {
      type: 'bar',
      title: 'Tickets por mes',
      subtitle: 'Evolución mensual de tickets registrados.',
      categoryKey: 'periodo',
      valueKey: 'total',
      valueLabel: 'Total tickets',
      colorTokens: ['primary'],
      metric: chartMetric(),
    },
    ticketsPorEstatus: {
      type: 'bar',
      title: 'Tickets por estatus',
      subtitle: 'Distribución de tickets por estado actual.',
      categoryKey: 'name',
      valueKey: 'value',
      valueLabel: 'Total tickets',
      colorTokens: ['primary', 'secondary', 'tertiary'],
      metric: chartMetric(),
    },
    ticketsRecibidosVsCerrados: {
      type: 'tornado',
      title: 'Tickets recibidos vs finalizados por departamento',
      subtitle: 'Comparativo entre volumen recibido y tickets cerrados.',
      leftLabel: 'Recibidos',
      rightLabel: 'Finalizados',
      totalLabel: 'Total',
      colorTokens: ['secondary', 'primary', 'neutral'],
      showTotal: true,
      metric: chartMetric(),
    },
    ticketsEmitidosVsCerrados: {
      type: 'tornado',
      title: 'Tickets emitidos vs cerrados por departamento',
      subtitle: 'Comparativo entre volumen emitido y tickets cerrados.',
      leftLabel: 'Emitidos',
      rightLabel: 'Cerrados',
      totalLabel: 'Total',
      colorTokens: ['secondary', 'primary', 'neutral'],
      showTotal: true,
      metric: chartMetric(),
    },
    cargaPorUsuario: {
      type: 'bar-horizontal',
      title: 'Carga de trabajo por usuario asignado',
      subtitle: 'Usuarios con mayor volumen de tickets abiertos.',
      categoryKey: 'departamento',
      valueKey: 'cantidad',
      valueLabel: 'Tickets abiertos',
      colorTokens: ['primary'],
      metric: chartMetric(),
    },
    agingBuckets: {
      type: 'bar-horizontal',
      title: 'Envejecimiento de tickets abiertos',
      subtitle: 'Distribución por antigüedad de tickets activos.',
      categoryKey: 'departamento',
      valueKey: 'cantidad',
      valueLabel: 'Tickets',
      colorTokens: ['secondary'],
      metric: chartMetric(),
    },
  }
}

function buildOperationalUi() {
  return {
    kpiOrder: [
      'totalTickets',
      'totalDepartamentos',
      'pendientesAbiertos',
      'vencidos',
      'porVencer72h',
      'agingPromedioDias',
    ],
    sections: [
      {
        id: 'operational-summary',
        charts: [
          'ticketsRecibidosVsCerrados',
          'ticketsEmitidosVsCerrados',
          'ticketsMensuales',
          'ticketsPorEstatus',
        ],
      },
      {
        id: 'operational-insights',
        charts: ['cargaPorUsuario', 'agingBuckets'],
        tables: ['ticketsCriticos'],
      },
    ],
  }
}

function buildGerencialKpiMeta(kpis = {}) {
  return {
    totalTickets: metricMeta({
      title: 'Total de Tickets',
      description: 'Volumen total gestionado en la ventana analizada.',
    }),
    tiempoRespuestaHoras: metricMeta({
      title: 'Tiempo de Respuesta',
      description: 'Promedio desde registro hasta primera atención.',
      decimals: 2,
      suffix: ' h',
    }),
    tiempoResolucionNetoHoras: metricMeta({
      title: 'Resolución Neta',
      description: 'Tiempo efectivo desde inicio hasta cierre.',
      decimals: 2,
      suffix: ' h',
    }),
    cumplimientoCompromisoPct: metricMeta({
      title: 'Cumplimiento de Compromiso',
      description: 'Tickets cerrados dentro del plazo comprometido.',
      format: 'percent',
      decimals: 2,
    }),
    ticketsEnSla: metricMeta({
      title: 'Tickets en SLA',
      description: 'Cantidad de cierres que cumplieron compromiso.',
    }),
    backlogActual: metricMeta({
      title: 'Backlog Actual',
      description: buildBacklogDeltaDescription(kpis),
    }),
    backlogDelta: metricMeta({
      title: 'Delta Backlog',
      description: 'Variación absoluta respecto al mes anterior.',
    }),
    backlogDeltaPct: metricMeta({
      title: 'Delta Backlog %',
      description: 'Variación porcentual respecto al mes anterior.',
      format: 'percent',
      decimals: 2,
    }),
    tasaRechazoPct: metricMeta({
      title: 'Tasa de Rechazo',
      description: 'Peso relativo de rechazos con causa registrada.',
      format: 'percent',
      decimals: 2,
    }),
    ejecutadas: metricMeta({
      title: 'Ejecutadas',
      description: 'Cantidad de tickets marcados como ejecutados.',
    }),
    noEjecutadas: metricMeta({
      title: 'No ejecutadas',
      description: 'Cantidad de tickets sin ejecución efectiva.',
    }),
    efectividadEjecucionPct: metricMeta({
      title: 'Efectividad de Ejecución',
      description: 'Proporción de tickets efectivamente ejecutados.',
      format: 'percent',
      decimals: 2,
    }),
  }
}

function buildGerencialChartMeta() {
  return {
    slaPorDepartamento: {
      type: 'bar-horizontal',
      title: 'Ranking de Cumplimiento SLA por Departamento',
      subtitle: 'Porcentaje de tickets cerrados en plazo por área.',
      categoryKey: 'departamento',
      valueKey: 'cantidad',
      valueLabel: 'Cumplimiento',
      colorTokens: ['primary'],
      metric: chartMetric({ format: 'percent', decimals: 2 }),
    },
    backlogMensual: {
      type: 'composed',
      title: 'Backlog mensual: entradas, cerrados y acumulado',
      subtitle: 'Lectura mensual de entradas, cierres y saldo acumulado.',
      categoryKey: 'periodo',
      metric: chartMetric(),
      series: [
        {
          key: 'entradas',
          label: 'Entradas',
          type: 'bar',
          colorToken: 'secondary',
        },
        {
          key: 'cerrados',
          label: 'Cerrados',
          type: 'bar',
          colorToken: 'success',
        },
        {
          key: 'backlog',
          label: 'Backlog',
          type: 'line',
          colorToken: 'primary',
        },
      ],
    },
    motivosRechazo: {
      type: 'bar-horizontal',
      title: 'Motivos de rechazo más frecuentes',
      subtitle: 'Causas registradas con mayor recurrencia.',
      categoryKey: 'motivo',
      valueKey: 'cantidad',
      valueLabel: 'Incidencias',
      colorTokens: ['danger'],
      metric: chartMetric(),
    },
    efectividadEjecucion: {
      type: 'donut',
      title: 'Efectividad de ejecución',
      subtitle: 'Distribución entre tickets ejecutados y no ejecutados.',
      categoryKey: 'name',
      valueKey: 'value',
      valueLabel: 'Total tickets',
      colorTokens: ['success', 'warning'],
      metric: chartMetric(),
    },
    rankingPersonas: {
      type: 'toggle-horizontal-bar',
      title: 'Distribución por personas',
      subtitle: 'Comparativo entre requeridores y resolutores.',
      defaultKey: 'requeridores',
      options: [
        {
          key: 'requeridores',
          label: 'Requeridores',
          title: 'Top requeridores',
          categoryKey: 'label',
          valueKey: 'value',
          valueLabel: 'Tickets',
          colorTokens: ['primary'],
          metric: chartMetric(),
        },
        {
          key: 'resolutores',
          label: 'Resolutores',
          title: 'Top resolutores',
          categoryKey: 'label',
          valueKey: 'value',
          valueLabel: 'Tickets',
          colorTokens: ['secondary'],
          metric: chartMetric(),
        },
      ],
    },
  }
}

function buildGerencialUi() {
  return {
    kpiOrder: [
      'totalTickets',
      'tiempoRespuestaHoras',
      'tiempoResolucionNetoHoras',
      'cumplimientoCompromisoPct',
      'ticketsEnSla',
      'backlogActual',
      'tasaRechazoPct',
      'efectividadEjecucionPct',
    ],
    sections: [
      {
        id: 'service-reading',
        charts: [
          'slaPorDepartamento',
          'backlogMensual',
          'motivosRechazo',
          'efectividadEjecucion',
          'rankingPersonas',
        ],
      },
    ],
  }
}

/**
 * Obtiene el dataset detallado de tickets para consumos drill-down.
 */
async function getTicketsDataset(options = {}) {
  const rows = await getTicketRows(options)

  return rows.map((row) => ({
    ...row,
    registration_date: undefined,
    start_date: undefined,
    end_date: undefined,
    required_date: undefined,
  }))
}

/**
 * Construye el resumen operacional completo, listo para dashboard.
 */
async function getOperationalSummary(options = {}) {
  const rows = await getTicketRows(options)
  const filteredRows = filterRowsByDepartment(rows, options.department)
  const criticalTickets = buildCriticalTickets(
    filteredRows,
    resolveLimit(options.limit, DEFAULT_CRITICAL_LIMIT),
  )
  const openRows = filteredRows.filter((row) => row.is_open)
  const overdueRows = openRows.filter((row) => row.is_overdue)
  const dueSoonRows = openRows.filter(
    (row) =>
      row.days_to_due != null && row.days_to_due >= 0 && row.days_to_due <= 3,
  )
  const averageAging =
    openRows.length > 0
      ? round(
          openRows.reduce((acc, row) => acc + row.aging_days, 0) /
            openRows.length,
          2,
        )
      : 0

  const kpis = {
    totalTickets: filteredRows.length,
    totalDepartamentos: countUniqueDepartments(filteredRows),
    pendientesAbiertos: openRows.length,
    vencidos: overdueRows.length,
    porVencer72h: dueSoonRows.length,
    agingPromedioDias: averageAging,
  }

  return {
    total_tickets: kpis.totalTickets,
    total_departamentos: kpis.totalDepartamentos,
    pendientes_abiertos: kpis.pendientesAbiertos,
    vencidos: kpis.vencidos,
    por_vencer_72h: kpis.porVencer72h,
    aging_promedio_dias: kpis.agingPromedioDias,
    kpis,
    kpiMeta: buildOperationalKpiMeta(kpis),
    charts: {
      ticketsMensuales: buildMonthlyTickets(
        filteredRows,
        Math.max(resolveWindowMonths(options.windowMonths), 12),
      ),
      ticketsPorEstatus: buildStatusBreakdown(filteredRows, DEFAULT_TOP_LIMIT),
      ticketsRecibidosVsCerrados: buildTornadoData(
        filteredRows,
        'departamento',
        DEFAULT_TOP_LIMIT,
      ),
      ticketsEmitidosVsCerrados: buildTornadoData(
        filteredRows,
        'departamento_emite',
        DEFAULT_TOP_LIMIT,
      ),
      cargaPorUsuario: buildWorkloadData(filteredRows, DEFAULT_TOP_LIMIT),
      agingBuckets: buildAgingBucketsData(filteredRows),
    },
    chartMeta: buildOperationalChartMeta(),
    filters: {
      departamentos: buildDepartmentFilter(rows),
      appliedDepartment: options.department
        ? normalizeText(options.department)
        : null,
    },
    tables: {
      ticketsCriticos: criticalTickets,
    },
    meta: {
      windowMonths: resolveWindowMonths(options.windowMonths),
      totalTicketsCriticos: criticalTickets.length,
    },
    ui: buildOperationalUi(),
  }
}

/**
 * Construye el resumen gerencial completo listo para dashboard.
 */
async function getManagementSummary(options = {}) {
  const rows = await getTicketRows(options)
  const closedRows = rows.filter((row) => row.is_closed)
  const responseRows = rows.filter(
    (row) =>
      row.registration_date &&
      row.start_date &&
      row.start_date >= row.registration_date,
  )
  const resolutionRows = closedRows.filter(
    (row) => row.start_date && row.end_date && row.end_date >= row.start_date,
  )
  const rowsWithCommitment = closedRows.filter((row) => row.required_date)
  const ticketsEnSla = rowsWithCommitment.filter((row) => row.sla_met).length
  const execution = buildExecutionSummary(rows)
  const backlogMensual = buildBacklogMonthly(
    rows,
    Math.max(resolveWindowMonths(options.windowMonths), 12),
  )
  const backlogActual = rows.filter((row) => row.is_open).length
  const previousBacklog =
    backlogMensual.length > 1
      ? Number(backlogMensual[backlogMensual.length - 2].backlog || backlogActual)
      : backlogActual
  const backlogDelta = backlogActual - previousBacklog
  const backlogDeltaPct =
    previousBacklog > 0
      ? round((backlogDelta / previousBacklog) * 100, 2)
      : 0
  const totalRechazados = rows.filter((row) =>
    hasRealReason(row.motivo_rechazo),
  ).length

  const kpis = {
    totalTickets: rows.length,
    tiempoRespuestaHoras:
      responseRows.length > 0
        ? round(
            responseRows.reduce(
              (acc, row) =>
                acc + diffInHours(row.registration_date, row.start_date),
              0,
            ) / responseRows.length,
            2,
          )
        : 0,
    tiempoResolucionNetoHoras:
      resolutionRows.length > 0
        ? round(
            resolutionRows.reduce(
              (acc, row) => acc + diffInHours(row.start_date, row.end_date),
              0,
            ) / resolutionRows.length,
            2,
          )
        : 0,
    cumplimientoCompromisoPct:
      rowsWithCommitment.length > 0
        ? round((ticketsEnSla / rowsWithCommitment.length) * 100, 2)
        : 0,
    ticketsEnSla,
    backlogActual,
    backlogDelta,
    backlogDeltaPct,
    tasaRechazoPct:
      rows.length > 0 ? round((totalRechazados / rows.length) * 100, 2) : 0,
    ejecutadas: execution.ejecutadas,
    noEjecutadas: execution.noEjecutadas,
    efectividadEjecucionPct:
      rows.length > 0
        ? round((execution.ejecutadas / rows.length) * 100, 2)
        : 0,
  }

  return {
    total_tickets: kpis.totalTickets,
    tiempo_respuesta_horas: kpis.tiempoRespuestaHoras,
    tiempo_resolucion_neto_horas: kpis.tiempoResolucionNetoHoras,
    cumplimiento_compromiso_pct: kpis.cumplimientoCompromisoPct,
    tickets_en_sla: kpis.ticketsEnSla,
    backlog_actual: kpis.backlogActual,
    backlog_delta: kpis.backlogDelta,
    backlog_delta_pct: kpis.backlogDeltaPct,
    tasa_rechazo_pct: kpis.tasaRechazoPct,
    ejecutadas: kpis.ejecutadas,
    no_ejecutadas: kpis.noEjecutadas,
    efectividad_ejecucion_pct: kpis.efectividadEjecucionPct,
    kpis,
    kpiMeta: buildGerencialKpiMeta(kpis),
    charts: {
      slaPorDepartamento: buildSlaByDepartment(rows, DEFAULT_TOP_LIMIT),
      backlogMensual,
      motivosRechazo: buildMotivosRechazo(rows, DEFAULT_TOP_LIMIT),
      efectividadEjecucion: execution.donut,
      rankingPersonas: {
        requeridores: buildPeopleRanking(rows, 'requeridores', DEFAULT_TOP_LIMIT),
        resolutores: buildPeopleRanking(rows, 'resolutores', DEFAULT_TOP_LIMIT),
      },
    },
    chartMeta: buildGerencialChartMeta(),
    meta: {
      windowMonths: resolveWindowMonths(options.windowMonths),
    },
    ui: buildGerencialUi(),
  }
}

async function getMonthlyTickets(options = {}) {
  const rows = await getTicketRows(options)

  return buildMonthlyTickets(
    rows,
    Math.max(
      resolveWindowMonths(options.windowMonths, MONTHLY_ENDPOINT_DEFAULT),
      12,
    ),
  )
}

async function getOperationalCriticalTickets(options = {}) {
  const rows = await getTicketRows(options)
  const filteredRows = filterRowsByDepartment(rows, options.department)

  return buildCriticalTickets(
    filteredRows,
    resolveLimit(options.limit, DEFAULT_CRITICAL_LIMIT),
  )
}

async function getBacklogMonthly(options = {}) {
  const rows = await getTicketRows(options)

  return buildBacklogMonthly(
    rows,
    Math.max(resolveWindowMonths(options.windowMonths), 12),
  )
}

async function getRejectionReasons(options = {}) {
  const rows = await getTicketRows(options)

  return buildMotivosRechazo(rows, resolveLimit(options.limit, DEFAULT_TOP_LIMIT))
}

module.exports = {
  getTicketsDataset,
  getOperationalSummary,
  getManagementSummary,
  getMonthlyTickets,
  getOperationalCriticalTickets,
  getBacklogMonthly,
  getRejectionReasons,
}
