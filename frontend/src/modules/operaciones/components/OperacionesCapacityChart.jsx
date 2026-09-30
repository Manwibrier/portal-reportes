// src/modules/operaciones/components/OperacionesCapacityChart.jsx

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ensureArray,
  normalizeNumber,
  normalizeText,
} from '../utils'

const BAR_COLORS = ['#ff5b0a', '#0057b8']
const BAR_STROKES = ['#e94b00', '#003d91']
const SEPARATOR_COLOR = '#64748b'
const SPACERS_BETWEEN_SLOTS = 1

function parseSortableNumber(value) {
  const numericValue = Number(String(value ?? '').replace(/[^\d.-]/g, ''))

  return Number.isFinite(numericValue) ? numericValue : Number.MAX_SAFE_INTEGER
}

function formatCompactNumber(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return ''
  }

  return new Intl.NumberFormat('es-VE', {
    maximumFractionDigits: 0,
  }).format(numericValue)
}

function formatSignal(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 'N/D'
  }

  return `${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)} dBm`
}

function buildChartKey(slot = '', port = '', index = 0) {
  return `slot-${slot || 'nd'}-port-${port || 'nd'}-${index}`
}

function createSpacerRow(slot, slotIndex, spacerIndex) {
  const key = `spacer-${slot}-${slotIndex}-${spacerIndex}`

  return {
    id: key,
    key,
    name: '',
    xKey: key,
    slot,
    port: '',
    slotIndex,
    colorIndex: slotIndex % BAR_COLORS.length,
    barColor: 'transparent',
    barStroke: 'transparent',
    onus: 0,
    online: 0,
    offline: 0,
    powerFail: 0,
    los: 0,
    critical: 0,
    warning: 0,
    veryGood: 0,
    averageSignal: null,
    isSpacer: true,
    isFirstInSlot: false,
    isLastInSlot: false,
    showSeparator: false,
  }
}

function normalizeData(data = []) {
  const sortedRows = ensureArray(data)
    .map((item, index) => {
      const slot = normalizeText(item?.slot ?? item?.tarjeta, 'N/D')
      const port = normalizeText(item?.port ?? item?.puerto, 'N/D')
      const onus = normalizeNumber(item?.onus ?? item?.clientes ?? item?.total)

      return {
        id: normalizeText(
          item?.id ?? item?.key,
          buildChartKey(slot, port, index),
        ),
        key: normalizeText(
          item?.key ?? item?.id,
          buildChartKey(slot, port, index),
        ),
        name: `T${slot} / P${port}`,
        xKey: `${slot}::${port}::${index}`,
        slot,
        port,
        slotNumber: parseSortableNumber(slot),
        portNumber: parseSortableNumber(port),
        onus,
        online: normalizeNumber(item?.online),
        offline: normalizeNumber(item?.offline),
        powerFail: normalizeNumber(item?.powerFail),
        los: normalizeNumber(item?.los),
        critical: normalizeNumber(item?.critical),
        warning: normalizeNumber(item?.warning),
        veryGood: normalizeNumber(item?.veryGood),
        averageSignal:
          item?.averageSignal === null || item?.averageSignal === undefined
            ? null
            : normalizeNumber(item.averageSignal),
        isSpacer: false,
      }
    })
    .filter((item) => item.onus > 0)
    .sort((left, right) => {
      if (left.slotNumber !== right.slotNumber) {
        return left.slotNumber - right.slotNumber
      }

      if (left.portNumber !== right.portNumber) {
        return left.portNumber - right.portNumber
      }

      return left.name.localeCompare(right.name, 'es', {
        sensitivity: 'base',
      })
    })

  const firstIndexBySlot = new Map()
  const lastIndexBySlot = new Map()

  sortedRows.forEach((row, index) => {
    if (!firstIndexBySlot.has(row.slot)) {
      firstIndexBySlot.set(row.slot, index)
    }

    lastIndexBySlot.set(row.slot, index)
  })

  let currentSlot = ''
  let slotIndex = -1

  const enrichedRows = sortedRows.map((row, index) => {
    if (row.slot !== currentSlot) {
      currentSlot = row.slot
      slotIndex += 1
    }

    const colorIndex = slotIndex % BAR_COLORS.length

    return {
      ...row,
      index,
      slotIndex,
      colorIndex,
      barColor: BAR_COLORS[colorIndex],
      barStroke: BAR_STROKES[colorIndex],
      isFirstInSlot: firstIndexBySlot.get(row.slot) === index,
      isLastInSlot: lastIndexBySlot.get(row.slot) === index,
      showSeparator: index > 0 && firstIndexBySlot.get(row.slot) === index,
    }
  })

  const chartRows = []

  enrichedRows.forEach((row, index) => {
    chartRows.push(row)

    if (row.isLastInSlot && index < enrichedRows.length - 1) {
      for (
        let spacerIndex = 0;
        spacerIndex < SPACERS_BETWEEN_SLOTS;
        spacerIndex += 1
      ) {
        chartRows.push(createSpacerRow(row.slot, row.slotIndex, spacerIndex))
      }
    }
  })

  return chartRows
}

function buildDataMap(data = []) {
  return data.reduce((acc, item) => {
    acc.set(item.xKey, item)
    return acc
  }, new Map())
}

function getRealRows(data = []) {
  return data.filter((row) => !row.isSpacer)
}

function CapacityValueLabel(props) {
  const { x, y, width, value, row } = props

  if (!row || row.isSpacer) {
    return null
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  const safeX = Number(x) || 0
  const safeY = Number(y) || 0
  const safeWidth = Number(width) || 0

  return (
    <text
      x={safeX + safeWidth / 2}
      y={safeY - 5}
      textAnchor="middle"
      fill="var(--portal-label-text, #334155)"
      fontSize={9}
      fontWeight={700}
    >
      {formatCompactNumber(numericValue)}
    </text>
  )
}

function CapacityXAxisTick({ x = 0, y = 0, payload = {}, dataMap }) {
  const row = dataMap.get(payload.value)

  if (!row || row.isSpacer) {
    return null
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor="middle"
        fill="var(--portal-axis-text, #475569)"
        fontSize={10}
      >
        {row.port}
      </text>

      {row.isFirstInSlot ? (
        <text
          x={0}
          y={0}
          dy={27}
          textAnchor="middle"
          fill="var(--portal-label-text, #334155)"
          fontSize={12}
          fontWeight={800}
        >
          {row.slot}
        </text>
      ) : null}
    </g>
  )
}

function CapacityTooltipContent({ active, payload, label }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null
  }

  const row = payload[0]?.payload || {}

  if (row.isSpacer) {
    return null
  }

  const title = row.name || label || 'Detalle'

  return (
    <div className="portal-chart-tooltip">
      <div className="portal-chart-tooltip__title">{title}</div>

      <div className="portal-chart-tooltip__items">
        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">ONUs</span>
          <strong>{formatCompactNumber(row.onus)}</strong>
        </div>

        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">Online</span>
          <strong>{formatCompactNumber(row.online)}</strong>
        </div>

        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">Offline</span>
          <strong>{formatCompactNumber(row.offline)}</strong>
        </div>

        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">Power Fail</span>
          <strong>{formatCompactNumber(row.powerFail)}</strong>
        </div>

        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">LOS</span>
          <strong>{formatCompactNumber(row.los)}</strong>
        </div>

        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">Señales críticas</span>
          <strong>{formatCompactNumber(row.critical)}</strong>
        </div>

        <div className="portal-chart-tooltip__row">
          <span className="portal-chart-tooltip__label">Señal promedio</span>
          <strong>{formatSignal(row.averageSignal)}</strong>
        </div>
      </div>
    </div>
  )
}

function buildReferenceSeparators(data = []) {
  return data
    .filter((row) => row.showSeparator)
    .map((row) => row.xKey)
}

function getChartHeight(realBars = 0) {
  if (realBars > 120) return 405
  if (realBars > 80) return 390
  if (realBars > 50) return 370

  return 340
}

function getChartWidth(realBars = 0, totalSlots = 0) {
  const widthByBars = realBars * 26
  const widthBySlots = totalSlots * 12

  return Math.max(900, widthByBars + widthBySlots)
}

function getBarSize(realBars = 0) {
  if (realBars > 120) return 16
  if (realBars > 90) return 18
  if (realBars > 60) return 20

  return 24
}

function getSlotCount(data = []) {
  return new Set(
    getRealRows(data)
      .map((row) => row.slot)
      .filter(Boolean),
  ).size
}

function OperacionesCapacityChart({
  data = [],
  title = 'Ocupación por tarjetas y puertos',
  subtitle = 'Cada barra representa ONUs por puerto. Los grupos inferiores corresponden a tarjetas.',
  emptyMessage = 'No hay datos de ocupación disponibles para esta OLT.',
}) {
  const chartData = normalizeData(data)
  const realRows = getRealRows(chartData)
  const realBars = realRows.length
  const totalSlots = getSlotCount(chartData)
  const dataMap = buildDataMap(chartData)
  const separators = buildReferenceSeparators(chartData)
  const chartHeight = getChartHeight(realBars)
  const chartWidth = getChartWidth(realBars, totalSlots)
  const barSize = getBarSize(realBars)

  if (realRows.length === 0) {
    return (
      <section className="portal-card chart-card operaciones-capacity-card">
        <header className="portal-card__header chart-card__header">
          <div className="portal-card__heading">
            <h3 className="portal-card__title chart-card__title">{title}</h3>
            {subtitle ? (
              <p className="portal-card__subtitle">{subtitle}</p>
            ) : null}
          </div>
        </header>

        <div className="portal-card__body chart-card__body">
          <div className="tickets-empty-state">{emptyMessage}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="portal-card chart-card operaciones-capacity-card">
      <header
        className="portal-card__header chart-card__header"
        style={{
          padding: '14px 16px 0',
        }}
      >
        <div className="portal-card__heading">
          <h3 className="portal-card__title chart-card__title">{title}</h3>
          {subtitle ? (
            <p className="portal-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <div
        className="portal-card__body chart-card__body"
        style={{
          minHeight: 'auto',
          padding: '0 6px 0',
        }}
      >
        <div
          className="operaciones-capacity-chart-scroll"
          style={{
            width: '100%',
            overflowX: chartWidth > 900 ? 'auto' : 'hidden',
            overflowY: 'hidden',
            paddingBottom: 0,
          }}
        >
          <BarChart
            width={chartWidth}
            height={chartHeight}
            data={chartData}
            margin={{
              top: 22,
              right: 4,
              bottom: 18,
              left: -6,
            }}
            barCategoryGap="6%"
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--portal-chart-grid, #e2e8f0)"
            />

            <XAxis
              dataKey="xKey"
              interval={0}
              height={46}
              tickLine={false}
              axisLine={{
                stroke: 'var(--portal-axis-stroke, #b8c7d9)',
              }}
              tick={(props) => (
                <CapacityXAxisTick
                  {...props}
                  dataMap={dataMap}
                />
              )}
            />

            <YAxis
              width={38}
              allowDecimals={false}
              tickLine={false}
              axisLine={{
                stroke: 'var(--portal-axis-stroke, #b8c7d9)',
              }}
              tick={{
                fontSize: 12,
                fill: 'var(--portal-label-text, #334155)',
              }}
              domain={[
                0,
                (dataMax) => {
                  const maxValue = Number(dataMax)

                  if (!Number.isFinite(maxValue) || maxValue <= 0) {
                    return 10
                  }

                  return Math.ceil((maxValue + 8) / 10) * 10
                },
              ]}
            />

            <Tooltip
              cursor={{
                fill: 'rgba(0, 87, 184, 0.06)',
              }}
              content={<CapacityTooltipContent />}
            />

            {separators.map((xKey) => (
              <ReferenceLine
                key={`separator-${xKey}`}
                x={xKey}
                stroke={SEPARATOR_COLOR}
                strokeDasharray="2 4"
                strokeOpacity={0.34}
                ifOverflow="extendDomain"
              />
            ))}

            <Bar
              dataKey="onus"
              name="ONUs por puerto"
              radius={[7, 7, 0, 0]}
              maxBarSize={barSize}
              minPointSize={2}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="onus"
                content={(props) => (
                  <CapacityValueLabel
                    {...props}
                    row={chartData[props.index]}
                  />
                )}
              />

              {chartData.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={entry.barColor}
                  stroke={entry.barStroke}
                  strokeWidth={entry.isSpacer ? 0 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>
    </section>
  )
}

export default OperacionesCapacityChart