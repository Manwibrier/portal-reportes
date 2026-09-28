// src/components/KpiCard.jsx

function buildClassName(...classes) {
  return classes.filter(Boolean).join(' ')
}

function normalizeMetricValue(value, fallback = '0') {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  return value
}

function normalizeInteger(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function formatMetricValue(
  value,
  {
    format = 'number',
    decimals = 0,
    locale = 'es-VE',
    prefix = '',
    suffix = '',
    emptyValue = '0',
  } = {},
) {
  const normalizedValue = normalizeMetricValue(value, emptyValue)

  if (format === 'text') {
    return String(normalizedValue)
  }

  const numericValue = Number(normalizedValue)

  if (!Number.isFinite(numericValue)) {
    return String(normalizedValue)
  }

  const safeDecimals = normalizeInteger(decimals, 0)

  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: safeDecimals,
    maximumFractionDigits: safeDecimals,
  }).format(numericValue)

  switch (format) {
    case 'percent':
      return `${prefix}${formattedNumber}%${suffix}`

    case 'currency':
      return `${prefix}${formattedNumber}${suffix}`

    case 'number':
    default:
      return `${prefix}${formattedNumber}${suffix}`
  }
}

function KpiCard({
  title = 'Indicador',
  value,
  description = '',
  format = 'number',
  decimals = 0,
  prefix = '',
  suffix = '',
  locale = 'es-VE',
  emptyValue = '0',
  icon: Icon,
  tone = '',
  className = '',
  meta = '',
  trend = '',
  compact = false,
  loading = false,
  testId = '',
}) {
  const formattedValue = loading
    ? '...'
    : formatMetricValue(value, {
        format,
        decimals,
        prefix,
        suffix,
        locale,
        emptyValue,
      })

  const hasDescription = Boolean(description)
  const hasMeta = Boolean(meta)
  const hasTrend = Boolean(trend)
  const hasIcon = Boolean(Icon)

  return (
    <article
      className={buildClassName(
        'kpi-card',
        compact ? 'kpi-card--compact' : '',
        tone ? `kpi-card--${tone}` : '',
        loading ? 'kpi-card--loading' : '',
        className,
      )}
      data-testid={testId || undefined}
      aria-busy={loading}
    >
      <div className="kpi-card__header">
        <div className="kpi-card__heading">
          <h3 className="kpi-card__title">{title}</h3>

          {hasMeta ? (
            <span className="kpi-card__meta">{meta}</span>
          ) : null}
        </div>

        <div className="kpi-card__value-wrap">
          {hasIcon ? (
            <span className="kpi-card__icon" aria-hidden="true">
              <Icon
                size={22}
                strokeWidth={2.2}
                color="var(--norte-orange)"
                fill="none"
              />
            </span>
          ) : null}

          <strong className="kpi-card__value">{formattedValue}</strong>
        </div>
      </div>

      {hasDescription || hasTrend ? (
        <div className="kpi-card__footer">
          {hasDescription ? (
            <p className="kpi-card__description">{description}</p>
          ) : null}

          {hasTrend ? (
            <span className="kpi-card__trend">{trend}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export default KpiCard