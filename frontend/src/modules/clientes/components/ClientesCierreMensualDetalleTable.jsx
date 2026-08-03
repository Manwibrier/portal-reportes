// src/modules/clientes/components/ClientesCierreMensualDetalleTable.jsx

const EXPORT_MIME_TYPE = 'application/vnd.ms-excel;charset=utf-8;'

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toSafeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const normalizedValue = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '')
    .trim()

  if (!normalizedValue) return fallback

  const numericValue = Number(normalizedValue)

  return Number.isFinite(numericValue) ? numericValue : fallback
}

function normalizeInteger(value, fallback = 0) {
  const numericValue = Number(value)

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : fallback
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-VE').format(toSafeNumber(value))
}

function formatPercent(value) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toSafeNumber(value))
}

function calculatePercentage(numerator, denominator) {
  const safeNumerator = toSafeNumber(numerator)
  const safeDenominator = toSafeNumber(denominator)

  if (safeDenominator <= 0) return 0

  return (safeNumerator / safeDenominator) * 100
}

function sanitizeFileName(value = 'clientes-cierre-mensual') {
  const safeValue = normalizeText(value, 'clientes-cierre-mensual')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return safeValue || 'clientes-cierre-mensual'
}

function normalizeExcelFileName(value = 'clientes-cierre-mensual.xls') {
  const safeName = sanitizeFileName(value)
    .replace(/\.xlsx$/i, '')
    .replace(/\.xls$/i, '')
    .replace(/\.csv$/i, '')

  return `${safeName || 'clientes-cierre-mensual'}.xls`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeRows(rows = [], { mesEvaluado = 0, anioEvaluado = 0 } = {}) {
  if (!Array.isArray(rows)) return []

  const safeMonth = normalizeInteger(mesEvaluado, 0)
  const safeYear = normalizeInteger(anioEvaluado, 0)

  return rows.map((row, index) => {
    const totalClientesActivos = toSafeNumber(row?.totalClientesActivos)
    const totalClientesCortados = toSafeNumber(row?.totalClientesCortados)
    const totalClientesPorCortar = toSafeNumber(row?.totalClientesPorCortar)
    const totalClientesExonerados = toSafeNumber(row?.totalClientesExonerados)
    const totalVenta = toSafeNumber(row?.totalVenta)
    const totalInstalacionesFinalizadas = toSafeNumber(
      row?.totalInstalacionesFinalizadas,
    )
    const totalInstalacionesPendientes = toSafeNumber(
      row?.totalInstalacionesPendientes,
    )
    const totalReclamosFinalizados = toSafeNumber(
      row?.totalReclamosFinalizados,
    )

    const baseTotalClientes =
      totalClientesActivos +
      totalClientesCortados +
      totalClientesPorCortar +
      totalClientesExonerados

    const totalInstalaciones =
      totalInstalacionesFinalizadas + totalInstalacionesPendientes

    const efectividadInstalacionPct = toSafeNumber(
      row?.efectividadInstalacionPct,
      calculatePercentage(
        totalInstalacionesFinalizadas,
        totalInstalaciones,
      ),
    )

    const backlogInstalacionPct = toSafeNumber(
      row?.backlogInstalacionPct,
      calculatePercentage(
        totalInstalacionesPendientes,
        totalInstalaciones,
      ),
    )

    const tasaCortePct = toSafeNumber(
      row?.tasaCortePct,
      calculatePercentage(totalClientesCortados, baseTotalClientes),
    )

    const churnRateOperacionalPct = toSafeNumber(
      row?.churnRateOperacionalPct,
      calculatePercentage(
        totalClientesCortados + totalClientesPorCortar,
        baseTotalClientes,
      ),
    )

    return {
      id: normalizeText(
        row?.id ??
          row?.key ??
          `${row?.servicio || 'servicio'}-${row?.zona || 'zona'}-${row?.franquicia || 'franquicia'}-${index}`,
        `detalle-row-${index}`,
      ),
      mes: normalizeInteger(row?.mes, safeMonth),
      anio: normalizeInteger(row?.anio, safeYear),
      servicio: normalizeText(row?.servicio, 'SIN DATO'),
      zona: normalizeText(row?.zona, 'SIN DATO'),
      franquicia: normalizeText(row?.franquicia, 'SIN DATO'),
      totalClientesActivos,
      totalClientesCortados,
      totalClientesPorCortar,
      totalClientesExonerados,
      totalVenta,
      totalInstalacionesFinalizadas,
      totalInstalacionesPendientes,
      totalReclamosFinalizados,
      baseTotalClientes,
      totalInstalaciones,
      efectividadInstalacionPct,
      backlogInstalacionPct,
      tasaCortePct,
      churnRateOperacionalPct,
    }
  })
}

function buildExportColumns() {
  return [
    {
      header: 'Mes evaluado',
      value: (row) => row.mes || '',
    },
    {
      header: 'Año evaluado',
      value: (row) => row.anio || '',
    },
    {
      header: 'Servicio',
      value: (row) => row.servicio,
    },
    {
      header: 'Zona',
      value: (row) => row.zona,
    },
    {
      header: 'Franquicia',
      value: (row) => row.franquicia,
    },
    {
      header: 'Base total clientes',
      value: (row) => row.baseTotalClientes,
    },
    {
      header: 'Clientes activos',
      value: (row) => row.totalClientesActivos,
    },
    {
      header: 'Clientes exonerados',
      value: (row) => row.totalClientesExonerados,
    },
    {
      header: 'Clientes por cortar',
      value: (row) => row.totalClientesPorCortar,
    },
    {
      header: 'Clientes cortados',
      value: (row) => row.totalClientesCortados,
    },
    {
      header: 'Ventas',
      value: (row) => row.totalVenta,
    },
    {
      header: 'Instalaciones finalizadas',
      value: (row) => row.totalInstalacionesFinalizadas,
    },
    {
      header: 'Instalaciones pendientes',
      value: (row) => row.totalInstalacionesPendientes,
    },
    {
      header: 'Reclamos finalizados',
      value: (row) => row.totalReclamosFinalizados,
    },
    {
      header: '% Efectividad instalación',
      value: (row) => `${formatPercent(row.efectividadInstalacionPct)}%`,
    },
    {
      header: '% Backlog instalación',
      value: (row) => `${formatPercent(row.backlogInstalacionPct)}%`,
    },
    {
      header: '% Tasa de corte',
      value: (row) => `${formatPercent(row.tasaCortePct)}%`,
    },
    {
      header: '% Churn operacional',
      value: (row) => `${formatPercent(row.churnRateOperacionalPct)}%`,
    },
  ]
}

function buildExcelHtml({
  rows = [],
  columns = [],
  title = 'Detalle por Servicio',
  subtitle = '',
  sheetName = 'Detalle por Servicio',
}) {
  const safeSheetName = escapeHtml(sheetName || title)

  const headerCells = columns
    .map(
      (column) =>
        `<th style="background:#f3f7fc;color:#003d91;border:1px solid #dbe4ee;padding:8px;text-align:left;">${escapeHtml(column.header)}</th>`,
    )
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const rawValue =
            typeof column.value === 'function'
              ? column.value(row)
              : row[column.key]

          return `<td style="border:1px solid #dbe4ee;padding:8px;">${escapeHtml(rawValue)}</td>`
        })
        .join('')

      return `<tr>${cells}</tr>`
    })
    .join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${safeSheetName}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines />
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
        <![endif]-->
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="${columns.length}" style="font-size:18px;color:#003d91;text-align:left;padding:10px;">
                ${escapeHtml(title)}
              </th>
            </tr>
            ${
              subtitle
                ? `<tr><th colspan="${columns.length}" style="font-size:12px;color:#64748b;text-align:left;padding:8px;">${escapeHtml(subtitle)}</th></tr>`
                : ''
            }
            <tr>${headerCells}</tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `
}

function downloadExcelFile({
  filename,
  rows,
  columns,
  title,
  subtitle,
  sheetName,
}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const html = buildExcelHtml({
    rows,
    columns,
    title,
    subtitle,
    sheetName,
  })

  const blob = new Blob([html], {
    type: EXPORT_MIME_TYPE,
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = normalizeExcelFileName(filename)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

function ExportButton({ disabled = false, onClick }) {
  return (
    <button
      type="button"
      className="portal-filter-action portal-filter-action--primary portal-filter-action--compact clientes-cierre-export-button"
      disabled={disabled}
      onClick={onClick}
    >
      Exportar Excel
    </button>
  )
}

function ClientesCierreMensualDetalleTable({
  title = 'Tabla de detalle',
  subtitle = '',
  rows = [],
  emptyMessage = 'No hay registros disponibles para esta tabla.',
  periodoLabel = '',
  mesEvaluado = 0,
  anioEvaluado = 0,
  exportFileName = 'clientes-cierre-mensual.xls',
  exportSheetName = 'Detalle por Servicio',
}) {
  const safeRows = normalizeRows(rows, {
    mesEvaluado,
    anioEvaluado,
  })

  const hasRows = safeRows.length > 0
  const exportColumns = buildExportColumns()

  const resolvedSubtitle =
    subtitle ||
    (periodoLabel ? `Período evaluado: ${periodoLabel}` : '')

  function handleExport() {
    if (!hasRows) return

    downloadExcelFile({
      filename: exportFileName,
      rows: safeRows,
      columns: exportColumns,
      title,
      subtitle: resolvedSubtitle,
      sheetName: exportSheetName,
    })
  }

  return (
    <section className="portal-card clientes-cierre-mensual-detalle-card">
      <header className="portal-card__header">
        <div className="portal-card__header-row">
          <div className="portal-card__heading">
            <h3 className="portal-card__title">{title}</h3>

            {resolvedSubtitle ? (
              <p className="portal-card__subtitle">{resolvedSubtitle}</p>
            ) : null}
          </div>

          <div className="portal-card__actions">
            <ExportButton disabled={!hasRows} onClick={handleExport} />
          </div>
        </div>
      </header>

      <div className="portal-card__body">
        {!hasRows ? (
          <div className="tickets-empty-state">{emptyMessage}</div>
        ) : (
          <div className="portal-table-responsive clientes-cierre-mensual-detalle-table">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Año</th>
                  <th>Servicio</th>
                  <th>Zona</th>
                  <th>Franquicia</th>
                  <th>Base total</th>
                  <th>Activos</th>
                  <th>Exonerados</th>
                  <th>Por cortar</th>
                  <th>Cortados</th>
                  <th>Ventas</th>
                  <th>Inst. finalizadas</th>
                  <th>Inst. pendientes</th>
                  <th>Reclamos finalizados</th>
                  <th>% Efectividad</th>
                  <th>% Backlog</th>
                  <th>% Corte</th>
                  <th>% Churn</th>
                </tr>
              </thead>

              <tbody>
                {safeRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Mes">{row.mes || 'N/D'}</td>
                    <td data-label="Año">{row.anio || 'N/D'}</td>
                    <td data-label="Servicio">{row.servicio}</td>
                    <td data-label="Zona">{row.zona}</td>
                    <td data-label="Franquicia">{row.franquicia}</td>
                    <td data-label="Base total">
                      {formatNumber(row.baseTotalClientes)}
                    </td>
                    <td data-label="Activos">
                      {formatNumber(row.totalClientesActivos)}
                    </td>
                    <td data-label="Exonerados">
                      {formatNumber(row.totalClientesExonerados)}
                    </td>
                    <td data-label="Por cortar">
                      {formatNumber(row.totalClientesPorCortar)}
                    </td>
                    <td data-label="Cortados">
                      {formatNumber(row.totalClientesCortados)}
                    </td>
                    <td data-label="Ventas">
                      {formatNumber(row.totalVenta)}
                    </td>
                    <td data-label="Inst. finalizadas">
                      {formatNumber(row.totalInstalacionesFinalizadas)}
                    </td>
                    <td data-label="Inst. pendientes">
                      {formatNumber(row.totalInstalacionesPendientes)}
                    </td>
                    <td data-label="Reclamos finalizados">
                      {formatNumber(row.totalReclamosFinalizados)}
                    </td>
                    <td data-label="% Efectividad">
                      {formatPercent(row.efectividadInstalacionPct)}%
                    </td>
                    <td data-label="% Backlog">
                      {formatPercent(row.backlogInstalacionPct)}%
                    </td>
                    <td data-label="% Corte">
                      {formatPercent(row.tasaCortePct)}%
                    </td>
                    <td data-label="% Churn">
                      {formatPercent(row.churnRateOperacionalPct)}%
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

export default ClientesCierreMensualDetalleTable