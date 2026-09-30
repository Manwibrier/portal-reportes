import ClientesRegionRow from './ClientesRegionRow'
import ClientesResponsiveRegionCard from './ClientesResponsiveRegionCard'

function normalizeRows(rows = []) {
  return Array.isArray(rows) ? rows.filter(Boolean) : []
}

function ClientesResumenRegionalBoard({
  rows = [],
  loading = false,
  emptyMessage = 'No hay regiones disponibles para mostrar.',
}) {
  const safeRows = normalizeRows(rows)

  return (
    <section className="portal-card clientes-resumen-regional-board">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">Desglose regional</h3>
          <p className="portal-card__subtitle">
            Comparativo rápido por región con acceso al detalle de franquicias.
          </p>
        </div>
      </header>

      <div className="portal-card__body clientes-resumen-regional-board__body">
        {loading ? (
          <div className="portal-feedback portal-feedback--loading">
            Cargando detalle regional...
          </div>
        ) : safeRows.length === 0 ? (
          <div className="tickets-empty-state">{emptyMessage}</div>
        ) : (
          <>
            <div className="clientes-resumen-regional-board__desktop">
              {safeRows.map((row) => (
                <ClientesRegionRow
                  key={row?.key || row?.id || row?.title || row?.name}
                  row={row}
                />
              ))}
            </div>

            <div className="clientes-resumen-regional-board__mobile">
              {safeRows.map((row) => (
                <ClientesResponsiveRegionCard
                  key={row?.key || row?.id || row?.title || row?.name}
                  row={row}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default ClientesResumenRegionalBoard
