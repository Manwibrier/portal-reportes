import { ResponsiveContainer, Tooltip } from 'recharts'

const CHART_COLOR_TOKENS = {
  primary: 'var(--norte-blue)',
  secondary: 'var(--norte-orange)',
  tertiary: 'var(--norte-cyan)',
  success: 'var(--success-color)',
  warning: 'var(--warning-color)',
  danger: 'var(--danger-color)',
  neutral: 'var(--text-secondary)',
}

function normalizeMetric(metric = {}) {
  return {
    format: metric?.format || 'number',
    decimals: Number.isFinite(Number(metric?.decimals))
      ? Number(metric.decimals)
      : 0,
    prefix: metric?.prefix || '',
    suffix: metric?.suffix || '',
    locale: metric?.locale || 'es-VE',
  }
}

export function resolveChartColor(token = 'primary') {
  return CHART_COLOR_TOKENS[token] || token || CHART_COLOR_TOKENS.primary
}

export function formatMetricValue(value, metric = {}) {
  const resolvedMetric = normalizeMetric(metric)

  if (value === undefined || value === null || value === '') {
    return resolvedMetric.format === 'text' ? '' : '0'
  }

  if (resolvedMetric.format === 'text') {
    return String(value)
  }

  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return String(value)
  }

  const formattedNumber = new Intl.NumberFormat(resolvedMetric.locale, {
    minimumFractionDigits: resolvedMetric.decimals,
    maximumFractionDigits: resolvedMetric.decimals,
  }).format(numericValue)

  if (resolvedMetric.format === 'percent') {
    return `${resolvedMetric.prefix}${formattedNumber}%${resolvedMetric.suffix}`
  }

  if (resolvedMetric.format === 'currency') {
    return `${resolvedMetric.prefix}${formattedNumber}${resolvedMetric.suffix}`
  }

  return `${resolvedMetric.prefix}${formattedNumber}${resolvedMetric.suffix}`
}

function PortalTooltip({
  active,
  payload,
  label,
  metric,
  valueLabel = 'Valor',
}) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null

  const title =
    label || payload[0]?.name || payload[0]?.payload?.name || 'Detalle'

  return (
    <div className="portal-chart-tooltip">
      <div className="portal-chart-tooltip__title">{title}</div>

      <div className="portal-chart-tooltip__items">
        {payload.map((entry) => {
          const entryLabel = entry?.name || valueLabel
          const entryColor =
            entry?.color ||
            entry?.fill ||
            entry?.payload?.color ||
            resolveChartColor('primary')

          return (
            <div
              key={`${entry?.dataKey || entryLabel}-${entry?.value}`}
              className="portal-chart-tooltip__row"
            >
              <span className="portal-chart-tooltip__label">
                <span
                  className="portal-chart-tooltip__swatch"
                  style={{ backgroundColor: entryColor }}
                />
                <span>{entryLabel}</span>
              </span>

              <strong>{formatMetricValue(entry?.value, metric)}</strong>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartWrapper({
  title,
  subtitle = '',
  height = 340,
  data = [],
  metric = { format: 'number', decimals: 0 },
  valueLabel = 'Valor',
  actions = null,
  emptyMessage = 'No hay información disponible.',
  children,
}) {
  const resolvedMetric = normalizeMetric(metric)
  const safeData = Array.isArray(data) ? data : []
  const hasData = safeData.length > 0
  const canRenderChart = typeof children === 'function'

  return (
    <section className="portal-card chart-card">
      <header className="portal-card__header chart-card__header">
        <div className="portal-card__header-row">
          <div className="portal-card__heading">
            <h3 className="portal-card__title chart-card__title">{title}</h3>
            {subtitle ? (
              <p className="portal-card__subtitle">{subtitle}</p>
            ) : null}
          </div>

          {actions ? (
            <div className="portal-card__actions">{actions}</div>
          ) : null}
        </div>
      </header>

      <div className="portal-card__body chart-card__body">
        {!hasData || !canRenderChart ? (
          <div className="tickets-empty-state">{emptyMessage}</div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {children({
              data: safeData,
              colors: CHART_COLOR_TOKENS,
              margin: { top: 8, right: 44, bottom: 8, left: 12 },
              gridProps: {
                vertical: false,
                strokeDasharray: '3 3',
                stroke: 'var(--portal-chart-grid)',
              },
              xAxisProps: {
                tick: {
                  fontSize: 12,
                  fill: 'var(--portal-axis-text)',
                },
                axisLine: { stroke: 'var(--portal-axis-stroke)' },
                tickLine: { stroke: 'var(--portal-axis-stroke)' },
                allowDecimals: false,
              },
              yAxisProps: {
                tick: {
                  fontSize: 12,
                  fill: 'var(--portal-label-text)',
                },
                axisLine: { stroke: 'var(--portal-axis-stroke)' },
                tickLine: { stroke: 'var(--portal-axis-stroke)' },
                allowDecimals: false,
              },
              legendProps: {
                verticalAlign: 'bottom',
                align: 'center',
                iconType: 'circle',
              },
              tooltip: (
                <Tooltip
                  content={
                    <PortalTooltip
                      metric={resolvedMetric}
                      valueLabel={valueLabel}
                    />
                  }
                />
              ),
              formatValue: (value, overrideMetric) =>
                formatMetricValue(value, overrideMetric || resolvedMetric),
              resolveColor: resolveChartColor,
            })}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

export default ChartWrapper