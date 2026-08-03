// src/modules/operaciones/components/OperacionesKpiMosaic.jsx

import { ensureArray, formatNumber, normalizeNumber, normalizeText } from '../utils'

function normalizeKpiItem(item = {}, index = 0) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return {
      key: normalizeText(item.key ?? item.id, `kpi-${index}`),
      title: normalizeText(
        item.title ?? item.label ?? item.name,
        `Indicador ${index + 1}`,
      ),
      value: normalizeNumber(item.value ?? item.total ?? item.count, 0),
      description: normalizeText(item.description),
      format: normalizeText(item.format, 'number'),
      decimals: normalizeNumber(item.decimals, 0),
      prefix: normalizeText(item.prefix),
      suffix: normalizeText(item.suffix),
    }
  }

  return {
    key: `kpi-${index}`,
    title: `Indicador ${index + 1}`,
    value: normalizeNumber(item, 0),
    description: '',
    format: 'number',
    decimals: 0,
    prefix: '',
    suffix: '',
  }
}

function formatKpiValue(item) {
  const decimals = item.format === 'percent' ? item.decimals || 2 : item.decimals
  const value = formatNumber(item.value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  if (item.format === 'percent') {
    return `${item.prefix}${value}%${item.suffix}`
  }

  return `${item.prefix}${value}${item.suffix}`
}

function OperacionesKpiMosaic({
  kpis = [],
  title = 'Indicadores Operacionales',
  subtitle = '',
  emptyMessage = 'No hay indicadores disponibles para el filtro activo.',
}) {
  const items = ensureArray(kpis).map(normalizeKpiItem)

  return (
    <section className="tickets-insights-section operaciones-kpi-section">
      {(title || subtitle) ? (
        <header className="tickets-insights-header">
          {title ? <h2 className="tickets-insights-title">{title}</h2> : null}
          {subtitle ? (
            <p className="tickets-insights-subtitle">{subtitle}</p>
          ) : null}
        </header>
      ) : null}

      {items.length === 0 ? (
        <div className="tickets-empty-state">{emptyMessage}</div>
      ) : (
        <div className="kpi-grid">
          {items.map((item) => (
            <article key={item.key} className="kpi-card">
              <div className="kpi-card__header">
                <h3 className="kpi-card__title">{item.title}</h3>
                <strong className="kpi-card__value">
                  {formatKpiValue(item)}
                </strong>
              </div>

              {item.description ? (
                <p className="kpi-card__description">{item.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default OperacionesKpiMosaic