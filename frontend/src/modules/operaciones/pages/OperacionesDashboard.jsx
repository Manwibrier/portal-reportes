// src/modules/operaciones/pages/OperacionesDashboard.jsx

import { useEffect, useMemo, useState } from 'react'
import { createEmptyDashboard, normalizeOperacionesDashboard } from '../constants'
import { getOperacionesDashboard } from '../services/operaciones.service'

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function formatNumber(value) {
  const numericValue = Number(value)
  return new Intl.NumberFormat('es-VE').format(
    Number.isFinite(numericValue) ? numericValue : 0,
  )
}

function normalizeKpiItem(item = {}, index = 0) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return {
      key: item.key || item.id || `kpi-${index}`,
      title: item.title || item.label || item.name || `Indicador ${index + 1}`,
      value: item.value ?? item.total ?? item.count ?? 0,
      description: item.description || '',
    }
  }

  return {
    key: `kpi-${index}`,
    title: `Indicador ${index + 1}`,
    value: item ?? 0,
    description: '',
  }
}

function KpiPanel({ kpis = [] }) {
  const items = ensureArray(kpis).map(normalizeKpiItem)

  if (items.length === 0) {
    return (
      <section className="portal-card">
        <header className="portal-card__header">
          <div className="portal-card__heading">
            <h3 className="portal-card__title">Indicadores</h3>
            <p className="portal-card__subtitle">
              No hay indicadores disponibles para el filtro activo.
            </p>
          </div>
        </header>
      </section>
    )
  }

  return (
    <section className="kpi-grid">
      {items.map((item) => (
        <article key={item.key} className="kpi-card">
          <div className="kpi-card__header">
            <h3 className="kpi-card__title">{item.title}</h3>
            <strong className="kpi-card__value">
              {formatNumber(item.value)}
            </strong>
          </div>

          {item.description ? (
            <p className="kpi-card__description">{item.description}</p>
          ) : null}
        </article>
      ))}
    </section>
  )
}

function JsonPanel({ title, subtitle = '', data = [] }) {
  const rows = ensureArray(data)

  return (
    <section className="portal-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">{title}</h3>
          {subtitle ? (
            <p className="portal-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <div className="portal-card__body">
        {rows.length === 0 ? (
          <div className="tickets-empty-state">
            No hay registros disponibles.
          </div>
        ) : (
          <pre className="operaciones-debug-json">
            {JSON.stringify(rows, null, 2)}
          </pre>
        )}
      </div>
    </section>
  )
}

export default function OperacionesDashboard() {
  const [dashboard, setDashboard] = useState(() => createEmptyDashboard())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchDashboard() {
      setLoading(true)
      setError('')

      try {
        const data = await getOperacionesDashboard()
        const normalized = normalizeOperacionesDashboard(data)

        if (isMounted) {
          setDashboard(normalized)
        }
      } catch (err) {
        console.error('Error cargando dashboard de Operaciones:', err)

        if (isMounted) {
          setError('No se pudo cargar el dashboard de Operaciones.')
          setDashboard(createEmptyDashboard())
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const dashboardTables = dashboard?.tables
  const dashboardMeta = dashboard?.meta
  const tables = useMemo(() => dashboardTables || {}, [dashboardTables])
  const meta = useMemo(() => dashboardMeta || {}, [dashboardMeta])

  const resumen = useMemo(() => {
    const detalleTecnico = ensureArray(tables.detalleTecnico)
    const detalleOrdenes = ensureArray(tables.detalleOrdenes)
    const detalleSmartOLT = ensureArray(tables.detalleSmartOLT)

    return {
      detalleTecnico: detalleTecnico.length,
      detalleOrdenes: detalleOrdenes.length,
      detalleSmartOLT: detalleSmartOLT.length,
      generatedAt: meta.generatedAt || '',
    }
  }, [tables, meta])

  if (loading) {
    return <div className="tickets-empty-state">Cargando dashboard...</div>
  }

  if (error) {
    return <div className="tickets-empty-state">{error}</div>
  }

  return (
    <section className="module-page">
      <header className="module-page__header">
        <h1 className="page-title">Dashboard Operaciones</h1>
        <p className="page-subtitle">
          Vista consolidada de SmartOLT y órdenes de servicio desde TotalNet.
        </p>
      </header>

      <div className="module-page__content">
        <KpiPanel kpis={dashboard.kpis} />

        <section className="portal-card">
          <header className="portal-card__header">
            <div className="portal-card__heading">
              <h3 className="portal-card__title">Resumen de carga</h3>
              <p className="portal-card__subtitle">
                Registros cargados por cada fuente operacional.
              </p>
            </div>
          </header>

          <div className="portal-card__body">
            <div className="kpi-grid">
              <article className="kpi-card">
                <h3 className="kpi-card__title">Detalle técnico</h3>
                <strong className="kpi-card__value">
                  {formatNumber(resumen.detalleTecnico)}
                </strong>
              </article>

              <article className="kpi-card">
                <h3 className="kpi-card__title">Órdenes TotalNet</h3>
                <strong className="kpi-card__value">
                  {formatNumber(resumen.detalleOrdenes)}
                </strong>
              </article>

              <article className="kpi-card">
                <h3 className="kpi-card__title">Registros SmartOLT</h3>
                <strong className="kpi-card__value">
                  {formatNumber(resumen.detalleSmartOLT)}
                </strong>
              </article>
            </div>

            {resumen.generatedAt ? (
              <p className="portal-card__subtitle">
                Generado: {resumen.generatedAt}
              </p>
            ) : null}
          </div>
        </section>

        <JsonPanel
          title="Detalle Técnico"
          subtitle="Filas técnicas consolidadas por el backend."
          data={tables.detalleTecnico}
        />

        <JsonPanel
          title="Órdenes de Servicio"
          subtitle="Órdenes operativas consultadas desde TotalNet."
          data={tables.detalleOrdenes}
        />

        <JsonPanel
          title="SmartOLT"
          subtitle="Registros técnicos consultados desde SmartOLT."
          data={tables.detalleSmartOLT}
        />
      </div>
    </section>
  )
}
