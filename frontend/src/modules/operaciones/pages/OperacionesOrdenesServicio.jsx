import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ArrowUp, Download } from 'lucide-react'

import ModulePage from '../../../components/ModulePage'

import {
  apiGet,
} from '../../../core/services/api.js'

const NUMBER_FORMAT =
  new Intl.NumberFormat(
    'es-VE',
    {
      maximumFractionDigits: 0,
    },
  )

const DECIMAL_FORMAT =
  new Intl.NumberFormat(
    'es-VE',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )

const PERCENT_FORMAT =
  new Intl.NumberFormat(
    'es-VE',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )

const ALLOWED_ORDER_TYPES = [
  'CAMBIO DE EQUIPO',
  'CAMBIO DE TECNOLOGIA',
  'INSTALACION',
  'VISITA TECNICA',
  'VISITA TECNICA GARANTIA',
]

function numberValue(value) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function formatInteger(value) {
  return NUMBER_FORMAT.format(
    numberValue(value),
  )
}

function formatDecimal(value) {
  return DECIMAL_FORMAT.format(
    numberValue(value),
  )
}

function formatPercent(value) {
  return `${PERCENT_FORMAT.format(
    numberValue(value),
  )}%`
}

function ensureArray(value) {
  return Array.isArray(value)
    ? value
    : []
}

function normalizeOrderType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toUpperCase()
}

function currentPeriodLabel() {
  return new Intl.DateTimeFormat(
    'es-VE',
    {
      month: 'long',
      year: 'numeric',
    },
  )
    .format(new Date())
    .toUpperCase()
}

function scrollToSection(id) {
  const element =
    document.getElementById(id)

  if (!element) {
    return
  }

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function FloatingBackToTop() {
  return (
    <button
      type="button"
      className="operaciones-os-floating-top"
      aria-label="Volver al inicio"
      title="Volver al inicio"
      onClick={() =>
        scrollToSection(
          'ordenes-servicio-inicio',
        )
      }
    >
      <ArrowUp aria-hidden="true" size={22} />
    </button>
  )
}

function KpiCard({
  label,
  value,
  note,
  tone = 'blue',
}) {
  return (
    <article
      className={[
        'operaciones-os-kpi',
        `operaciones-os-kpi--${tone}`,
      ].join(' ')}
    >
      <span className="operaciones-os-kpi__label">
        {label}
      </span>

      <strong className="operaciones-os-kpi__value">
        {value}
      </strong>

      {note ? (
        <span className="operaciones-os-kpi__note">
          {note}
        </span>
      ) : null}
    </article>
  )
}

function OperationalKpis({
  kpis,
}) {
  const current =
    kpis?.mesActual || {}

  const previous =
    kpis?.mesesAnteriores || {}

  return (
    <div className="operaciones-os-period-grid">

      <section className="portal-card operaciones-os-period-card">
        <header className="operaciones-os-period-card__header">
          Mes actual · {currentPeriodLabel()}
        </header>

        <div className="operaciones-os-primary-total">
          <span>
            Total órdenes
          </span>

          <strong>
            {formatInteger(
              current.total,
            )}
          </strong>
        </div>

        <div className="operaciones-os-three-kpis">

          <KpiCard
            label="Pendientes"
            value={formatInteger(
              current.pendientes,
            )}
            note={formatPercent(
              current.pctPendientes,
            )}
            tone="orange"
          />

          <KpiCard
            label="Finalizadas"
            value={formatInteger(
              current.finalizadas,
            )}
            note={formatPercent(
              current.pctFinalizadas,
            )}
            tone="green"
          />

          <KpiCard
            label="Canceladas"
            value={formatInteger(
              current.canceladas,
            )}
            note={formatPercent(
              current.pctCanceladas,
            )}
            tone="gray"
          />

        </div>
      </section>

      <section className="portal-card operaciones-os-period-card operaciones-os-period-card--previous">

        <header className="operaciones-os-period-card__header">
          Meses anteriores
        </header>

        <div className="operaciones-os-primary-total">
          <span>
            Total órdenes
          </span>

          <strong>
            {formatInteger(
              previous.total,
            )}
          </strong>
        </div>

        <div className="operaciones-os-three-kpis">

          <KpiCard
            label="Pendientes"
            value={formatInteger(
              previous.pendientes,
            )}
            tone="orange"
          />

          <KpiCard
            label="Finalizadas"
            value={formatInteger(
              previous.finalizadas,
            )}
            tone="green"
          />

          <KpiCard
            label="Canceladas"
            value={formatInteger(
              previous.canceladas,
            )}
            tone="gray"
          />

        </div>
      </section>

    </div>
  )
}

function OperationalRanking({
  data,
  variant = 'zone',
}) {
  const rows =
    ensureArray(data)
      .map((row) => {
        const pendientes = numberValue(row.pendientes)
        const ejecutadas = numberValue(row.ejecutadas)
        const total = pendientes + ejecutadas

        return {
          ...row,
          pendientes,
          ejecutadas,
          total,
          pctPendientes: total > 0 ? (pendientes / total) * 100 : 0,
          pctEjecutadas: total > 0 ? (ejecutadas / total) * 100 : 0,
        }
      })
      .filter((row) => row.total > 0)
      .sort((left, right) => {
        if (right.total !== left.total) return right.total - left.total
        if (right.pendientes !== left.pendientes) return right.pendientes - left.pendientes
        return String(left.label || '').localeCompare(String(right.label || ''), 'es', { sensitivity: 'base' })
      })

  if (!rows.length) {
    return (
      <div className="operaciones-os-empty">
        Sin información.
      </div>
    )
  }

  const maxTotal = Math.max(...rows.map((row) => row.total), 1)

  return (
    <div className={`operaciones-os-ranking operaciones-os-ranking--${variant}`}>
      <div className="operaciones-os-ranking__legend" aria-hidden="true">
        <span><i className="operaciones-os-ranking__dot operaciones-os-ranking__dot--executed" />Ejecutadas</span>
        <span><i className="operaciones-os-ranking__dot operaciones-os-ranking__dot--pending" />Pendientes</span>
      </div>

      <div className="operaciones-os-ranking__scroll">
        <div className="operaciones-os-ranking__list">
          {rows.map((row, index) => (
            <div className="operaciones-os-ranking__row" key={`${row.label}-${index}`}>
              <div className="operaciones-os-ranking__head">
                <strong title={row.label}>{row.label}</strong>
                <span>{formatInteger(row.total)} O.S.</span>
              </div>

              <div className="operaciones-os-ranking__track" aria-label={`${row.label}: ${formatInteger(row.ejecutadas)} ejecutadas y ${formatInteger(row.pendientes)} pendientes`}>
                <span
                  className="operaciones-os-ranking__bar operaciones-os-ranking__bar--executed"
                  style={{ width: `${(row.ejecutadas / maxTotal) * 100}%` }}
                />
                <span
                  className="operaciones-os-ranking__bar operaciones-os-ranking__bar--pending"
                  style={{ width: `${(row.pendientes / maxTotal) * 100}%` }}
                />
              </div>

              <div className="operaciones-os-ranking__metrics">
                <span><b>{formatInteger(row.ejecutadas)}</b> ejecutadas <small>{formatPercent(row.pctEjecutadas)}</small></span>
                <span><b>{formatInteger(row.pendientes)}</b> pendientes <small>{formatPercent(row.pctPendientes)}</small></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EvolutionChart({
  rows,
}) {
  const data = ensureArray(rows)

  if (!data.length) {
    return (
      <div className="operaciones-os-empty">
        Sin información.
      </div>
    )
  }

  return (
    <div className="operaciones-os-evolution-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 28, right: 18, bottom: 8, left: 4 }}
        >
          <CartesianGrid stroke="#d8dee8" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="key"
            tickFormatter={(value) => {
              const [year, month] = String(value || '').split('-')
              const labels = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
              const monthIndex = Number(month) - 1
              return monthIndex >= 0 && monthIndex < 12 ? `${labels[monthIndex]} ${year}` : value
            }}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />

          <YAxis hide />

          <Tooltip
            labelFormatter={(value) => String(value || '')}
            formatter={(value, name) => [formatInteger(value), name]}
          />

          <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: 10 }} />

          <Bar dataKey="generadas" name="Total nuevas" fill="#15558a">
            <LabelList
              dataKey="generadas"
              position="top"
              formatter={(value) => numberValue(value) > 0 ? formatInteger(value) : ''}
              style={{ fill: '#15558a', fontSize: 10, fontWeight: 600 }}
            />
          </Bar>

          <Bar dataKey="finalizadas" name="Finalizadas nuevas" fill="#8ec5f4" />
          <Bar dataKey="pendientes" name="Pendientes nuevas" fill="#a7adb4" />
          <Bar dataKey="canceladas" name="Canceladas nuevas" fill="#d84555" />
          <Bar dataKey="finalizadasAnteriores" name="Finalizadas meses anteriores" fill="#db7142" />
          <Bar dataKey="pendientesAnteriores" name="Pendientes meses anteriores" fill="#ff5c00">
            <LabelList
              dataKey="pendientesAnteriores"
              position="top"
              formatter={(value) => numberValue(value) > 0 ? formatInteger(value) : ''}
              style={{ fill: '#d94f00', fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AnalyticsBlock({
  id,
  title,
  kpis,
  charts,
  showEvolution = true,
}) {
  return (
    <section
      id={id}
      className="operaciones-os-dashboard-block"
    >
      <header className="operaciones-os-type-heading">
        <h2>
          {title}
        </h2>
      </header>

      <OperationalKpis
        kpis={kpis}
      />

      <div className="operaciones-os-charts-layout">

        <section className="portal-card">
          <header className="portal-card__header">
            <div>
              <h3 className="portal-card__title">
                O.S. por zona · Pendientes + ejecutadas
              </h3>
            </div>
          </header>

          <div className="operaciones-os-chart-padding">
            <OperationalRanking
              data={charts?.porZona}
              variant="zone"
            />
          </div>
        </section>

        <section className="portal-card">
          <header className="portal-card__header">
            <div>
              <h3 className="portal-card__title">
                O.S. por franquicia · Pendientes + ejecutadas
              </h3>
            </div>
          </header>

          <div className="operaciones-os-chart-padding">
            <OperationalRanking
              data={charts?.porFranquicia}
              variant="franchise"
            />
          </div>
        </section>

      </div>

      {showEvolution ? (
        <section className="portal-card operaciones-os-evolution-card">
          <header className="portal-card__header">
            <div className="portal-card__heading">
              <h3 className="portal-card__title">
                Evolución y detalle de pendientes
              </h3>
              <p className="portal-card__subtitle">
                Histórico mensual de órdenes nuevas y de la gestión pendiente/finalizada proveniente de meses anteriores.
              </p>
            </div>
          </header>

          <div className="operaciones-os-chart-padding">
            <EvolutionChart rows={charts?.historicoMensual} />
          </div>
        </section>
      ) : null}
    </section>
  )
}


function escapeExcelCell(value) {
  return String(value ?? '')
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
}

function exportTechnicianRanking(rows) {
  const safeRows = ensureArray(rows)
  if (!safeRows.length) return

  const headers = [
    'Técnico',
    'Asignadas',
    'Finalizadas',
    'En ejecución',
    '% finalización',
    'Prom. asignación',
    'Prom. ejecución',
  ]

  const body = safeRows
    .map((row) => [
      row.tecnico,
      formatInteger(row.asignadas),
      formatInteger(row.finalizadas),
      formatInteger(row.enEjecucion),
      formatPercent(row.pctFinalizacion),
      `${formatDecimal(row.promedioAsignacionDias)} d`,
      `${formatDecimal(row.promedioEjecucionDias)} d`,
    ])
    .map((cells) => `<tr>${cells.map((cell) => `<td>${escapeExcelCell(cell)}</td>`).join('')}</tr>`)
    .join('')

  const content = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="UTF-8" />',
    '<style>',
    'body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;}',
    'h1{color:#003d91;font-size:18px;}',
    'table{border-collapse:collapse;}',
    'th{background:#0057b8;color:#fff;font-weight:600;border:1px solid #dbe4ee;padding:8px;}',
    'td{border:1px solid #dbe4ee;padding:8px;}',
    '</style></head><body>',
    `<h1>Ranking de técnicos · ${escapeExcelCell(currentPeriodLabel())}</h1>`,
    '<table><thead><tr>',
    headers.map((header) => `<th>${escapeExcelCell(header)}</th>`).join(''),
    '</tr></thead><tbody>',
    body,
    '</tbody></table></body></html>',
  ].join('')

  const blob = new Blob(['\ufeff', content], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const periodKey = new Date().toISOString().slice(0, 7)

  link.href = url
  link.download = `ranking_tecnicos_${periodKey}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function TechnicianSection({
  data,
}) {
  const tech =
    data?.technicians?.kpis ||
    {}

  const rows =
    ensureArray(
      data?.technicians?.ranking,
    )

  if (!rows.length) {
    return null
  }

  return (
    <section id="ordenes-servicio-tecnicos" className="operaciones-os-dashboard-block">

      <header className="operaciones-os-type-heading">
        <h2>
          Desempeño de técnicos
        </h2>
      </header>

      <div className="operaciones-os-tech-kpis">

        <KpiCard
          label="Técnicos activos"
          value={formatInteger(
            tech.tecnicosActivos,
          )}
        />

        <KpiCard
          label="O.S. finalizadas"
          value={formatInteger(
            tech.finalizadas,
          )}
          tone="green"
        />

        <KpiCard
          label="En ejecución"
          value={formatInteger(
            tech.enEjecucion,
          )}
          tone="orange"
        />

        <KpiCard
          label="Promedio asignación"
          value={`${formatDecimal(
            tech.promedioAsignacionDias,
          )} d`}
        />

        <KpiCard
          label="Promedio ejecución"
          value={`${formatDecimal(
            tech.promedioEjecucionDias,
          )} d`}
        />

      </div>

      <section className="portal-card">

        <header className="portal-card__header">
          <div className="portal-card__header-row">
            <div className="portal-card__heading">
              <h3 className="portal-card__title">
                Ranking de técnicos
              </h3>
              <p className="portal-card__subtitle">
                Desempeño consolidado por técnico.
              </p>
            </div>

            <div className="portal-card__actions">
              <button
                type="button"
                className="portal-action-button portal-action-button--primary operaciones-os-export-button"
                onClick={() => exportTechnicianRanking(rows)}
                disabled={!rows.length}
              >
                <Download aria-hidden="true" size={16} />
                Exportar Excel
              </button>
            </div>
          </div>
        </header>

        <div className="operaciones-os-table-scroll">

          <table className="portal-table operaciones-os-tech-table">

            <thead>
              <tr>
                <th>Técnico</th>
                <th>Asignadas</th>
                <th>Finalizadas</th>
                <th>En ejecución</th>
                <th>% finalización</th>
                <th>Prom. asignación</th>
                <th>Prom. ejecución</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row) => (
                  <tr
                    key={
                      row.tecnico
                    }
                  >
                    <td>
                      <strong>
                        {row.tecnico}
                      </strong>
                    </td>

                    <td>
                      {formatInteger(
                        row.asignadas,
                      )}
                    </td>

                    <td>
                      {formatInteger(
                        row.finalizadas,
                      )}
                    </td>

                    <td>
                      {formatInteger(
                        row.enEjecucion,
                      )}
                    </td>

                    <td>
                      {formatPercent(
                        row.pctFinalizacion,
                      )}
                    </td>

                    <td>
                      {formatDecimal(
                        row.promedioAsignacionDias,
                      )} d
                    </td>

                    <td>
                      {formatDecimal(
                        row.promedioEjecucionDias,
                      )} d
                    </td>
                  </tr>
                ),
              )}
            </tbody>

          </table>
        </div>
      </section>

    </section>
  )
}

export default function OperacionesOrdenesServicio() {
  const [
    data,
    setData,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const response =
          await apiGet(
            '/api/operaciones/ordenes-servicio?limit=5000',
          )

        if (!cancelled) {
          setData(response)
        }
      } catch (
        requestError
      ) {
        if (!cancelled) {
          setError(
            requestError?.message ||
              'No fue posible cargar Órdenes de Servicio.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const typeBlocks =
    useMemo(
      () => {
        const available =
          new Map(
            ensureArray(
              data?.orderTypeBlocks,
            ).map(
              (block) => [
                normalizeOrderType(
                  block.tipoOrden,
                ),
                block,
              ],
            ),
          )

        return ALLOWED_ORDER_TYPES
          .map(
            (type) =>
              available.get(type),
          )
          .filter(Boolean)
      },
      [
        data?.orderTypeBlocks,
      ],
    )

  return (
    <ModulePage
      title="Operaciones · Órdenes de Servicio"
      description="Seguimiento operativo de órdenes de servicio."
    >
      <div
        id="ordenes-servicio-inicio"
        className="operaciones-os-standard-page"
      >
        <FloatingBackToTop />

        {loading ? (
          <div className="portal-feedback portal-feedback--loading">
            Cargando Órdenes de Servicio...
          </div>
        ) : null}

        {error ? (
          <div className="portal-feedback portal-feedback--error">
            {error}
          </div>
        ) : null}

        {!loading &&
        !error &&
        data ? (
          <>
            <nav className="portal-card operaciones-os-access" aria-label="Acceso rápido a Órdenes de Servicio">
              <div className="operaciones-os-access__heading">
                <strong>Acceso rápido</strong>
                <span>Seleccione una sección para ir directamente a su ubicación.</span>
              </div>

              <div className="operaciones-os-access__links">
                <button
                  type="button"
                  className="operaciones-os-access__link"
                  onClick={() => scrollToSection('ordenes-servicio-general')}
                >
                  <span>01</span>
                  <strong>General</strong>
                </button>

                {typeBlocks.map((block, index) => (
                  <button
                    key={block.key}
                    type="button"
                    className="operaciones-os-access__link"
                    onClick={() => scrollToSection(`ordenes-servicio-${block.key}`)}
                  >
                    <span>{String(index + 2).padStart(2, '0')}</span>
                    <strong>{block.tipoOrden}</strong>
                  </button>
                ))}

                <button
                  type="button"
                  className="operaciones-os-access__link"
                  onClick={() => scrollToSection('ordenes-servicio-tecnicos')}
                >
                  <span>{String(typeBlocks.length + 2).padStart(2, '0')}</span>
                  <strong>Técnicos</strong>
                </button>
              </div>
            </nav>

            <AnalyticsBlock
              id="ordenes-servicio-general"
              title="General"
              kpis={
                data.kpis
              }
              charts={
                data.charts
              }
              showEvolution={false}
            />

            {typeBlocks.map(
              (block) => (
                <AnalyticsBlock
                  key={
                    block.key
                  }
                  id={
                    `ordenes-servicio-${block.key}`
                  }
                  title={
                    block.tipoOrden
                  }
                  kpis={
                    block.kpis
                  }
                  charts={
                    block.charts
                  }
                />
              ),
            )}

            <TechnicianSection
              data={data}
            />
          </>
        ) : null}
      </div>
    </ModulePage>
  )
}