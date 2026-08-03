// src/modules/operaciones/pages/OperacionesOrdenesServicio.jsx

import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../../components/ModulePage'
import { apiGet } from '../../../core/services/api.js'

const PAGE_SIZE = 100

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalizeNumber(value))
}

function toDateOnly(value) {
  if (!value) return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const text = normalizeText(value)
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const veMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (veMatch) return `${veMatch[3]}-${veMatch[2]}-${veMatch[1]}`

  return ''
}

function formatDate(value, fallback = 'N/D') {
  const dateOnly = toDateOnly(value)

  if (!dateOnly) return fallback

  const [year, month, day] = dateOnly.split('-')
  return `${day}/${month}/${year}`
}

function getCurrentPeriodLabel() {
  const now = new Date()
  const monthLabels = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  return `${monthLabels[now.getMonth()]} ${now.getFullYear()}`
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(ensureObject(params)).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()

  return query ? `?${query}` : ''
}

function getSelectClassName(isActive = false) {
  return [
    'tickets-filter-select__input',
    isActive ? 'tickets-filter-select__input--active' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function getOptionValue(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return normalizeText(option)
  }

  return normalizeText(option?.value ?? option?.label ?? option?.name)
}

function getOptionLabel(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return normalizeText(option)
  }

  return normalizeText(option?.label ?? option?.value ?? option?.name)
}

function normalizeCatalogList(items = []) {
  const seen = new Set()
  const output = []

  ensureArray(items).forEach((item) => {
    const value = getOptionValue(item)

    if (!value) return

    const key = value.toUpperCase()

    if (seen.has(key)) return

    seen.add(key)
    output.push(value)
  })

  return output.sort((left, right) =>
    left.localeCompare(right, 'es', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload

  const source = ensureObject(payload)

  return ensureArray(
    source.rows ??
      source?.tables?.resumenOrdenesServicio ??
      source?.tables?.ordenesServicio ??
      source?.tables?.detalleOrdenes ??
      source?.data ??
      source?.response,
  )
}

function extractFilters(payload) {
  return ensureObject(ensureObject(payload).filters)
}

function extractKpis(payload) {
  return ensureObject(ensureObject(payload).kpis)
}

function extractCharts(payload) {
  return ensureObject(ensureObject(payload).charts)
}

function extractMeta(payload) {
  return ensureObject(ensureObject(payload).meta)
}

function normalizeOrderRow(row = {}, index = 0) {
  const pendientesMesesAnteriores = normalizeNumber(
    row.pendientesMesesAnteriores ?? row.pendientes_meses_anteriores,
  )
  const finalizadasMesesAnteriores = normalizeNumber(
    row.finalizadasMesesAnteriores ?? row.finalizadas_meses_anteriores,
  )
  const canceladasMesesAnteriores = normalizeNumber(
    row.canceladasMesesAnteriores ?? row.canceladas_meses_anteriores,
  )
  const generadasMesActual = normalizeNumber(
    row.generadasMesActual ?? row.generadas_mes_actual,
  )
  const pendientesMesActual = normalizeNumber(
    row.pendientesMesActual ?? row.pendienes_mes_actual,
  )
  const finalizadasMesActual = normalizeNumber(
    row.finalizadasMesActual ?? row.finalizadas_mes_actual,
  )
  const canceladasMesActual = normalizeNumber(
    row.canceladasMesActual ?? row.canceladas_mes_actual,
  )

  const totalPendientes = pendientesMesesAnteriores + pendientesMesActual
  const totalFinalizadas = finalizadasMesesAnteriores + finalizadasMesActual
  const totalCanceladas = canceladasMesesAnteriores + canceladasMesActual
  const baseOperativa =
    pendientesMesesAnteriores +
    finalizadasMesesAnteriores +
    canceladasMesesAnteriores +
    generadasMesActual

  const ordenesServicio = ensureArray(row.ordenesServicio)
  const contratos = ensureArray(row.contratos)

  return {
    id: normalizeText(row.id, `ordenes-${index + 1}`),
    fecha: toDateOnly(row.fecha),
    fechaRegistro: toDateOnly(row.fechaRegistro ?? row.fecha_registro),
    fechaAsignacion: toDateOnly(row.fechaAsignacion ?? row.fecha_asignacion),
    fechaFinalizacion: toDateOnly(
      row.fechaFinalizacion ?? row.fecha_finalizacion,
    ),

    zona: normalizeText(row.zona, 'SIN ZONA'),
    franquicia: normalizeText(row.franquicia, 'SIN FRANQUICIA'),
    servicio: normalizeText(row.servicio, 'SIN SERVICIO'),
    tipoServicio: normalizeText(
      row.tipoServicio ?? row.tipo_servicio,
      'SIN TIPO SERVICIO',
    ),
    tipoOrden: normalizeText(row.tipoOrden ?? row.tipo_orden, 'SIN TIPO ORDEN'),

    pendientesMesesAnteriores,
    finalizadasMesesAnteriores,
    canceladasMesesAnteriores,
    generadasMesActual,
    pendientesMesActual,
    finalizadasMesActual,
    canceladasMesActual,
    totalPendientes,
    totalFinalizadas,
    totalCanceladas,
    baseOperativa,

    ordenesServicio,
    ordenesServicioTexto: normalizeText(
      row.ordenesServicioTexto ?? row.ordenes_servicio,
    ),
    ordenesServicioCantidad: normalizeNumber(
      row.ordenesServicioCantidad ?? ordenesServicio.length,
    ),
    contratos,
    contratosTexto: normalizeText(row.contratosTexto ?? row.contratos),
    contratosCantidad: normalizeNumber(row.contratosCantidad ?? contratos.length),
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeFileName(value = 'ordenes-servicio') {
  return normalizeText(value, 'ordenes-servicio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function buildExcelHtml({ title, subtitle = '', columns = [], rows = [] }) {
  const headers = columns
    .map(
      (column) =>
        `<th style="background:#f3f7fc;color:#003d91;border:1px solid #dbe4ee;padding:8px;text-align:left;">${escapeHtml(column.header)}</th>`,
    )
    .join('')

  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value =
            typeof column.value === 'function'
              ? column.value(row)
              : row[column.key]

          return `<td style="border:1px solid #dbe4ee;padding:8px;">${escapeHtml(value)}</td>`
        })
        .join('')

      return `<tr>${cells}</tr>`
    })
    .join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
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
            <tr>${headers}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `
}

function downloadExcel({ filename, title, subtitle, columns, rows }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const html = buildExcelHtml({ title, subtitle, columns, rows })

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${sanitizeFileName(filename).replace(/\.xls$/i, '')}.xls`
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

function SelectFilter({ id, label, value, options, allLabel, onChange }) {
  const safeOptions = ensureArray(options)
  const isActive = normalizeText(value) !== ''

  return (
    <div className="tickets-filter-panel tickets-filter-panel--select">
      <label htmlFor={id} className="tickets-filter-panel__title">
        {label}
      </label>

      <div className="tickets-filter-select__control">
        <select
          id={id}
          className={getSelectClassName(isActive)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{allLabel}</option>

          {safeOptions.map((option) => {
            const optionValue = getOptionValue(option)
            const optionLabel = getOptionLabel(option)

            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            )
          })}
        </select>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  description,
  tone = 'neutral',
  decimals = 0,
  suffix = '',
}) {
  const valueText =
    typeof value === 'number'
      ? `${formatNumber(value, decimals)}${suffix}`
      : normalizeText(value, '0')

  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__header">
        <div className="kpi-card__heading">
          <span className="kpi-card__title">{title}</span>
        </div>

        <div className="kpi-card__value-wrap">
          <strong className="kpi-card__value">{valueText}</strong>
        </div>
      </div>

      {description ? (
        <div className="kpi-card__footer">
          <p className="kpi-card__description">{description}</p>
        </div>
      ) : null}
    </article>
  )
}

function MiniBarList({
  title,
  subtitle,
  data,
  valueKey = 'total',
  labelKey = 'label',
  emptyMessage = 'No hay datos disponibles.',
}) {
  const safeData = ensureArray(data)
  const maxValue = Math.max(
    1,
    ...safeData.map((item) => normalizeNumber(item[valueKey])),
  )

  return (
    <section className="portal-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">{title}</h3>
          {subtitle ? <p className="portal-card__subtitle">{subtitle}</p> : null}
        </div>
      </header>

      <div className="portal-card__body">
        {safeData.length === 0 ? (
          <div className="tickets-empty-state tickets-empty-state--compact">
            {emptyMessage}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {safeData.map((item) => {
              const mainValue = normalizeNumber(item[valueKey])

              return (
                <div
                  key={item.key || item[labelKey]}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'minmax(130px, 230px) minmax(0, 1fr) 80px',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--norte-blue-ink)',
                      fontSize: 12,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item[labelKey]}
                  >
                    {item[labelKey]}
                  </span>

                  <div
                    style={{
                      height: 14,
                      borderRadius: 999,
                      background: '#e8eef5',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(2, (mainValue / maxValue) * 100)}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'var(--norte-blue)',
                      }}
                    />
                  </div>

                  <strong
                    style={{
                      color: 'var(--norte-blue-deep)',
                      fontSize: 12,
                      textAlign: 'right',
                    }}
                  >
                    {formatNumber(mainValue)}
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function EvolutionChart({ data }) {
  const safeData = ensureArray(data)
  const maxValue = Math.max(
    1,
    ...safeData.map((item) =>
      Math.max(
        normalizeNumber(item.generadasMesActual),
        normalizeNumber(item.totalFinalizadas),
        normalizeNumber(item.totalPendientes),
      ),
    ),
  )

  return (
    <section className="portal-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">Evolución operativa por fecha</h3>
          <p className="portal-card__subtitle">
            Generadas, finalizadas y pendientes del resumen operativo.
          </p>
        </div>
      </header>

      <div className="portal-card__body">
        {safeData.length === 0 ? (
          <div className="tickets-empty-state tickets-empty-state--compact">
            No hay actividad diaria disponible.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${safeData.length}, minmax(22px, 1fr))`,
              gap: 7,
              alignItems: 'end',
              minHeight: 240,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {safeData.map((item) => {
              const generadasHeight =
                (normalizeNumber(item.generadasMesActual) / maxValue) * 170
              const finalizadasHeight =
                (normalizeNumber(item.totalFinalizadas) / maxValue) * 170
              const pendientesHeight =
                (normalizeNumber(item.totalPendientes) / maxValue) * 170

              return (
                <div
                  key={item.key || item.label}
                  title={`${formatDate(item.label, item.label)} · Generadas: ${formatNumber(
                    item.generadasMesActual,
                  )} · Finalizadas: ${formatNumber(
                    item.totalFinalizadas,
                  )} · Pendientes: ${formatNumber(item.totalPendientes)}`}
                  style={{
                    minWidth: 22,
                    display: 'grid',
                    gap: 4,
                    alignItems: 'end',
                    justifyItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 176,
                      display: 'flex',
                      alignItems: 'end',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: Math.max(2, generadasHeight),
                        borderRadius: '999px 999px 0 0',
                        background: 'var(--norte-blue)',
                      }}
                    />
                    <div
                      style={{
                        width: 6,
                        height: Math.max(2, finalizadasHeight),
                        borderRadius: '999px 999px 0 0',
                        background: '#10b981',
                      }}
                    />
                    <div
                      style={{
                        width: 6,
                        height: Math.max(2, pendientesHeight),
                        borderRadius: '999px 999px 0 0',
                        background: 'var(--norte-orange)',
                      }}
                    />
                  </div>

                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 10,
                      lineHeight: 1,
                    }}
                  >
                    {formatDate(item.label, item.label).slice(0, 5)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <div className="tornado-legend">
          <div className="tornado-legend__item">
            <span
              className="tornado-legend__swatch"
              style={{ backgroundColor: 'var(--norte-blue)' }}
            />
            <span>Generadas mes actual</span>
          </div>

          <div className="tornado-legend__item">
            <span
              className="tornado-legend__swatch"
              style={{ backgroundColor: '#10b981' }}
            />
            <span>Finalizadas total</span>
          </div>

          <div className="tornado-legend__item">
            <span
              className="tornado-legend__swatch"
              style={{ backgroundColor: 'var(--norte-orange)' }}
            />
            <span>Pendientes total</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function OperationalMatrix({ kpis }) {
  const rows = [
    {
      key: 'anteriores',
      label: 'Meses anteriores',
      pendientes: kpis.pendientesMesesAnteriores,
      finalizadas: kpis.finalizadasMesesAnteriores,
      canceladas: kpis.canceladasMesesAnteriores,
      total:
        normalizeNumber(kpis.pendientesMesesAnteriores) +
        normalizeNumber(kpis.finalizadasMesesAnteriores) +
        normalizeNumber(kpis.canceladasMesesAnteriores),
    },
    {
      key: 'actual',
      label: 'Mes actual',
      generadas: kpis.generadasMesActual,
      pendientes: kpis.pendientesMesActual,
      finalizadas: kpis.finalizadasMesActual,
      canceladas: kpis.canceladasMesActual,
      total: kpis.generadasMesActual,
    },
    {
      key: 'total',
      label: 'Total operativo',
      pendientes: kpis.totalPendientes,
      finalizadas: kpis.totalFinalizadas,
      canceladas: kpis.totalCanceladas,
      total: kpis.baseOperativa,
    },
  ]

  return (
    <section className="portal-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h3 className="portal-card__title">
            Matriz operativa de Órdenes de Servicio
          </h3>
          <p className="portal-card__subtitle">
            Basada en powerbi.resumen_ordenes_servicio. La columna original pendienes_mes_actual se muestra como pendientes mes actual.
          </p>
        </div>
      </header>

      <div className="portal-card__body">
        <div className="portal-table-responsive">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Bloque</th>
                <th>Generadas</th>
                <th>Pendientes</th>
                <th>Finalizadas</th>
                <th>Canceladas</th>
                <th>Total operativo</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <strong style={{ color: 'var(--norte-blue-deep)' }}>
                      {row.label}
                    </strong>
                  </td>
                  <td>{row.generadas === undefined ? '-' : formatNumber(row.generadas)}</td>
                  <td>{formatNumber(row.pendientes)}</td>
                  <td>{formatNumber(row.finalizadas)}</td>
                  <td>{formatNumber(row.canceladas)}</td>
                  <td>
                    <strong>{formatNumber(row.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function DetailTable({ rows }) {
  const [page, setPage] = useState(1)
  const safeRows = ensureArray(rows)
  const totalPages = Math.max(1, Math.ceil(safeRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const visibleRows = safeRows.slice(startIndex, startIndex + PAGE_SIZE)

  const columns = [
    { header: 'Fecha', value: (row) => formatDate(row.fecha) },
    { header: 'Fecha registro', value: (row) => formatDate(row.fechaRegistro) },
    { header: 'Fecha asignación', value: (row) => formatDate(row.fechaAsignacion) },
    {
      header: 'Fecha finalización',
      value: (row) => formatDate(row.fechaFinalizacion),
    },
    { header: 'Zona', value: (row) => row.zona },
    { header: 'Franquicia', value: (row) => row.franquicia },
    { header: 'Servicio', value: (row) => row.servicio },
    { header: 'Tipo servicio', value: (row) => row.tipoServicio },
    { header: 'Tipo orden', value: (row) => row.tipoOrden },
    {
      header: 'Pendientes meses anteriores',
      value: (row) => row.pendientesMesesAnteriores,
    },
    {
      header: 'Finalizadas meses anteriores',
      value: (row) => row.finalizadasMesesAnteriores,
    },
    {
      header: 'Canceladas meses anteriores',
      value: (row) => row.canceladasMesesAnteriores,
    },
    { header: 'Generadas mes actual', value: (row) => row.generadasMesActual },
    { header: 'Pendientes mes actual', value: (row) => row.pendientesMesActual },
    { header: 'Finalizadas mes actual', value: (row) => row.finalizadasMesActual },
    { header: 'Canceladas mes actual', value: (row) => row.canceladasMesActual },
    { header: 'Total pendientes', value: (row) => row.totalPendientes },
    { header: 'Total finalizadas', value: (row) => row.totalFinalizadas },
    { header: 'Total canceladas', value: (row) => row.totalCanceladas },
    { header: 'Base operativa', value: (row) => row.baseOperativa },
    { header: 'Cantidad órdenes', value: (row) => row.ordenesServicioCantidad },
    { header: 'Cantidad contratos', value: (row) => row.contratosCantidad },
    { header: 'Órdenes de servicio', value: (row) => row.ordenesServicioTexto },
    { header: 'Contratos', value: (row) => row.contratosTexto },
  ]

  function handleExport() {
    downloadExcel({
      filename: 'ordenes-servicio-operativas',
      title: 'Órdenes de Servicio Operativas',
      subtitle: `Registros exportados: ${formatNumber(safeRows.length)}. Fuente: powerbi.resumen_ordenes_servicio.`,
      columns,
      rows: safeRows,
    })
  }

  function goPrev() {
    setPage((current) => Math.max(1, current - 1))
  }

  function goNext() {
    setPage((current) => Math.min(totalPages, current + 1))
  }

  return (
    <section className="portal-card operaciones-table-card">
      <header className="portal-card__header">
        <div className="portal-card__header-row">
          <div className="portal-card__heading">
            <h3 className="portal-card__title">
              Detalle agregado de Órdenes de Servicio
            </h3>
            <p className="portal-card__subtitle">
              Vista agrupada por fecha, territorio, servicio, tipo de servicio y tipo de orden. Mostrando página {formatNumber(currentPage)} de {formatNumber(totalPages)}.
            </p>
          </div>

          <div className="portal-card__actions">
            <button
              type="button"
              className="portal-filter-action portal-filter-action--primary portal-filter-action--compact"
              disabled={safeRows.length === 0}
              onClick={handleExport}
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </header>

      <div className="portal-card__body">
        {safeRows.length === 0 ? (
          <div className="tickets-empty-state">
            No hay órdenes de servicio para los filtros seleccionados.
          </div>
        ) : (
          <>
            <div className="portal-table-responsive operaciones-table">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Zona</th>
                    <th>Franquicia</th>
                    <th>Servicio</th>
                    <th>Tipo servicio</th>
                    <th>Tipo orden</th>
                    <th>Pend. ant.</th>
                    <th>Fin. ant.</th>
                    <th>Canc. ant.</th>
                    <th>Gen. mes</th>
                    <th>Pend. mes</th>
                    <th>Fin. mes</th>
                    <th>Canc. mes</th>
                    <th>Total pend.</th>
                    <th>Base operativa</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.id}-${index}`}>
                      <td className="operaciones-table__primary">
                        {formatDate(row.fecha)}
                      </td>
                      <td>{row.zona}</td>
                      <td>{row.franquicia}</td>
                      <td>{row.servicio}</td>
                      <td>{row.tipoServicio}</td>
                      <td>{row.tipoOrden}</td>
                      <td>{formatNumber(row.pendientesMesesAnteriores)}</td>
                      <td>{formatNumber(row.finalizadasMesesAnteriores)}</td>
                      <td>{formatNumber(row.canceladasMesesAnteriores)}</td>
                      <td>{formatNumber(row.generadasMesActual)}</td>
                      <td>{formatNumber(row.pendientesMesActual)}</td>
                      <td>{formatNumber(row.finalizadasMesActual)}</td>
                      <td>{formatNumber(row.canceladasMesActual)}</td>
                      <td>{formatNumber(row.totalPendientes)}</td>
                      <td>{formatNumber(row.baseOperativa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                marginTop: 14,
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Filas {formatNumber(startIndex + 1)} - {formatNumber(Math.min(startIndex + PAGE_SIZE, safeRows.length))} de {formatNumber(safeRows.length)}
              </span>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="portal-filter-action portal-filter-action--compact"
                  disabled={currentPage <= 1}
                  onClick={goPrev}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  className="portal-filter-action portal-filter-action--primary portal-filter-action--compact"
                  disabled={currentPage >= totalPages}
                  onClick={goNext}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function OperacionesOrdenesServicio() {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    zona: '',
    franquicia: '',
    servicio: '',
    tipoServicio: '',
    tipoOrden: '',
  })

  const requestParams = useMemo(
    () => ({
      zona: filters.zona,
      franquicia: filters.franquicia,
      servicio: filters.servicio,
      tipoServicio: filters.tipoServicio,
      tipoOrden: filters.tipoOrden,
    }),
    [filters],
  )

  useEffect(() => {
    let isMounted = true

    async function fetchOrdenesServicio() {
      setLoading(true)
      setError('')

      try {
        const data = await apiGet(
          `/api/operaciones/ordenes-servicio${buildQueryString(requestParams)}`,
          {
            force: true,
            cache: false,
          },
        )

        if (!isMounted) return

        setPayload(data)
      } catch (requestError) {
        console.error('Error cargando Órdenes de Servicio:', requestError)

        if (!isMounted) return

        setPayload(null)
        setError(
          requestError?.message ||
            'No se pudo cargar el portal de Órdenes de Servicio.',
        )
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchOrdenesServicio()

    return () => {
      isMounted = false
    }
  }, [requestParams])

  const rows = useMemo(
    () => extractRows(payload).map((row, index) => normalizeOrderRow(row, index)),
    [payload],
  )

  const kpis = useMemo(() => extractKpis(payload), [payload])
  const charts = useMemo(() => extractCharts(payload), [payload])
  const responseFilters = useMemo(() => extractFilters(payload), [payload])
  const meta = useMemo(() => extractMeta(payload), [payload])

  const catalogs = useMemo(
    () => ({
      zonas: normalizeCatalogList(responseFilters.zonas),
      franquicias: normalizeCatalogList(responseFilters.franquicias),
      servicios: normalizeCatalogList(responseFilters.servicios),
      tiposServicio: normalizeCatalogList(responseFilters.tiposServicio),
      tiposOrden: normalizeCatalogList(responseFilters.tiposOrden),
    }),
    [responseFilters],
  )

  const hasActiveFilters = Boolean(
    filters.zona ||
      filters.franquicia ||
      filters.servicio ||
      filters.tipoServicio ||
      filters.tipoOrden,
  )

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleReset() {
    setFilters({
      zona: '',
      franquicia: '',
      servicio: '',
      tipoServicio: '',
      tipoOrden: '',
    })
  }

  const periodLabel = getCurrentPeriodLabel()
  const warnings = ensureArray(meta.warnings)

  return (
    <ModulePage
      title="Operaciones · Órdenes de Servicio"
      description="Vista operativa agregada desde powerbi.resumen_ordenes_servicio."
    >
      <section className="portal-card">
        <header className="portal-card__header">
          <div className="portal-card__heading">
            <h3 className="portal-card__title">
              Filtros de Órdenes de Servicio
            </h3>
            <p className="portal-card__subtitle">
              Segmenta la vista por zona, franquicia, servicio, tipo de servicio y tipo de orden.
            </p>
          </div>
        </header>

        <div className="portal-card__body">
          <div className="portal-filter-grid">
            <article className="tickets-filter-panel tickets-filter-panel--summary">
              <span className="tickets-filter-panel__title">
                Período operativo
              </span>
              <strong className="tickets-filter-panel__value">
                {periodLabel}
              </strong>
            </article>

            <SelectFilter
              id="ordenes-zona"
              label="Zona"
              value={filters.zona}
              options={catalogs.zonas}
              allLabel="TODAS LAS ZONAS"
              onChange={(value) => handleFilterChange('zona', value)}
            />

            <SelectFilter
              id="ordenes-franquicia"
              label="Franquicia"
              value={filters.franquicia}
              options={catalogs.franquicias}
              allLabel="TODAS LAS FRANQUICIAS"
              onChange={(value) => handleFilterChange('franquicia', value)}
            />

            <SelectFilter
              id="ordenes-servicio"
              label="Servicio"
              value={filters.servicio}
              options={catalogs.servicios}
              allLabel="TODOS LOS SERVICIOS"
              onChange={(value) => handleFilterChange('servicio', value)}
            />

            <SelectFilter
              id="ordenes-tipo-servicio"
              label="Tipo servicio"
              value={filters.tipoServicio}
              options={catalogs.tiposServicio}
              allLabel="TODOS LOS TIPOS"
              onChange={(value) => handleFilterChange('tipoServicio', value)}
            />

            <SelectFilter
              id="ordenes-tipo-orden"
              label="Tipo orden"
              value={filters.tipoOrden}
              options={catalogs.tiposOrden}
              allLabel="TODOS LOS TIPOS"
              onChange={(value) => handleFilterChange('tipoOrden', value)}
            />

            <div className="portal-filter-actions">
              <button
                type="button"
                className="portal-filter-action portal-filter-action--primary portal-filter-action--compact"
                disabled={!hasActiveFilters}
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="portal-feedback portal-feedback--loading">
          Cargando Órdenes de Servicio...
        </div>
      ) : error ? (
        <div className="portal-feedback portal-feedback--error">{error}</div>
      ) : (
        <>
          {warnings.length > 0 ? (
            <section className="portal-card">
              <div className="portal-card__body">
                <div className="portal-feedback portal-feedback--info">
                  {warnings[0]}
                </div>
              </div>
            </section>
          ) : null}

          <section className="clientes-cierre-mensual-kpi-section">
            <div className="kpi-grid">
              <KpiCard
                title="Pendientes anteriores"
                value={normalizeNumber(kpis.pendientesMesesAnteriores)}
                description="Órdenes de meses anteriores que siguen pendientes."
                tone="warning"
              />

              <KpiCard
                title="Finalizadas anteriores"
                value={normalizeNumber(kpis.finalizadasMesesAnteriores)}
                description="Backlog anterior finalizado en el mes actual."
                tone="success"
              />

              <KpiCard
                title="Canceladas anteriores"
                value={normalizeNumber(kpis.canceladasMesesAnteriores)}
                description="Backlog anterior cancelado en el mes actual."
                tone="danger"
              />

              <KpiCard
                title="Generadas mes actual"
                value={normalizeNumber(kpis.generadasMesActual)}
                description="Órdenes creadas durante el mes actual."
              />
            </div>

            <div className="kpi-grid">
              <KpiCard
                title="Pendientes mes actual"
                value={normalizeNumber(kpis.pendientesMesActual)}
                description="Órdenes del mes actual aún pendientes."
                tone="warning"
              />

              <KpiCard
                title="Finalizadas mes actual"
                value={normalizeNumber(kpis.finalizadasMesActual)}
                description="Órdenes creadas y finalizadas en el mes actual."
                tone="success"
              />

              <KpiCard
                title="Canceladas mes actual"
                value={normalizeNumber(kpis.canceladasMesActual)}
                description="Órdenes creadas y canceladas en el mes actual."
                tone="danger"
              />

              <KpiCard
                title="Base operativa"
                value={normalizeNumber(kpis.baseOperativa)}
                description="Backlog anterior gestionado más órdenes generadas del mes."
              />
            </div>

            <div className="kpi-grid">
              <KpiCard
                title="Total pendientes"
                value={normalizeNumber(kpis.totalPendientes)}
                description="Pendientes anteriores más pendientes del mes actual."
                tone="warning"
              />

              <KpiCard
                title="Total finalizadas"
                value={normalizeNumber(kpis.totalFinalizadas)}
                description="Finalizadas anteriores más finalizadas del mes actual."
                tone="success"
              />

              <KpiCard
                title="Total canceladas"
                value={normalizeNumber(kpis.totalCanceladas)}
                description="Canceladas anteriores más canceladas del mes actual."
                tone="danger"
              />

              <KpiCard
                title="% finalización mes"
                value={normalizeNumber(kpis.tasaFinalizacionMesActualPct)}
                description="Finalizadas del mes sobre generadas del mes actual."
                decimals={2}
                suffix="%"
                tone="success"
              />
            </div>
          </section>

          <OperationalMatrix kpis={kpis} />

          <div className="portal-operational-grid">
            <EvolutionChart data={charts.evolucionOperativaPorFecha} />

            <MiniBarList
              title="Órdenes por tipo de orden"
              subtitle="Base operativa agrupada por tipo de orden."
              data={charts.ordenesPorTipoOrden}
              valueKey="baseOperativa"
            />
          </div>

          <div className="portal-operational-grid">
            <MiniBarList
              title="Pendientes por zona"
              subtitle="Pendientes anteriores más pendientes del mes actual."
              data={charts.pendientesPorZona}
              valueKey="totalPendientes"
            />

            <MiniBarList
              title="Pendientes por franquicia"
              subtitle="Pendientes anteriores más pendientes del mes actual."
              data={charts.pendientesPorFranquicia}
              valueKey="totalPendientes"
            />
          </div>

          <div className="portal-operational-grid">
            <MiniBarList
              title="Órdenes por servicio"
              subtitle="Base operativa agrupada por servicio."
              data={charts.ordenesPorServicio}
              valueKey="baseOperativa"
            />

            <MiniBarList
              title="Órdenes por tipo de servicio"
              subtitle="Base operativa agrupada por tipo de servicio."
              data={charts.ordenesPorTipoServicio}
              valueKey="baseOperativa"
            />
          </div>
          <DetailTable key={JSON.stringify(requestParams)}
          rows={rows}
          />
        </>
      )}
    </ModulePage>
  )
}

export default OperacionesOrdenesServicio
