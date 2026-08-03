import { Cell, Legend, Pie, PieChart } from 'recharts'
import ChartWrapper from './ChartWrapper'

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

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data
    .map((item, index) => ({
      id: normalizeText(item?.id, `donut-segment-${index}`),
      name: normalizeText(item?.name ?? item?.label, 'SIN DATO'),
      label: normalizeText(item?.label ?? item?.name, 'SIN DATO'),
      value: normalizeNumber(item?.value ?? item?.cantidad ?? item?.total, 0),
      colorToken: normalizeText(
        item?.colorToken ??
          item?.color_token ??
          item?.color ??
          (Array.isArray(item?.colorTokens) ? item.colorTokens[0] : ''),
        '',
      ),
    }))
    .filter((item) => item.value > 0)
}

function buildFallbackColorToken(index = 0) {
  const orderedTokens = [
    'primary',
    'secondary',
    'tertiary',
    'success',
    'warning',
    'danger',
    'neutral',
  ]

  return orderedTokens[index % orderedTokens.length]
}

function renderExternalLabel(formatValue) {
  return function donutExternalLabel({
    cx,
    cy,
    midAngle,
    outerRadius,
    name,
    value,
    percent,
  }) {
    if (!outerRadius || !percent || percent < 0.04) return null

    const RADIAN = Math.PI / 180
    const radius = outerRadius + 22
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const textAnchor = x > cx ? 'start' : 'end'

    return (
      <text
        x={x}
        y={y}
        fill="var(--portal-label-text)"
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${name}: ${formatValue(value)}`}
      </text>
    )
  }
}

function TicketsDonutChart({
  data = [],
  title = 'Distribución',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Total tickets',
  showLegend = true,
  showTotal = true,
  showExternalLabels = false,
  innerRadius = 68,
  outerRadius = 104,
  emptyMessage = 'No hay información disponible.',
}) {
  const chartData = normalizeData(data)
  const total = chartData.reduce((acc, item) => acc + item.value, 0)

  return (
    <ChartWrapper
      title={title}
      subtitle={
        subtitle || (showTotal ? `Total: ${new Intl.NumberFormat('es-VE').format(total)}` : '')
      }
      data={chartData}
      height={320}
      metric={metric}
      valueLabel={valueLabel}
      emptyMessage={emptyMessage}
    >
      {({ data, tooltip, legendProps, resolveColor, formatValue }) => (
        <PieChart>
          {tooltip}

          {showLegend ? <Legend {...legendProps} /> : null}

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="var(--portal-card-bg, #fff)"
            strokeWidth={2}
            labelLine={showExternalLabels}
            label={showExternalLabels ? renderExternalLabel(formatValue) : false}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.id || `donut-cell-${index}`}
                fill={resolveColor(entry.colorToken || buildFallbackColorToken(index))}
              />
            ))}
          </Pie>
        </PieChart>
      )}
    </ChartWrapper>
  )
}

export default TicketsDonutChart
