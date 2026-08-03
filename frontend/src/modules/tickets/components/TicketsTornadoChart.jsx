// src/modules/tickets/components/TicketsTornadoChart.jsx

import { useMemo } from 'react'
import {
  formatMetricValue,
  resolveChartColor,
} from '../../../components/charts/ChartWrapper'

const DEFAULT_METRIC = {
  format: 'number',
  decimals: 0,
  locale: 'es-VE',
}

const LEFT_TRACK_STYLE = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  transform: 'none',
  borderRadius: '999px 0 0 999px',
  overflow: 'hidden',
}

const RIGHT_TRACK_STYLE = {
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  transform: 'none',
  borderRadius: '0 999px 999px 0',
  overflow: 'hidden',
}

const LEFT_BAR_STYLE = {
  transform: 'none',
  borderRadius: '999px 0 0 999px',
}

const RIGHT_BAR_STYLE = {
  transform: 'none',
  borderRadius: '0 999px 999px 0',
}

const CENTER_SEPARATOR_STYLE = {
  width: 0,
  minWidth: 0,
  height: 'var(--tornado-bar-height, 18px)',
  borderRadius: 0,
  background: 'transparent',
}

const TRACK_STYLE = {
  gridTemplateColumns: 'minmax(0, 1fr) 0 minmax(0, 1fr)',
  gap: 0,
}

function normalizeText(value, fallback = 'SIN DATO') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? Math.abs(numericValue) : fallback
}

function getFirstValue(row = {}, fields = []) {
  for (const field of fields) {
    const value = row?.[field]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function truncateLabel(value = '', maxLength = 34) {
  const text = normalizeText(value)
  const safeMaxLength = Number(maxLength)

  if (!Number.isFinite(safeMaxLength) || safeMaxLength <= 0) {
    return text
  }

  if (text.length <= safeMaxLength) {
    return text
  }

  return `${text.slice(0, safeMaxLength - 1)}…`
}

function normalizeRow(item = {}) {
  const leftValue = normalizeNumber(
    getFirstValue(item, [
      'leftValue',
      'left',
      'recibidos',
      'emitidos',
      'entradas',
      'totalRecibidos',
      'totalEmitidos',
    ]),
  )

  const rightValue = normalizeNumber(
    getFirstValue(item, [
      'rightValue',
      'right',
      'finalizados',
      'cerrados',
      'resueltos',
      'salidas',
      'totalFinalizados',
      'totalCerrados',
    ]),
  )

  const explicitTotal = normalizeNumber(item?.total, -1)
  const total = explicitTotal >= 0 ? explicitTotal : leftValue + rightValue

  return {
    departamento: normalizeText(
      getFirstValue(item, [
        'departamento',
        'department',
        'area',
        'label',
        'name',
        'usuario',
        'persona',
      ]),
    ),
    leftValue,
    rightValue,
    total,
  }
}

function normalizeData(data = []) {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map(normalizeRow)
    .filter((item) => item.leftValue > 0 || item.rightValue > 0)
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total
      }

      if (right.leftValue !== left.leftValue) {
        return right.leftValue - left.leftValue
      }

      if (right.rightValue !== left.rightValue) {
        return right.rightValue - left.rightValue
      }

      return left.departamento.localeCompare(right.departamento, 'es', {
        sensitivity: 'base',
      })
    })
}

function TicketsTornadoChart({
  data = [],
  title = 'Tickets recibidos vs finalizados por departamento',
  subtitle = 'Comparativo entre volumen recibido y tickets cerrados.',
  leftLabel = 'Recibidos',
  rightLabel = 'Finalizados',
  totalLabel = 'Total',
  leftColor = 'secondary',
  rightColor = 'primary',
  totalColor = 'neutral',
  metric = DEFAULT_METRIC,
  showTotal = true,
  emptyMessage = 'No hay datos disponibles para esta visualización.',
  maxLabelLength = 34,
}) {
  const rows = useMemo(() => normalizeData(data), [data])

  const resolvedMetric =
    metric && typeof metric === 'object' ? metric : DEFAULT_METRIC

  const maxValue = useMemo(() => {
    return rows.reduce((acc, item) => {
      return Math.max(acc, item.leftValue, item.rightValue)
    }, 1)
  }, [rows])

  const resolvedLeftColor = resolveChartColor(leftColor || 'secondary')
  const resolvedRightColor = resolveChartColor(rightColor || 'primary')
  const resolvedTotalColor = resolveChartColor(totalColor || 'neutral')

  function formatValue(value) {
    return formatMetricValue(value, resolvedMetric)
  }

  return (
    <section
      className="portal-card chart-card tornado-card"
      style={{
        '--tornado-left-color': resolvedLeftColor,
        '--tornado-right-color': resolvedRightColor,
        '--tornado-total-color': resolvedTotalColor,
      }}
    >
      <header className="portal-card__header chart-card__header">
        <div className="portal-card__header-row">
          <div className="portal-card__heading">
            <h3 className="portal-card__title chart-card__title">
              {title}
            </h3>

            {subtitle ? (
              <p className="portal-card__subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="portal-card__body chart-card__body tornado-card__body">
        {rows.length === 0 ? (
          <div className="tickets-empty-state">{emptyMessage}</div>
        ) : (
          <>
            <div className="tornado-scroll">
              <div className="tornado-chart" role="list" aria-label={title}>
                {rows.map((item, index) => {
                  const leftPct =
                    maxValue > 0 ? (item.leftValue / maxValue) * 100 : 0

                  const rightPct =
                    maxValue > 0 ? (item.rightValue / maxValue) * 100 : 0

                  const formattedLeftValue = formatValue(item.leftValue)
                  const formattedRightValue = formatValue(item.rightValue)
                  const formattedTotalValue = formatValue(item.total)

                  return (
                    <div
                      className="tornado-row"
                      key={`${item.departamento}-${item.leftValue}-${item.rightValue}-${index}`}
                      role="listitem"
                    >
                      <div
                        className="tornado-row__label"
                        title={item.departamento}
                        aria-label={item.departamento}
                      >
                        {truncateLabel(item.departamento, maxLabelLength)}
                      </div>

                      <div className="tornado-row__track" style={TRACK_STYLE}>
                        <div className="tornado-row__side tornado-row__side--left">
                          <span
                            className="tornado-value tornado-value--left"
                            title={`${leftLabel}: ${formattedLeftValue}`}
                            aria-label={`${leftLabel}: ${formattedLeftValue}`}
                            style={{ color: 'var(--tornado-left-color)' }}
                          >
                            {formattedLeftValue}
                          </span>

                          <div
                            className="tornado-bar-outer tornado-bar-outer--left"
                            style={LEFT_TRACK_STYLE}
                          >
                            <div
                              className="tornado-bar tornado-bar--left"
                              style={{
                                ...LEFT_BAR_STYLE,
                                width: `${leftPct}%`,
                                backgroundColor: 'var(--tornado-left-color)',
                              }}
                              title={`${leftLabel}: ${formattedLeftValue}`}
                              aria-label={`${leftLabel}: ${formattedLeftValue}`}
                            />
                          </div>
                        </div>

                        <div
                          className="tornado-row__separator"
                          style={CENTER_SEPARATOR_STYLE}
                        />

                        <div className="tornado-row__side tornado-row__side--right">
                          <div
                            className="tornado-bar-outer tornado-bar-outer--right"
                            style={RIGHT_TRACK_STYLE}
                          >
                            <div
                              className="tornado-bar tornado-bar--right"
                              style={{
                                ...RIGHT_BAR_STYLE,
                                width: `${rightPct}%`,
                                backgroundColor: 'var(--tornado-right-color)',
                              }}
                              title={`${rightLabel}: ${formattedRightValue}`}
                              aria-label={`${rightLabel}: ${formattedRightValue}`}
                            />
                          </div>

                          <span
                            className="tornado-value tornado-value--right"
                            title={`${rightLabel}: ${formattedRightValue}`}
                            aria-label={`${rightLabel}: ${formattedRightValue}`}
                            style={{ color: 'var(--tornado-right-color)' }}
                          >
                            {formattedRightValue}
                          </span>
                        </div>
                      </div>

                      {showTotal ? (
                        <div
                          className="tornado-row__total"
                          title={`${totalLabel}: ${formattedTotalValue}`}
                          aria-label={`${totalLabel}: ${formattedTotalValue}`}
                          style={{ color: 'var(--tornado-total-color)' }}
                        >
                          {formattedTotalValue}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="tornado-legend">
              <div className="tornado-legend__item">
                <span
                  className="tornado-legend__swatch"
                  style={{ backgroundColor: 'var(--tornado-left-color)' }}
                />
                <span>{leftLabel}</span>
              </div>

              <div className="tornado-legend__item">
                <span
                  className="tornado-legend__swatch"
                  style={{ backgroundColor: 'var(--tornado-right-color)' }}
                />
                <span>{rightLabel}</span>
              </div>

              {showTotal ? (
                <div className="tornado-legend__item">
                  <span
                    className="tornado-legend__total"
                    style={{ color: 'var(--tornado-total-color)' }}
                  >
                    {totalLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default TicketsTornadoChart