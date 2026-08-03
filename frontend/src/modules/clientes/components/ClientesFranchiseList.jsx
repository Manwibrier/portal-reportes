import ClientesFranchiseRow from './ClientesFranchiseRow'

function normalizeFranchises(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : []
}

function ClientesFranchiseList({
  items = [],
  emptyMessage = 'No hay franquicias registradas para esta región.',
}) {
  const safeItems = normalizeFranchises(items)

  if (safeItems.length === 0) {
    return <div className="tickets-empty-state">{emptyMessage}</div>
  }

  return (
    <div className="clientes-franchise-list">
      {safeItems.map((franchise, index) => (
        <ClientesFranchiseRow
          key={
            franchise?.id ||
            franchise?.key ||
            franchise?.nombre ||
            franchise?.name ||
            `franchise-${index}`
          }
          franchise={franchise}
        />
      ))}
    </div>
  )
}

export default ClientesFranchiseList
