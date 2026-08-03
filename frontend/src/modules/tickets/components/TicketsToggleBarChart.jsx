import { useMemo, useState } from 'react'
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

function truncateLabel(value = '', max = 30) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function normalizeOptionData(
  data = [],
  {
    categoryKey = 'label',
    valueKey = 'value',
  } = {},
) {
  if (!Array.isArray(data)) return []

  return data
    .map((item) => {
      const label = normalizeText(
        item?.[categoryKey] ??
          item?.label ??
          item?.departamento ??
          item?.name,
        'SIN DATO',
      )

      const value = normalizeNumber(
        item?.[valueKey] ??
          item?.value ??
          item?.cantidad ??
          item?.total,
        0,
      )

      return {
        label,
        name: label,
        departamento: label,
        value,
        cantidad: value,
      }
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value

      return a.label.localeCompare(b.label, 'es', {
        sensitivity: 'base',
      })
    })
}

function normalizeOptions(options = []) {
  if (!Array.isArray(options)) return []

  return options
    .map((option, index) => ({
      key: normalizeText(option?.key, `toggle-option-${index}`),
      label: normalizeText(option?.label ?? option?.title, `Opción ${index + 1}`),
      title: normalizeText(option?.title ?? option?.label, 'Distribución'),
      subtitle: normalizeText(option?.subtitle, ''),
      metric:
        option?.metric && typeof option.metric === 'object'
          ? option.metric
          : DEFAULT_METRIC,
      valueLabel: normalizeText(option?.valueLabel, 'Total tickets'),
      categoryKey: normalizeText(option?.categoryKey, 'label'),
      valueKey: normalizeText(option?.valueKey, 'value'),
      colorToken: normalizeText(
        option?.colorToken ??
          option?.color_token ??
          (Array.isArray(option?.colorTokens) ? option.colorTokens[0] : '') ??
          option?.barColor,
        '',
      ),
      barColor: normalizeText(option?.barColor, ''),
      data: Array.isArray(option?.data) ? option.data : [],
    }))
    .filter((option) => option.key)
}

function getDefaultKey(options = [], requestedDefaultKey = '') {
  if (
    requestedDefaultKey &&
    options.some((option) => option.key === requestedDefaultKey)
  ) {
    return requestedDefaultKey
  }

  return options[0]?.key || ''
}

function resolveActiveOption(options = [], activeKey = '') {
  return options.find((option) => option.key === activeKey) || options[0] || null
}

function TicketsToggleBarChart({
  title = 'Distribución',
  subtitle = '',
  options = [],
  defaultKey = '',
  emptyMessage = 'No hay información disponible.',
}) {
  const normalizedOptions = useMemo(
    () => normalizeOptions(options),
    [options],
  )

  const [activeKey, setActiveKey] = useState(
    getDefaultKey(normalizedOptions, defaultKey),
  )

  const resolvedActiveKey = normalizedOptions.some(
    (option) => option.key === activeKey,
  )
    ? activeKey
    : getDefaultKey(normalizedOptions, defaultKey)

  const activeOption = useMemo(() => {
    return resolveActiveOption(normalizedOptions, resolvedActiveKey)
  }, [normalizedOptions, resolvedActiveKey])

  const chartData = useMemo(() => {
    return normalizeOptionData(activeOption?.data, {
      categoryKey: activeOption?.categoryKey,
      valueKey: activeOption?.valueKey,
    })
  }, [activeOption])

  const chartHeight = Math.max(320, chartData.length * 36)

  const actions =
    normalizedOptions.length > 0 ? (
      <div className="tickets-toggle__actions">
        {normalizedOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className={
              option.key === activeOption?.key
                ? 'tickets-toggle__button tickets-toggle__button--active'
                : 'tickets-toggle__button'
            }
            onClick={() => setActiveKey(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
    ) : null

  return (
    <ChartWrapper
      title={activeOption?.title || title}
      subtitle={activeOption?.subtitle || subtitle}
      data={chartData}
      height={chartHeight}
      metric={activeOption?.metric || DEFAULT_METRIC}
      valueLabel={activeOption?.valueLabel || 'Total tickets'}
      actions={actions}
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
            tickFormatter={(value) => truncateLabel(String(value), 30)}
          />

          {tooltip}

          <Bar dataKey="value" radius={[0, 9, 9, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`toggle-bar-cell-${entry.label}-${index}`}
                fill={resolveColor(
                  activeOption?.colorToken ||
                    activeOption?.barColor ||
                    'primary',
                )}
              />
            ))}

            <LabelList
              dataKey="value"
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

export default TicketsToggleBarChart
