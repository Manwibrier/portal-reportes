import KpiCard from '../../../components/KpiCard'

function normalizeItems(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : []
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function GerenciaKpiSection({ title, subtitle = '', items = [] }) {
  const safeItems = normalizeItems(items)

  return (
    <section className="portal-insights-section">
      <header className="portal-insights-header">
        <h2 className="portal-insights-title">{title}</h2>
        {subtitle ? <p className="portal-insights-subtitle">{subtitle}</p> : null}
      </header>

      <div className="kpi-grid">
        {safeItems.map((item) => (
          <KpiCard
            key={item.key || item.title}
            title={item.title || 'Indicador'}
            value={item.value}
            description={item.description || ''}
            format={item.format || 'number'}
            decimals={toSafeNumber(item.decimals, 0)}
            prefix={item.prefix || ''}
            suffix={item.suffix || ''}
            locale={item.locale || 'es-VE'}
            emptyValue={item.emptyValue || '0'}
          />
        ))}
      </div>
    </section>
  )
}

export default GerenciaKpiSection
