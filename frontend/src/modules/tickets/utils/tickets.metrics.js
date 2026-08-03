import {
  ensureArray,
  ensureObject,
  ensureString,
  firstNonEmpty,
  formatBacklogDescription,
  parseBoolean,
  parseNumber,
  round,
} from './tickets.helpers'
import {
  toCriticalRows,
  toDepartmentChartData,
  toDonutChartData,
  toFilterItems,
  toGroupedValueData,
  toTornadoChartData,
} from './tickets.transformers'

function normalizeRankingPersonas(data = {}) {
  const ranking = ensureObject(data)

  return {
    requeridores: toGroupedValueData(ensureArray(ranking.requeridores), {
      labelKeys: ['label', 'name', 'departamento'],
      valueKeys: ['value', 'cantidad', 'total'],
      fallbackLabel: 'SIN DATO',
    }),
    resolutores: toGroupedValueData(ensureArray(ranking.resolutores), {
      labelKeys: ['label', 'name', 'departamento'],
      valueKeys: ['value', 'cantidad', 'total'],
      fallbackLabel: 'SIN ASIGNAR',
    }),
  }
}

function normalizeUiSection(section = {}) {
  const value = ensureObject(section)

  return {
    ...value,
    id: ensureString(value.id),
    charts: ensureArray(value.charts).filter(Boolean),
    tables: ensureArray(value.tables).filter(Boolean),
  }
}

function normalizeUiConfig(ui = {}) {
  const value = ensureObject(ui)

  return {
    ...value,
    kpiOrder: ensureArray(value.kpiOrder).filter(Boolean),
    sections: ensureArray(value.sections).map(normalizeUiSection),
  }
}

function normalizeMetricMeta(meta = {}) {
  const value = ensureObject(meta)

  return {
    ...value,
    title: ensureString(value.title),
    description: ensureString(value.description),
    format: ensureString(value.format, 'number'),
    prefix: ensureString(value.prefix),
    suffix: ensureString(value.suffix),
    locale: ensureString(value.locale, 'es-VE'),
    decimals: parseNumber(value.decimals, 0),
    emptyValue: ensureString(value.emptyValue, '0'),
  }
}

function normalizeChartSeriesEntry(item = {}) {
  const value = ensureObject(item)
  const colorToken =
    ensureString(value.colorToken) ||
    ensureArray(value.colorTokens)[0] ||
    ensureString(value.barColor)

  return {
    ...value,
    key: ensureString(value.key),
    label: ensureString(value.label),
    title: ensureString(value.title),
    type: ensureString(value.type),
    categoryKey: ensureString(value.categoryKey),
    valueKey: ensureString(value.valueKey),
    valueLabel: ensureString(value.valueLabel),
    colorToken,
    colorTokens: ensureArray(value.colorTokens).filter(Boolean),
    barColor: ensureString(value.barColor),
    metric: normalizeMetricMeta(value.metric),
  }
}

function normalizeChartMeta(meta = {}) {
  const value = ensureObject(meta)
  const colorTokens = ensureArray(value.colorTokens).filter(Boolean)
  const primaryColorToken =
    colorTokens[0] ||
    ensureString(value.colorToken) ||
    ensureString(value.barColor)

  return {
    ...value,
    title: ensureString(value.title),
    subtitle: ensureString(value.subtitle),
    type: ensureString(value.type),
    categoryKey: ensureString(value.categoryKey),
    valueKey: ensureString(value.valueKey),
    valueLabel: ensureString(value.valueLabel),
    defaultKey: ensureString(value.defaultKey),
    leftLabel: ensureString(value.leftLabel),
    rightLabel: ensureString(value.rightLabel),
    totalLabel: ensureString(value.totalLabel, 'Total'),
    showTotal:
      value.showTotal === undefined ? true : parseBoolean(value.showTotal, true),
    showLegend:
      value.showLegend === undefined
        ? true
        : parseBoolean(value.showLegend, true),
    showExternalLabels:
      value.showExternalLabels === undefined
        ? false
        : parseBoolean(value.showExternalLabels, false),
    colorToken: primaryColorToken,
    colorTokens,
    barColor: ensureString(value.barColor),
    metric: normalizeMetricMeta(value.metric),
    series: ensureArray(value.series).map(normalizeChartSeriesEntry),
    options: ensureArray(value.options).map(normalizeChartSeriesEntry),
  }
}

function normalizeMonthlySeries(data = []) {
  return ensureArray(data).map((item) => {
    const periodo = firstNonEmpty(
      [item?.periodo, item?.label, item?.mes],
      'SIN DATO',
    )
    const total = parseNumber(item?.total ?? item?.cantidad ?? item?.value)

    return {
      ...item,
      periodo,
      label: periodo,
      mes: ensureString(item?.mes),
      anio: parseNumber(item?.anio, 0),
      mes_num: parseNumber(item?.mes_num, 0),
      total,
      cantidad: total,
      value: total,
    }
  })
}

function normalizeBacklogSeries(data = []) {
  return ensureArray(data).map((item) => {
    const periodo = firstNonEmpty(
      [item?.periodo, item?.label, item?.mes],
      'SIN DATO',
    )

    return {
      ...item,
      periodo,
      label: periodo,
      entradas: parseNumber(item?.entradas),
      cerrados: parseNumber(item?.cerrados),
      backlog: parseNumber(item?.backlog),
    }
  })
}

function normalizeKpiMetaMap(meta = {}) {
  const value = ensureObject(meta)

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalizeMetricMeta(item)]),
  )
}

function normalizeChartMetaMap(meta = {}) {
  const value = ensureObject(meta)

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalizeChartMeta(item)]),
  )
}

/**
 * Normaliza el payload del resumen operacional entregado por backend.
 * La página solo consume KPIs y datasets listos para renderizar.
 */
export function normalizeOperationalSummary(payload) {
  const summary = ensureObject(payload)
  const kpis = ensureObject(summary.kpis)
  const charts = ensureObject(summary.charts)
  const filters = ensureObject(summary.filters)
  const tables = ensureObject(summary.tables)

  return {
    kpis: {
      totalTickets: parseNumber(kpis.totalTickets ?? summary.total_tickets),
      totalDepartamentos: parseNumber(
        kpis.totalDepartamentos ?? summary.total_departamentos,
      ),
      pendientesAbiertos: parseNumber(
        kpis.pendientesAbiertos ?? summary.pendientes_abiertos,
      ),
      vencidos: parseNumber(kpis.vencidos ?? summary.vencidos),
      porVencer72h: parseNumber(kpis.porVencer72h ?? summary.por_vencer_72h),
      agingPromedioDias: round(
        parseNumber(kpis.agingPromedioDias ?? summary.aging_promedio_dias),
        2,
      ),
    },
    kpiMeta: normalizeKpiMetaMap(summary.kpiMeta),
    charts: {
      ticketsMensuales: normalizeMonthlySeries(charts.ticketsMensuales),
      ticketsPorEstatus: toGroupedValueData(charts.ticketsPorEstatus, {
        labelKeys: ['name', 'label', 'departamento'],
        valueKeys: ['value', 'cantidad', 'total'],
      }),
      ticketsRecibidosVsCerrados: toTornadoChartData(
        charts.ticketsRecibidosVsCerrados,
      ),
      ticketsEmitidosVsCerrados: toTornadoChartData(
        charts.ticketsEmitidosVsCerrados,
      ),
      cargaPorUsuario: toDepartmentChartData(charts.cargaPorUsuario),
      agingBuckets: toDepartmentChartData(charts.agingBuckets),
    },
    chartMeta: normalizeChartMetaMap(summary.chartMeta),
    filters: {
      departamentos: toFilterItems(filters.departamentos),
      appliedDepartment:
        filters.appliedDepartment == null
          ? null
          : ensureString(filters.appliedDepartment) || null,
    },
    tables: {
      ticketsCriticos: toCriticalRows(tables.ticketsCriticos),
    },
    meta: {
      ...ensureObject(summary.meta),
      totalTicketsCriticos: parseNumber(summary?.meta?.totalTicketsCriticos),
      windowMonths: parseNumber(summary?.meta?.windowMonths, 12),
    },
    ui: normalizeUiConfig(summary.ui),
  }
}

/**
 * Normaliza el payload del resumen gerencial entregado por backend.
 * El frontend solo formatea y presenta datasets.
 */
export function normalizeGerencialSummary(payload) {
  const summary = ensureObject(payload)
  const kpis = ensureObject(summary.kpis)
  const charts = ensureObject(summary.charts)
  const rankings = ensureObject(charts.rankingPersonas)

  const normalizedKpis = {
    totalTickets: parseNumber(kpis.totalTickets ?? summary.total_tickets),
    tiempoRespuestaHoras: round(
      parseNumber(kpis.tiempoRespuestaHoras ?? summary.tiempo_respuesta_horas),
      2,
    ),
    tiempoResolucionNetoHoras: round(
      parseNumber(
        kpis.tiempoResolucionNetoHoras ??
          summary.tiempo_resolucion_neto_horas,
      ),
      2,
    ),
    cumplimientoCompromisoPct: round(
      parseNumber(
        kpis.cumplimientoCompromisoPct ??
          summary.cumplimiento_compromiso_pct,
      ),
      2,
    ),
    ticketsEnSla: parseNumber(kpis.ticketsEnSla ?? summary.tickets_en_sla),
    backlogActual: parseNumber(kpis.backlogActual ?? summary.backlog_actual),
    backlogDelta: parseNumber(kpis.backlogDelta ?? summary.backlog_delta),
    backlogDeltaPct: round(
      parseNumber(kpis.backlogDeltaPct ?? summary.backlog_delta_pct),
      2,
    ),
    tasaRechazoPct: round(
      parseNumber(kpis.tasaRechazoPct ?? summary.tasa_rechazo_pct),
      2,
    ),
    ejecutadas: parseNumber(kpis.ejecutadas ?? summary.ejecutadas),
    noEjecutadas: parseNumber(kpis.noEjecutadas ?? summary.no_ejecutadas),
    efectividadEjecucionPct: round(
      parseNumber(
        kpis.efectividadEjecucionPct ??
          summary.efectividad_ejecucion_pct,
      ),
      2,
    ),
  }

  const normalizedMeta = normalizeKpiMetaMap(summary.kpiMeta)

  if (normalizedMeta.backlogActual) {
    normalizedMeta.backlogActual = {
      ...normalizedMeta.backlogActual,
      description:
        normalizedMeta.backlogActual.description ||
        formatBacklogDescription(normalizedKpis),
    }
  }

  return {
    kpis: normalizedKpis,
    kpiMeta: normalizedMeta,
    charts: {
      slaPorDepartamento: toDepartmentChartData(charts.slaPorDepartamento),
      backlogMensual: normalizeBacklogSeries(charts.backlogMensual),
      motivosRechazo: toDepartmentChartData(charts.motivosRechazo, {
        labelKeys: ['motivo', 'label', 'name', 'departamento'],
        valueKeys: ['cantidad', 'value', 'total'],
      }),
      efectividadEjecucion: toDonutChartData(charts.efectividadEjecucion),
      rankingPersonas: normalizeRankingPersonas(rankings),
    },
    chartMeta: normalizeChartMetaMap(summary.chartMeta),
    meta: {
      ...ensureObject(summary.meta),
      windowMonths: parseNumber(summary?.meta?.windowMonths, 12),
    },
    ui: normalizeUiConfig(summary.ui),
  }
}