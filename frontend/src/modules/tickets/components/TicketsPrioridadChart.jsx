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

function normalizePriorityName(value) {
  return normalizeText(value, 'SIN DATO').toUpperCase()
}

function getPriorityColorToken(name = '') {
  const priority = normalizePriorityName(name)

  if (priority.includes('ALTA') || priority.includes('URGENTE') || priority.includes('CRITICA') || priority.includes('CRÍTICA')) {
    return 'danger'
  }

  if (priority.includes('MEDIA') || priority.includes('NORMAL')) {
    return 'warning'
  }

  if (priority.includes('BAJA')) {
    return 'success'
  }

  return 'neutral'
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data
    .map((item, index) => ({
      id: normalizeText(item?.id, `priority-segment-${index}`),
      name: normalizePriorityName(
        item?.name ?? item?.label ?? item?.prioridad,
      ),
      label: normalizePriorityName(
        item?.label ?? item?.name ?? item?.prioridad,
      ),
      value: normalizeNumber(
        item?.value ?? item?.cantidad ?? item?.total,
        0,
      ),
      colorToken: normalizeText(
        item?.colorToken ??
          item?.color_token ??
          (Array.isArray(item?.colorTokens) ? item.colorTokens[0] : ''),
        '',
      ),
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value

      return left.name.localeCompare(right.name, 'es', {
        sensitivity: 'base',
      })
    })
}

function renderExternalLabel(formatValue) {
  return function prioridadExternalLabel({
    cx,
    cy,
    midAngle,
    outerRadius,
    name,
    value,
    percent,
  }) {
    if (!outerRadius || !percent || percent < 0.08) return null

    const RADIAN = Math.PI / 180
    const radius = outerRadius + 18
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="var(--portal-label-text)"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${name} (${formatValue(value)})`}
      </text>
    )
  }
}

function TicketsPrioridadChart({
  data = [],
  title = 'Distribución por prioridad',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Total tickets',
  showLegend = true,
  showExternalLabels = true,
  innerRadius = 58,
  outerRadius = 102,
  emptyMessage = 'No hay información disponible para prioridades.',
}) {
  const chartData = normalizeData(data)

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
                key={entry.id || `priority-cell-${index}`}
                fill={resolveColor(entry.colorToken || getPriorityColorToken(entry.name))}
              />
            ))}
          </Pie>
        </PieChart>
      )}
    </ChartWrapper>
  )
}

export default TicketsPrioridadChart
