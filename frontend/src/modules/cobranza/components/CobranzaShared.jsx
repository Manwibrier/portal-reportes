import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  apiGet,
} from '../../../core/services/api.js'

export const CHART_COLORS = {
  blue: '#0050a4',
  orange: '#ff5b00',
  red: '#dc2626',
  green: '#16a34a',
  slate: '#64748b',
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

export function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

export function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalizeNumber(value))
}

export function formatAmount(value) {
  return formatNumber(value, 2)
}

export function formatMoney(value) {
  return `US$ ${formatNumber(value, 2)}`
}

export function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getPeriodLabel(period = '') {
  const [year, month] = String(period || getCurrentPeriod()).split('-')
  const labels = {
    '01': 'ENERO',
    '02': 'FEBRERO',
    '03': 'MARZO',
    '04': 'ABRIL',
    '05': 'MAYO',
    '06': 'JUNIO',
    '07': 'JULIO',
    '08': 'AGOSTO',
    '09': 'SEPTIEMBRE',
    10: 'OCTUBRE',
    11: 'NOVIEMBRE',
    12: 'DICIEMBRE',
  }

  return `${labels[month] || month} ${year || ''}`.trim()
}

export function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(ensureObject(params)).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export function useCobranzaEndpoint(endpoint, initialFilters = {}) {
  const [filters, setFilters] = useState({
    periodo: getCurrentPeriod(),
    zona: '',
    franquicia: '',
    servicio: '',
    search: '',
    limit: 300,
    ...initialFilters,
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const queryString = useMemo(() => {
    return buildQueryString(appliedFilters)
  }, [appliedFilters])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const response = await apiGet(`/api/cobranza/${endpoint}${queryString}`, {
          force: true,
        })

        if (!cancelled) {
          setData(response)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No fue posible cargar el módulo de Cobranza.')
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
  }, [endpoint, queryString])

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'zona' ? { franquicia: '' } : {}),
    }))
  }

  function applyFilters(event) {
    event?.preventDefault()
    setAppliedFilters(filters)
  }

  return {
    appliedFilters,
    applyFilters,
    data: ensureObject(data),
    error,
    filters,
    loading,
    setFilters,
    updateFilter,
  }
}

export function CobranzaFilters({
  data,
  filters,
  loading,
  onChange,
  onSubmit,
  showSearch = true,
  searchPlaceholder = 'RIF, cliente o contrato',
}) {
  const options = ensureObject(data?.filtrosDisponibles)

  return (
    <form
      className={`portal-card cobranza-filter-bar ${showSearch ? '' : 'cobranza-filter-bar--compact'}`}
      onSubmit={onSubmit}
    >
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

      {showSearch ? (
        <label className="cobranza-filter-field">
          <span>Buscar</span>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
          />
        </label>
      ) : null}

      <button type="submit" className="portal-button portal-button--primary">
        {loading ? 'Cargando...' : 'Actualizar'}
      </button>
    </form>
  )
}

export function CobranzaStatus({ loading, error }) {
  if (loading) {
    return <div className="portal-feedback">Cargando información de cobranza...</div>
  }

  if (error) {
    return <div className="portal-feedback portal-feedback--error">{error}</div>
  }

  return null
}

export function CobranzaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="cobranza-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => {
        const key = String(item.dataKey || '').toLowerCase()
        const isMoney = key.includes('monto')

        return (
          <span key={item.dataKey}>
            {item.name}: {isMoney ? formatAmount(item.value) : formatNumber(item.value)}
          </span>
        )
      })}
    </div>
  )
}

export function CobranzaSectionHeader({ title, subtitle }) {
  return (
    <header className="portal-insights-header">
      <h2 className="portal-insights-title">{title}</h2>
      <p className="portal-insights-subtitle">{subtitle}</p>
    </header>
  )
}

export function CobranzaChartCard({ title, subtitle, children, large = false }) {
  return (
    <section className={`portal-card cobranza-chart-card ${large ? 'cobranza-chart-card--large' : ''}`}>
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h2 className="portal-card__title">{title}</h2>
          <p className="portal-card__subtitle">{subtitle}</p>
        </div>
      </header>
      <div className="portal-card__body cobranza-chart-card__body">
        {children}
      </div>
    </section>
  )
}

export function AvancePieChart({ data }) {
  const rows = ensureArray(data).filter((item) => normalizeNumber(item.value) > 0)

  if (!rows.length) {
    return <div className="portal-feedback">Sin datos para graficar.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <PieChart>
        <Tooltip content={<CobranzaTooltip />} />
        <Legend />
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="48%"
          outerRadius={122}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}
          labelLine
        >
          {rows.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.name === 'Cobrado' ? CHART_COLORS.blue : CHART_COLORS.orange}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

export function PercentDonut({ title, value, detail, tone = 'blue' }) {
  const safeValue = Math.max(0, Math.min(100, normalizeNumber(value)))

  return (
    <div
      className={`portal-card cobranza-percent-card cobranza-percent-card--${tone}`}
      style={{ '--percent-value': `${safeValue}%` }}
    >
      <div className="cobranza-percent-card__ring">
        <strong>{formatNumber(safeValue, 2)}%</strong>
      </div>
      <div className="cobranza-percent-card__content">
        <span>{title}</span>
        <p>{detail}</p>
      </div>
    </div>
  )
}

export function PercentBar({ value, tone = 'blue', label }) {
  const safeValue = Math.max(0, Math.min(100, normalizeNumber(value)))

  return (
    <div className={`cobranza-percent-bar cobranza-percent-bar--${tone}`}>
      <div className="cobranza-percent-bar__track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{label || `${formatNumber(safeValue, 2)}%`}</strong>
    </div>
  )
}

export function CobranzaPowerBiCard({
  title,
  value,
  secondaryValue,
  accent = 'blue',
  isAmount = false,
  description = '',
}) {
  return (
    <article className={`portal-card cobranza-metric-card cobranza-metric-card--${accent}`}>
      <div className="cobranza-metric-card__top">
        <h3>{title}</h3>

        <div className="cobranza-metric-card__values">
          <strong>{isAmount ? formatAmount(value) : formatNumber(value)}</strong>
          {secondaryValue !== undefined && secondaryValue !== null ? (
            <strong>{formatNumber(secondaryValue, 2)}%</strong>
          ) : null}
        </div>
      </div>

      {description ? (
        <p>{description}</p>
      ) : null}
    </article>
  )
}

export function TornadoChart({
  rows,
  leftLabel = 'Clientes por cobrar',
  rightLabel = 'Cobrado',
  totalLabel = 'Total',
  nameLabel = 'Nombre de la región',
  leftKey = 'totalXCobrar',
  rightKey = 'totalCobrado',
  totalKey = 'totalCargos',
  valueType = 'number',
  variant = 'standard',
}) {
  const safeRows = ensureArray(rows).slice(0, 10)
  const maxValue = Math.max(
    ...safeRows.map((row) => normalizeNumber(row[leftKey])),
    ...safeRows.map((row) => normalizeNumber(row[rightKey])),
    1,
  )

  function formatFullMoney(value) {
    return formatAmount(value)
  }

  const formatValue = (value) => {
    return valueType === 'money' ? formatFullMoney(value) : formatNumber(value)
  }

  if (!safeRows.length) {
    return <div className="portal-feedback">Sin registros para mostrar.</div>
  }

  return (
    <div className={`cobranza-ticket-tornado cobranza-ticket-tornado--${variant}`}>
      {safeRows.map((row) => {
        const left = normalizeNumber(row[leftKey])
        const right = normalizeNumber(row[rightKey])
        const total = normalizeNumber(row[totalKey])
        const leftPct = Math.max(0.8, (left / maxValue) * 100)
        const rightPct = Math.max(0.8, (right / maxValue) * 100)

        return (
          <div className="cobranza-ticket-tornado__row" key={row.name}>
            <div className="cobranza-ticket-tornado__name" title={row.name}>
              <span>{row.name}</span>
              <small>{formatNumber(row.pctCobrado, 2)}% cobrado</small>
            </div>

            <span className="cobranza-ticket-tornado__value cobranza-ticket-tornado__value--left">
              {formatValue(left)}
            </span>

            <div className="cobranza-ticket-tornado__track" aria-label={`${nameLabel}: ${row.name}`}>
              <div className="cobranza-ticket-tornado__half cobranza-ticket-tornado__half--left">
                <span style={{ width: `${leftPct}%` }} />
              </div>
              <div className="cobranza-ticket-tornado__separator" />
              <div className="cobranza-ticket-tornado__half cobranza-ticket-tornado__half--right">
                <span style={{ width: `${rightPct}%` }} />
              </div>
            </div>

            <span className="cobranza-ticket-tornado__value cobranza-ticket-tornado__value--right">
              {formatValue(right)}
            </span>

            <span className="cobranza-ticket-tornado__total">
              {formatValue(total)}
            </span>
          </div>
        )
      })}

      <div className="cobranza-ticket-tornado__legend">
        <span><i className="is-left" />{leftLabel}</span>
        <span><i className="is-right" />{rightLabel}</span>
        <span>{totalLabel}</span>
      </div>
    </div>
  )
}

export function HistoricoLineChart({ data }) {
  const rows = ensureArray(data)

  if (!rows.length) {
    return <div className="portal-feedback">Aún no hay snapshots históricos para este periodo.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={310}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip content={<CobranzaTooltip />} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="pctCobrado" name="% Cobrado" stroke={CHART_COLORS.blue} strokeWidth={2.4} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="montoXCobrarUsd" name="Monto X Cobrar" stroke={CHART_COLORS.orange} strokeWidth={2.4} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RiskChip({ value }) {
  const risk = String(value || 'Bajo').toLowerCase()
  return <span className={`cobranza-risk-chip cobranza-risk-chip--${risk}`}>{value || 'Bajo'}</span>
}

export function CobranzaTable({ columns, rows, emptyMessage = 'Sin registros para mostrar.' }) {
  const safeRows = ensureArray(rows)

  return (
    <div className="portal-card__body cobranza-table-wrap">
      <table className="cobranza-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          ) : (
            safeRows.map((row, index) => (
              <tr key={row.idCargoCliente || row.name || index}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}



