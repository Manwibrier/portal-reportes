import ClientesKpiSection from './ClientesKpiSection'
import ClientesStatusStackBar from './ClientesStatusStackBar'
import {
  buildClientesKpiItems,
  CLIENTES_CHART_META,
  CLIENTES_SECTION_META,
  createEmptyBucket,
  createEmptyProductSummary,
  createEmptyStatusSummary,
} from '../constants'

function normalizeDashboard(dashboard = {}) {
  return {
    internet: dashboard?.internet || createEmptyBucket(),
    television: dashboard?.television || createEmptyBucket(),
    segmentacionEstatus: dashboard?.segmentacionEstatus || createEmptyStatusSummary(),
    segmentacionProducto: dashboard?.segmentacionProducto || createEmptyProductSummary(),
  }
}

function buildProductSegments(summary = {}) {
  return [
    {
      key: 'producto-internet',
      name: 'Clientes Internet',
      value: Number(summary?.internet || 0),
      colorToken: 'primary',
    },
    {
      key: 'producto-internet-tv',
      name: 'Clientes Internet + TV',
      value: Number(summary?.internetTv || 0),
      colorToken: 'secondary',
    },
  ].filter((item) => Number.isFinite(item.value) && item.value > 0)
}

function ClientesResumenGeneralHero({ dashboard = {}, loading = false }) {
  const normalized = normalizeDashboard(dashboard)

  const internetItems = buildClientesKpiItems('internet', normalized.internet)
  const televisionItems = buildClientesKpiItems('television', normalized.television)
  const productoSegments = buildProductSegments(normalized.segmentacionProducto)

  return (
    <section className="clientes-resumen-general-hero">
      {loading ? (
        <div className="portal-feedback portal-feedback--loading">
          Cargando resumen general...
        </div>
      ) : null}

      <ClientesKpiSection
        title={`Total Norte · ${CLIENTES_SECTION_META.internet.title}`}
        subtitle={CLIENTES_SECTION_META.internet.subtitle}
        items={internetItems}
      />

      <section className="portal-card clientes-resumen-general-hero__charts">
        <header className="portal-card__header">
          <div className="portal-card__heading">
            <h3 className="portal-card__title">Fotografía ejecutiva</h3>
            <p className="portal-card__subtitle">
              Consolidado operativo para lectura rápida del negocio.
            </p>
          </div>
        </header>

        <div className="portal-card__body clientes-resumen-general-hero__charts-body">
          <ClientesStatusStackBar
            title={CLIENTES_CHART_META.estatus.title}
            subtitle={CLIENTES_CHART_META.estatus.subtitle}
            segment={normalized.segmentacionEstatus}
          />

          <ClientesStatusStackBar
            title={CLIENTES_CHART_META.producto.title}
            subtitle={CLIENTES_CHART_META.producto.subtitle}
            segment={productoSegments}
          />
        </div>
      </section>

      <ClientesKpiSection
        title={`Total Norte · ${CLIENTES_SECTION_META.television.title}`}
        subtitle={CLIENTES_SECTION_META.television.subtitle}
        items={televisionItems}
      />
    </section>
  )
}

export default ClientesResumenGeneralHero
