import React, { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../../components/ModulePage'
import { apiGet } from '../../../core/services/api.js'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const MONTHS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0)
}

function formatMoney(value) {
  return `US$ ${formatNumber(value, 2)}`
}

function axisMoney(value) {
  const number = Number(value) || 0
  if (Math.abs(number) >= 1000000) return `$${(number / 1000000).toFixed(1)}M`
  if (Math.abs(number) >= 1000) return `$${(number / 1000).toFixed(0)}K`
  return `$${number.toFixed(0)}`
}

function AnnualTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="portal-chart-tooltip">
      <strong className="portal-chart-tooltip__title">{label}</strong>
      <div className="portal-chart-tooltip__items">
        {payload.map((item) => (
          <div className="portal-chart-tooltip__row" key={item.dataKey}>
            <span>{item.name}</span>
            <strong>
              {item.dataKey === 'avance'
                ? `${formatNumber(item.value, 2)}%`
                : formatMoney(item.value)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CobranzaRegiones() {
  const year = new Date().getFullYear()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadYear() {
      setLoading(true)
      setError('')

      try {
        const result = await Promise.all(
          MONTHS.map(async (label, index) => {
            const periodo = `${year}-${String(index + 1).padStart(2, '0')}`

            try {
              const params = new URLSearchParams({ periodo })
              const response = await apiGet(`/api/cobranza/dashboard?${params.toString()}`)
              const kpis = response?.kpis || {}
              const totalCargos = Number(kpis.totalCargos) || 0
              const totalCobrado = Number(kpis.totalCobrado) || 0

              return {
                periodo,
                mes: `${label} ${year}`,
                disponible: totalCargos > 0,
                totalCargos,
                totalCobrado,
                totalXCobrar: Number(kpis.totalXCobrar) || 0,
                facturado: Number(kpis.montoCargosUsd) || 0,
                cobrado: Number(kpis.montoCobradoUsd) || 0,
                pendiente: Number(kpis.montoXCobrarUsd) || 0,
                avance: totalCargos > 0 ? (totalCobrado / totalCargos) * 100 : 0,
              }
            } catch (requestError) {
              return {
                periodo,
                mes: `${label} ${year}`,
                disponible: false,
                totalCargos: 0,
                totalCobrado: 0,
                totalXCobrar: 0,
                facturado: 0,
                cobrado: 0,
                pendiente: 0,
                avance: 0,
              }
            }
          }),
        )

        if (!cancelled) setRows(result)
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'No fue posible cargar el consolidado anual de cobranza.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadYear()

    return () => {
      cancelled = true
    }
  }, [year])

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.disponible) acc.mesesConDatos += 1
        acc.totalCargos += row.totalCargos
        acc.totalCobrado += row.totalCobrado
        acc.totalXCobrar += row.totalXCobrar
        acc.facturado += row.facturado
        acc.cobrado += row.cobrado
        acc.pendiente += row.pendiente
        return acc
      },
      {
        mesesConDatos: 0,
        totalCargos: 0,
        totalCobrado: 0,
        totalXCobrar: 0,
        facturado: 0,
        cobrado: 0,
        pendiente: 0,
      },
    )
  }, [rows])

  const avanceAnual = summary.totalCargos > 0
    ? (summary.totalCobrado / summary.totalCargos) * 100
    : 0

  return (
    <ModulePage
      title="Cobranza · Análisis Mensual"
      description={`Comportamiento consolidado de la cobranza durante todo ${year}.`}
    >
      <div className="cobranza-shell cobranza-analisis-mensual">
        {error ? (
          <div className="portal-feedback portal-feedback--error">{error}</div>
        ) : null}

        {loading ? (
          <div className="portal-feedback portal-feedback--loading">
            Cargando consolidado anual de cobranza...
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="cobranza-annual-kpis">
              <article className="kpi-card">
                <span className="kpi-card__title">Año analizado</span>
                <strong className="kpi-card__value">{year}</strong>
                <span className="kpi-card__meta">{summary.mesesConDatos} meses con información</span>
              </article>

              <article className="kpi-card">
                <span className="kpi-card__title">Cargos generados</span>
                <strong className="kpi-card__value">{formatNumber(summary.totalCargos)}</strong>
                <span className="kpi-card__meta">Consolidado mensual</span>
              </article>

              <article className="kpi-card">
                <span className="kpi-card__title">Monto cargos</span>
                <strong className="kpi-card__value">{formatMoney(summary.facturado)}</strong>
                <span className="kpi-card__meta">Cartera base acumulada</span>
              </article>

              <article className="kpi-card">
                <span className="kpi-card__title">% cobrado anual</span>
                <strong className="kpi-card__value">{formatNumber(avanceAnual, 2)}%</strong>
                <span className="kpi-card__meta">Cobrado / cargos generados</span>
              </article>
            </div>

            <section className="portal-card">
              <header className="portal-card__header">
                <div className="portal-card__heading">
                  <h2 className="portal-card__title">Comportamiento mensual {year}</h2>
                  <p className="portal-card__subtitle">
                    Monto de cargos, monto cobrado y avance de cobranza de enero a diciembre.
                  </p>
                </div>
              </header>

              <div className="portal-card__body cobranza-annual-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows} margin={{ top: 14, right: 22, left: 10, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fill: '#475569', fontSize: 11 }} />
                    <YAxis yAxisId="amount" tickFormatter={axisMoney} tick={{ fill: '#475569', fontSize: 11 }} />
                    <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#475569', fontSize: 11 }} />
                    <Tooltip content={<AnnualTooltip />} />
                    <Legend />
                    <Bar yAxisId="amount" dataKey="facturado" name="Monto cargos" fill="#003d91" radius={[5, 5, 0, 0]} />
                    <Bar yAxisId="amount" dataKey="cobrado" name="Monto cobrado" fill="#ff5c00" radius={[5, 5, 0, 0]} />
                    <Line yAxisId="pct" type="monotone" dataKey="avance" name="% Cobrado" stroke="#0057b8" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="portal-card">
              <header className="portal-card__header">
                <div className="portal-card__heading">
                  <h2 className="portal-card__title">Detalle mensual</h2>
                  <p className="portal-card__subtitle">
                    Consolidado anual sin filtros ni selección manual de período.
                  </p>
                </div>
              </header>

              <div className="portal-card__body">
                <div className="portal-table-responsive">
                  <table className="portal-table cobranza-annual-table">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th className="is-numeric">Cargos</th>
                        <th className="is-numeric">Cobrados</th>
                        <th className="is-numeric">X cobrar</th>
                        <th className="is-numeric">Monto cargos</th>
                        <th className="is-numeric">Monto cobrado</th>
                        <th className="is-numeric">Monto X cobrar</th>
                        <th className="is-numeric">% cobrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.periodo}>
                          <td><strong>{row.mes}</strong></td>
                          <td className="is-numeric">{row.disponible ? formatNumber(row.totalCargos) : '—'}</td>
                          <td className="is-numeric">{row.disponible ? formatNumber(row.totalCobrado) : '—'}</td>
                          <td className="is-numeric">{row.disponible ? formatNumber(row.totalXCobrar) : '—'}</td>
                          <td className="is-numeric">{row.disponible ? formatMoney(row.facturado) : '—'}</td>
                          <td className="is-numeric">{row.disponible ? formatMoney(row.cobrado) : '—'}</td>
                          <td className="is-numeric">{row.disponible ? formatMoney(row.pendiente) : '—'}</td>
                          <td className="is-numeric">{row.disponible ? `${formatNumber(row.avance, 2)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </ModulePage>
  )
}
