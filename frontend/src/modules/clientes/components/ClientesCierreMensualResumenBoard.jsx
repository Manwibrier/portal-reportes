function ClientesCierreMensualResumenBoard({
  children,
  className = '',
}) {
  const resolvedClassName = [
    'clientes-cierre-mensual-board',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={resolvedClassName}>{children}</div>
}

export default ClientesCierreMensualResumenBoard