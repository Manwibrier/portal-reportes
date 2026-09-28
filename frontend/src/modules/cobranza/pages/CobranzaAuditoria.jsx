import ModulePage from '../../../components/ModulePage'
import {
  CobranzaFilters,
  CobranzaSectionHeader,
  CobranzaStatus,
  CobranzaTable,
  PercentDonut,
  ensureObject,
  formatNumber,
  useCobranzaEndpoint,
} from '../components/CobranzaShared'

const columns = [
  { key: 'name', label: 'Validación' },
  { key: 'value', label: 'Cantidad', render: (row) => formatNumber(row.value) },
  { key: 'severity', label: 'Severidad' },
]

function CobranzaAuditoria() {
  const {
    applyFilters,
    data,
    error,
    filters,
    loading,
    updateFilter,
  } = useCobranzaEndpoint('auditoria', { limit: 300 })

  const calidad = ensureObject(data.calidad)

  return (
    <ModulePage
      title="Cobranza · Auditoría"
      description="Control de calidad de datos para explicar diferencias antes de publicar indicadores."
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
              title="Calidad y confiabilidad del dato"
              subtitle="La auditoría evita que inconsistencias de tasa, zona, franquicia o servicio contaminen el dashboard ejecutivo."
            />

            <div className="cobranza-percent-grid">
              <PercentDonut
                title="Registros con observación"
                value={calidad.totalRegistros ? ((calidad.cargosSinMonto + calidad.cargosSinZona + calidad.cargosSinFranquicia + calidad.cargosSinServicio) / calidad.totalRegistros) * 100 : 0}
                tone="orange"
                detail={`${formatNumber(calidad.totalRegistros)} registros evaluados.`}
              />
              <div className="portal-card cobranza-executive-note">
                <span>Renglones sin tasa</span>
                <strong>{formatNumber(calidad.renglonesSinTasa)}</strong>
                <p>
                  Si este indicador es mayor que cero, revisar tasas de moneda antes de cerrar el periodo.
                </p>
              </div>
            </div>

            <section className="portal-card">
              <header className="portal-card__header">
                <div className="portal-card__heading">
                  <h2 className="portal-card__title">Validaciones</h2>
                  <p className="portal-card__subtitle">
                    Controles principales sobre la data de Cobranza.
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

export default CobranzaAuditoria
