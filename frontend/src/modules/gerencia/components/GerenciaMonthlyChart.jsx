import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'
import ChartWrapper from '../../../components/charts/ChartWrapper'

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
    .map((item) => ({
      periodo: normalizeText(item?.periodo ?? item?.label ?? item?.mes),
      label: normalizeText(item?.label ?? item?.periodo ?? item?.mes),
      total: normalizeNumber(item?.total ?? item?.cantidad ?? item?.value),
      cantidad: normalizeNumber(item?.cantidad ?? item?.total ?? item?.value),
      value: normalizeNumber(item?.value ?? item?.total ?? item?.cantidad),
      anio: normalizeNumber(item?.anio),
      mes_num: normalizeNumber(item?.mes_num),
    }))
    .filter((item) => item.total >= 0)
    .sort((left, right) => {
      if (left.anio !== right.anio) return left.anio - right.anio
      if (left.mes_num !== right.mes_num) return left.mes_num - right.mes_num
      return left.periodo.localeCompare(right.periodo, 'es', {
        sensitivity: 'base',
      })
    })
}

function GerenciaMonthlyChart({
  data = [],
  title = 'Serie mensual',
  subtitle = '',
  metric = { format: 'number', decimals: 0 },
  valueLabel = 'Valor',
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
        <BarChart data={data} margin={{ ...margin, bottom: 16 }} barCategoryGap="18%">
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

          <Bar dataKey="total" radius={[9, 9, 0, 0]} maxBarSize={84}>
            {data.map((entry, index) => (
              <Cell
                key={`${entry.periodo}-${index}`}
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

export default GerenciaMonthlyChart
