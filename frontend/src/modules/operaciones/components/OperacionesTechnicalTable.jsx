// src/modules/operaciones/components/OperacionesTechnicalTable.jsx

import {
  ensureArray,
  formatDateTime,
  formatNumber,
  normalizeNumber,
  normalizeText,
} from '../utils'

function normalizeTechnicalRow(row = {}, index = 0) {
  return {
    id: normalizeText(row.id ?? row.key, `technical-${index}`),
    olt: normalizeText(row.olt ?? row.oltName ?? row.olt_name, 'SIN OLT'),
    onuId: normalizeText(row.onuId ?? row.onu_id ?? row.onu ?? row.idOnu, 'N/D'),
    serial: normalizeText(
      row.serial ?? row.serialNumber ?? row.serial_number ?? row.sn,
      'N/D',
    ),
    name: normalizeText(
      row.name ?? row.nombre ?? row.clientName ?? row.cliente,
      'SIN NOMBRE',
    ),
    status: normalizeText(row.status ?? row.estado ?? row.estatus, 'SIN STATUS'),
    signal: normalizeNumber(row.signal ?? row.rxPower ?? row.rx_power, 0),
    signalBand: normalizeText(
      row.signalBand ?? row.signal_band ?? row.powerBucket,
      'all',
    ),
    slot: normalizeText(row.slot ?? row.tarjeta ?? row.board, 'N/D'),
    port: normalizeText(row.port ?? row.puerto ?? row.pon, 'N/D'),
    lastStatusChange:
      row.lastStatusChange ??
      row.last_status_change ??
      row.updatedAt ??
      row.updated_at ??
      row.fechaActualizacion,
  }
}

function resolveStatusClass(status = '') {
  const normalized = normalizeText(status).toLowerCase()

  if (normalized === 'online' || normalized === 'activo') {
    return 'operaciones-pill operaciones-pill--success'
  }

  if (
    normalized.includes('warning') ||
    normalized.includes('pendiente') ||
    normalized.includes('power')
  ) {
    return 'operaciones-pill operaciones-pill--warning'
  }

  if (
    normalized.includes('offline') ||
    normalized.includes('critical') ||
    normalized.includes('los') ||
    normalized.includes('corte') ||
    normalized.includes('cortado')
  ) {
    return 'operaciones-pill operaciones-pill--danger'
  }

  return 'operaciones-pill operaciones-pill--neutral'
}

function OperacionesTechnicalTable({
  rows = [],
  title = 'Detalle Técnico SmartOLT',
  subtitle = 'Estado técnico de ONUs, señal, OLT, tarjeta y puerto.',
  emptyMessage = 'No hay registros técnicos disponibles.',
}) {
  const safeRows = ensureArray(rows).map(normalizeTechnicalRow)

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
                  <th>OLT</th>
                  <th>ONU ID</th>
                  <th>Serial</th>
                  <th>Nombre</th>
                  <th>Status</th>
                  <th>Señal</th>
                  <th>Banda</th>
                  <th>Tarjeta</th>
                  <th>Puerto</th>
                  <th>Último cambio</th>
                </tr>
              </thead>

              <tbody>
                {safeRows.map((row, index) => (
                  <tr key={`${row.id}-${index}`}>
                    <td data-label="OLT">{row.olt}</td>
                    <td data-label="ONU ID">{row.onuId}</td>
                    <td data-label="Serial">
                      <span className="operaciones-table__primary">
                        {row.serial}
                      </span>
                    </td>
                    <td data-label="Nombre">{row.name}</td>
                    <td data-label="Status">
                      <span className={resolveStatusClass(row.status)}>
                        {row.status}
                      </span>
                    </td>
                    <td data-label="Señal">
                        {formatNumber(row.signal, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </td>
                    <td data-label="Banda">{row.signalBand}</td>
                    <td data-label="Tarjeta">{row.slot}</td>
                    <td data-label="Puerto">{row.port}</td>
                    <td data-label="Último cambio">
                      {formatDateTime(row.lastStatusChange)}
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

export default OperacionesTechnicalTable