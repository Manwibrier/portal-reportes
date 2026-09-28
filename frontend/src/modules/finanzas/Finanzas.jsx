import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Bar,
  BarChart,
  ComposedChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import ModulePage from '../../components/ModulePage'

import {
  apiGet,
} from '../../core/services/api.js'

const MONTHS = [
  { key: 'ene', label: 'ENERO' },
  { key: 'feb', label: 'FEBRERO' },
  { key: 'mar', label: 'MARZO' },
  { key: 'abr', label: 'ABRIL' },
  { key: 'may', label: 'MAYO' },
  { key: 'jun', label: 'JUNIO' },
  { key: 'jul', label: 'JULIO' },
  { key: 'ago', label: 'AGOSTO' },
  { key: 'sep', label: 'SEPTIEMBRE' },
  { key: 'oct', label: 'OCTUBRE' },
  { key: 'nov', label: 'NOVIEMBRE' },
  { key: 'dic', label: 'DICIEMBRE' },
]

const CURRENCY_COLORS = {
  BS: '#0f4f87',
  COP: '#ff5c00',
  USD: '#00b82e',
  OTRA: '#94a3b8',
}

const DAILY_MONTH_COLORS = [
  '#1687e8',
  '#ff5c00',
  '#a8adb5',
  '#7d159a',
]

function n(value) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function money(value) {
  return new Intl.NumberFormat(
    'es-VE',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(n(value))
}

function chartValue(value) {
  const number = n(value)

  if (number === 0) {
    return ''
  }

  return new Intl.NumberFormat(
    'es-VE',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(number)
}

function ChartValueLabel({
  x,
  y,
  width,
  value,
}) {
  const number = n(value)

  if (number === 0) {
    return null
  }

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#475569"
      fontSize={10}
      fontWeight={600}
    >
      {chartValue(number)}
    </text>
  )
}

function VerticalChartValueLabel({
  x,
  y,
  width,
  value,
  fill,
}) {
  const number = n(value)

  if (number === 0) {
    return null
  }

  const centerX =
    x + width / 2

  const labelY =
    Math.max(
      y - 5,
      14,
    )

  return (
    <text
      x={centerX}
      y={labelY}
      textAnchor="start"
      transform={`rotate(-90 ${centerX} ${labelY})`}
      fill={fill || '#475569'}
      fontSize={9}
      fontWeight={700}
    >
      {chartValue(number)}
    </text>
  )
}
function VariationPercentLabel({
  x,
  y,
  value,
}) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const number =
    Number(value)

  if (!Number.isFinite(number)) {
    return null
  }

  const label =
    `${
      number > 0
        ? '+'
        : ''
    }${money(number)}%`

  return (
    <text
      x={x}
      y={y + 16}
      textAnchor="middle"
      fill="#ffffff"
      stroke="#334155"
      strokeWidth={1.5}
      paintOrder="stroke"
      fontSize={11}
      fontWeight={800}
      pointerEvents="none"
    >
      {label}
    </text>
  )
}

function RecentMonthsLegend({
  months,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
        paddingTop: 14,
        fontSize: 12,
        color: '#475569',
      }}
    >
      {months.map(
        (month, index) => (
          <span
            key={month.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 10,
                display: 'inline-block',
                background:
                  DAILY_MONTH_COLORS[
                    index %
                      DAILY_MONTH_COLORS.length
                  ],
              }}
            />

            {month.label}
          </span>
        ),
      )}
    </div>
  )
}
function integer(value) {
  return new Intl.NumberFormat(
    'es-VE',
    {
      maximumFractionDigits: 0,
    },
  ).format(n(value))
}

function percent(value) {
  return `${money(value)}%`
}

function currencyFullName(code = '') {
  const names = {
    BS: 'Bolívares (Bs.)',
    COP: 'Pesos colombianos (COP)',
    USD: 'USD',
  }

  return (
    names[code] ||
    code ||
    'Otra moneda'
  )
}

function downloadBlob(
  content,
  type,
  filename,
) {
  const blob =
    new Blob(
      [content],
      { type },
    )

  const url =
    URL.createObjectURL(
      blob,
    )

  const link =
    document.createElement(
      'a',
    )

  link.href = url
  link.download = filename

  document.body.appendChild(
    link,
  )

  link.click()

  document.body.removeChild(
    link,
  )

  URL.revokeObjectURL(url)
}

function escapeExcel(value) {
  return String(
    value ?? '',
  )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function exportDailyMatrixToExcel(
  daily,
  monthly,
  year,
) {
  const header =
    [
      '<th>Día del mes</th>',

      ...MONTHS.map(
        (month) =>
          `<th>Ingreso equivalente USD - ${month.label}</th>`,
      ),
    ].join('')

  const rows =
    daily.map((row) => {
      const cells =
        MONTHS.map(
          (month) =>
            `<td class="num">${escapeExcel(
              money(
                row[
                  month.key
                ],
              ),
            )}</td>`,
        ).join('')

      return (
        `<tr>` +
        `<td>${row.dia}</td>` +
        cells +
        `</tr>`
      )
    }).join('')

  const totals =
    MONTHS.map((month) => {
      const item =
        monthly.find(
          (entry) =>
            entry.key ===
            month.key,
        )

      return (
        `<td class="num">` +
        escapeExcel(
          money(
            item?.montoDolares,
          ),
        ) +
        `</td>`
      )
    }).join('')

  const html = `
<html
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns="http://www.w3.org/TR/REC-html40"
>
<head>
<meta charset="UTF-8" />
<style>
body {
  font-family: Segoe UI, Arial, sans-serif;
}
h2 {
  color: #003d91;
}
table {
  border-collapse: collapse;
  font-size: 11px;
}
th {
  background: #003d91;
  color: white;
  border: 1px solid #dbe4ee;
  padding: 7px;
}
td {
  border: 1px solid #dbe4ee;
  padding: 6px;
}
.num {
  text-align: right;
}
.total td {
  font-weight: 700;
  border-top: 2px solid #0057b8;
}
</style>
</head>
<body>
<h2>Ingresos diarios por mes - ${year}</h2>
<table>
<thead>
<tr>${header}</tr>
</thead>
<tbody>
${rows}
<tr class="total">
<td>Total mensual</td>
${totals}
</tr>
</tbody>
</table>
</body>
</html>
`

  downloadBlob(
    '\ufeff' + html,
    'application/vnd.ms-excel;charset=utf-8;',
    `finanzas_ingresos_diarios_${year}.xls`,
  )
}

function printFinanceScope(scope) {
  const body =
    document.body

  const previousTitle =
    document.title

  body.dataset.finanzasPrintScope =
    scope

  document.title =
    scope === 'completo'
      ? 'Finanzas - Reporte Completo'
      : `Finanzas - ${scope}`

  const cleanup = () => {
    delete body.dataset.finanzasPrintScope

    document.title =
      previousTitle

    window.removeEventListener(
      'afterprint',
      cleanup,
    )
  }

  window.addEventListener(
    'afterprint',
    cleanup,
  )

  window.setTimeout(
    () => {
      window.print()
    },
    100,
  )
}

function MetricCard({
  label,
  value,
  prefix = '',
  suffix = '',
  tone = 'blue',
  emphasis = false,
  helper = '',
}) {
  return (
    <article
      className={[
        'finanzas-metric-card',
        `finanzas-metric-card--${tone}`,
        emphasis
          ? 'is-emphasis'
          : '',
      ].join(' ')}
    >
      <span className="finanzas-metric-card__label">
        {label}
      </span>

      <strong className="finanzas-metric-card__value">
        {prefix}
        {value}
        {suffix}
      </strong>

      {helper ? (
        <span className="finanzas-metric-card__helper">
          {helper}
        </span>
      ) : null}
    </article>
  )
}

function SectionHeader({
  number,
  title,
  subtitle,
  exportScope,
}) {
  return (
    <header className="portal-card__header finanzas-section-header">
      <div className="portal-card__heading">
        <div className="finanzas-section-tag">
          {number}. {title}
        </div>

        <p className="portal-card__subtitle">
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        className="portal-action-button finanzas-pdf-button finanzas-no-print"
        onClick={() =>
          printFinanceScope(
            exportScope,
          )
        }
      >
        Exportar segmento a PDF
      </button>
    </header>
  )
}

function FinanceExportToolbar() {
  return (
    <div className="finanzas-export-toolbar finanzas-no-print">
      <div>
        <strong>
          Exportar informe
        </strong>

        <span>
          Puede exportar cada segmento o el módulo financiero completo.
        </span>
      </div>

      <div className="finanzas-export-toolbar__actions">
        <button
          type="button"
          className="portal-action-button"
          onClick={() =>
            printFinanceScope(
              'mes',
            )
          }
        >
          PDF · Mes
        </button>

        <button
          type="button"
          className="portal-action-button"
          onClick={() =>
            printFinanceScope(
              'comparativa',
            )
          }
        >
          PDF · Comparativa
        </button>

        <button
          type="button"
          className="portal-action-button"
          onClick={() =>
            printFinanceScope(
              'ano',
            )
          }
        >
          PDF · Año
        </button>

        <button
          type="button"
          className="portal-action-button portal-action-button--primary"
          onClick={() =>
            printFinanceScope(
              'completo',
            )
          }
        >
          Exportar módulo completo a PDF
        </button>
      </div>
    </div>
  )
}

function GoalCards({
  meta,
}) {
  if (
    !meta ||
    !meta.disponible
  ) {
    return null
  }

  const cumplimiento =
    n(meta.cumplimientoPct)

  const tone =
    cumplimiento >= 100
      ? 'green'
      : cumplimiento >= 80
        ? 'orange'
        : 'blue'

  return (
    <div className="finanzas-goal-grid">
      <MetricCard
        label="Meta de recaudación del mes"
        value={money(
          meta.metaFacturacionUsd,
        )}
        prefix="US$ "
        tone="blue"
        helper="Meta congelada; no cambia aunque posteriormente se modifiquen tarifas."
      />

      <MetricCard
        label="Cumplimiento de la meta"
        value={percent(
          cumplimiento,
        )}
        tone={tone}
        emphasis
        helper={
          cumplimiento >= 100
            ? `Meta superada en US$ ${money(meta.excedenteUsd)}`
            : `Pendiente para alcanzar la meta: US$ ${money(meta.pendienteUsd)}`
        }
      />
    </div>
  )
}

function CurrencyDistribution({
  distribution,
}) {
  const data =
    distribution.map(
      (item) => ({
        ...item,

        fullName:
          currencyFullName(
            item.name,
          ),
      }),
    )

  return (
    <section className="portal-card finanzas-inner-card finanzas-year-donut-card">
      <header className="portal-card__header">
        <div className="portal-card__heading">
          <h2 className="portal-card__title">
            Distribución del ingreso por moneda
          </h2>

          <p className="portal-card__subtitle">
            Participación del ingreso equivalente en bolívares según la moneda recibida.
          </p>
        </div>
      </header>

      <div className="portal-card__body">
        <ResponsiveContainer
          width="100%"
          height={320}
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="porcentaje"
              nameKey="fullName"
              cx="50%"
              cy="46%"
              innerRadius={70}
              outerRadius={112}
            >
              {data.map(
                (item) => (
                  <Cell
                    key={item.name}
                    fill={
                      CURRENCY_COLORS[
                        item.name
                      ] ||
                      CURRENCY_COLORS.OTRA
                    }
                  />
                ),
              )}
            </Pie>

            <Tooltip
              formatter={(
                value,
                name,
                item,
              ) => [
                `${percent(value)} · Bs. ${money(
                  item?.payload
                    ?.montoBase,
                )}`,
                name,
              ]}
            />

            <Legend
              formatter={(
                value,
                entry,
              ) =>
                `${value}: ${percent(
                  entry?.payload
                    ?.porcentaje,
                )}`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function Finanzas() {
  const currentYear =
    new Date().getFullYear()

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
            `/api/finanzas/dashboard?year=${currentYear}`,
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
              'No fue posible cargar la información financiera.',
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
  }, [currentYear])

  const summary =
    data?.resumen || {}

  const currentMonth =
    data?.mesActual || {}

  const comparative =
    data?.comparativa || {}

  const yearData =
    data?.ano || {}

  const monthly =
    data?.mensual || []

  const daily =
    data?.diario || []

  const recent =
    data?.graficoDiario || {
      months: [],
      rows: [],
    }

  const distribution =
    useMemo(
      () =>
        yearData.distribucion ||
        summary.distribucion ||
        [],
      [
        summary.distribucion,
        yearData.distribucion,
      ],
    )
  const orderedRecentMonths =
    useMemo(
      () => {
        const normalize =
          (value) =>
            String(
              value || '',
            )
              .trim()
              .toUpperCase()

        const available =
          recent.months || []

        return MONTHS
          .map(
            (canonicalMonth) => {
              const canonicalKey =
                normalize(
                  canonicalMonth.key,
                )

              const canonicalLabel =
                normalize(
                  canonicalMonth.label,
                )

              const canonicalShort =
                canonicalLabel.slice(
                  0,
                  3,
                )

              const found =
                available.find(
                  (item) => {
                    const itemKey =
                      normalize(
                        item?.key,
                      )

                    const itemLabel =
                      normalize(
                        item?.label,
                      )

                    const itemShort =
                      normalize(
                        item?.shortLabel,
                      )

                    const itemMes =
                      normalize(
                        item?.mes,
                      )

                    return (
                      itemKey ===
                        canonicalKey ||
                      itemLabel ===
                        canonicalLabel ||
                      itemShort ===
                        canonicalShort ||
                      itemMes ===
                        canonicalLabel
                    )
                  },
                )

              if (!found) {
                return null
              }

              return {
                ...found,

                label:
                  canonicalMonth.label,
              }
            },
          )
          .filter(Boolean)
          .slice(-4)
      },
      [recent.months],
    )
  const comparisonSeries =
    useMemo(
      () => {
        const monthPosition =
          (item) => {
            const key =
              String(
                item?.key || '',
              )
                .trim()
                .toLowerCase()

            const keyIndex =
              MONTHS.findIndex(
                (month) =>
                  month.key === key,
              )

            if (keyIndex >= 0) {
              return keyIndex
            }

            const label =
              String(
                item?.mes ||
                item?.label ||
                item?.shortLabel ||
                '',
              )
                .trim()
                .toUpperCase()

            const labelIndex =
              MONTHS.findIndex(
                (month) =>
                  month.label ===
                  label,
              )

            if (labelIndex >= 0) {
              return labelIndex
            }

            const numeric =
              n(
                item?.mesNumero,
              )

            return (
              numeric > 0
                ? numeric - 1
                : 99
            )
          }

        const source =
          [
            ...(comparative.serie || []),
          ].sort(
            (left, right) =>
              monthPosition(left) -
              monthPosition(right),
          )

        return source.map(
          (item, index) => {
            const current =
              n(
                item?.montoDolares,
              )

            const previous =
              index > 0
                ? n(
                    source[
                      index - 1
                    ]?.montoDolares,
                  )
                : 0

            const variacionMesPct =
              index > 0 &&
              previous > 0
                ? (
                    (
                      current -
                      previous
                    ) /
                    previous
                  ) * 100
                : null

            return {
              ...item,

              variacionMesPct:
                variacionMesPct === null
                  ? null
                  : Math.round(
                      variacionMesPct *
                      100,
                    ) / 100,
            }
          },
        )
      },
      [comparative.serie],
    )
  const currentDaily =
    useMemo(
      () =>
        currentMonth.serieDiaria ||
        [],
      [
        currentMonth.serieDiaria,
      ],
    )

  return (
    <ModulePage
      title="Finanzas"
      description="Indicadores financieros e historia operativa de ingresos."
    >
      <div className="finanzas-story-dashboard">

        <FinanceExportToolbar />

        {loading ? (
          <div className="portal-feedback portal-feedback--loading">
            Cargando información financiera...
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
            {/* ============================================================ */}
            {/* 1. MES EN CURSO */}
            {/* ============================================================ */}

            <section
              className="portal-card finanzas-print-section"
              data-finanzas-section="mes"
            >
              <SectionHeader
                number="1"
                title="Cómo va el mes en curso"
                exportScope="mes"
                subtitle={`Corte operativo de ${currentMonth.label || ''}.`}
              />

              <div className="portal-card__body">

                <div className="finanzas-month-main-layout">

                  <section className="portal-card finanzas-inner-card finanzas-month-chart-panel">
                    <header className="portal-card__header">
                      <div className="portal-card__heading">
                        <h2 className="portal-card__title">
                          Ingreso diario del mes
                        </h2>

                        <p className="portal-card__subtitle">
                          Ingreso equivalente en USD por día.
                        </p>
                      </div>
                    </header>

                    <div className="portal-card__body">
                      <ResponsiveContainer
                        width="100%"
                        height={410}
                      >
                        <BarChart
                          data={currentDaily}
                          margin={{
                            top: 34,
                            right: 16,
                            bottom: 8,
                            left: 4,
                          }}
                        >
                          <CartesianGrid
                            stroke="#d7dee8"
                            strokeDasharray="3 3"
                            vertical
                            horizontal
                          />

                          <XAxis
                            dataKey="dia"
                            interval={0}
                            tick={{
                              fontSize: 11,
                            }}
                            tickLine={false}
                          />

                          <YAxis
                            hide
                            domain={[
                              0,
                              (dataMax) =>
                                dataMax > 0
                                  ? dataMax * 1.18
                                  : 1,
                            ]}
                          />

                          <Tooltip
                            formatter={
                              (value) => [
                                `US$ ${money(value)}`,
                                'Ingreso diario',
                              ]
                            }
                            labelFormatter={
                              (day) =>
                                `Día ${day}`
                            }
                          />

                          <Bar
                            dataKey="montoUsd"
                            name="Ingreso diario"
                            fill="#0f4f87"
                            maxBarSize={42}
                          >
                            <LabelList
                              dataKey="montoUsd"
                              content={
                                <ChartValueLabel />
                              }
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <div className="finanzas-month-metrics-panel">

                    <MetricCard
                      label="Meta"
                      value={
                        currentMonth.meta?.disponible
                          ? money(
                              currentMonth.meta.metaFacturacionUsd,
                            )
                          : 'Sin meta'
                      }
                      prefix={
                        currentMonth.meta?.disponible
                          ? 'US$ '
                          : ''
                      }
                      tone="blue"
                      emphasis
                      helper="Meta mensual congelada."
                    />

                    <MetricCard
                      label="Ingreso USD / % cumplimiento"
                      value={money(
                        currentMonth.ingresoUsd,
                      )}
                      prefix="US$ "
                      tone="green"
                      emphasis
                      helper={
                        currentMonth.meta?.disponible
                          ? `Cumplimiento: ${percent(
                              currentMonth.meta.cumplimientoPct,
                            )}`
                          : 'Sin meta configurada.'
                      }
                    />

                    <MetricCard
                      label="Equivalente Bs."
                      value={money(
                        currentMonth.equivalenteBs,
                      )}
                      prefix="Bs. "
                      tone="blue"
                    />

                    <MetricCard
                      label="Prom. diario"
                      value={money(
                        currentMonth.promedioDiarioUsd,
                      )}
                      prefix="US$ "
                      tone="orange"
                      helper={`${integer(
                        currentMonth.diasConMovimiento,
                      )} días con movimiento`}
                    />

                    <MetricCard
                      label="Día con mayor ingreso"
                      value={`Día ${integer(
                        currentMonth.mejorDia?.dia || 0,
                      )}`}
                      tone="green"
                      helper={`US$ ${money(
                        currentMonth.mejorDia?.montoUsd,
                      )}`}
                    />

                    <MetricCard
                      label="Día con menor ingreso"
                      value={`Día ${integer(
                        currentMonth.menorDia?.dia || 0,
                      )}`}
                      tone="orange"
                      helper={`US$ ${money(
                        currentMonth.menorDia?.montoUsd,
                      )}`}
                    />

                  </div>
                </div>

                <div className="finanzas-month-currency-grid">

                  <MetricCard
                    label="Recibido en Bs."
                    value={money(
                      currentMonth.recibidoBs,
                    )}
                    prefix="Bs. "
                    tone="blue"
                  />

                  <MetricCard
                    label="Recibido en COP"
                    value={money(
                      currentMonth.recibidoCop,
                    )}
                    prefix="COP "
                    tone="orange"
                  />

                  <MetricCard
                    label="Recibido en USD"
                    value={money(
                      currentMonth.recibidoUsd,
                    )}
                    prefix="US$ "
                    tone="green"
                  />

                </div>

              </div>
            </section>
            {/* ============================================================ */}
            {/* 2. COMPARATIVA */}
            {/* ============================================================ */}

            <section
              className="portal-card finanzas-print-section"
              data-finanzas-section="comparativa"
            >
              <SectionHeader
                number="2"
                title="Comparativa de este mes con meses anteriores"
                exportScope="comparativa"
                subtitle="Compara el desempeño del mes actual contra el mes anterior y el comportamiento reciente."
              />

              <div className="portal-card__body">
                <div className="finanzas-comparison-grid">
                  <MetricCard
                    label={`Ingreso de ${comparative.mesActual?.mes || 'mes actual'}`}
                    value={money(
                      comparative.mesActual?.montoDolares,
                    )}
                    prefix="US$ "
                    tone="blue"
                    emphasis
                    helper={
                      comparative.mesActual?.metaDisponible
                        ? `Cumplimiento de meta: ${percent(comparative.mesActual?.cumplimientoMetaPct)}`
                        : 'Ingreso equivalente en USD.'
                    }
                  />

                  <MetricCard
                    label={`Ingreso de ${comparative.mesAnterior?.mes || 'mes anterior'}`}
                    value={money(
                      comparative.mesAnterior?.montoDolares,
                    )}
                    prefix="US$ "
                    tone="blue"
                    helper={
                      comparative.mesAnterior?.metaDisponible
                        ? `Cumplimiento de meta: ${percent(comparative.mesAnterior?.cumplimientoMetaPct)}`
                        : 'Mes inmediatamente anterior.'
                    }
                  />

                  <MetricCard
                    label="Variación porcentual contra el mes anterior"
                    value={percent(
                      comparative.variacionVsMesAnterior,
                    )}
                    tone="orange"
                    helper={`Diferencia absoluta: US$ ${money(comparative.deltaVsMesAnterior)}`}
                  />

                  <MetricCard
                    label="Promedio de ingresos de los tres meses anteriores"
                    value={money(
                      comparative.promedioUltimos3Meses,
                    )}
                    prefix="US$ "
                    tone="green"
                    helper={`Variación del mes actual contra ese promedio: ${percent(comparative.variacionVsPromedioUltimos3Meses)}`}
                  />
                </div>

                <section className="portal-card finanzas-inner-card">
                  <header className="portal-card__header">
                    <div className="portal-card__heading">
                      <h2 className="portal-card__title">
                        Evolución mensual reciente de los ingresos
                      </h2>

                      <p className="portal-card__subtitle">
                        Ingreso equivalente en USD de los últimos seis meses disponibles.
                      </p>
                    </div>
                  </header>

                  <div className="portal-card__body">
                    <ResponsiveContainer
                      width="100%"
                      height={350}
                    >
                      <ComposedChart
                        data={comparisonSeries}
                        margin={{
                          top: 65,
                          right: 28,
                          bottom: 8,
                          left: 4,
                        }}
                      >
                        <CartesianGrid
                          stroke="#d7dee8"
                          strokeDasharray="3 3"
                          vertical
                          horizontal
                        />

                        <XAxis
                          dataKey="mes"
                          interval={0}
                          tick={{
                            fontSize: 11,
                          }}
                          tickLine={false}
                        />

                        <YAxis
                          yAxisId="amount"
                          hide
                          domain={[
                            0,
                            (dataMax) =>
                              dataMax > 0
                                ? dataMax * 1.17
                                : 1,
                          ]}
                        />

                        <YAxis
                          yAxisId="percentage"
                          orientation="right"
                          hide
                          domain={[-120, 120]}
                        />

                        <Tooltip
                          formatter={(
                            value,
                            name,
                          ) => {
                            if (
                              name ===
                              'Variación mensual'
                            ) {
                              return [
                                `${money(value)}%`,
                                name,
                              ]
                            }

                            return [
                              `US$ ${money(value)}`,
                              name,
                            ]
                          }}
                        />

                        <Legend />

                        <Bar
                          yAxisId="amount"
                          dataKey="montoDolares"
                          name="Ingreso mensual USD"
                          maxBarSize={190}
                        >
                          {comparisonSeries.map(
                            (
                              item,
                              index,
                            ) => (
                              <Cell
                                key={`${item.key}-${index}`}
                                fill={
                                  item.esActual
                                    ? '#ff5c00'
                                    : '#0f4f87'
                                }
                              />
                            ),
                          )}

                          <LabelList
                            dataKey="montoDolares"
                            content={
                              <ChartValueLabel />
                            }
                          />
                        </Bar>

                        <Line
                          yAxisId="percentage"
                          type="linear"
                          dataKey="variacionMesPct"
                          name="Variación mensual"
                          stroke="#64748b"
                          strokeWidth={2.5}
                          connectNulls={false}
                          dot={{
                            r: 5,
                            fill: '#ffffff',
                            stroke: '#64748b',
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 6,
                          }}
                        >
                          <LabelList
                            dataKey="variacionMesPct"
                            content={
                              <VariationPercentLabel />
                            }
                          />
                        </Line>

                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            </section>

            {/* ============================================================ */}
            {/* 3. ANO */}
            {/* ============================================================ */}

            <section
              className="portal-card finanzas-print-section"
              data-finanzas-section="ano"
            >
              <SectionHeader
                number="3"
                title="Cómo va el año"
                exportScope="ano"
                subtitle={`Visión acumulada de ${data.year}. Presenta indicadores anuales, distribución monetaria y comportamiento diario.`}
              />

              <div className="portal-card__body">

                {/* CAPSULAS IZQUIERDA / DONUT DERECHA */}

                <div className="finanzas-year-summary-layout">

                  <div className="finanzas-year-capsules">
                    <MetricCard
                      label="Ingreso acumulado del año en USD"
                      value={money(
                        yearData.totalUsd,
                      )}
                      prefix="US$ "
                      tone="blue"
                      emphasis
                      helper="Suma acumulada de los ingresos equivalentes en USD."
                    />

                    <MetricCard
                      label="Ingreso acumulado del año en bolívares"
                      value={money(
                        yearData.totalBs,
                      )}
                      prefix="Bs. "
                      tone="blue"
                      helper="Suma acumulada del ingreso equivalente en bolívares."
                    />

                    <MetricCard
                      label="Promedio mensual de ingresos"
                      value={money(
                        yearData.promedioMensualUsd,
                      )}
                      prefix="US$ "
                      tone="orange"
                      helper={`Meses con movimientos registrados: ${integer(yearData.mesesConMovimiento)}`}
                    />

                    <MetricCard
                      label="Mes con mayor ingreso del año"
                      value={
                        yearData.mejorMes?.mes ||
                        '-'
                      }
                      tone="green"
                      helper={`Ingreso del mejor mes: US$ ${money(yearData.mejorMes?.montoDolares)}`}
                    />
                  </div>

                  <CurrencyDistribution
                    distribution={
                      distribution
                    }
                  />
                </div>

                {/* TABLA CENTRAL */}

                <section className="portal-card finanzas-inner-card finanzas-year-table-card">
                  <header className="portal-card__header finanzas-table-header">
                    <div className="portal-card__heading">
                      <h2 className="portal-card__title">
                        Ingresos diarios por mes
                      </h2>

                      <p className="portal-card__subtitle">
                        Ingreso equivalente en USD para cada día de cada mes del año.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="portal-action-button finanzas-no-print"
                      onClick={() =>
                        exportDailyMatrixToExcel(
                          daily,
                          monthly,
                          data.year,
                        )
                      }
                    >
                      Exportar tabla a Excel
                    </button>
                  </header>

                  <div className="portal-card__body finanzas-year-table-body">
                    <div className="finanzas-full-matrix-wrap">
                      <table className="portal-table finanzas-full-matrix">
                        <thead>
                          <tr>
                            <th>
                              Día
                            </th>

                            {MONTHS.map(
                              (month) => (
                                <th
                                  key={
                                    month.key
                                  }
                                  className="is-numeric"
                                  title={`Ingreso equivalente en USD - ${month.label}`}
                                >
                                  {month.label}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {daily.map(
                            (row) => (
                              <tr
                                key={
                                  row.dia
                                }
                              >
                                <td>
                                  {row.dia}
                                </td>

                                {MONTHS.map(
                                  (
                                    month,
                                  ) => (
                                    <td
                                      key={
                                        month.key
                                      }
                                      className="is-numeric"
                                    >
                                      {money(
                                        row[
                                          month.key
                                        ],
                                      )}
                                    </td>
                                  ),
                                )}
                              </tr>
                            ),
                          )}
                        </tbody>

                        <tfoot>
                          <tr>
                            <th>
                              Total mensual
                            </th>

                            {MONTHS.map(
                              (
                                month,
                              ) => {
                                const item =
                                  monthly.find(
                                    (
                                      entry,
                                    ) =>
                                      entry.key ===
                                      month.key,
                                  )

                                return (
                                  <th
                                    key={
                                      month.key
                                    }
                                    className="is-numeric"
                                  >
                                    {money(
                                      item?.montoDolares,
                                    )}
                                  </th>
                                )
                              },
                            )}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </section>

                {/* GRAFICO DEBAJO */}

                <section className="portal-card finanzas-inner-card finanzas-recent-chart-card">
                  <header className="portal-card__header">
                    <div className="portal-card__heading">
                      <h2 className="portal-card__title">
                        Ingresos diarios de los últimos cuatro meses con movimientos
                      </h2>

                      <p className="portal-card__subtitle">
                        Comparación cronológica, día a día, de los cuatro meses más recientes que presentan ingresos.
                      </p>
                    </div>
                  </header>

                  <div className="portal-card__body">
                    <ResponsiveContainer
                      width="100%"
                      height={390}
                    >
                      <BarChart
                        data={recent.rows}
                        margin={{
                          top: 58,
                          right: 18,
                          bottom: 20,
                          left: 4,
                        }}
                        barCategoryGap="16%"
                        barGap={2}
                      >
                        <CartesianGrid
                          stroke="#d2d8e0"
                          strokeDasharray="3 3"
                          vertical
                          horizontal
                        />

                        <XAxis
                          dataKey="dia"
                          interval={0}
                          tick={{
                            fontSize: 11,
                          }}
                          tickLine={false}
                        />

                        <YAxis
                          hide
                          domain={[
                            0,
                            (dataMax) =>
                              dataMax > 0
                                ? dataMax * 1.18
                                : 1,
                          ]}
                        />

                        <Tooltip
                          itemSorter={(item) => {
                            const order = {
                              jun: 1,
                              jul: 2,
                              ago: 3,
                              sep: 4,
                            }

                            return (
                              order[
                                String(
                                  item?.dataKey ||
                                  '',
                                ).toLowerCase()
                              ] ||
                              99
                            )
                          }}
                          labelFormatter={
                            (day) =>
                              `Día ${day}`
                          }
                          formatter={
                            (
                              value,
                              name,
                            ) => [
                              `US$ ${money(value)}`,
                              name,
                            ]
                          }
                        />

                        <Legend
                          verticalAlign="bottom"
                          content={
                            <RecentMonthsLegend
                              months={
                                orderedRecentMonths
                              }
                            />
                          }
                          wrapperStyle={{
                            paddingTop: 14,
                          }}
                        />

                        {orderedRecentMonths.map(
                          (
                            month,
                            index,
                          ) => {
                            const fill =
                              DAILY_MONTH_COLORS[
                                index %
                                  DAILY_MONTH_COLORS.length
                              ]

                            return (
                              <Bar
                                key={
                                  month.key
                                }
                                dataKey={
                                  month.key
                                }
                                name={
                                  month.label
                                }
                                fill={
                                  fill
                                }
                                maxBarSize={22}
                              >
                                <LabelList
                                  dataKey={
                                    month.key
                                  }
                                  content={(
                                    props,
                                  ) => (
                                    <VerticalChartValueLabel
                                      {...props}
                                      fill={
                                        fill
                                      }
                                    />
                                  )}
                                />
                              </Bar>
                            )
                          },
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

              </div>
            </section>
          </>
        ) : null}
      </div>
    </ModulePage>
  )
}

export default Finanzas