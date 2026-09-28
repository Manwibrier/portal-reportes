import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  XAxis,
  YAxis,
} from 'recharts'
import ChartWrapper from './ChartWrapper'

const DEFAULT_METRIC = {
  format: 'number',
  decimals: 0,
}

const DEFAULT_SERIES = [
  {
    key: 'entradas',
    label: 'Entradas',
    type: 'bar',
    colorToken: 'secondary',
  },
  {
    key: 'cerrados',
    label: 'Cerrados',
    type: 'bar',
    colorToken: 'success',
  },
  {
    key: 'backlog',
    label: 'Backlog',
    type: 'line',
    colorToken: 'primary',
  },
]

function normalizeText(value, fallback = 'SIN DATO') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function truncateLabel(value = '', max = 18) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function normalizeSeries(series = []) {
  if (!Array.isArray(series) || series.length === 0) {
    return DEFAULT_SERIES
  }

  return series
    .map((item) => ({
      key: normalizeText(item?.key, ''),
      label: normalizeText(item?.label ?? item?.title, ''),
      type: normalizeText(item?.type, '').toLowerCase(),
      colorToken: normalizeText(
        item?.colorToken ??
          item?.color_token ??
          item?.barColor ??
          (Array.isArray(item?.colorTokens) ? item.colorTokens[0] : ''),
        '',
      ),
    }))
    .filter((item) => item.key && (item.type === 'bar' || item.type === 'line'))
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data.map((item) => {
    const periodo = normalizeText(
      item?.periodo ?? item?.mes ?? item?.label,
      'SIN DATO',
    )

    return {
      periodo,
      label: periodo,
      entradas: normalizeNumber(item?.entradas, 0),
      cerrados: normalizeNumber(item?.cerrados, 0),
      backlog: normalizeNumber(item?.backlog, 0),
      anio: normalizeNumber(item?.anio, 0),
      mes_num: normalizeNumber(item?.mes_num, 0),
    }
  })
}

function renderSeries(series = [], resolveColor, formatValue) {
  return series.map((item) => {
    const color = resolveColor(item.colorToken || 'primary')

    if (item.type === 'line') {
      return (
        <Line
          key={item.key}
          type="monotone"
          dataKey={item.key}
          name={item.label}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      )
    }

    return (
      <Bar
        key={item.key}
        dataKey={item.key}
        name={item.label}
        fill={color}
        radius={[8, 8, 0, 0]}
        maxBarSize={56}
      >
        <LabelList
          dataKey={item.key}
          position="top"
          formatter={formatValue}
          style={{
            fontSize: 12,
            fontWeight: 600,
            fill: 'var(--portal-label-text)',
          }}
        />
      </Bar>
    )
  })
}

function TicketsBacklogChart({
  data = [],
  title = 'Backlog mensual',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Tickets',
  series = DEFAULT_SERIES,
  emptyMessage = 'No hay información disponible de backlog mensual.',
}) {
  const chartData = normalizeData(data)
  const normalizedSeries = normalizeSeries(series)

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
        legendProps,
        resolveColor,
        formatValue,
      }) => (
        <ComposedChart
          data={data}
          margin={{ ...margin, top: 12, right: 20, left: 0, bottom: 12 }}
          barCategoryGap="20%"
        >
          <CartesianGrid {...gridProps} />

          <XAxis
            {...xAxisProps}
            dataKey="periodo"
            tickFormatter={(value) => truncateLabel(value, 18)}
          />

          <YAxis
            {...yAxisProps}
            allowDecimals={false}
            tickFormatter={(value) =>
              metric?.format === 'percent'
                ? `${Number(value).toFixed(0)}%`
                : formatValue(value)
            }
          />

          {tooltip}

          <Legend {...legendProps} />

          {renderSeries(normalizedSeries, resolveColor, formatValue)}
        </ComposedChart>
      )}
    </ChartWrapper>
  )
}

export default TicketsBacklogChart
