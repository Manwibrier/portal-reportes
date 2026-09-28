import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatMetricValue,
  resolveChartColor,
} from '../../../components/charts/ChartWrapper'

const DEFAULT_METRIC = {
  format: 'number',
  decimals: 0,
}

function normalizeText(value, fallback = 'SIN DATO') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function truncateLabel(value = '', max = 16) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data
    .map((item, index) => ({
      key: normalizeText(item?.key, `clientes-servicio-detalle-${index}`),
      servicio: normalizeText(
        item?.servicio ?? item?.servicioLabel,
        'SIN SERVICIO',
      ),
      servicioLabel: normalizeText(
        item?.servicioLabel ?? item?.servicio,
        'SIN SERVICIO',
      ),
      estatus: normalizeText(item?.estatus ?? item?.label, 'SIN DATO'),
      value: normalizeNumber(item?.value, 0),
      totalServicio: normalizeNumber(item?.totalServicio, 0),
      colorToken: normalizeText(item?.colorToken, 'primary'),
      groupIndex: normalizeNumber(item?.groupIndex, 0),
      orderIndex: normalizeNumber(item?.orderIndex, index),
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => {
      if (left.groupIndex !== right.groupIndex) {
        return left.groupIndex - right.groupIndex
      }

      if (left.orderIndex !== right.orderIndex) {
        return left.orderIndex - right.orderIndex
      }

      return left.servicio.localeCompare(right.servicio, 'es', {
        sensitivity: 'base',
      })
    })
}

function buildDisplayData(data = []) {
  const normalized = normalizeData(data)

  if (normalized.length === 0) {
    return {
      chartData: [],
      separatorKeys: [],
    }
  }

  const grouped = new Map()

  normalized.forEach((item) => {
    if (!grouped.has(item.groupIndex)) {
      grouped.set(item.groupIndex, [])
    }

    grouped.get(item.groupIndex).push(item)
  })

  const orderedGroups = Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, items]) => items)

  const chartData = []
  const separatorKeys = []

  orderedGroups.forEach((groupItems, groupPosition) => {
    const centerIndex = Math.floor((groupItems.length - 1) / 2)

    groupItems.forEach((item, itemIndex) => {
      chartData.push({
        ...item,
        serviceAxisLabel: itemIndex === centerIndex ? item.servicioLabel : '',
      })
    })

    if (groupPosition < orderedGroups.length - 1) {
      const groupLastItem = groupItems[groupItems.length - 1]

      if (groupLastItem?.key) {
        separatorKeys.push(groupLastItem.key)
      }
    }
  })

  return {
    chartData,
    separatorKeys,
  }
}

function PortalTooltip({
  active,
  payload,
  metric = DEFAULT_METRIC,
}) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null

  const point = payload[0]?.payload

  if (!point) return null

  return (
    <div className="portal-chart-tooltip">
      <div className="portal-chart-tooltip__title">{point.servicio}</div>

      <div className="portal-chart-tooltip__items">
        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">
            <span
              className="portal-chart-tooltip__swatch"
              style={{
                backgroundColor: resolveChartColor(point.colorToken || 'primary'),
              }}
            />
            <span>{point.estatus}</span>
          </span>

          <strong>{formatMetricValue(point.value, metric)}</strong>
        </div>
      </div>
    </div>
  )
}

function ClientesServiceStatusChart({
  data = [],
  title = 'Clientes por Tipo de Servicio',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Clientes',
  emptyMessage = 'No hay información disponible para esta visualización.',
}) {
  const resolvedMetric =
    metric && typeof metric === 'object' ? metric : DEFAULT_METRIC

  const { chartData, separatorKeys } = buildDisplayData(data)
  const hasData = chartData.length > 0

  function formatValue(value) {
    return formatMetricValue(value, resolvedMetric)
  }

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
        </div>
      </header>

      <div className="portal-card__body chart-card__body">
        {!hasData ? (
          <div className="tickets-empty-state">{emptyMessage}</div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 18, left: 8, bottom: 132 }}
              barCategoryGap="10%"
              barGap={2}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--portal-chart-grid)"
              />

              {separatorKeys.map((separatorKey) => (
                <ReferenceLine
                  key={separatorKey}
                  xAxisId="status-axis"
                  x={separatorKey}
                  stroke="var(--portal-axis-stroke)"
                  strokeDasharray="2 4"
                  strokeWidth={1}
                />
              ))}

              <XAxis
                xAxisId="status-axis"
                dataKey="key"
                interval={0}
                tickLine={false}
                axisLine={{ stroke: 'var(--portal-axis-stroke)' }}
                height={80}
                tickMargin={12}
                tick={({ x, y, index }) => {
                  const point = chartData[index]

                  if (!point) return null

                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        transform="rotate(-90)"
                        x={-8}
                        y={0}
                        textAnchor="end"
                        fill="var(--portal-axis-text)"
                        fontSize={10}
                        fontWeight={500}
                      >
                        {point.estatus}
                      </text>
                    </g>
                  )
                }}
              />

              <XAxis
                xAxisId="service-axis"
                dataKey="serviceAxisLabel"
                axisLine={{ stroke: 'var(--portal-axis-stroke)' }}
                tickLine={false}
                interval={0}
                height={52}
                tickMargin={26}
                tick={({ x, y, payload }) => {
                  const value = String(payload?.value || '').trim()

                  if (!value) return null

                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={12}
                        textAnchor="middle"
                        fill="var(--text-secondary)"
                        fontSize={12}
                        fontWeight={600}
                      >
                        {truncateLabel(value, 14)}
                      </text>
                    </g>
                  )
                }}
              />

              <YAxis
                tickLine={false}
                axisLine={{ stroke: 'var(--portal-axis-stroke)' }}
                tick={{
                  fontSize: 12,
                  fill: 'var(--portal-label-text)',
                }}
                tickFormatter={formatValue}
                allowDecimals={false}
              />

              <Tooltip
                content={<PortalTooltip metric={resolvedMetric} />}
              />

              <Bar
                xAxisId="status-axis"
                yAxisId={0}
                dataKey="value"
                name={valueLabel}
                radius={[0, 0, 0, 0]}
                maxBarSize={34}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={resolveChartColor(entry.colorToken || 'primary')}
                  />
                ))}

                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value) => {
                    const numericValue = Number(value)
                    return Number.isFinite(numericValue)
                      ? formatValue(numericValue)
                      : ''
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fill: 'var(--portal-label-text)',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

export default ClientesServiceStatusChart