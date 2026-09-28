// src/modules/clientes/components/ClientesCierreMensualKpiSection.jsx

import KpiCard from '../../../components/KpiCard'

function normalizeItems(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : []
}

function normalizeGroups(groups = []) {
  if (!Array.isArray(groups)) {
    return []
  }

  return groups
    .map((group, index) => {
      const safeItems = normalizeItems(group?.items)

      return {
        key: String(group?.key || `kpi-group-${index}`).trim(),
        title: String(group?.title || 'Indicadores').trim(),
        subtitle: String(group?.subtitle || '').trim(),
        items: safeItems,
      }
    })
    .filter((group) => group.items.length > 0)
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function getItemKey(item = {}, index = 0) {
  return String(
    item.key ||
      item.id ||
      item.title ||
      `clientes-cierre-mensual-kpi-${index}`,
  )
}

function KpiList({ items = [] }) {
  const safeItems = normalizeItems(items)

  if (safeItems.length === 0) {
    return (
      <div className="tickets-empty-state tickets-empty-state--compact">
        No hay indicadores disponibles.
      </div>
    )
  }

  return (
    <div className="kpi-grid clientes-cierre-mensual-kpi-grid">
      {safeItems.map((item, index) => (
        <KpiCard
          key={getItemKey(item, index)}
          title={item.title || 'Indicador'}
          value={item.value}
          description={item.description || ''}
          format={item.format || 'number'}
          decimals={toSafeNumber(item.decimals, 0)}
          prefix={item.prefix || ''}
          suffix={item.suffix || ''}
          locale={item.locale || 'es-VE'}
          emptyValue={item.emptyValue || '0'}
          tone={item.tone || ''}
          meta={item.meta || ''}
        />
      ))}
    </div>
  )
}

function ClientesCierreMensualKpiSection({
  title = 'KPIs del Cierre Mensual',
  subtitle = '',
  items = [],
  groups = [],
}) {
  const safeGroups = normalizeGroups(groups)
  const safeItems = normalizeItems(items)
  const hasGroups = safeGroups.length > 0

  return (
    <section className="tickets-insights-section clientes-kpi-section clientes-cierre-mensual-kpi-section">
      <header className="tickets-insights-header clientes-cierre-mensual-kpi-section__header">
        <h2 className="tickets-insights-title">{title}</h2>

        {subtitle ? (
          <p className="tickets-insights-subtitle">{subtitle}</p>
        ) : null}
      </header>

      {hasGroups ? (
        <div className="clientes-cierre-mensual-kpi-groups">
          {safeGroups.map((group) => (
            <article
              key={group.key}
              className="portal-card clientes-cierre-mensual-kpi-group"
            >
              <header className="portal-card__header clientes-cierre-mensual-kpi-group__header">
                <div className="portal-card__heading">
                  <h3 className="portal-card__title clientes-cierre-mensual-kpi-group__title">
                    {group.title}
                  </h3>

                  {group.subtitle ? (
                    <p className="portal-card__subtitle clientes-cierre-mensual-kpi-group__subtitle">
                      {group.subtitle}
                    </p>
                  ) : null}
                </div>
              </header>

              <div className="portal-card__body clientes-cierre-mensual-kpi-group__body">
                <KpiList items={group.items} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <KpiList items={safeItems} />
      )}
    </section>
  )
}

export default ClientesCierreMensualKpiSection