import ModulePage from '../../../components/ModulePage'
import {
  CobranzaChartCard,
  CobranzaFilters,
  CobranzaSectionHeader,
  CobranzaStatus,
  CobranzaTable,
  HistoricoLineChart,
  PercentDonut,
  ensureArray,
  formatMoney,
  formatNumber,
  useCobranzaEndpoint,
} from '../components/CobranzaShared'

const columns = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'totalCargos', label: 'Cargos', render: (row) => formatNumber(row.totalCargos) },
  { key: 'totalCobrado', label: 'Cobrado', render: (row) => formatNumber(row.totalCobrado) },
  { key: 'totalXCobrar', label: 'X Cobrar', render: (row) => formatNumber(row.totalXCobrar) },
  { key: 'pctCobrado', label: '% Cobrado', render: (row) => `${formatNumber(row.pctCobrado, 2)}%` },
  { key: 'montoCobradoUsd', label: 'Mto Cobrado', render: (row) => formatMoney(row.montoCobradoUsd) },
  { key: 'montoXCobrarUsd', label: 'Mto X Cobrar', render: (row) => formatMoney(row.montoXCobrarUsd) },
]

function getLast(rows) {
  return ensureArray(rows)[ensureArray(rows).length - 1] || {}
}

function CobranzaHistorico() {
  const {
    applyFilters,
    data,
    error,
    filters,
    loading,
    updateFilter,
  } = useCobranzaEndpoint('historico', { limit: 300 })

  const rows = ensureArray(data.rows)
  const last = getLast(rows)

  return (
    <ModulePage
      title="Cobranza · Histórico"
      description="Evolución diaria de cobranza usando snapshots guardados en la base del portal."
    >
      <div className="cobranza-shell">
        <CobranzaFilters
          data={data}
          filters={filters}
          loading={loading}
          onChange={updateFilter}
          onSubmit={applyFilters}
          showSearch={false}
        />

        <CobranzaStatus loading={loading} error={error} />

        {!loading ? (
          <>
            <CobranzaSectionHeader
              title="Cómo evoluciona la gestión"
              subtitle="Esta lectura no depende del Power BI; se alimenta con snapshots diarios del portal."
            />

            <div className="cobranza-percent-grid">
              <PercentDonut
                title="Último % cobrado"
                value={last.pctCobrado || 0}
                tone="green"
                detail={last.fecha ? `Último snapshot: ${last.fecha}` : 'Sin snapshots disponibles.'}
              />
              <div className="portal-card cobranza-executive-note">
                <span>Último saldo X Cobrar</span>
                <strong>{formatMoney(last.montoXCobrarUsd || 0)}</strong>
                <p>
                  Para alimentar esta pantalla se debe ejecutar el snapshot diario desde el backend.
                </p>
              </div>
            </div>

            <CobranzaChartCard
              title="Tendencia diaria"
              subtitle="% cobrado, monto cobrado y monto pendiente."
            >
              <HistoricoLineChart data={rows} />
            </CobranzaChartCard>

            <section className="portal-card">
              <header className="portal-card__header">
                <div className="portal-card__heading">
                  <h2 className="portal-card__title">Snapshots registrados</h2>
                  <p className="portal-card__subtitle">
                    Corte diario guardado en la base de datos del portal.
                  </p>
                </div>
              </header>

              <CobranzaTable columns={columns} rows={rows} />
            </section>
          </>
        ) : null}
      </div>
    </ModulePage>
  )
}

export default CobranzaHistorico
