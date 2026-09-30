// src/modules/gerencia/components/GerenciaExecutiveMetric.jsx

function buildClassName(...classes) {
  return classes.filter(Boolean).join(' ')
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
    emptyValue = 'N/D',
  } = {},
) {
  if (value === undefined || value === null || value === '') {
    return emptyValue
  }

  if (format === 'text') {
    return String(value)
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return String(value)
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

function GerenciaExecutiveMetric({
  label = 'Indicador',
  value,
  format = 'number',
  decimals = 0,
  locale = 'es-VE',
  prefix = '',
  suffix = '',
  emptyValue = 'N/D',
  description = '',
  meta = '',
  tone = '',
  className = '',
}) {
  const formattedValue = formatMetricValue(value, {
    format,
    decimals,
    locale,
    prefix,
    suffix,
    emptyValue,
  })

  const hasDescription = Boolean(description)
  const hasMeta = Boolean(meta)

  return (
    <article
      className={buildClassName(
        'kpi-card',
        'gerencia-metric',
        'gerencia-executive-metric',
        tone ? `kpi-card--${tone}` : '',
        tone ? `gerencia-metric--${tone}` : '',
        className,
      )}
    >
      <div className="kpi-card__header gerencia-metric__header">
        <div className="kpi-card__heading gerencia-metric__heading">
          <h3 className="kpi-card__title gerencia-metric__label">
            {label}
          </h3>

          {hasMeta ? (
            <span className="kpi-card__meta gerencia-metric__meta">
              {meta}
            </span>
          ) : null}
        </div>

        <strong className="kpi-card__value gerencia-metric__value">
          {formattedValue}
        </strong>
      </div>

      {hasDescription ? (
        <p className="kpi-card__description gerencia-metric__description">
          {description}
        </p>
      ) : null}
    </article>
  )
}

export default GerenciaExecutiveMetric