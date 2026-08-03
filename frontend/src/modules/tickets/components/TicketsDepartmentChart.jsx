import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'
import ChartWrapper, { resolveChartColor } from './ChartWrapper'

function normalizeText(value, fallback = 'SIN DATO') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function truncateLabel(value = '', max = 30) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data
    .map((item) => ({
      departamento: normalizeText(
        item?.departamento ?? item?.name ?? item?.label,
        'SIN DATO',
      ),
      cantidad: normalizeNumber(item?.cantidad ?? item?.value ?? 0, 0),
    }))
    .filter((item) => item.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)
}

function resolveSeriesToken(seriesColorIndex = 0) {
  const tokens = [
    'primary',
    'secondary',
    'tertiary',
    'success',
    'warning',
    'danger',
    'neutral',
  ]

  const safeIndex = Number.isFinite(Number(seriesColorIndex))
    ? Math.abs(Math.trunc(Number(seriesColorIndex)))
    : 0

  return tokens[safeIndex % tokens.length]
}

function TicketsDepartmentChart({
  data = [],
  title = 'Tickets por departamento',
  subtitle = '',
  metric = { format: 'number', decimals: 0 },
  seriesColorIndex = 0,
  valueLabel,
  barColor = '',
  emptyMessage = 'No hay información disponible para esta visualización.',
}) {
  const chartData = normalizeData(data)
  const chartHeight = Math.max(340, chartData.length * 36)
  const resolvedBarColor = resolveChartColor(
    barColor || resolveSeriesToken(seriesColorIndex),
  )

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      data={chartData}
      height={chartHeight}
      metric={metric}
      valueLabel={
        valueLabel ||
        (metric?.format === 'percent' ? 'Cumplimiento' : 'Total tickets')
      }
      emptyMessage={emptyMessage}
    >
      {({
        data,
        margin,
        gridProps,
        xAxisProps,
        yAxisProps,
        tooltip,
        formatValue,
      }) => (
        <BarChart
          data={data}
          layout="vertical"
          margin={{ ...margin, left: 12, right: 52 }}
          barCategoryGap={10}
          barSize={18}
        >
          <CartesianGrid {...gridProps} />

          <XAxis
            {...xAxisProps}
            type="number"
            tickFormatter={(value) =>
              metric?.format === 'percent'
                ? `${Number(value).toFixed(0)}%`
                : formatValue(value)
            }
          />

          <YAxis
            {...yAxisProps}
            type="category"
            dataKey="departamento"
            width={210}
            tickMargin={8}
            tickFormatter={(value) => truncateLabel(String(value), 30)}
          />

          {tooltip}

          <Bar
            dataKey="cantidad"
            radius={[0, 9, 9, 0]}
            fill={resolvedBarColor}
          >
            {data.map((_, index) => (
              <Cell
                key={`department-cell-${index}`}
                fill={resolvedBarColor}
              />
            ))}

            <LabelList
              dataKey="cantidad"
              position="right"
              formatter={formatValue}
              offset={8}
              style={{
                fontSize: 12,
                fontWeight: 600,
                fill: 'var(--portal-label-text)',
              }}
            />
          </Bar>
        </BarChart>
      )}
    </ChartWrapper>
  )
}

export default TicketsDepartmentChart
