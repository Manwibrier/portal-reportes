import {
  ArrowUp,
  Download,
} from 'lucide-react'
import ModulePage from '../../../components/ModulePage'
import {
  CobranzaStatus,
  ensureArray,
  ensureObject,
  formatMoney,
  formatNumber,
  getPeriodLabel,
  normalizeNumber,
  useCobranzaEndpoint,
} from '../components/CobranzaShared'

const QUICK_LINKS = [
  { id: 'detalle-franquicia', label: 'Detalle por Franquicia' },
  { id: 'clientes-por-cobrar', label: 'Clientes por Cobrar' },
  { id: 'cargos-post-franquicia', label: 'Cargos Post X Franquicia' },
  { id: 'clientes-recuperados-franquicia', label: 'Clientes Recuperados por Franquicia' },
  { id: 'detalle-cliente', label: 'Detalle por Cliente' },
]

const DETALLE_FRANQUICIA_COLUMNS = [
  { key: 'zona', label: 'Zona' },
  { key: 'nombreFranquicia', label: 'Franquicia' },
  { key: 'totalCargos', label: 'Cargos', type: 'number' },
  { key: 'montoCargosUsd', label: 'Monto cargos', type: 'money' },
  { key: 'totalCobrado', label: 'Cobrados', type: 'number' },
  { key: 'montoCobradoUsd', label: 'Monto cobrado', type: 'money' },
  // Discrepancia detectada: el alias cambió de monto_descuento_usd a descuento_usd
  { key: 'descuentoUsd', label: 'Descuentos', type: 'money' },
  { key: 'totalXCobrar', label: 'Por cobrar', type: 'number' },
  { key: 'montoXCobrarUsd', label: 'Monto por cobrar', type: 'money' },
]

const CLIENTES_POR_COBRAR_COLUMNS = [
  { key: 'zona', label: 'Zona' },
  { key: 'nombreFranquicia', label: 'Franquicia' },
  { key: 'razonSocial', label: 'Cliente' },
  { key: 'rif', label: 'RIF' },
  { key: 'numeroContrato', label: 'Contrato' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'estatusCliente', label: 'Estatus cliente' },
  { key: 'fechaCargo', label: 'Fecha cargo', type: 'date' },
  { key: 'montoCargoUsd', label: 'Monto cargo', type: 'money' },
  { key: 'montoPagoUsd', label: 'Monto pagado', type: 'money' },
  // Discrepancia detectada: el alias cambió de monto_descuento_usd a descuento_usd
  { key: 'descuentoUsd', label: 'Descuento', type: 'money' },
  { key: 'saldoPendienteUsd', label: 'Saldo pendiente', type: 'money' },
]

const CARGOS_POST_COLUMNS = [
  { key: 'zona', label: 'Zona' },
  { key: 'nombreFranquicia', label: 'Franquicia' },
  { key: 'totalPosterior', label: 'Cargos posteriores', type: 'number' },
  { key: 'montoPosteriorUsd', label: 'Monto posterior', type: 'money' },
  { key: 'totalPosteriorCobrado', label: 'Posteriores cobrados', type: 'number' },
  { key: 'montoPosteriorCobradoUsd', label: 'Monto cobrado', type: 'money' },
  { key: 'totalPosteriorXCobrar', label: 'Posteriores por cobrar', type: 'number' },
  { key: 'montoPosteriorXCobrarUsd', label: 'Monto por cobrar', type: 'money' },
  { key: 'montoPosteriorAjusteUsd', label: 'Descuentos / ajustes', type: 'money' },
]

const CLIENTES_RECUPERADOS_COLUMNS = [
  { key: 'zona', label: 'Zona' },
  { key: 'nombreFranquicia', label: 'Franquicia' },
  { key: 'clientesRecuperados', label: 'Clientes recuperados', type: 'number' },
  { key: 'totalRecuperado', label: 'Cargos recuperados', type: 'number' },
  { key: 'montoRecuperadoUsd', label: 'Monto recuperado', type: 'money' },
]

const DETALLE_CLIENTE_COLUMNS = [
  { key: 'idCargoCliente', label: 'ID cargo' },
  { key: 'idCliente', label: 'ID cliente' },
  { key: 'razonSocial', label: 'Cliente' },
  { key: 'rif', label: 'RIF' },
  { key: 'numeroContrato', label: 'Contrato' },
  { key: 'zona', label: 'Zona' },
  { key: 'nombreFranquicia', label: 'Franquicia' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'estatusCliente', label: 'Estatus cliente' },
  { key: 'tipoCargo', label: 'Tipo movimiento' },
  { key: 'estadoPago', label: 'Estado pago' },
  { key: 'fechaCargo', label: 'Fecha cargo', type: 'date' },
  { key: 'fechaPago', label: 'Fecha pago', type: 'date' },
  { key: 'fechaDescuento', label: 'Fecha descuento', type: 'date' },
  { key: 'montoCargoUsd', label: 'Monto cargo', type: 'money' },
  { key: 'montoPagoUsd', label: 'Monto pagado', type: 'money' },
  // Discrepancia detectada: el alias cambió de monto_descuento_usd a descuento_usd
  { key: 'descuentoUsd', label: 'Descuento', type: 'money' },
  { key: 'saldoPendienteUsd', label: 'Saldo pendiente', type: 'money' },
  { key: 'montoRecuperadoUsd', label: 'Monto recuperado', type: 'money' },
]

function cleanText(value, fallback = 'N/D') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function formatDate(value) {
  if (!value) return 'N/D'

  const text = String(value)
  const datePart = text.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (datePart) {
    return `${datePart[3]}/${datePart[2]}/${datePart[1]}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return cleanText(value)

  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatCell(row, column) {
  const value = row?.[column.key]

  if (column.type === 'money') return formatMoney(value)
  if (column.type === 'number') return formatNumber(value)
  if (column.type === 'date') return formatDate(value)

  return cleanText(value)
}

function escapeExcelCell(value = '') {
  const text = String(value ?? '')
  const safeText = ['=', '+', '-', '@'].includes(text.charAt(0))
    ? `'${text}`
    : text

  return safeText
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
}

function exportTable({ columns, filename, period, rows, title }) {
  if (!rows.length) return

  const headers = columns
    .map((column) => `<th>${escapeExcelCell(column.label)}</th>`)
    .join('')

  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${escapeExcelCell(formatCell(row, column))}</td>`)
        .join('')

      return `<tr>${cells}</tr>`
    })
    .join('')

  const content = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<style>',
    'body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;}',
    'h1{color:#003d91;font-size:18px;}',
    'table{border-collapse:collapse;}',
    'th{background:#0057b8;color:#ffffff;font-weight:700;border:1px solid #dbe4ee;padding:8px;}',
    'td{border:1px solid #dbe4ee;padding:8px;}',
    '</style>',
    '</head>',
    '<body>',
    `<h1>${escapeExcelCell(title)} · ${escapeExcelCell(getPeriodLabel(period))}</h1>`,
    '<table>',
    `<thead><tr>${headers}</tr></thead>`,
    `<tbody>${body}</tbody>`,
    '</table>',
    '</body>',
    '</html>',
  ].join('')

  const blob = new Blob(['\ufeff', content], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${filename}_${period}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getRowsLabel(meta = {}, rows = []) {
  const shown = normalizeNumber(meta.mostrados, rows.length)
  const total = normalizeNumber(meta.total, rows.length)

  if (shown < total) {
    return `Mostrando ${formatNumber(shown)} de ${formatNumber(total)} registros.`
  }

  return `${formatNumber(total)} registros.`
}

function CobranzaTablasPeriodFilter({ filters, loading, onChange, onSubmit }) {
  return (
    <form className="cobranza-franquicias-period-dashboard" onSubmit={onSubmit}>
      <div className="cobranza-franquicias-period-dashboard__head">
        <span>PERIODO</span>
        <strong>{getPeriodLabel(filters.periodo)}</strong>
      </div>

      <div className="cobranza-franquicias-period-dashboard__body">
        <label className="cobranza-franquicias-period-dashboard__input-wrap">
          <span className="cobranza-franquicias-period-dashboard__calendar" aria-hidden="true">
            📅
          </span>
          <input
            type="month"
            name="periodo"
            value={filters.periodo}
            onChange={(event) => onChange('periodo', event.target.value)}
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          className="portal-filter-action portal-filter-action--primary cobranza-franquicias-period-dashboard__button"
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Cargar'}
        </button>
      </div>
    </form>
  )
}

function QuickAccess() {
  return (
    <nav className="portal-card cobranza-tablas-access" aria-label="Acceso rápido a las tablas">
      <div className="cobranza-tablas-access__heading">
        <strong>Acceso rápido</strong>
        <span>Seleccione una tabla para ir directamente a su ubicación.</span>
      </div>

      <div className="cobranza-tablas-access__links">
        {QUICK_LINKS.map((item, index) => (
          <a className="cobranza-tablas-access__link" href={`#${item.id}`} key={item.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.label}</strong>
          </a>
        ))}
      </div>
    </nav>
  )
}

function DataTableSection({
  columns,
  emptyMessage,
  filename,
  id,
  meta,
  metaDetail = '',
  period,
  rows,
  subtitle,
  title,
}) {
  const safeRows = ensureArray(rows)

  return (
    <section className="portal-card cobranza-tablas-section" id={id}>
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h2 className="portal-card__title">{title}</h2>
          <p className="portal-card__subtitle">{subtitle}</p>
        </div>
      </header>

      <div className="portal-card__body">
        <div className="cobranza-table-toolbar">
          <div>
            <strong>{getRowsLabel(meta, safeRows)}</strong>
            {metaDetail ? <span>{metaDetail}</span> : null}
          </div>

          <button
            type="button"
            className="portal-action-button portal-action-button--primary cobranza-table-export-button"
            onClick={() => exportTable({
              columns,
              filename,
              period,
              rows: safeRows,
              title,
            })}
            disabled={!safeRows.length}
          >
            <Download aria-hidden="true" size={16} />
            Exportar Excel
          </button>
        </div>

        <div className="portal-table-responsive cobranza-tablas-table-wrap">
          <table className="portal-table cobranza-tablas-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    className={column.type === 'number' || column.type === 'money' ? 'is-numeric' : ''}
                    key={column.key}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!safeRows.length ? (
                <tr>
                  <td className="cobranza-tablas-table__empty" colSpan={columns.length}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                safeRows.map((row, index) => (
                  <tr key={`${cleanText(row.idCargoCliente, '')}-${cleanText(row.zona, '')}-${cleanText(row.nombreFranquicia, '')}-${index}`}>
                    {columns.map((column) => (
                      <td
                        className={column.type === 'number' || column.type === 'money' ? 'is-numeric' : ''}
                        key={column.key}
                      >
                        {formatCell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function CobranzaTablas() {
  const {
    applyFilters,
    data,
    error,
    filters,
    loading,
    updateFilter,
  } = useCobranzaEndpoint('tablas', { limit: 5000 })

  const tablas = ensureObject(data.tablas)
  const metaTablas = ensureObject(data.metaTablas)

  const rows = {
    detalleFranquicias: ensureArray(tablas.detalleFranquicias),
    clientesPorCobrar: ensureArray(tablas.clientesPorCobrar),
    cargosPostFranquicia: ensureArray(tablas.cargosPostFranquicia),
    clientesRecuperadosFranquicia: ensureArray(tablas.clientesRecuperadosFranquicia),
    detalleClientes: ensureArray(tablas.detalleClientes),
  }

  const appliedPeriod = cleanText(
    ensureObject(data.filtrosAplicados).periodo,
    filters.periodo,
  )

  const clientesPendientesUnicos = normalizeNumber(
    ensureObject(metaTablas.clientesPorCobrar).clientesUnicos,
  )

  return (
    <ModulePage
      title="Cobranza · Tablas"
      description="Consulta operativa y exportable de las tablas del período seleccionado."
    >
      <div className="cobranza-tablas-page" id="cobranza-tablas-inicio">
        <div className="cobranza-tablas-page__header">
          <div className="cobranza-tablas-page__period-slot">
            <CobranzaTablasPeriodFilter
              filters={filters}
              loading={loading}
              onChange={updateFilter}
              onSubmit={applyFilters}
            />
          </div>
        </div>

        <CobranzaStatus loading={loading} error={error} />

        {!loading && !error ? (
          <>
            <QuickAccess />

            <div className="cobranza-tablas-list">
              <DataTableSection
                id="detalle-franquicia"
                title="Detalle por Franquicia"
                subtitle="Resumen consolidado por zona y franquicia trasladado desde Cobranza · Franquicias."
                columns={DETALLE_FRANQUICIA_COLUMNS}
                rows={rows.detalleFranquicias}
                meta={ensureObject(metaTablas.detalleFranquicias)}
                period={appliedPeriod}
                filename="cobranza_detalle_franquicia"
                emptyMessage="No hay datos por franquicia para el período seleccionado."
              />

              <DataTableSection
                id="clientes-por-cobrar"
                title="Clientes por Cobrar"
                subtitle="Cargos de la carga masiva que permanecen pendientes, ordenados por saldo."
                columns={CLIENTES_POR_COBRAR_COLUMNS}
                rows={rows.clientesPorCobrar}
                meta={ensureObject(metaTablas.clientesPorCobrar)}
                metaDetail={`${formatNumber(clientesPendientesUnicos)} clientes únicos en los cargos pendientes.`}
                period={appliedPeriod}
                filename="cobranza_clientes_por_cobrar"
                emptyMessage="No hay cargos pendientes para el período seleccionado."
              />

              <DataTableSection
                id="cargos-post-franquicia"
                title="Cargos Post X Franquicia"
                subtitle="Cargos posteriores a la carga masiva, conciliados entre cobrado, pendiente y descuentos o ajustes."
                columns={CARGOS_POST_COLUMNS}
                rows={rows.cargosPostFranquicia}
                meta={ensureObject(metaTablas.cargosPostFranquicia)}
                period={appliedPeriod}
                filename="cobranza_cargos_post_franquicia"
                emptyMessage="No hay cargos posteriores para el período seleccionado."
              />

              <DataTableSection
                id="clientes-recuperados-franquicia"
                title="Clientes Recuperados por Franquicia"
                subtitle="Clientes únicos, cargos recuperados y monto recuperado, agrupados por zona y franquicia."
                columns={CLIENTES_RECUPERADOS_COLUMNS}
                rows={rows.clientesRecuperadosFranquicia}
                meta={ensureObject(metaTablas.clientesRecuperadosFranquicia)}
                period={appliedPeriod}
                filename="cobranza_clientes_recuperados_franquicia"
                emptyMessage="No hay recuperaciones para el período seleccionado."
              />

              <DataTableSection
                id="detalle-cliente"
                title="Detalle por Cliente"
                subtitle="Trazabilidad de cargos generados, posteriores y recuperados con sus montos y estados."
                columns={DETALLE_CLIENTE_COLUMNS}
                rows={rows.detalleClientes}
                meta={ensureObject(metaTablas.detalleClientes)}
                period={appliedPeriod}
                filename="cobranza_detalle_cliente"
                emptyMessage="No hay detalle de clientes para el período seleccionado."
              />
            </div>

            <button
              type="button"
              className="cobranza-tablas-back-to-top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Volver al inicio de la página"
              title="Volver al inicio"
            >
              <ArrowUp aria-hidden="true" size={22} />
            </button>
          </>
        ) : null}
      </div>
    </ModulePage>
  )
}

export default CobranzaTablas
