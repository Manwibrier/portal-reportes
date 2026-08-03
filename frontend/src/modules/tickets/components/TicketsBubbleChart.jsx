import {
  CartesianGrid,
  Cell,
  LabelList,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
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

function getBubbleColorToken(item = {}) {
  if (item?.colorToken) return item.colorToken

  const sla = normalizeNumber(item?.y ?? item?.sla ?? item?.cumplimiento, 0)

  if (sla >= 90) return 'success'
  if (sla >= 70) return 'warning'
  return 'danger'
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data
    .map((item, index) => ({
      id: normalizeText(item?.id, `bubble-point-${index}`),
      name: normalizeText(
        item?.name ?? item?.label ?? item?.departamento,
        'SIN DATO',
      ),
      x: normalizeNumber(item?.x ?? item?.recibidos ?? item?.entradas, 0),
      y: normalizeNumber(
        item?.y ?? item?.sla ?? item?.cumplimiento ?? item?.porcentaje,
        0,
      ),
      z: normalizeNumber(item?.z ?? item?.cerrados ?? item?.salidas, 0),
      colorToken: getBubbleColorToken(item),
    }))
    .filter((item) => item.x > 0 || item.y > 0 || item.z > 0)
}

function createBubbleLabelRenderer() {
  return function renderBubbleLabel(props) {
    const { x, y, value, index, data } = props
    const point = data?.[index]

    if (!point) return null
    if ((point.x || 0) < 20 && (point.z || 0) < 10) return null

    return (
      <text
        x={x}
        y={y - 12}
        textAnchor="middle"
        fontSize={12}
        fill="var(--portal-label-text)"
        fontWeight={600}
      >
        {value}
      </text>
    )
  }
}

function TicketsBubbleChart({
  data = [],
  title = 'Tickets vs Cumplimiento SLA',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Valor',
  xLabel = 'Tickets recibidos',
  yLabel = '% Cumplimiento SLA',
  zLabel = 'Tickets cerrados',
  emptyMessage = 'No hay datos disponibles para esta visualización.',
}) {
  const chartData = normalizeData(data)

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      data={chartData}
      height={360}
      metric={metric}
      valueLabel={valueLabel}
      emptyMessage={emptyMessage}
    >
      {({
        data,
        margin,
        gridProps,
        xAxisProps,
        yAxisProps,
        tooltip,
        resolveColor,
        formatValue,
      }) => (
        <ScatterChart
          margin={{ ...margin, top: 20, right: 20, bottom: 20, left: 10 }}
        >
          <CartesianGrid {...gridProps} />

          <XAxis
            {...xAxisProps}
            type="number"
            dataKey="x"
            name={xLabel}
            domain={[0, 'dataMax + 20']}
          />

          <YAxis
            {...yAxisProps}
            type="number"
            dataKey="y"
            name={yLabel}
            domain={[0, 100]}
            tickCount={6}
            tickFormatter={(value) =>
              metric?.format === 'percent'
                ? `${Number(value).toFixed(0)}%`
                : formatValue(value)
            }
          />

          <ZAxis
            type="number"
            dataKey="z"
            range={[80, 900]}
            name={zLabel}
          />

          {tooltip}

          <Scatter data={data}>
            {data.map((entry, index) => (
              <Cell
                key={entry.id || `bubble-cell-${index}`}
                fill={resolveColor(entry.colorToken || 'primary')}
              />
            ))}

            <LabelList
              dataKey="name"
              content={createBubbleLabelRenderer()}
            />
          </Scatter>
        </ScatterChart>
      )}
    </ChartWrapper>
  )
}

export default TicketsBubbleChart
