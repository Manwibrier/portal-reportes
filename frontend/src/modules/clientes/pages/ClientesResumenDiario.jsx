// src/modules/clientes/pages/ClientesResumenDiario.jsx

import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../../components/ModulePage'
import ClientesDonutChart from '../components/ClientesDonutChart'
import ClientesFiltroBar from '../components/ClientesFiltroBar'
import ClientesKpiSection from '../components/ClientesKpiSection'
import {
  CLIENTES_CHART_META,
  CLIENTES_SECTION_META,
  buildClientesDonutItems,
  buildClientesKpiItems,
  createEmptyDashboard,
  getTotalClientes,
  normalizeClientesDashboard,
} from '../constants'
import { getClientesDashboard } from '../services'

const DEFAULT_DASHBOARD = createEmptyDashboard()

function normalizeFilterValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function ClientesResumenDiario() {
  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zona, setZona] = useState('')
  const [franquicia, setFranquicia] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const response = await getClientesDashboard({
          zona: zona || undefined,
          franquicia: franquicia || undefined,
          force: true,
          cache: false,
        })

        if (!isMounted) return

        setDashboard(normalizeClientesDashboard(response))
      } catch (requestError) {
        console.error(
          'Error cargando el resumen diario de clientes:',
          requestError,
        )

        if (!isMounted) return

        setError(
          requestError?.message ||
            'No fue posible cargar el resumen diario de clientes.',
        )
        setDashboard(DEFAULT_DASHBOARD)
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
  }, [zona, franquicia])

  const totalClientes = useMemo(() => {
    return getTotalClientes(dashboard)
  }, [dashboard])

  const internetItems = useMemo(() => {
    return buildClientesKpiItems(
      'internet',
      ensureObject(dashboard?.internet),
    )
  }, [dashboard])

  const televisionItems = useMemo(() => {
    return buildClientesKpiItems(
      'television',
      ensureObject(dashboard?.television),
    )
  }, [dashboard])

  const estatusChartData = useMemo(() => {
    return buildClientesDonutItems(
      'estatus',
      ensureObject(dashboard?.segmentacionEstatus),
    )
  }, [dashboard])

  const productoChartData = useMemo(() => {
    return buildClientesDonutItems(
      'producto',
      ensureObject(dashboard?.segmentacionProducto),
    )
  }, [dashboard])

  function handleZonaChange(value) {
    setZona(normalizeFilterValue(value))
    setFranquicia('')
  }

  function handleFranquiciaChange(value) {
    setFranquicia(normalizeFilterValue(value))
  }

  return (
    <ModulePage
      title="Clientes · Resumen Diario"
      description="Indicadores diarios de clientes."
    >
      <ClientesFiltroBar
        zonas={dashboard?.filtrosDisponibles?.zonas || []}
        franquicias={dashboard?.filtrosDisponibles?.franquicias || []}
        zonaActiva={zona}
        franquiciaActiva={franquicia}
        onZonaChange={handleZonaChange}
        onFranquiciaChange={handleFranquiciaChange}
        totalClientes={totalClientes}
      />

      {loading ? (
        <div className="portal-feedback portal-feedback--loading">
          Cargando resumen diario de clientes...
        </div>
      ) : error ? (
        <div className="portal-feedback portal-feedback--error">
          {error}
        </div>
      ) : (
        <>
          <ClientesKpiSection
            title={CLIENTES_SECTION_META.internet.title}
            items={internetItems}
          />

          <div className="portal-operational-grid clientes-internet-chart-grid">
            <ClientesDonutChart
              title={CLIENTES_CHART_META.estatus.title}
              data={estatusChartData}
              valueLabel="Clientes"
              emptyMessage="No hay datos de estatus para el filtro seleccionado."
            />

            <ClientesDonutChart
              title={CLIENTES_CHART_META.producto.title}
              data={productoChartData}
              valueLabel="Clientes"
              emptyMessage="No hay datos de producto para el filtro seleccionado."
            />
          </div>

          <ClientesKpiSection
            title={CLIENTES_SECTION_META.television.title}
            items={televisionItems}
          />
        </>
      )}
    </ModulePage>
  )
}

export default ClientesResumenDiario