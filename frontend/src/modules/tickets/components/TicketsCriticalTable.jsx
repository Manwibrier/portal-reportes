function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeProgress(value) {
  const numericValue = normalizeNumber(value, 0)

  if (numericValue < 0) return 0
  if (numericValue > 100) return 100

  return Math.round(numericValue)
}

function formatDate(value) {
  if (!value) return 'Sin fecha'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getDueMeta(row) {
  const days =
    row?.diasParaVencimiento == null
      ? null
      : normalizeNumber(row.diasParaVencimiento, 0)

  if (days == null) {
    return {
      label: 'Sin compromiso',
      tone: 'neutral',
    }
  }

  if (row?.vencido) {
    return {
      label: `Vencido ${Math.abs(days)}d`,
      tone: 'danger',
    }
  }

  if (days === 0) {
    return {
      label: 'Vence hoy',
      tone: 'warning',
    }
  }

  if (days <= 3) {
    return {
      label: `Vence en ${days}d`,
      tone: 'warning',
    }
  }

  return {
    label: `Vence en ${days}d`,
    tone: 'ok',
  }
}

function normalizeRows(rows = []) {
  if (!Array.isArray(rows)) return []

  return rows.map((row, index) => {
    const nroTicket = normalizeText(
      row?.nroTicket ?? row?.nro_ticket,
      'N/D',
    )

    const diasParaVencimientoRaw =
      row?.diasParaVencimiento ??
      row?.dias_para_vencimiento ??
      row?.daysToDue ??
      row?.days_to_due

    const diasParaVencimiento =
      diasParaVencimientoRaw === undefined || diasParaVencimientoRaw === null
        ? null
        : normalizeNumber(diasParaVencimientoRaw, 0)

    const vencido =
      row?.vencido ??
      row?.is_overdue ??
      (diasParaVencimiento != null ? diasParaVencimiento < 0 : false)

    return {
      id: normalizeText(
        row?.id ?? row?.key ?? (nroTicket !== 'N/D' ? `ticket-${nroTicket}` : ''),
        `ticket-critical-${index}`,
      ),
      nroTicket,
      tipoTicket: normalizeText(
        row?.tipoTicket ?? row?.tipo_ticket,
        'Sin tipo',
      ),
      departamento: normalizeText(
        row?.departamento ?? row?.department,
        'Sin departamento',
      ),
      departamentoEmite: normalizeText(
        row?.departamentoEmite ?? row?.departamento_emite,
        'Sin emisor',
      ),
      usuarioAsignado: normalizeText(
        row?.usuarioAsignado ?? row?.usuario_asignado ?? row?.assigned_to,
        'Sin asignación',
      ),
      prioridad: normalizeText(row?.prioridad, 'Sin prioridad'),
      fechaRequerido:
        row?.fechaRequerido ??
        row?.fecha_requerido ??
        row?.required_date ??
        null,
      diasParaVencimiento,
      vencido: Boolean(vencido),
      avance: normalizeProgress(row?.avance),
      estatus: normalizeText(row?.estatus ?? row?.status, 'Sin estatus'),
      categoria: normalizeText(
        row?.categoria ?? row?.category,
        'Sin categoría',
      ),
    }
  })
}

function TicketsCriticalTable({
  rows = [],
  title = 'Tickets críticos',
  subtitle = '',
  emptyMessage = 'No hay tickets críticos en este momento.',
}) {
  const normalizedRows = normalizeRows(rows)

  return (
    <section className="portal-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">{title}</h3>
          {subtitle ? <p className="portal-card__subtitle">{subtitle}</p> : null}
        </div>
      </header>

      <div className="portal-card__body">
        <div className="tickets-critical-table">
          {normalizedRows.length === 0 ? (
            <div className="tickets-empty-state">{emptyMessage}</div>
          ) : (
            <table className="tickets-critical-table__table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Departamento</th>
                  <th>Asignado</th>
                  <th>Compromiso</th>
                  <th>Avance</th>
                  <th>Estatus</th>
                </tr>
              </thead>

              <tbody>
                {normalizedRows.map((row) => {
                  const dueMeta = getDueMeta(row)

                  return (
                    <tr key={row.id}>
                      <td data-label="Ticket">
                        <div className="tickets-critical-table__primary">
                          #{row.nroTicket}
                        </div>
                        <div className="tickets-critical-table__secondary">
                          {row.tipoTicket}
                        </div>
                      </td>

                      <td data-label="Departamento">
                        <div className="tickets-critical-table__primary">
                          {row.departamento}
                        </div>
                        <div className="tickets-critical-table__secondary">
                          Emite: {row.departamentoEmite}
                        </div>
                      </td>

                      <td data-label="Asignado">
                        <div className="tickets-critical-table__primary">
                          {row.usuarioAsignado}
                        </div>
                        <div className="tickets-critical-table__secondary">
                          {row.prioridad}
                        </div>
                      </td>

                      <td data-label="Compromiso">
                        <div className="tickets-critical-table__primary">
                          {formatDate(row.fechaRequerido)}
                        </div>
                        <span className={`tickets-pill tickets-pill--${dueMeta.tone}`}>
                          {dueMeta.label}
                        </span>
                      </td>

                      <td data-label="Avance">
                        <div className="tickets-progress">
                          <progress
                            className="tickets-progress__track"
                            value={row.avance}
                            max="100"
                            aria-label={`Avance del ticket ${row.nroTicket}: ${row.avance}%`}
                          />
                          <span className="tickets-progress__value">
                            {row.avance}%
                          </span>
                        </div>
                      </td>

                      <td data-label="Estatus">
                        <div className="tickets-critical-table__primary">
                          {row.estatus}
                        </div>
                        <div className="tickets-critical-table__secondary">
                          {row.categoria}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

export default TicketsCriticalTable
