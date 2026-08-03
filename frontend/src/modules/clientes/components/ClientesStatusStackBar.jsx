import { formatMetricValue, resolveChartColor } from '../../../components/charts/ChartWrapper'

const DEFAULT_METRIC = {
  format: 'number',
  decimals: 0,
}

const STATUS_SEGMENT_META = [
  {
    key: 'activos',
    name: 'Activos',
    colorToken: 'success',
  },
  {
    key: 'porInstalar',
    name: 'Por Instalar',
    colorToken: 'tertiary',
  },
  {
    key: 'suspendidos',
    name: 'Suspendidos',
    colorToken: 'warning',
  },
  {
    key: 'cortados',
    name: 'Cortados',
    colorToken: 'danger',
  },
]

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function normalizeSegments(segment = {}) {
  if (Array.isArray(segment)) {
    return segment
      .map((item, index) => ({
        key: String(item?.key || `segment-${index}`).trim() || `segment-${index}`,
        name: String(item?.name || item?.label || 'Segmento').trim() || 'Segmento',
        value: toSafeNumber(item?.value),
        colorToken: String(item?.colorToken || item?.color || 'primary').trim() || 'primary',
      }))
      .filter((item) => item.value > 0)
  }

  return STATUS_SEGMENT_META.map((item) => ({
    ...item,
    value: toSafeNumber(segment?.[item.key]),
  })).filter((item) => item.value > 0)
}

function getTotal(segments = []) {
  return segments.reduce((acc, item) => acc + toSafeNumber(item.value), 0)
}

function ClientesStatusStackBar({
  title = '',
  subtitle = '',
  segment = {},
  metric = DEFAULT_METRIC,
  compact = false,
  showLegend,
  emptyMessage = 'Sin datos para mostrar.',
}) {
  const segments = normalizeSegments(segment)
  const total = getTotal(segments)
  const shouldShowLegend = typeof showLegend === 'boolean' ? showLegend : !compact
  const wrapperClassName = compact
    ? 'clientes-status-stack clientes-status-stack--compact'
    : 'clientes-status-stack'

  if (segments.length === 0 || total <= 0) {
    return (
      <section className={wrapperClassName}>
        {title ? <h4 className="clientes-status-stack__title">{title}</h4> : null}
        {subtitle ? (
          <p className="clientes-status-stack__subtitle">{subtitle}</p>
        ) : null}
        <div className="tickets-empty-state">{emptyMessage}</div>
      </section>
    )
  }

  return (
    <section className={wrapperClassName}>
      {title ? <h4 className="clientes-status-stack__title">{title}</h4> : null}
      {subtitle ? (
        <p className="clientes-status-stack__subtitle">{subtitle}</p>
      ) : null}

      <div className="clientes-status-stack__bar" aria-label={title || 'Distribución de estatus'}>
        {segments.map((item) => {
          const width = `${Math.max((item.value / total) * 100, compact ? 8 : 4)}%`

          return (
            <div
              key={item.key}
              className="clientes-status-stack__segment"
              style={{
                width,
                backgroundColor: resolveChartColor(item.colorToken),
              }}
              title={`${item.name}: ${formatMetricValue(item.value, metric)}`}
            />
          )
        })}
      </div>

      {shouldShowLegend ? (
        <div className="clientes-status-stack__legend">
          {segments.map((item) => (
            <div key={item.key} className="clientes-status-stack__legend-item">
              <span
                className="clientes-status-stack__legend-swatch"
                style={{ backgroundColor: resolveChartColor(item.colorToken) }}
              />
              <span className="clientes-status-stack__legend-label">{item.name}</span>
              <strong className="clientes-status-stack__legend-value">
                {formatMetricValue(item.value, metric)}
              </strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default ClientesStatusStackBar
