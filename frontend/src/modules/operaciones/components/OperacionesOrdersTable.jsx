// src/modules/operaciones/components/OperacionesOrdersTable.jsx

import {
  ensureArray,
  formatDateTime,
  normalizeText,
} from '../utils'

function normalizeOrderRow(row = {}, index = 0) {
  return {
    id: normalizeText(
      row.id ??
        row.idOrden ??
        row.id_orden ??
        row.ordenId ??
        row.orden_id,
      `ORD-${index + 1}`,
    ),
    estado: normalizeText(
      row.estado ??
        row.estatus ??
        row.status ??
        row.ordenStatus,
      'SIN ESTADO',
    ),
    cliente: normalizeText(
      row.cliente ??
        row.nombreCliente ??
        row.nombre_cliente ??
        row.clientName ??
        row.name,
      'SIN CLIENTE',
    ),
    serial: normalizeText(
      row.serial ??
        row.serialNumber ??
        row.serial_number ??
        row.onuSerial ??
        row.onu_serial ??
        row.sn,
      'N/D',
    ),
    olt: normalizeText(
      row.olt ??
        row.oltName ??
        row.olt_name,
      'N/D',
    ),
    tarjeta: normalizeText(
      row.tarjeta ??
        row.slot ??
        row.board ??
        row.card,
      'N/D',
    ),
    puerto: normalizeText(
      row.puerto ??
        row.port ??
        row.pon ??
        row.pon_port,
      'N/D',
    ),
    tecnico: normalizeText(
      row.tecnico ??
        row.asignadoA ??
        row.assignedTo ??
        row.assigned_to,
      'SIN ASIGNAR',
    ),
    zona: normalizeText(row.zona, 'SIN ZONA'),
    franquicia: normalizeText(row.franquicia, 'SIN FRANQUICIA'),
    servicio: normalizeText(row.servicio, 'SIN SERVICIO'),
    fechaCreacion:
      row.fechaCreacion ??
      row.fecha_creacion ??
      row.createdAt ??
      row.created_at,
    fechaCompromiso:
      row.fechaCompromiso ??
      row.fecha_compromiso ??
      row.dueAt ??
      row.due_at ??
      row.fecha_vencimiento,
  }
}

function resolveStatusClass(status = '') {
  const normalized = normalizeText(status).toLowerCase()

  if (
    normalized.includes('finalizado') ||
    normalized.includes('completado') ||
    normalized.includes('cerrado') ||
    normalized.includes('activo')
  ) {
    return 'operaciones-pill operaciones-pill--success'
  }

  if (
    normalized.includes('pendiente') ||
    normalized.includes('proceso') ||
    normalized.includes('asignado') ||
    normalized.includes('abierto')
  ) {
    return 'operaciones-pill operaciones-pill--warning'
  }

  if (
    normalized.includes('vencido') ||
    normalized.includes('rechazado') ||
    normalized.includes('cancelado') ||
    normalized.includes('corte') ||
    normalized.includes('cortado')
  ) {
    return 'operaciones-pill operaciones-pill--danger'
  }

  return 'operaciones-pill operaciones-pill--neutral'
}

function OperacionesOrdersTable({
  rows = [],
  title = 'Órdenes de Servicio',
  subtitle = 'Detalle operativo de órdenes consultadas desde TotalNet.',
  emptyMessage = 'No hay órdenes de servicio disponibles.',
}) {
  const safeRows = ensureArray(rows).map(normalizeOrderRow)

  return (
    <section className="portal-card operaciones-table-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">{title}</h3>
          {subtitle ? (
            <p className="portal-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <div className="portal-card__body">
        {safeRows.length === 0 ? (
          <div className="tickets-empty-state">{emptyMessage}</div>
        ) : (
          <div className="operaciones-table">
            <table className="operaciones-table__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Cliente</th>
                  <th>Zona</th>
                  <th>Franquicia</th>
                  <th>Servicio</th>
                  <th>Serial</th>
                  <th>OLT</th>
                  <th>Tarjeta</th>
                  <th>Puerto</th>
                  <th>Técnico</th>
                  <th>Creación</th>
                  <th>Compromiso</th>
                </tr>
              </thead>

              <tbody>
                {safeRows.map((row, index) => (
                  <tr key={`${row.id}-${index}`}>
                    <td data-label="ID">
                      <span className="operaciones-table__primary">
                        {row.id}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span className={resolveStatusClass(row.estado)}>
                        {row.estado}
                      </span>
                    </td>
                    <td data-label="Cliente">{row.cliente}</td>
                    <td data-label="Zona">{row.zona}</td>
                    <td data-label="Franquicia">{row.franquicia}</td>
                    <td data-label="Servicio">{row.servicio}</td>
                    <td data-label="Serial">{row.serial}</td>
                    <td data-label="OLT">{row.olt}</td>
                    <td data-label="Tarjeta">{row.tarjeta}</td>
                    <td data-label="Puerto">{row.puerto}</td>
                    <td data-label="Técnico">{row.tecnico}</td>
                    <td data-label="Creación">
                      {formatDateTime(row.fechaCreacion)}
                    </td>
                    <td data-label="Compromiso">
                      {formatDateTime(row.fechaCompromiso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default OperacionesOrdersTable