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

function renderServiceSummary(title, bucket) {
  return (
    <div className="clientes-franchise-row__service">
      <div className="clientes-franchise-row__service-head">
        <h5 className="clientes-franchise-row__service-title">{title}</h5>
      </div>

      <div className="clientes-franchise-row__metrics">
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

function ClientesFranchiseRow({ franchise = {} }) {
  const name = normalizeText(franchise?.nombre || franchise?.name || franchise?.franquicia)
  const internet = normalizeBucket(franchise?.internet)
  const television = normalizeBucket(franchise?.television)

  return (
    <article className="clientes-franchise-row">
      <div className="clientes-franchise-row__identity">
        <h4 className="clientes-franchise-row__title">{name}</h4>
      </div>

      <div className="clientes-franchise-row__content">
        {renderServiceSummary('Internet + Internet TV', internet)}
        {renderServiceSummary('Solo Televisión', television)}
      </div>
    </article>
  )
}

export default ClientesFranchiseRow
