function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-VE').format(toSafeNumber(value))
}

function ClientesMetricCardCompact({
  label = 'Indicador',
  value = 0,
  tone = 'default',
}) {
  const toneClassName = `clientes-metric-card-compact clientes-metric-card-compact--${tone}`

  return (
    <article className={toneClassName}>
      <span className="clientes-metric-card-compact__label">{label}</span>
      <strong className="clientes-metric-card-compact__value">
        {formatNumber(value)}
      </strong>
    </article>
  )
}

export default ClientesMetricCardCompact
