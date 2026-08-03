// src/modules/operaciones/components/OperacionesStatusDonut.jsx

import { Cell, Pie, PieChart } from 'recharts'
import ChartWrapper from '../../../components/charts/ChartWrapper'
import {
  ensureArray,
  formatNumber,
  normalizeNumber,
  normalizeText,
} from '../utils'

const RADIAN = Math.PI / 180
const LABEL_COLOR = 'var(--norte-blue-deep, #003d91)'
const LABEL_LINE_COLOR = 'var(--norte-blue-soft, #2f80ed)'

function normalizeData(data = []) {
  return ensureArray(data)
    .map((item, index) => ({
      id: normalizeText(item?.id ?? item?.key, `operaciones-donut-${index}`),
      name: normalizeText(item?.name ?? item?.label, 'SIN DATO'),
      value: normalizeNumber(item?.value ?? item?.cantidad ?? item?.total),
      colorToken: normalizeText(item?.colorToken, 'neutral'),
    }))
    .filter((item) => item.value > 0)
}

function resolveBucketColor(name = '', resolveColor, colorToken = '') {
  if (colorToken) {
    return resolveColor(colorToken)
  }

  const normalized = String(name).toUpperCase()

  if (
    normalized.includes('ONLINE') ||
    normalized.includes('MUY BUENA') ||
    normalized.includes('VERY GOOD')
  ) {
    return resolveColor('success')
  }

  if (
    normalized.includes('WARNING') ||
    normalized.includes('ADVERTENCIA') ||
    normalized.includes('POWER')
  ) {
    return resolveColor('warning')
  }

  if (
    normalized.includes('OFFLINE') ||
    normalized.includes('LOS') ||
    normalized.includes('CRITICA') ||
    normalized.includes('CRÍTICA') ||
    normalized.includes('CRITICAL')
  ) {
    return resolveColor('danger')
  }

  return resolveColor('neutral')
}

function renderDonutLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  value,
}) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  const labelRadius = outerRadius + 18
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN)
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN)
  const textAnchor = x > cx ? 'start' : 'end'

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill={LABEL_COLOR}
      fontSize={11}
      fontWeight={700}
    >
      {`${name}: ${formatNumber(numericValue)}`}
    </text>
  )
}

function OperacionesStatusDonut({
  data = [],
  title = 'Distribución',
  subtitle = '',
  metric = { format: 'number', decimals: 0 },
  valueLabel = 'ONUs',
  emptyMessage = 'No hay información disponible.',
}) {
  const chartData = normalizeData(data)
  const total = chartData.reduce((acc, item) => acc + item.value, 0)

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      data={chartData}
      height={270}
      metric={metric}
      valueLabel={valueLabel}
      emptyMessage={emptyMessage}
    >
      {({ data, tooltip, resolveColor }) => (
        <PieChart
          margin={{
            top: 4,
            right: 58,
            bottom: 2,
            left: 58,
          }}
        >
          {tooltip}

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={86}
            stroke="var(--bg-card, #fff)"
            strokeWidth={3}
            paddingAngle={3}
            label={renderDonutLabel}
            labelLine={{
              stroke: LABEL_LINE_COLOR,
              strokeWidth: 1.35,
            }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={resolveBucketColor(
                  entry.name,
                  resolveColor,
                  entry.colorToken,
                )}
              />
            ))}
          </Pie>

          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="operaciones-donut__total"
          >
            {formatNumber(total)}
          </text>

          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="operaciones-donut__caption"
          >
            Total ONUs
          </text>
        </PieChart>
      )}
    </ChartWrapper>
  )
}

export default OperacionesStatusDonut