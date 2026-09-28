import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
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

function truncateLabel(value = '', max = 18) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data
    .map((item) => {
      const periodo = normalizeText(
        item?.periodo ?? item?.label ?? item?.mes,
        'SIN DATO',
      )

      const total = normalizeNumber(
        item?.total ?? item?.cantidad ?? item?.value,
        0,
      )

      return {
        periodo,
        label: periodo,
        total,
        cantidad: total,
        value: total,
        sortMonth: normalizeNumber(item?.mes_num, 0),
        sortYear: normalizeNumber(item?.anio, 0),
      }
    })
    .filter((item) => item.total >= 0)
    .sort((left, right) => {
      if (left.sortYear !== right.sortYear) return left.sortYear - right.sortYear
      if (left.sortMonth !== right.sortMonth) return left.sortMonth - right.sortMonth
      return left.periodo.localeCompare(right.periodo, 'es', {
        sensitivity: 'base',
      })
    })
}

function TicketsMonthlyChart({
  data = [],
  title = 'Tickets por mes',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Total tickets',
  colorToken = 'primary',
  emptyMessage = 'No hay información disponible para esta visualización.',
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
        formatValue,
        resolveColor,
      }) => (
        <BarChart
          data={data}
          margin={{ ...margin, bottom: 16 }}
          barCategoryGap="18%"
        >
          <CartesianGrid {...gridProps} />

          <XAxis
            {...xAxisProps}
            dataKey="periodo"
            tickFormatter={(value) => truncateLabel(value, 18)}
          />

          <YAxis
            {...yAxisProps}
            tickFormatter={(value) =>
              metric?.format === 'percent'
                ? `${Number(value).toFixed(0)}%`
                : formatValue(value)
            }
          />

          {tooltip}

          <Bar
            dataKey="total"
            radius={[9, 9, 0, 0]}
            maxBarSize={84}
          >
            {data.map((_, index) => (
              <Cell
                key={`monthly-cell-${index}`}
                fill={resolveColor(colorToken)}
              />
            ))}

            <LabelList
              dataKey="total"
              position="top"
              formatter={formatValue}
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

export default TicketsMonthlyChart
