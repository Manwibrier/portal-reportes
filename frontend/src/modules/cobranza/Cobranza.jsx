import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import KpiCard from '../../components/KpiCard'
import ModulePage from '../../components/ModulePage'
import {
  apiGet,
} from '../../core/services/api.js'

const DEFAULT_LIMIT = 300

const CHART_COLORS = {
  cargos: '#0f4c81',
  cobrado: '#16a34a',
  xCobrar: '#f97316',
  recuperado: '#7c3aed',
  posterior: '#64748b',
}

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'franquicias', label: 'Franquicias' },
  { id: 'clientes', label: 'Clientes X Cobrar' },
  { id: 'historico', label: 'Histórico' },
]

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalizeNumber(value))
}

function formatMoney(value) {
  return `US$ ${formatNumber(value, 2)}`
}

function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

function CobranzaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="cobranza-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => {
        const isMoney = String(item.dataKey || '').toLowerCase().includes('monto')
        const isPct = String(item.dataKey || '').toLowerCase().includes('pct')

        return (
          <span key={item.dataKey}>
            {item.name}: {isMoney ? formatMoney(item.value) : `${formatNumber(item.value, isPct ? 2 : 0)}${isPct ? '%' : ''}`}
          </span>
        )
      })}
    </div>
  )
}

function FilterBar({ filters, data, loading, onChange, onSubmit }) {
  const options = ensureObject(data?.filtrosDisponibles)

  return (
    <form className="portal-card cobranza-filter-bar" onSubmit={onSubmit}>
      <label className="cobranza-filter-field">
        <span>Periodo</span>
        <input
          type="month"
          value={filters.periodo}
          onChange={(event) => onChange('periodo', event.target.value)}
        />
      </label>

      <label className="cobranza-filter-field">
        <span>Zona</span>
        <select
          value={filters.zona}
          onChange={(event) => onChange('zona', event.target.value)}
        >
          <option value="">Todas</option>
          {ensureArray(options.zonas).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="cobranza-filter-field">
        <span>Franquicia</span>
        <select
          value={filters.franquicia}
          onChange={(event) => onChange('franquicia', event.target.value)}
        >
          <option value="">Todas</option>
          {ensureArray(options.franquicias).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="cobranza-filter-field">
        <span>Buscar</span>
        <input
          type="search"
          placeholder="RIF, cliente o contrato"
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
        />
      </label>

      <button type="submit" className="portal-button portal-button--primary">
        {loading ? 'Cargando...' : 'Actualizar'}
      </button>
    </form>
  )
}

function TabBar({ activeTab, onChange }) {
  return (
    <div className="portal-card cobranza-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? 'is-active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function KpiSection({ kpis }) {
  const safe = ensureObject(kpis)

  const items = [
    {
      key: 'cargos',
      title: '1.1 Cargos',
      value: safe.totalCargos,
      description: `Monto cargos: ${formatMoney(safe.montoCargosUsd)}`,
      format: 'number',
    },
    {
      key: 'xCobrar',
      title: '2.1 X Cobrar',
      value: safe.totalXCobrar,
      description: `Saldo: ${formatMoney(safe.montoXCobrarUsd)}`,
      format: 'number',
    },
    {
      key: 'pctXCobrar',
      title: '2.3 % X Cobrar',
      value: safe.pctXCobrar,
      description: 'Pendiente sobre cargos generados.',
      format: 'number',
      suffix: '%',
      decimals: 2,
    },
    {
      key: 'cobrado',
      title: '3.1 Cobrado',
      value: safe.totalCobrado,
      description: `Monto cobrado: ${formatMoney(safe.montoCobradoUsd)}`,
      format: 'number',
    },
    {
      key: 'pctCobrado',
      title: '3.3 % Cobrado',
      value: safe.pctCobrado,
      description: 'Cobrado sobre cargos generados.',
      format: 'number',
      suffix: '%',
      decimals: 2,
    },
    {
      key: 'posterior',
      title: '4.1 Cargos Post',
      value: safe.totalPosterior,
      description: `Monto post: ${formatMoney(safe.montoPosteriorUsd)}`,
      format: 'number',
    },
  ]

  return (
    <section className="portal-insights-section">
      <header className="portal-insights-header">
        <h2 className="portal-insights-title">Resumen ejecutivo</h2>
        <p className="portal-insights-subtitle">
          Base de medición: cargos generados. Recuperados y posteriores se muestran separados.
        </p>
      </header>

      <div className="kpi-grid cobranza-kpi-grid">
        {items.map((item) => (
          <KpiCard
            key={item.key}
            title={item.title}
            value={item.value}
            description={item.description}
            format={item.format}
            suffix={item.suffix}
            decimals={item.decimals}
            locale="es-VE"
          />
        ))}
      </div>

      <div className="portal-card cobranza-summary-strip">
        <div>
          <span>1.2 Mto Cargos</span>
          <strong>{formatMoney(safe.montoCargosUsd)}</strong>
        </div>
        <div>
          <span>2.2 Mto X Cobrar</span>
          <strong>{formatMoney(safe.montoXCobrarUsd)}</strong>
        </div>
        <div>
          <span>3.2 Mto Cobrado</span>
          <strong>{formatMoney(safe.montoCobradoUsd)}</strong>
        </div>
        <div>
          <span>7.1 Recuperados</span>
          <strong>{formatNumber(safe.totalRecuperado)} / {formatMoney(safe.montoRecuperadoUsd)}</strong>
        </div>
      </div>
    </section>
  )
}

function ResumenCharts({ data }) {
  const charts = ensureObject(data?.charts)
  const porFranquicia = ensureArray(charts.porFranquicia).slice(0, 10)
  const porZona = ensureArray(charts.porZona).slice(0, 10)

  return (
    <div className="cobranza-chart-grid">
      <section className="portal-card cobranza-chart-card">
        <header className="portal-card__header">
          <div className="portal-card__heading">
            <h2 className="portal-card__title">Cobrado vs X Cobrar por franquicia</h2>
            <p className="portal-card__subtitle">Top franquicias por cargos generados.</p>
          </div>
        </header>

        <div className="portal-card__body cobranza-chart-card__body">
          <ResponsiveContainer width="100%" height={292}>
            <BarChart data={porFranquicia}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={64} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CobranzaTooltip />} />
              <Legend />
              <Bar dataKey="totalCobrado" name="Cobrado" fill={CHART_COLORS.cobrado} radius={[8, 8, 0, 0]} />
              <Bar dataKey="totalXCobrar" name="X Cobrar" fill={CHART_COLORS.xCobrar} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="portal-card cobranza-chart-card">
        <header className="portal-card__header">
          <div className="portal-card__heading">
            <h2 className="portal-card__title">Distribución por zona</h2>
            <p className="portal-card__subtitle">Cargos, cobrado y pendiente por zona.</p>
          </div>
        </header>

        <div className="portal-card__body cobranza-chart-card__body">
          <ResponsiveContainer width="100%" height={292}>
            <BarChart data={porZona}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={64} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CobranzaTooltip />} />
              <Legend />
              <Bar dataKey="totalCargos" name="Cargos" fill={CHART_COLORS.cargos} radius={[8, 8, 0, 0]} />
              <Bar dataKey="totalCobrado" name="Cobrado" fill={CHART_COLORS.cobrado} radius={[8, 8, 0, 0]} />
              <Bar dataKey="totalXCobrar" name="X Cobrar" fill={CHART_COLORS.xCobrar} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function FranchiseTable({ rows }) {
  const safeRows = ensureArray(rows)

  return (
    <section className="portal-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h2 className="portal-card__title">Detalle por franquicia</h2>
          <p className="portal-card__subtitle">
            Cargos generados, avance de cobranza y saldo pendiente.
          </p>
        </div>
      </header>

      <div className="portal-card__body cobranza-table-wrap">
        <table className="cobranza-table">
          <thead>
            <tr>
              <th>Franquicia</th>
              <th>Cargos</th>
              <th>Cobrado</th>
              <th>X Cobrar</th>
              <th>% Cobrado</th>
              <th>Mto Cargos</th>
              <th>Mto Cobrado</th>
              <th>Mto X Cobrar</th>
              <th>Post</th>
              <th>Recup.</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan="10">Sin registros para mostrar.</td>
              </tr>
            ) : (
              safeRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{formatNumber(row.totalCargos)}</td>
                  <td>{formatNumber(row.totalCobrado)}</td>
                  <td>{formatNumber(row.totalXCobrar)}</td>
                  <td>{formatNumber(row.pctCobrado, 2)}%</td>
                  <td>{formatMoney(row.montoCargosUsd)}</td>
                  <td>{formatMoney(row.montoCobradoUsd)}</td>
                  <td>{formatMoney(row.montoXCobrarUsd)}</td>
                  <td>{formatNumber(row.totalPosterior)}</td>
                  <td>{formatNumber(row.totalRecuperado)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ClientsTable({ rows }) {
  const safeRows = ensureArray(rows)

  return (
    <section className="portal-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h2 className="portal-card__title">Clientes X Cobrar</h2>
          <p className="portal-card__subtitle">
            Solo cargos generados no pagados, priorizados por saldo pendiente.
          </p>
        </div>
      </header>

      <div className="portal-card__body cobranza-table-wrap">
        <table className="cobranza-table cobranza-table--detail">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>RIF</th>
              <th>Contrato</th>
              <th>Franquicia</th>
              <th>Zona</th>
              <th>Servicio</th>
              <th>Estatus</th>
              <th>Saldo USD</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan="8">Sin clientes pendientes para mostrar.</td>
              </tr>
            ) : (
              safeRows.map((row) => (
                <tr key={`${row.idCargoCliente}-${row.idCliente}`}>
                  <td>{row.razonSocial}</td>
                  <td>{row.rif || 'N/D'}</td>
                  <td>{row.numeroContrato || 'N/D'}</td>
                  <td>{row.nombreFranquicia}</td>
                  <td>{row.zona}</td>
                  <td>{row.servicio}</td>
                  <td>{row.estatusCliente || row.estadoPago}</td>
                  <td>{formatMoney(row.saldoPendienteUsd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Historico({ rows }) {
  const historico = ensureArray(rows)

  return (
    <section className="portal-card cobranza-chart-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h2 className="portal-card__title">Histórico diario</h2>
          <p className="portal-card__subtitle">
            Se alimenta con snapshots guardados en la base de datos del portal.
          </p>
        </div>
      </header>

      <div className="portal-card__body cobranza-chart-card__body">
        {historico.length === 0 ? (
          <div className="portal-feedback">
            Aún no hay snapshots históricos para este periodo.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CobranzaTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="totalCobrado" name="Cobrado" stroke={CHART_COLORS.cobrado} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="totalXCobrar" name="X Cobrar" stroke={CHART_COLORS.xCobrar} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="pctCobrado" name="% Cobrado" stroke={CHART_COLORS.cargos} strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

function Cobranza() {
  const [filters, setFilters] = useState({
    periodo: getCurrentPeriod(),
    zona: '',
    franquicia: '',
    servicio: '',
    search: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [activeTab, setActiveTab] = useState('resumen')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const queryString = useMemo(() => {
    return buildQueryString({
      ...appliedFilters,
      limit: DEFAULT_LIMIT,
    })
  }, [appliedFilters])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const response = await apiGet(`/api/cobranza/franquicias${queryString}`, {
          force: true,
        })

        if (!cancelled) {
          setData(response)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No fue posible cargar Cobranza.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [queryString])

  function handleChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'zona' ? { franquicia: '' } : {}),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setAppliedFilters(filters)
  }

  const source = ensureObject(data)
  const tablas = ensureObject(source.tablas)
  const charts = ensureObject(source.charts)

  return (
    <ModulePage
      title="Cobranza"
      description="Cargos generados, cobrado, por cobrar, posteriores, recuperados e histórico diario."
    >
      <div className="cobranza-shell">
        <FilterBar
          filters={filters}
          data={source}
          loading={loading}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {error ? (
          <div className="portal-feedback portal-feedback--error">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="portal-feedback">Cargando información de cobranza...</div>
        ) : (
          <>
            {activeTab === 'resumen' ? (
              <>
                <KpiSection kpis={source.kpis} />
                <ResumenCharts data={source} />
              </>
            ) : null}

            {activeTab === 'franquicias' ? (
              <FranchiseTable rows={tablas.franquicias} />
            ) : null}

            {activeTab === 'clientes' ? (
              <ClientsTable rows={tablas.clientesXCobrar} />
            ) : null}

            {activeTab === 'historico' ? (
              <Historico rows={charts.historico} />
            ) : null}

            <p className="cobranza-meta">
              Fuente: Totalnet solo lectura. Registros procesados: {formatNumber(source.meta?.totalRegistros)}.
            </p>
          </>
        )}
      </div>
    </ModulePage>
  )
}

export default Cobranza
