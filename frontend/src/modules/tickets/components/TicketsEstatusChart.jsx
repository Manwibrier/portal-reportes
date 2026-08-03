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

function normalizeStatusName(value) {
  const status = String(value ?? '').trim().toUpperCase()

  if (status === 'APROBADO POR EL SUPERVISOR') return 'APROBADO'
  if (status === 'APROBADO POR SUPERVISOR') return 'APROBADO'
  if (status === 'POR APROBACIÓN DEL SUPERVISOR') return 'POR APROBAR'
  if (status === 'POR APROBACION DEL SUPERVISOR') return 'POR APROBAR'

  return status || 'SIN DATO'
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function truncateLabel(value = '', max = 20) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function getStatusColorToken(name = '') {
  const key = normalizeStatusName(name)

  if (
    key.includes('CERRADO') ||
    key.includes('RESUELTO') ||
    key.includes('FINALIZADO') ||
    key.includes('ACEPTADO')
  ) {
    return 'success'
  }

  if (
    key.includes('PROCESO') ||
    key.includes('PROGRESO') ||
    key.includes('ATENCION') ||
    key.includes('ATENCIÓN') ||
    key.includes('EN ESPERA') ||
    key.includes('APROBADO')
  ) {
    return 'warning'
  }

  if (
    key.includes('ABIERTO') ||
    key.includes('PENDIENTE') ||
    key.includes('RECHAZADO') ||
    key.includes('CANCELADO') ||
    key.includes('POR APROBAR')
  ) {
    return 'danger'
  }

  return 'primary'
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) return []

  const grouped = data.reduce((acc, item) => {
    const name = normalizeStatusName(
      item?.name ?? item?.label ?? item?.departamento,
    )
    const value = normalizeNumber(
      item?.value ?? item?.cantidad ?? item?.total,
      0,
    )

    acc[name] = (acc[name] || 0) + value
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([name, value]) => ({
      name,
      label: name,
      value,
      cantidad: value,
      colorToken: getStatusColorToken(name),
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value

      return left.name.localeCompare(right.name, 'es', {
        sensitivity: 'base',
      })
    })
}

function TicketsEstatusChart({
  data = [],
  title = 'Tickets por estatus',
  subtitle = '',
  metric = DEFAULT_METRIC,
  valueLabel = 'Total tickets',
  emptyMessage = 'No hay información disponible para esta visualización.',
}) {
  const chartData = normalizeData(data)

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      data={chartData}
      height={380}
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
          margin={{ ...margin, bottom: 22 }}
          barCategoryGap="18%"
        >
          <CartesianGrid {...gridProps} />

          <XAxis
            {...xAxisProps}
            dataKey="name"
            tickFormatter={(value) => truncateLabel(value, 20)}
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
            dataKey="value"
            radius={[9, 9, 0, 0]}
            maxBarSize={72}
          >
            {data.map((entry, index) => (
              <Cell
                key={`status-cell-${entry.name}-${index}`}
                fill={resolveColor(entry.colorToken || 'primary')}
              />
            ))}

            <LabelList
              dataKey="value"
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

export default TicketsEstatusChart
