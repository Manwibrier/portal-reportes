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

function truncateLabel(value = '', max = 26) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  return data
    .map((item) => ({
      label: normalizeText(item?.label ?? item?.name ?? item?.franquicia ?? item?.servicio),
      cantidad: normalizeNumber(item?.cantidad ?? item?.value ?? item?.total),
      value: normalizeNumber(item?.value ?? item?.cantidad ?? item?.total),
      total: normalizeNumber(item?.total ?? item?.value ?? item?.cantidad),
    }))
    .filter((item) => item.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)
}

function GerenciaDistributionChart({
  data = [],
  title = 'Distribución',
  subtitle = '',
  metric = { format: 'number', decimals: 0 },
  valueLabel = 'Valor',
  colorToken = 'primary',
  emptyMessage = 'No hay información disponible para esta visualización.',
}) {
  const chartData = normalizeData(data)
  const chartHeight = Math.max(320, chartData.length * 34)

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      data={chartData}
      height={chartHeight}
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
          layout="vertical"
          margin={{ ...margin, right: 28, left: 8 }}
          barCategoryGap={10}
          barSize={18}
        >
          <CartesianGrid {...gridProps} />

          <XAxis
            {...xAxisProps}
            type="number"
            tickFormatter={(value) => formatValue(value)}
          />

          <YAxis
            {...yAxisProps}
            type="category"
            dataKey="label"
            width={220}
            tickFormatter={(value) => truncateLabel(String(value), 26)}
          />

          {tooltip}

          <Bar dataKey="cantidad" radius={[0, 9, 9, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`${entry.label}-${index}`}
                fill={resolveColor(colorToken)}
              />
            ))}

            <LabelList
              dataKey="cantidad"
              position="right"
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

export default GerenciaDistributionChart
