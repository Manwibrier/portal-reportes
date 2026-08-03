// src/modules/clientes/pages/ClientesCierreMensual.jsx

import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../../components/ModulePage'
import {
  ClientesCierreMensualDetalleTable,
  ClientesCierreMensualFiltroBar,
  ClientesCierreMensualKpiSection,
} from '../components'
import {
  buildClientesCierreMensualKpiItems,
  createEmptyCierreMensualDashboard,
  normalizeClientesCierreMensualDashboard,
} from '../constants'
import { getClientesCierreMensual } from '../services'

const DEFAULT_DASHBOARD = createEmptyCierreMensualDashboard()

const KPI_TOTAL_FIELDS = [
  'totalClientesActivos',
  'totalClientesCortados',
  'totalClientesPorCortar',
  'totalClientesExonerados',
  'totalVenta',
  'totalInstalacionesFinalizadas',
  'totalInstalacionesPendientes',
  'totalReclamosFinalizados',
]

const KPI_GROUPS = [
  {
    key: 'clientes',
    title: 'Información de clientes',
    order: [
      'baseTotalClientes',
      'totalClientesActivos',
      'totalClientesExonerados',
      'totalClientesPorCortar',
      'totalClientesCortados',
    ],
  },
  {
    key: 'calculados',
    title: 'Campos calculados',
    order: [
      'totalVenta',
      'totalInstalacionesFinalizadas',
      'totalInstalacionesPendientes',
      'totalReclamosFinalizados',
    ],
  },
  {
    key: 'metricas',
    title: 'Métricas',
    order: [
      'efectividadInstalacionPct',
      'backlogInstalacionPct',
      'tasaCortePct',
    ],
  },
]

function normalizeFilterValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNumberValue(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : fallback
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function calculatePercentage(numerator, denominator) {
  const safeNumerator = toSafeNumber(numerator)
  const safeDenominator = toSafeNumber(denominator)

  if (safeDenominator <= 0) return 0

  return (safeNumerator / safeDenominator) * 100
}

function resolveInitialYear(data = DEFAULT_DASHBOARD) {
  const appliedYear = normalizeNumberValue(data?.filtrosAplicados?.anio, 0)

  if (appliedYear > 0) return appliedYear

  const availableYears = Array.isArray(data?.filtrosDisponibles?.anios)
    ? data.filtrosDisponibles.anios
    : []

  return normalizeNumberValue(availableYears[0], new Date().getFullYear())
}

function resolveInitialMonth(data = DEFAULT_DASHBOARD) {
  const appliedMonth = normalizeNumberValue(data?.filtrosAplicados?.mes, 0)

  if (appliedMonth > 0) return appliedMonth

  const availableMonths = Array.isArray(data?.filtrosDisponibles?.meses)
    ? data.filtrosDisponibles.meses
    : []

  return normalizeNumberValue(availableMonths[0], new Date().getMonth() + 1)
}

function aggregateServiceRows(rows = []) {
  const totals = toSafeArray(rows).reduce(
    (acc, row) => {
      KPI_TOTAL_FIELDS.forEach((field) => {
        acc[field] += toSafeNumber(row?.[field])
      })

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

  const baseTotalClientes =
    totals.totalClientesActivos +
    totals.totalClientesCortados +
    totals.totalClientesPorCortar +
    totals.totalClientesExonerados

  const totalInstalaciones =
    totals.totalInstalacionesFinalizadas +
    totals.totalInstalacionesPendientes

  return {
    ...totals,
    baseTotalClientes,
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
      baseTotalClientes,
    ),
    churnRateOperacionalPct: calculatePercentage(
      totals.totalClientesCortados + totals.totalClientesPorCortar,
      baseTotalClientes,
    ),
    clientesPorCortarPct: calculatePercentage(
      totals.totalClientesPorCortar,
      baseTotalClientes,
    ),
    clientesExoneradosPct: calculatePercentage(
      totals.totalClientesExonerados,
      baseTotalClientes,
    ),
    ventasSobreBasePct: calculatePercentage(
      totals.totalVenta,
      baseTotalClientes,
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

function resolveKpisWithServiceFallback(kpis = {}, serviceRows = []) {
  const sourceKpis =
    kpis && typeof kpis === 'object' && !Array.isArray(kpis) ? kpis : {}

  const fallbackKpis = aggregateServiceRows(serviceRows)
  const mergedKpis = {
    ...sourceKpis,
  }

  Object.entries(fallbackKpis).forEach(([key, fallbackValue]) => {
    const currentValue = toSafeNumber(sourceKpis?.[key])
    const nextValue = toSafeNumber(fallbackValue)

    mergedKpis[key] = currentValue !== 0 ? currentValue : nextValue
  })

  return mergedKpis
}

function buildGroupedKpiItems(kpis = {}) {
  return KPI_GROUPS.map((group) => ({
    ...group,
    items: buildClientesCierreMensualKpiItems(kpis, group.order),
  }))
}

function buildFlatKpiItems(groups = []) {
  return groups.flatMap((group) => toSafeArray(group.items))
}

function resolvePeriodoLabel(filtrosAplicados = {}, mesActivo, anioActivo) {
  const mesNombre = String(filtrosAplicados?.mesNombre || '').trim()
  const mesEvaluado =
    normalizeNumberValue(filtrosAplicados?.mes, 0) ||
    normalizeNumberValue(mesActivo, 0)

  const anioEvaluado =
    normalizeNumberValue(filtrosAplicados?.anio, 0) ||
    normalizeNumberValue(anioActivo, 0)

  if (mesNombre && anioEvaluado > 0) {
    return `${mesNombre} ${anioEvaluado}`
  }

  if (mesEvaluado > 0 && anioEvaluado > 0) {
    return `Mes ${mesEvaluado} ${anioEvaluado}`
  }

  if (anioEvaluado > 0) {
    return `${anioEvaluado}`
  }

  return 'Período no disponible'
}

function ClientesCierreMensual() {
  const [data, setData] = useState(DEFAULT_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zona, setZona] = useState('')
  const [franquicia, setFranquicia] = useState('')
  const [mes, setMes] = useState(resolveInitialMonth(DEFAULT_DASHBOARD))
  const [anio, setAnio] = useState(resolveInitialYear(DEFAULT_DASHBOARD))

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const result = await getClientesCierreMensual({
          zona: zona || undefined,
          franquicia: franquicia || undefined,
          mes,
          anio,
          force: true,
          cache: false,
        })

        if (!isMounted) return

        setData(normalizeClientesCierreMensualDashboard(result))
      } catch (requestError) {
        console.error(
          'Error cargando el cierre mensual de clientes:',
          requestError,
        )

        if (!isMounted) return

        setError(
          requestError?.message ||
            'No fue posible cargar el cierre mensual de clientes.',
        )
        setData(DEFAULT_DASHBOARD)
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
  }, [zona, franquicia, mes, anio])

  const dashboard = useMemo(() => {
    return normalizeClientesCierreMensualDashboard(data)
  }, [data])

  const filtrosDisponibles = dashboard.filtrosDisponibles
  const filtrosAplicados = dashboard.filtrosAplicados
  const tablas = dashboard.tablas
  const serviceRows = toSafeArray(tablas?.porServicio)

  const resolvedKpis = useMemo(() => {
    return resolveKpisWithServiceFallback(dashboard.kpis, serviceRows)
  }, [dashboard.kpis, serviceRows])

  const kpiGroups = useMemo(() => {
    return buildGroupedKpiItems(resolvedKpis)
  }, [resolvedKpis])

  const kpiItems = useMemo(() => {
    return buildFlatKpiItems(kpiGroups)
  }, [kpiGroups])

  const periodoLabel = useMemo(() => {
    return resolvePeriodoLabel(filtrosAplicados, mes, anio)
  }, [filtrosAplicados, mes, anio])

  const mesEvaluado = useMemo(() => {
    return (
      normalizeNumberValue(filtrosAplicados?.mes, 0) ||
      normalizeNumberValue(mes, 0)
    )
  }, [filtrosAplicados, mes])

  const anioEvaluado = useMemo(() => {
    return (
      normalizeNumberValue(filtrosAplicados?.anio, 0) ||
      normalizeNumberValue(anio, 0)
    )
  }, [filtrosAplicados, anio])

  const exportFileName = useMemo(() => {
    const mesArchivo = mesEvaluado > 0 ? String(mesEvaluado).padStart(2, '0') : 'mes'
    const anioArchivo = anioEvaluado > 0 ? String(anioEvaluado) : 'anio'

    return `clientes-cierre-mensual-${anioArchivo}-${mesArchivo}.xlsx`
  }, [mesEvaluado, anioEvaluado])

  function handleZonaChange(value) {
    setZona(normalizeFilterValue(value))
    setFranquicia('')
  }

  function handleFranquiciaChange(value) {
    setFranquicia(normalizeFilterValue(value))
  }

  function handleMesChange(nextMes) {
    const normalizedMonth = normalizeNumberValue(nextMes, mes)

    setMes((currentMonth) =>
      currentMonth === normalizedMonth ? currentMonth : normalizedMonth,
    )
  }

  function handleAnioChange(nextAnio) {
    const normalizedYear = normalizeNumberValue(nextAnio, anio)

    setAnio((currentYear) =>
      currentYear === normalizedYear ? currentYear : normalizedYear,
    )

    setZona('')
    setFranquicia('')
  }

  function handleResetFilters() {
    setZona('')
    setFranquicia('')
    setMes(resolveInitialMonth(DEFAULT_DASHBOARD))
    setAnio(resolveInitialYear(DEFAULT_DASHBOARD))
  }

  return (
    <ModulePage
      title="Clientes · Cierre Mensual"
      description="Indicadores mensuales de clientes."
    >
      {loading ? (
        <div className="portal-feedback portal-feedback--loading">
          Cargando cierre mensual de clientes...
        </div>
      ) : error ? (
        <div className="portal-feedback portal-feedback--error">
          {error}
        </div>
      ) : (
        <>
          <ClientesCierreMensualFiltroBar
            zonas={filtrosDisponibles.zonas}
            franquicias={filtrosDisponibles.franquicias}
            meses={filtrosDisponibles.meses}
            anios={filtrosDisponibles.anios}
            zonaActiva={zona}
            franquiciaActiva={franquicia}
            mesActivo={mes}
            anioActivo={anio}
            onZonaChange={handleZonaChange}
            onFranquiciaChange={handleFranquiciaChange}
            onMesChange={handleMesChange}
            onAnioChange={handleAnioChange}
            onReset={handleResetFilters}
            totalClientes={resolvedKpis.baseTotalClientes}
          />

          <ClientesCierreMensualKpiSection
            title="KPIs del Cierre Mensual"
            items={kpiItems}
            groups={kpiGroups}
          />

          <ClientesCierreMensualDetalleTable
            title="Detalle por Servicio"
            subtitle={`Período evaluado: ${periodoLabel}`}
            rows={serviceRows}
            periodoLabel={periodoLabel}
            mesEvaluado={mesEvaluado}
            anioEvaluado={anioEvaluado}
            exportFileName={exportFileName}
            exportSheetName="Detalle por Servicio"
            emptyMessage="No hay registros por servicio para el período seleccionado."
          />
        </>
      )}
    </ModulePage>
  )
}

export default ClientesCierreMensual