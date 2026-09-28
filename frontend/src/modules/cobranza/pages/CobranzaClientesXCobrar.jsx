import ModulePage from '../../../components/ModulePage'
import {
  CobranzaFilters,
  CobranzaSectionHeader,
  CobranzaStatus,
  CobranzaTable,
  PercentDonut,
  ensureObject,
  formatMoney,
  formatNumber,
  useCobranzaEndpoint,
} from '../components/CobranzaShared'

const columns = [
  { key: 'razonSocial', label: 'Cliente' },
  { key: 'rif', label: 'RIF', render: (row) => row.rif || 'N/D' },
  { key: 'numeroContrato', label: 'Contrato', render: (row) => row.numeroContrato || 'N/D' },
  { key: 'nombreFranquicia', label: 'Franquicia' },
  { key: 'zona', label: 'Región' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'estatusCliente', label: 'Estatus' },
  { key: 'saldoPendienteUsd', label: 'Saldo USD', render: (row) => formatMoney(row.saldoPendienteUsd) },
]

function CobranzaClientesXCobrar() {
  const {
    applyFilters,
    data,
    error,
    filters,
    loading,
    updateFilter,
  } = useCobranzaEndpoint('clientes-x-cobrar', { limit: 500 })

  const kpis = ensureObject(data.kpis)
  const meta = ensureObject(data.meta)

  return (
    <ModulePage
      title="Cobranza · Clientes X Cobrar"
      description="Lista operativa de clientes con saldo pendiente, ordenada por monto."
    >
      <div className="cobranza-shell">
        <CobranzaFilters
          data={data}
          filters={filters}
          loading={loading}
          onChange={updateFilter}
          onSubmit={applyFilters}
          searchPlaceholder="Cliente, RIF o contrato"
        />

        <CobranzaStatus loading={loading} error={error} />

        {!loading ? (
          <>
            <CobranzaSectionHeader
              title="A quién hay que cobrarle"
              subtitle="Esta pantalla debe servir para acción diaria: priorizar por monto y filtrar por zona o franquicia."
            />

            <div className="cobranza-percent-grid">
              <PercentDonut
                title="% X Cobrar"
                value={kpis.pctXCobrar}
                tone="orange"
                detail={`${formatNumber(kpis.totalXCobrar)} cargos pendientes.`}
              />
              <div className="portal-card cobranza-executive-note">
                <span>Saldo priorizado</span>
                <strong>{formatMoney(kpis.montoXCobrarUsd)}</strong>
                <p>
                  Mostrando {formatNumber(meta.registrosMostrados)} de {formatNumber(meta.totalClientesPendientes)} clientes pendientes.
                </p>
              </div>
            </div>

            <section className="portal-card">
              <header className="portal-card__header">
                <div className="portal-card__heading">
                  <h2 className="portal-card__title">Clientes pendientes</h2>
                  <p className="portal-card__subtitle">
                    Cargos generados no pagados, con saldo pendiente mayor a cero.
                  </p>
                </div>
              </header>

              <CobranzaTable columns={columns} rows={data.rows} />
            </section>
          </>
        ) : null}
      </div>
    </ModulePage>
  )
}

export default CobranzaClientesXCobrar
