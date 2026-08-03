// src/modules/tickets/pages/TicketsGerencial.jsx

import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../../components/ModulePage'
import KpiCard from '../../../components/KpiCard'
import {
  TicketsBacklogChart,
  TicketsDepartmentChart,
  TicketsDonutChart,
} from '../components'
import { getGerencialDashboard } from '../services'

const DEFAULT_KPI_ORDER = [
  'totalTickets',
  'tiempoRespuestaHoras',
  'tiempoResolucionNetoHoras',
  'cumplimientoCompromisoPct',
  'ticketsEnSla',
  'backlogActual',
  'tasaRechazoPct',
  'efectividadEjecucionPct',
]

const KPI_FALLBACK_META = {
  totalTickets: {
    title: 'Total de Tickets',
    description: 'Volumen total gestionado en la ventana analizada.',
    format: 'number',
    decimals: 0,
  },
  tiempoRespuestaHoras: {
    title: 'Tiempo de Respuesta',
    description: 'Promedio desde registro hasta primera atención.',
    format: 'number',
    decimals: 2,
    suffix: 'h',
  },
  tiempoResolucionNetoHoras: {
    title: 'Resolución Neta',
    description: 'Tiempo efectivo desde inicio hasta cierre.',
    format: 'number',
    decimals: 2,
    suffix: 'h',
  },
  cumplimientoCompromisoPct: {
    title: 'Cumplimiento de Compromiso',
    description: 'Tickets cerrados dentro del plazo comprometido.',
    format: 'percent',
    decimals: 2,
  },
  ticketsEnSla: {
    title: 'Tickets en SLA',
    description: 'Cantidad de cierres que cumplieron compromiso.',
    format: 'number',
    decimals: 0,
  },
  backlogActual: {
    title: 'Backlog Actual',
    description: '',
    format: 'number',
    decimals: 0,
  },
  tasaRechazoPct: {
    title: 'Tasa de Rechazo',
    description: 'Peso relativo de rechazos con causa registrada.',
    format: 'percent',
    decimals: 2,
  },
  efectividadEjecucionPct: {
    title: 'Efectividad de Ejecución',
    description: 'Proporción de tickets efectivamente ejecutados.',
    format: 'percent',
    decimals: 2,
  },
}

const DEFAULT_SUMMARY = {
  kpis: {
    totalTickets: 0,
    tiempoRespuestaHoras: 0,
    tiempoResolucionNetoHoras: 0,
    cumplimientoCompromisoPct: 0,
    ticketsEnSla: 0,
    backlogActual: 0,
    backlogDelta: 0,
    backlogDeltaPct: 0,
    tasaRechazoPct: 0,
    ejecutadas: 0,
    noEjecutadas: 0,
    efectividadEjecucionPct: 0,
  },
  kpiMeta: {},
  charts: {
    slaPorDepartamento: [],
    backlogMensual: [],
    motivosRechazo: [],
    efectividadEjecucion: [],
    rankingPersonas: {
      requeridores: [],
      resolutores: [],
    },
  },
  chartMeta: {},
  meta: {},
  ui: {
    kpiOrder: DEFAULT_KPI_ORDER,
  },
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function ensureString(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function parseNumber(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function mergeSummary(payload = {}) {
  const summary = ensureObject(payload)

  return {
    ...DEFAULT_SUMMARY,
    ...summary,
    kpis: {
      ...DEFAULT_SUMMARY.kpis,
      ...ensureObject(summary.kpis),
    },
    kpiMeta: ensureObject(summary.kpiMeta),
    charts: {
      ...DEFAULT_SUMMARY.charts,
      ...ensureObject(summary.charts),
      rankingPersonas: {
        ...DEFAULT_SUMMARY.charts.rankingPersonas,
        ...ensureObject(summary?.charts?.rankingPersonas),
      },
    },
    chartMeta: ensureObject(summary.chartMeta),
    meta: {
      ...DEFAULT_SUMMARY.meta,
      ...ensureObject(summary.meta),
    },
    ui: {
      ...DEFAULT_SUMMARY.ui,
      ...ensureObject(summary.ui),
    },
  }
}

function resolveMetricMeta(metric = {}, fallback = {}) {
  const safeMetric = ensureObject(metric)
  const safeFallback = ensureObject(fallback)

  return {
    format: safeMetric.format || safeFallback.format || 'number',
    decimals: Number.isFinite(Number(safeMetric.decimals))
      ? Number(safeMetric.decimals)
      : Number.isFinite(Number(safeFallback.decimals))
        ? Number(safeFallback.decimals)
        : 0,
    prefix: safeMetric.prefix || safeFallback.prefix || '',
    suffix: safeMetric.suffix || safeFallback.suffix || '',
    locale: safeMetric.locale || safeFallback.locale || 'es-VE',
  }
}

function resolveKpiMeta(summary = {}, key = '') {
  const backendMeta = ensureObject(summary?.kpiMeta?.[key])
  const fallbackMeta = KPI_FALLBACK_META[key] || {
    title: key,
    description: '',
    format: 'number',
    decimals: 0,
  }

  return {
    title: backendMeta.title || fallbackMeta.title || key,
    description:
      backendMeta.description ||
      backendMeta.subtitle ||
      fallbackMeta.description ||
      '',
    format: backendMeta.format || fallbackMeta.format || 'number',
    decimals: Number.isFinite(Number(backendMeta.decimals))
      ? Number(backendMeta.decimals)
      : Number.isFinite(Number(fallbackMeta.decimals))
        ? Number(fallbackMeta.decimals)
        : 0,
    prefix: backendMeta.prefix || fallbackMeta.prefix || '',
    suffix: backendMeta.suffix || fallbackMeta.suffix || '',
    locale: backendMeta.locale || fallbackMeta.locale || 'es-VE',
    emptyValue: backendMeta.emptyValue || fallbackMeta.emptyValue || '0',
  }
}

function resolveChartMeta(summary = {}, key = '', fallback = {}) {
  const backendMeta = ensureObject(summary?.chartMeta?.[key])
  const fallbackMeta = ensureObject(fallback)

  const backendColorTokens = ensureArray(backendMeta.colorTokens)
  const fallbackColorTokens = ensureArray(fallbackMeta.colorTokens)
  const colorTokens =
    backendColorTokens.length > 0 ? backendColorTokens : fallbackColorTokens

  return {
    title: backendMeta.title || fallbackMeta.title || key,
    subtitle:
      backendMeta.subtitle ||
      backendMeta.description ||
      fallbackMeta.subtitle ||
      '',
    valueLabel:
      backendMeta.valueLabel ||
      fallbackMeta.valueLabel ||
      'Total tickets',
    metric: resolveMetricMeta(backendMeta.metric, fallbackMeta.metric),
    colorToken:
      backendMeta.colorToken ||
      backendMeta.barColor ||
      colorTokens[0] ||
      fallbackMeta.colorToken ||
      fallbackMeta.barColor ||
      'primary',
    barColor:
      backendMeta.barColor ||
      backendMeta.colorToken ||
      colorTokens[0] ||
      fallbackMeta.barColor ||
      fallbackMeta.colorToken ||
      'primary',
    colorTokens,
    series: ensureArray(backendMeta.series).length > 0
      ? backendMeta.series
      : ensureArray(fallbackMeta.series),
    showLegend:
      typeof backendMeta.showLegend === 'boolean'
        ? backendMeta.showLegend
        : typeof fallbackMeta.showLegend === 'boolean'
          ? fallbackMeta.showLegend
          : true,
    showTotal:
      typeof backendMeta.showTotal === 'boolean'
        ? backendMeta.showTotal
        : typeof fallbackMeta.showTotal === 'boolean'
          ? fallbackMeta.showTotal
          : true,
    showExternalLabels:
      typeof backendMeta.showExternalLabels === 'boolean'
        ? backendMeta.showExternalLabels
        : typeof fallbackMeta.showExternalLabels === 'boolean'
          ? fallbackMeta.showExternalLabels
          : false,
    defaultKey: backendMeta.defaultKey || fallbackMeta.defaultKey || '',
    options: ensureArray(backendMeta.options).length > 0
      ? backendMeta.options
      : ensureArray(fallbackMeta.options),
  }
}

function formatBacklogDescription(summary = {}) {
  const delta = parseNumber(summary?.kpis?.backlogDelta, 0)
  const deltaPct = parseNumber(summary?.kpis?.backlogDeltaPct, 0)

  if (delta > 0) {
    return `+${delta} vs mes anterior (${deltaPct}%)`
  }

  if (delta < 0) {
    return `${delta} vs mes anterior (${deltaPct}%)`
  }

  return 'Sin variación vs mes anterior'
}

function normalizeSlaData(data = []) {
  return ensureArray(data)
    .map((item) => ({
      departamento: ensureString(
        item?.departamento ?? item?.name ?? item?.label,
        'SIN DATO',
      ),
      cantidad: parseNumber(
        item?.cumplimientoPct ??
          item?.cumplimiento ??
          item?.cantidad ??
          item?.value,
        0,
      ),
    }))
    .filter((item) => item.cantidad >= 0)
}

function normalizeRejectionData(data = []) {
  return ensureArray(data)
    .map((item) => ({
      departamento: ensureString(
        item?.motivo ??
          item?.name ??
          item?.label ??
          item?.departamento,
        'SIN DATO',
      ),
      cantidad: parseNumber(item?.cantidad ?? item?.value, 0),
    }))
    .filter((item) => item.cantidad > 0)
}

function normalizeExecutionData(data = []) {
  return ensureArray(data)
    .map((item) => {
      const name = ensureString(item?.name ?? item?.label, 'SIN DATO')
      const normalizedName = name.toLowerCase()
      const colorToken =
        ensureString(item?.colorToken ?? item?.color, '') ||
        (normalizedName.includes('ejecut') ? 'success' : 'warning')

      return {
        name,
        label: name,
        value: parseNumber(item?.value ?? item?.cantidad, 0),
        colorToken,
      }
    })
    .filter((item) => item.value > 0)
}

function normalizeRankingData(data = [], categoryKey = 'label', valueKey = 'value') {
  return ensureArray(data)
    .map((item) => ({
      ...item,
      label: ensureString(
        item?.[categoryKey] ??
          item?.label ??
          item?.name ??
          item?.usuario ??
          item?.persona,
        'SIN DATO',
      ),
      departamento: ensureString(
        item?.[categoryKey] ??
          item?.departamento ??
          item?.label ??
          item?.name ??
          item?.usuario ??
          item?.persona,
        'SIN DATO',
      ),
      value: parseNumber(
        item?.[valueKey] ??
          item?.value ??
          item?.cantidad ??
          item?.total,
        0,
      ),
      cantidad: parseNumber(
        item?.[valueKey] ??
          item?.cantidad ??
          item?.value ??
          item?.total,
        0,
      ),
    }))
    .filter((item) => item.value > 0 || item.cantidad > 0)
}

function buildRankingOptions(summary = {}) {
  const rankingMeta = ensureObject(summary?.chartMeta?.rankingPersonas)
  const backendOptions = ensureArray(rankingMeta.options)
  const rankingData = ensureObject(summary?.charts?.rankingPersonas)

  if (backendOptions.length > 0) {
    return backendOptions.map((option, index) => {
      const key = option?.key || `ranking-${index}`
      const fallbackColorToken = key === 'resolutores' ? 'secondary' : 'primary'
      const categoryKey = option?.categoryKey || 'label'
      const valueKey = option?.valueKey || 'value'

      return {
        key,
        label: option?.label || option?.title || key,
        title: option?.title || option?.label || key,
        subtitle: option?.subtitle || '',
        metric: resolveMetricMeta(option?.metric, {
          format: 'number',
          decimals: 0,
        }),
        valueLabel: option?.valueLabel || 'Total tickets',
        categoryKey,
        valueKey,
        colorToken:
          option?.colorToken ||
          (Array.isArray(option?.colorTokens) ? option.colorTokens[0] : '') ||
          option?.barColor ||
          fallbackColorToken,
        barColor:
          option?.barColor ||
          option?.colorToken ||
          (Array.isArray(option?.colorTokens) ? option.colorTokens[0] : '') ||
          fallbackColorToken,
        data: normalizeRankingData(rankingData?.[key], categoryKey, valueKey),
      }
    })
  }

  return [
    {
      key: 'requeridores',
      label: 'Requeridores',
      title: 'Top requeridores',
      subtitle: '',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Total tickets',
      categoryKey: 'label',
      valueKey: 'value',
      colorToken: 'primary',
      barColor: 'primary',
      data: normalizeRankingData(rankingData?.requeridores),
    },
    {
      key: 'resolutores',
      label: 'Resolutores',
      title: 'Top resolutores',
      subtitle: '',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Total tickets',
      categoryKey: 'label',
      valueKey: 'value',
      colorToken: 'secondary',
      barColor: 'secondary',
      data: normalizeRankingData(rankingData?.resolutores),
    },
  ]
}

function TicketsGerencial() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const response = await getGerencialDashboard({
          windowMonths: 12,
          force: true,
          cache: false,
        })

        if (!isMounted) return

        setSummary(mergeSummary(response))
      } catch (requestError) {
        if (!isMounted) return

        console.error('Error cargando dashboard gerencial:', requestError)
        setError(
          requestError?.message || 'No se pudo cargar el resumen gerencial.',
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const kpiOrder = useMemo(() => {
    const backendOrder = ensureArray(summary?.ui?.kpiOrder)
    return backendOrder.length > 0 ? backendOrder : DEFAULT_KPI_ORDER
  }, [summary])

  const backlogDescription = useMemo(() => {
    return formatBacklogDescription(summary)
  }, [summary])

  const slaMeta = useMemo(() => {
    return resolveChartMeta(summary, 'slaPorDepartamento', {
      title: 'Cumplimiento SLA por departamento',
      subtitle: '',
      metric: { format: 'percent', decimals: 2 },
      valueLabel: 'Cumplimiento',
      barColor: 'primary',
    })
  }, [summary])

  const backlogMeta = useMemo(() => {
    return resolveChartMeta(summary, 'backlogMensual', {
      title: 'Backlog mensual',
      subtitle: '',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Tickets',
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
    })
  }, [summary])

  const rejectionMeta = useMemo(() => {
    return resolveChartMeta(summary, 'motivosRechazo', {
      title: 'Motivos de rechazo',
      subtitle: '',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Tickets rechazados',
      barColor: 'danger',
    })
  }, [summary])

  const executionMeta = useMemo(() => {
    return resolveChartMeta(summary, 'efectividadEjecucion', {
      title: 'Efectividad de ejecución',
      subtitle: '',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Total tickets',
      showLegend: true,
      showTotal: true,
      showExternalLabels: false,
    })
  }, [summary])

  const slaData = useMemo(() => {
    return normalizeSlaData(summary?.charts?.slaPorDepartamento)
  }, [summary])

  const rejectionData = useMemo(() => {
    return normalizeRejectionData(summary?.charts?.motivosRechazo)
  }, [summary])

  const executionData = useMemo(() => {
    return normalizeExecutionData(summary?.charts?.efectividadEjecucion)
  }, [summary])

  const rankingOptions = useMemo(() => {
    return buildRankingOptions(summary)
  }, [summary])

  const requeridoresRanking = useMemo(() => {
    return (
      rankingOptions.find((option) => option.key === 'requeridores') ||
      rankingOptions[0] ||
      {
        key: 'requeridores',
        title: 'Top requeridores',
        subtitle: '',
        metric: { format: 'number', decimals: 0 },
        valueLabel: 'Total tickets',
        barColor: 'primary',
        data: [],
      }
    )
  }, [rankingOptions])

  const resolutoresRanking = useMemo(() => {
    return (
      rankingOptions.find((option) => option.key === 'resolutores') ||
      rankingOptions[1] ||
      {
        key: 'resolutores',
        title: 'Top resolutores',
        subtitle: '',
        metric: { format: 'number', decimals: 0 },
        valueLabel: 'Total tickets',
        barColor: 'secondary',
        data: [],
      }
    )
  }, [rankingOptions])

  return (
    <ModulePage
      title="Tickets Gerencial"
      description="Indicadores gerenciales de tickets."
    >
      {loading ? (
        <div className="portal-feedback portal-feedback--loading">
          Cargando resumen gerencial de tickets...
        </div>
      ) : error ? (
        <div className="portal-feedback portal-feedback--error">
          {error}
        </div>
      ) : (
        <>
          <div className="gerencial-kpis__grid">
            {kpiOrder.map((key) => {
              const meta = resolveKpiMeta(summary, key)
              const value = summary?.kpis?.[key]
              const description =
                key === 'backlogActual'
                  ? backlogDescription
                  : meta.description

              return (
                <KpiCard
                  key={key}
                  title={meta.title}
                  value={value}
                  description={description}
                  format={meta.format}
                  decimals={meta.decimals}
                  prefix={meta.prefix}
                  suffix={meta.suffix}
                  locale={meta.locale}
                  emptyValue={meta.emptyValue}
                />
              )
            })}
          </div>

          <div className="gerencial-recommended-grid">
            <TicketsDepartmentChart
              data={slaData}
              title={slaMeta.title}
              subtitle={slaMeta.subtitle}
              metric={slaMeta.metric}
              valueLabel={slaMeta.valueLabel}
              barColor={slaMeta.barColor || slaMeta.colorToken}
            />

            <TicketsBacklogChart
              data={summary?.charts?.backlogMensual}
              title={backlogMeta.title}
              subtitle={backlogMeta.subtitle}
              metric={backlogMeta.metric}
              valueLabel={backlogMeta.valueLabel}
              series={backlogMeta.series}
            />

            <TicketsDepartmentChart
              data={rejectionData}
              title={rejectionMeta.title}
              subtitle={rejectionMeta.subtitle}
              metric={rejectionMeta.metric}
              valueLabel={rejectionMeta.valueLabel}
              barColor={rejectionMeta.barColor || rejectionMeta.colorToken}
            />

            <TicketsDonutChart
              data={executionData}
              title={executionMeta.title}
              subtitle={executionMeta.subtitle}
              metric={executionMeta.metric}
              valueLabel={executionMeta.valueLabel}
              showLegend={executionMeta.showLegend}
              showTotal={executionMeta.showTotal}
              showExternalLabels={executionMeta.showExternalLabels}
            />

            <TicketsDepartmentChart
              data={requeridoresRanking.data}
              title={requeridoresRanking.title || 'Top requeridores'}
              subtitle={requeridoresRanking.subtitle || ''}
              metric={requeridoresRanking.metric}
              valueLabel={requeridoresRanking.valueLabel || 'Total tickets'}
              barColor={
                requeridoresRanking.barColor ||
                requeridoresRanking.colorToken ||
                'primary'
              }
            />

            <TicketsDepartmentChart
              data={resolutoresRanking.data}
              title={resolutoresRanking.title || 'Top resolutores'}
              subtitle={resolutoresRanking.subtitle || ''}
              metric={resolutoresRanking.metric}
              valueLabel={resolutoresRanking.valueLabel || 'Total tickets'}
              barColor={
                resolutoresRanking.barColor ||
                resolutoresRanking.colorToken ||
                'secondary'
              }
            />
          </div>
        </>
      )}
    </ModulePage>
  )
}

export default TicketsGerencial