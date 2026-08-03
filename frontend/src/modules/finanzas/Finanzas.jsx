import KpiCard from '../../components/KpiCard'
import ModulePage from '../../components/ModulePage'

const FINANZAS_KPIS = [
  {
    key: 'facturacion',
    title: 'Facturación',
    value: 45000,
    description: 'Monto total facturado en el período visible.',
    format: 'currency',
    prefix: '$',
    decimals: 0,
  },
  {
    key: 'cobranza',
    title: 'Cobranza',
    value: 31500,
    description: 'Monto efectivamente recaudado en el período.',
    format: 'currency',
    prefix: '$',
    decimals: 0,
  },
  {
    key: 'pendiente',
    title: 'Pendiente',
    value: 13500,
    description: 'Saldo pendiente por recaudar del mismo corte.',
    format: 'currency',
    prefix: '$',
    decimals: 0,
  },
]

function Finanzas() {
  return (
    <ModulePage
      title="Finanzas"
      description="Resumen financiero base del portal."
    >
      <section className="portal-insights-section">
        <header className="portal-insights-header">
          <h2 className="portal-insights-title">Indicadores financieros</h2>
          <p className="portal-insights-subtitle">
            Vista inicial estandarizada para el módulo de finanzas.
          </p>
        </header>

        <div className="kpi-grid">
          {FINANZAS_KPIS.map((item) => (
            <KpiCard
              key={item.key}
              title={item.title}
              value={item.value}
              description={item.description}
              format={item.format}
              prefix={item.prefix}
              decimals={item.decimals}
            />
          ))}
        </div>
      </section>
    </ModulePage>
  )
}

export default Finanzas