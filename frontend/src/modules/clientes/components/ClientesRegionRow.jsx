import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ClientesFranchiseList from './ClientesFranchiseList'
import ClientesMetricCardCompact from './ClientesMetricCardCompact'
import ClientesStatusStackBar from './ClientesStatusStackBar'

function normalizeText(value, fallback = 'SIN DATO') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function normalizeBucket(bucket = {}) {
  return {
    total: toSafeNumber(bucket?.total),
    activos: toSafeNumber(bucket?.activos),
    porInstalar: toSafeNumber(bucket?.porInstalar),
    suspendidos: toSafeNumber(bucket?.suspendidos),
    cortados: toSafeNumber(bucket?.cortados),
  }
}

function normalizeFranchises(franquicias = []) {
  return Array.isArray(franquicias) ? franquicias.filter(Boolean) : []
}

function renderServiceBlock(title, bucket) {
  return (
    <div className="clientes-region-row__service-block">
      <div className="clientes-region-row__service-head">
        <h5 className="clientes-region-row__service-title">{title}</h5>
      </div>

      <div className="clientes-region-row__metrics-grid">
        <ClientesMetricCardCompact label="Total" value={bucket.total} />
        <ClientesMetricCardCompact label="Activos" value={bucket.activos} tone="success" />
        <ClientesMetricCardCompact
          label="Por Instalar"
          value={bucket.porInstalar}
          tone="info"
        />
        <ClientesMetricCardCompact
          label="Suspendidos"
          value={bucket.suspendidos}
          tone="warning"
        />
        <ClientesMetricCardCompact label="Cortados" value={bucket.cortados} tone="danger" />
      </div>

      <ClientesStatusStackBar compact segment={bucket} showLegend={false} />
    </div>
  )
}

function ClientesRegionRow({
  row = {},
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const title = normalizeText(row?.title || row?.nombre || row?.name)
  const internet = normalizeBucket(row?.internet || row?.summary?.internet)
  const television = normalizeBucket(row?.television || row?.summary?.television)
const franquicias = normalizeFranchises(
  row?.franquicias || row?.summary?.franquicias,
)

  return (
    <article className="clientes-region-row portal-card">
      <header className="portal-card__header clientes-region-row__header">
        <div className="portal-card__heading clientes-region-row__heading">
          <h3 className="portal-card__title clientes-region-row__title">{title}</h3>
          <p className="portal-card__subtitle clientes-region-row__subtitle">
            {franquicias.length > 0
              ? `${franquicias.length} franquicia${franquicias.length === 1 ? '' : 's'} disponible${franquicias.length === 1 ? '' : 's'}.`
              : 'Sin detalle de franquicias disponible.'}
          </p>
        </div>

        <button
          type="button"
          className="portal-filter-action portal-filter-action--secondary portal-filter-action--compact"
          onClick={() => setExpanded((currentState) => !currentState)}
          disabled={franquicias.length === 0}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{expanded ? 'Ocultar franquicias' : 'Ver franquicias'}</span>
        </button>
      </header>

      <div className="portal-card__body clientes-region-row__body">
        <div className="clientes-region-row__summary-grid">
          {renderServiceBlock('Internet + Internet TV', internet)}
          {renderServiceBlock('Solo Televisión', television)}
        </div>

        {expanded ? (
          <div className="clientes-region-row__franchises">
            <ClientesFranchiseList items={franquicias} />
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default ClientesRegionRow
