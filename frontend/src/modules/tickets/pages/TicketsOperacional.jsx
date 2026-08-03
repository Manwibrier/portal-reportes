// src/modules/tickets/pages/TicketsOperacional.jsx

import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../../components/ModulePage'
import KpiCard from '../../../components/KpiCard'
import {
  TicketsDepartmentChart,
  TicketsDepartmentFilter,
  TicketsEstatusChart,
  TicketsMonthlyChart,
  TicketsTornadoChart,
} from '../components'
import { getOperationalDashboard } from '../services'

const DEFAULT_KPI_ORDER = [
  'totalTickets',
  'totalDepartamentos',
  'pendientesAbiertos',
  'vencidos',
  'porVencer72h',
  'agingPromedioDias',
]

const KPI_FALLBACK_META = {
  totalTickets: {
    title: 'Total de Tickets',
    description: 'Volumen total del conjunto filtrado.',
    format: 'number',
    decimals: 0,
  },
  totalDepartamentos: {
    title: 'Departamentos',
    description: 'Cantidad de áreas con actividad.',
    format: 'number',
    decimals: 0,
  },
  pendientesAbiertos: {
    title: 'Pendientes',
    description: 'Tickets abiertos que aún no han cerrado ciclo.',
    format: 'number',
    decimals: 0,
  },
  vencidos: {
    title: 'Vencidos',
    description: 'Tickets abiertos cuyo compromiso ya expiró.',
    format: 'number',
    decimals: 0,
  },
  porVencer72h: {
    title: 'Por vencer en 72h',
    description: 'Tickets abiertos con vencimiento cercano.',
    format: 'number',
    decimals: 0,
  },
  agingPromedioDias: {
    title: 'Aging promedio',
    description: 'Promedio de antigüedad de tickets abiertos.',
    format: 'number',
    decimals: 2,
    suffix: ' días',
  },
}

const DEFAULT_SUMMARY = {
  kpis: {
    totalTickets: 0,
    totalDepartamentos: 0,
    pendientesAbiertos: 0,
    vencidos: 0,
    porVencer72h: 0,
    agingPromedioDias: 0,
  },
  kpiMeta: {},
  charts: {
    ticketsMensuales: [],
    ticketsPorEstatus: [],
    ticketsRecibidosVsCerrados: [],
    ticketsEmitidosVsCerrados: [],
    cargaPorUsuario: [],
    agingBuckets: [],
  },
  chartMeta: {},
  tables: {
    ticketsCriticos: [],
  },
  filters: {
    departamentos: [],
  },
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

function parseNumber(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function resolveMetricMeta(metric, fallback = { format: 'number', decimals: 0 }) {
  const resolvedMetric = ensureObject(metric)
  const fallbackMetric = ensureObject(fallback)

  return {
    format: resolvedMetric.format || fallbackMetric.format || 'number',
    decimals: Number.isFinite(Number(resolvedMetric.decimals))
      ? Number(resolvedMetric.decimals)
      : Number.isFinite(Number(fallbackMetric.decimals))
        ? Number(fallbackMetric.decimals)
        : 0,
    prefix: resolvedMetric.prefix || fallbackMetric.prefix || '',
    suffix: resolvedMetric.suffix || fallbackMetric.suffix || '',
    locale: resolvedMetric.locale || fallbackMetric.locale || 'es-VE',
  }
}

function resolveKpiMeta(summary, key) {
  const backendMeta = ensureObject(summary?.kpiMeta?.[key])
  const fallback = KPI_FALLBACK_META[key] || {
    title: key,
    description: '',
    format: 'number',
    decimals: 0,
  }

  return {
    title: backendMeta.title || fallback.title || key,
    description:
      backendMeta.description ||
      backendMeta.subtitle ||
      fallback.description ||
      '',
    format: backendMeta.format || fallback.format || 'number',
    decimals: Number.isFinite(Number(backendMeta.decimals))
      ? Number(backendMeta.decimals)
      : Number.isFinite(Number(fallback.decimals))
        ? Number(fallback.decimals)
        : 0,
    prefix: backendMeta.prefix || fallback.prefix || '',
    suffix: backendMeta.suffix || fallback.suffix || '',
    locale: backendMeta.locale || fallback.locale || 'es-VE',
    emptyValue: backendMeta.emptyValue || fallback.emptyValue || '0',
  }
}

function resolveChartMeta(summary, key, fallback = {}) {
  const backendMeta = ensureObject(summary?.chartMeta?.[key])
  const fallbackMeta = ensureObject(fallback)

  const colorTokens = ensureArray(backendMeta.colorTokens).length
    ? backendMeta.colorTokens
    : ensureArray(fallbackMeta.colorTokens)

  return {
    title: backendMeta.title || fallbackMeta.title || key,
    subtitle:
      backendMeta.subtitle ||
      backendMeta.description ||
      fallbackMeta.subtitle ||
      '',
    valueLabel:
      backendMeta.valueLabel || fallbackMeta.valueLabel || 'Valor',
    metric: resolveMetricMeta(backendMeta.metric, fallbackMeta.metric),
    colorToken:
      backendMeta.colorToken ||
      backendMeta.barColor ||
      colorTokens[0] ||
      fallbackMeta.colorToken ||
      fallbackMeta.barColor ||
      '',
    barColor:
      backendMeta.barColor ||
      backendMeta.colorToken ||
      colorTokens[0] ||
      fallbackMeta.barColor ||
      fallbackMeta.colorToken ||
      '',
    colorTokens,
    leftLabel:
      backendMeta.leftLabel || fallbackMeta.leftLabel || 'Recibidos',
    rightLabel:
      backendMeta.rightLabel || fallbackMeta.rightLabel || 'Finalizados',
    totalLabel:
      backendMeta.totalLabel || fallbackMeta.totalLabel || 'Total',
    showTotal:
      typeof backendMeta.showTotal === 'boolean'
        ? backendMeta.showTotal
        : typeof fallbackMeta.showTotal === 'boolean'
          ? fallbackMeta.showTotal
          : true,
  }
}

function mergeSummary(summary) {
  const value = ensureObject(summary)

  return {
    ...DEFAULT_SUMMARY,
    ...value,
    kpis: {
      ...DEFAULT_SUMMARY.kpis,
      ...ensureObject(value.kpis),
    },
    kpiMeta: ensureObject(value.kpiMeta),
    charts: {
      ...DEFAULT_SUMMARY.charts,
      ...ensureObject(value.charts),
    },
    chartMeta: ensureObject(value.chartMeta),
    tables: {
      ...DEFAULT_SUMMARY.tables,
      ...ensureObject(value.tables),
    },
    filters: {
      ...DEFAULT_SUMMARY.filters,
      ...ensureObject(value.filters),
    },
    meta: {
      ...DEFAULT_SUMMARY.meta,
      ...ensureObject(value.meta),
    },
    ui: {
      ...DEFAULT_SUMMARY.ui,
      ...ensureObject(value.ui),
    },
  }
}

function normalizeSelectedDepartment(value) {
  if (Array.isArray(value)) {
    return value[0] || 'TOTAL'
  }

  const text = String(value ?? '').trim()

  return text || 'TOTAL'
}

function TicketsOperacional() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('TOTAL')

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const response = await getOperationalDashboard({
          department:
            selectedDepartment && selectedDepartment !== 'TOTAL'
              ? selectedDepartment
              : undefined,
          windowMonths: 12,
          limit: 25,
          force: true,
          cache: false,
        })

        if (!isMounted) return

        setSummary(mergeSummary(response))
      } catch (requestError) {
        if (!isMounted) return

        console.error('Error cargando dashboard operacional:', requestError)
        setError(
          requestError?.message ||
            'No se pudo cargar el resumen operacional.',
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
  }, [selectedDepartment])

  const kpiOrder = useMemo(() => {
    const backendOrder = ensureArray(summary?.ui?.kpiOrder)

    return backendOrder.length > 0 ? backendOrder : DEFAULT_KPI_ORDER
  }, [summary])

  const totalTickets = useMemo(() => {
    return parseNumber(summary?.kpis?.totalTickets, 0)
  }, [summary])

  const selectedDepartments = useMemo(() => {
    return selectedDepartment && selectedDepartment !== 'TOTAL'
      ? [selectedDepartment]
      : []
  }, [selectedDepartment])

  const monthlyMeta = useMemo(() => {
    return resolveChartMeta(summary, 'ticketsMensuales', {
      title: 'Tickets por mes',
      subtitle: 'Evolución mensual de tickets registrados.',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Total tickets',
      colorToken: 'primary',
    })
  }, [summary])

  const statusMeta = useMemo(() => {
    return resolveChartMeta(summary, 'ticketsPorEstatus', {
      title: 'Tickets por estatus',
      subtitle: 'Distribución de tickets por estado actual.',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Total tickets',
    })
  }, [summary])

  const recibidosMeta = useMemo(() => {
    return resolveChartMeta(summary, 'ticketsRecibidosVsCerrados', {
      title: 'Tickets recibidos vs finalizados por departamento',
      subtitle: 'Comparativo entre volumen recibido y tickets cerrados.',
      leftLabel: 'Recibidos',
      rightLabel: 'Finalizados',
      totalLabel: 'Total',
      colorTokens: ['secondary', 'primary', 'neutral'],
      metric: { format: 'number', decimals: 0 },
      showTotal: true,
    })
  }, [summary])

  const emitidosMeta = useMemo(() => {
    return resolveChartMeta(summary, 'ticketsEmitidosVsCerrados', {
      title: 'Tickets emitidos vs cerrados por departamento',
      subtitle: 'Comparativo entre volumen emitido y tickets cerrados.',
      leftLabel: 'Emitidos',
      rightLabel: 'Cerrados',
      totalLabel: 'Total',
      colorTokens: ['secondary', 'primary', 'neutral'],
      metric: { format: 'number', decimals: 0 },
      showTotal: true,
    })
  }, [summary])

  const cargaMeta = useMemo(() => {
    return resolveChartMeta(summary, 'cargaPorUsuario', {
      title: 'Carga de trabajo por usuario asignado',
      subtitle: 'Usuarios con mayor volumen de tickets abiertos.',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Tickets abiertos',
      colorToken: 'primary',
    })
  }, [summary])

  const agingMeta = useMemo(() => {
    return resolveChartMeta(summary, 'agingBuckets', {
      title: 'Envejecimiento de tickets abiertos',
      subtitle: 'Distribución por antigüedad de tickets pendientes.',
      metric: { format: 'number', decimals: 0 },
      valueLabel: 'Tickets abiertos',
      colorToken: 'warning',
    })
  }, [summary])

  function handleDepartmentChange(value) {
    setSelectedDepartment(normalizeSelectedDepartment(value))
  }

  return (
    <ModulePage
      title="Tickets Operacional"
      description="Indicadores operativos de tickets."
    >
      {loading ? (
        <div className="portal-feedback portal-feedback--loading">
          Cargando resumen operacional de tickets...
        </div>
      ) : error ? (
        <div className="portal-feedback portal-feedback--error">
          {error}
        </div>
      ) : (
        <>
          <TicketsDepartmentFilter
            items={summary?.filters?.departamentos}
            value={selectedDepartment}
            selectedDepartment={selectedDepartment}
            selectedDepartments={selectedDepartments}
            onChange={handleDepartmentChange}
            onReset={() => setSelectedDepartment('TOTAL')}
            title="Filtrar por departamento"
            totalTickets={totalTickets}
            totalLabel="Total de Tickets"
            selectLabel="Departamento"
          />

          <div className="kpi-grid">
            {kpiOrder.map((key) => {
              const meta = resolveKpiMeta(summary, key)
              const value = summary?.kpis?.[key]

              return (
                <KpiCard
                  key={key}
                  title={meta.title}
                  value={value}
                  description={meta.description}
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
            <TicketsTornadoChart
              data={summary?.charts?.ticketsRecibidosVsCerrados}
              title={recibidosMeta.title}
              subtitle={recibidosMeta.subtitle}
              leftLabel={recibidosMeta.leftLabel}
              rightLabel={recibidosMeta.rightLabel}
              totalLabel={recibidosMeta.totalLabel}
              leftColor={recibidosMeta.colorTokens?.[0] || 'secondary'}
              rightColor={recibidosMeta.colorTokens?.[1] || 'primary'}
              totalColor={recibidosMeta.colorTokens?.[2] || 'neutral'}
              metric={recibidosMeta.metric}
              showTotal={recibidosMeta.showTotal}
            />

            <TicketsTornadoChart
              data={summary?.charts?.ticketsEmitidosVsCerrados}
              title={emitidosMeta.title}
              subtitle={emitidosMeta.subtitle}
              leftLabel={emitidosMeta.leftLabel}
              rightLabel={emitidosMeta.rightLabel}
              totalLabel={emitidosMeta.totalLabel}
              leftColor={emitidosMeta.colorTokens?.[0] || 'secondary'}
              rightColor={emitidosMeta.colorTokens?.[1] || 'primary'}
              totalColor={emitidosMeta.colorTokens?.[2] || 'neutral'}
              metric={emitidosMeta.metric}
              showTotal={emitidosMeta.showTotal}
            />

            <TicketsMonthlyChart
              data={summary?.charts?.ticketsMensuales}
              title={monthlyMeta.title}
              subtitle={monthlyMeta.subtitle}
              metric={monthlyMeta.metric}
              valueLabel={monthlyMeta.valueLabel}
              barColor={monthlyMeta.barColor || monthlyMeta.colorToken}
            />

            <TicketsEstatusChart
              data={summary?.charts?.ticketsPorEstatus}
              title={statusMeta.title}
              subtitle={statusMeta.subtitle}
              metric={statusMeta.metric}
              valueLabel={statusMeta.valueLabel}
            />

            <TicketsDepartmentChart
              data={summary?.charts?.cargaPorUsuario}
              title={cargaMeta.title}
              subtitle={cargaMeta.subtitle}
              metric={cargaMeta.metric}
              valueLabel={cargaMeta.valueLabel}
              barColor={cargaMeta.barColor || cargaMeta.colorToken}
            />

            <TicketsDepartmentChart
              data={summary?.charts?.agingBuckets}
              title={agingMeta.title}
              subtitle={agingMeta.subtitle}
              metric={agingMeta.metric}
              valueLabel={agingMeta.valueLabel}
              barColor={agingMeta.barColor || agingMeta.colorToken}
            />
          </div>
        </>
      )}
    </ModulePage>
  )
}

export default TicketsOperacional