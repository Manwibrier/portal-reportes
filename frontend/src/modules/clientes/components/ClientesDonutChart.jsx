import { Cell, Pie, PieChart } from 'recharts'
import ChartWrapper from '../../../components/charts/ChartWrapper'

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
      id: normalizeText(item?.id ?? item?.key, `clientes-donut-${index}`),
      name: normalizeText(item?.name ?? item?.label, 'SIN DATO'),
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
    'success',
    'danger',
    'tertiary',
    'warning',
    'primary',
    'secondary',
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
    if (!outerRadius || !percent || percent <= 0) return null

    const RADIAN = Math.PI / 180
    const radius = outerRadius + 20
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

function ClientesDonutChart({
  data = [],
  title = 'Distribución',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Clientes',
  showTotal = true,
  innerRadius = 66,
  outerRadius = 102,
  emptyMessage = 'No hay información disponible para esta visualización.',
}) {
  const chartData = normalizeData(data)
  const total = chartData.reduce((acc, item) => acc + item.value, 0)

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      data={chartData}
      height={320}
      metric={metric}
      valueLabel={valueLabel}
      emptyMessage={emptyMessage}
    >
      {({ data, tooltip, resolveColor, formatValue }) => (
        <PieChart>
          {tooltip}

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
            labelLine
            label={renderExternalLabel(formatValue)}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.id || `clientes-donut-cell-${index}`}
                fill={resolveColor(
                  entry.colorToken || buildFallbackColorToken(index),
                )}
              />
            ))}
          </Pie>

          {showTotal ? (
            <>
              <text
                x="50%"
                y="47%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={500}
                fill="var(--text-secondary)"
              >
                Total
              </text>

              <text
                x="50%"
                y="53%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={18}
                fontWeight={700}
                fill="var(--norte-blue-deep)"
              >
                {formatValue(total)}
              </text>
            </>
          ) : null}
        </PieChart>
      )}
    </ChartWrapper>
  )
}

export default ClientesDonutChart