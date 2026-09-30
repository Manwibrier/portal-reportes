const fs = require('fs')
const path = require('path')
const { totalnetQuery } = require('../config/database')

const MONTH_KEYS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

const MONTH_LABELS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
]

const MONTH_SHORT_LABELS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
]

const METAS_FILE = path.join(
  __dirname,
  '..',
  'data',
  'finanzas-metas.json',
)

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals

  return Math.round(
    (toNumber(value) + Number.EPSILON) * factor,
  ) / factor
}

function normalizeText(value = '') {
  return String(value ?? '').trim()
}

function normalizeCurrency(value = '') {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function normalizeYear(value) {
  const year = Number(value)

  if (
    Number.isInteger(year) &&
    year >= 2020 &&
    year <= 2100
  ) {
    return year
  }

  return getCurrentYear()
}

function getPeriodKey(year, monthIndex) {
  return (
    String(year) +
    '-' +
    String(monthIndex + 1).padStart(2, '0')
  )
}

function readFrozenGoals() {
  try {
    if (!fs.existsSync(METAS_FILE)) {
      return {}
    }

    const raw = fs.readFileSync(
      METAS_FILE,
      'utf8',
    )

    const parsed = JSON.parse(raw)

    return (
      parsed &&
      typeof parsed.metas === 'object' &&
      parsed.metas !== null
    )
      ? parsed.metas
      : {}
  } catch (error) {
    console.error(
      'No fue posible leer finanzas-metas.json:',
      error,
    )

    return {}
  }
}

function getFrozenGoal(
  goals,
  year,
  monthIndex,
) {
  const period = getPeriodKey(
    year,
    monthIndex,
  )

  const entry = goals?.[period]

  if (!entry) {
    return {
      periodo: period,
      metaFacturacionUsd: 0,
      estado: 'SIN META',
      origen: '',
      disponible: false,
    }
  }

  const value = toNumber(
    entry.metaFacturacionUsd,
  )

  return {
    periodo: period,
    metaFacturacionUsd: round(value),
    estado: normalizeText(
      entry.estado,
      'CONGELADA',
    ),
    origen: normalizeText(
      entry.origen,
      'COBRANZA_GENERADO',
    ),
    descripcion: normalizeText(
      entry.descripcion,
    ),
    disponible: value > 0,
  }
}

function calculateGoalMetrics(
  incomeUsd,
  goal,
) {
  const income = toNumber(incomeUsd)

  if (
    !goal?.disponible ||
    goal.metaFacturacionUsd <= 0
  ) {
    return {
      ...goal,
      cumplimientoPct: 0,
      pendienteUsd: 0,
      excedenteUsd: 0,
    }
  }

  const target = goal.metaFacturacionUsd

  const cumplimientoPct =
    target > 0
      ? (income / target) * 100
      : 0

  return {
    ...goal,

    cumplimientoPct:
      round(cumplimientoPct),

    pendienteUsd:
      round(
        Math.max(
          target - income,
          0,
        ),
      ),

    excedenteUsd:
      round(
        Math.max(
          income - target,
          0,
        ),
      ),
  }
}

const FINANZAS_QUERY = `
SELECT
    fecha::date AS fecha,
    forma_pago,
    moneda_base,
    COALESCE(monto_base, 0)::numeric AS monto_base,
    moneda_secundaria,
    COALESCE(monto_secundario, 0)::numeric AS monto_secundario,
    COALESCE(tasa, 0)::numeric AS tasa,
    COALESCE(monto_dolares, 0)::numeric AS monto_dolares,
    zona,
    franquicia
FROM powerbi.ingreso_consolidado
WHERE fecha >= make_date($1::integer, 1, 1)
  AND fecha <  make_date(($1::integer + 1), 1, 1)
ORDER BY
    fecha,
    zona,
    franquicia,
    forma_pago;
`

function normalizeRow(row = {}) {
  return {
    fecha: row.fecha,

    formaPago:
      normalizeText(row.forma_pago),

    monedaBase:
      normalizeText(row.moneda_base),

    montoBase:
      toNumber(row.monto_base),

    monedaSecundaria:
      normalizeText(
        row.moneda_secundaria,
      ),

    montoSecundario:
      toNumber(
        row.monto_secundario,
      ),

    tasa:
      toNumber(row.tasa),

    montoDolares:
      toNumber(row.monto_dolares),

    zona:
      normalizeText(row.zona),

    franquicia:
      normalizeText(row.franquicia),
  }
}

function getCurrencyCode(value = '') {
  const key = normalizeCurrency(value)

  if (
    key === 'BS' ||
    key === 'BSD' ||
    key === 'VES' ||
    key.includes('BOLIVAR')
  ) {
    return 'BS'
  }

  if (
    key === 'COP' ||
    key.includes(
      'PESOCOLOMBIANO',
    ) ||
    key.includes(
      'PESOSCOLOMBIANOS',
    )
  ) {
    return 'COP'
  }

  if (
    key === 'USD' ||
    key === 'US$' ||
    key.includes('DOLAR')
  ) {
    return 'USD'
  }

  return key || 'OTRA'
}

function buildSummary(rows = []) {
  const summary = {
    totalBolivares: 0,
    totalDolares: 0,
    recibidoBs: 0,
    recibidoCop: 0,
    recibidoUsd: 0,
  }

  const currencyBase = new Map()

  rows.forEach((row) => {
    summary.totalBolivares +=
      row.montoBase

    summary.totalDolares +=
      row.montoDolares

    const currency =
      getCurrencyCode(
        row.monedaSecundaria,
      )

    currencyBase.set(
      currency,
      (
        currencyBase.get(currency) ||
        0
      ) + row.montoBase,
    )

    if (currency === 'BS') {
      summary.recibidoBs +=
        row.montoSecundario
    }

    if (currency === 'COP') {
      summary.recibidoCop +=
        row.montoSecundario
    }

    if (currency === 'USD') {
      summary.recibidoUsd +=
        row.montoSecundario
    }
  })

  const totalBs =
    summary.totalBolivares

  const distribucion =
    Array.from(
      currencyBase.entries(),
    )
      .map(
        ([name, montoBase]) => ({
          name,

          montoBase:
            round(montoBase),

          porcentaje:
            totalBs > 0
              ? round(
                  (
                    montoBase /
                    totalBs
                  ) * 100,
                )
              : 0,
        }),
      )
      .filter(
        (item) =>
          item.montoBase !== 0,
      )
      .sort(
        (a, b) =>
          b.montoBase -
          a.montoBase,
      )

  return {
    totalBolivares:
      round(
        summary.totalBolivares,
      ),

    totalDolares:
      round(
        summary.totalDolares,
      ),

    recibidoBs:
      round(
        summary.recibidoBs,
      ),

    recibidoCop:
      round(
        summary.recibidoCop,
      ),

    recibidoUsd:
      round(
        summary.recibidoUsd,
      ),

    distribucion,
  }
}

function buildMonthly(
  rows = [],
  year,
  goals = {},
) {
  const values =
    Array(12).fill(0)

  rows.forEach((row) => {
    const date =
      new Date(row.fecha)

    if (
      Number.isNaN(
        date.getTime(),
      ) ||
      date.getUTCFullYear() !==
        year
    ) {
      return
    }

    values[
      date.getUTCMonth()
    ] += row.montoDolares
  })

  return MONTH_KEYS.map(
    (key, index) => {
      const montoDolares =
        round(values[index])

      const goal =
        calculateGoalMetrics(
          montoDolares,
          getFrozenGoal(
            goals,
            year,
            index,
          ),
        )

      return {
        key,

        mes:
          MONTH_LABELS[index],

        mesCorto:
          MONTH_SHORT_LABELS[index],

        mesNumero:
          index + 1,

        montoDolares,

        metaFacturacionUsd:
          goal.metaFacturacionUsd,

        metaDisponible:
          goal.disponible,

        cumplimientoMetaPct:
          goal.cumplimientoPct,

        pendienteMetaUsd:
          goal.pendienteUsd,

        excedenteMetaUsd:
          goal.excedenteUsd,

        estadoMeta:
          goal.estado,
      }
    },
  )
}

function buildDailyMatrix(
  rows = [],
  year,
) {
  const matrix =
    Array.from(
      { length: 31 },
      (_, index) => ({
        dia: index + 1,
        ene: 0,
        feb: 0,
        mar: 0,
        abr: 0,
        may: 0,
        jun: 0,
        jul: 0,
        ago: 0,
        sep: 0,
        oct: 0,
        nov: 0,
        dic: 0,
      }),
    )

  rows.forEach((row) => {
    const date =
      new Date(row.fecha)

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return
    }

    if (
      date.getUTCFullYear() !==
      year
    ) {
      return
    }

    const monthIndex =
      date.getUTCMonth()

    const day =
      date.getUTCDate()

    if (
      monthIndex < 0 ||
      monthIndex > 11 ||
      day < 1 ||
      day > 31
    ) {
      return
    }

    const monthKey =
      MONTH_KEYS[monthIndex]

    matrix[
      day - 1
    ][monthKey] +=
      row.montoDolares
  })

  return matrix.map(
    (row) => {
      const item = {
        dia: row.dia,
      }

      MONTH_KEYS.forEach(
        (month) => {
          item[month] =
            round(row[month])
        },
      )

      return item
    },
  )
}

function getEffectiveCurrentMonthIndex(
  monthly = [],
  year,
) {
  const now =
    new Date()

  const systemYear =
    now.getFullYear()

  if (year === systemYear) {
    return now.getMonth()
  }

  let lastWithData = 0

  monthly.forEach(
    (item, index) => {
      if (
        toNumber(
          item.montoDolares,
        ) > 0
      ) {
        lastWithData = index
      }
    },
  )

  return lastWithData
}

function buildCurrentMonth(
  rows = [],
  monthly = [],
  year,
  goals = {},
) {
  const monthIndex =
    getEffectiveCurrentMonthIndex(
      monthly,
      year,
    )

  const monthKey =
    MONTH_KEYS[monthIndex]

  const monthLabel =
    MONTH_LABELS[monthIndex]

  const monthRows =
    rows.filter((row) => {
      const date =
        new Date(row.fecha)

      return (
        !Number.isNaN(
          date.getTime(),
        ) &&
        date.getUTCFullYear() ===
          year &&
        date.getUTCMonth() ===
          monthIndex
      )
    })

  let ingresoUsd = 0
  let equivalenteBs = 0
  let recibidoBs = 0
  let recibidoCop = 0
  let recibidoUsd = 0

  const dailyMap =
    new Map()

  monthRows.forEach((row) => {
    ingresoUsd +=
      row.montoDolares

    equivalenteBs +=
      row.montoBase

    const currency =
      getCurrencyCode(
        row.monedaSecundaria,
      )

    if (currency === 'BS') {
      recibidoBs +=
        row.montoSecundario
    }

    if (currency === 'COP') {
      recibidoCop +=
        row.montoSecundario
    }

    if (currency === 'USD') {
      recibidoUsd +=
        row.montoSecundario
    }

    const date =
      new Date(row.fecha)

    const day =
      date.getUTCDate()

    dailyMap.set(
      day,
      (
        dailyMap.get(day) ||
        0
      ) + row.montoDolares,
    )
  })

  const serieDiaria =
    Array.from(
      { length: 31 },
      (_, index) => {
        const day =
          index + 1

        return {
          dia: day,

          montoUsd:
            round(
              dailyMap.get(day) ||
              0,
            ),
        }
      },
    )

  const diasConMovimiento =
    serieDiaria.filter(
      (item) =>
        item.montoUsd > 0,
    ).length

  const mejorDiaItem =
    serieDiaria.reduce(
      (best, item) =>
        item.montoUsd >
        best.montoUsd
          ? item
          : best,
      {
        dia: 0,
        montoUsd: 0,
      },
    )

  const diasConIngreso =
    serieDiaria.filter(
      (item) =>
        item.montoUsd > 0,
    )

  const menorDiaItem =
    diasConIngreso.length > 0
      ? diasConIngreso.reduce(
          (lowest, item) =>
            item.montoUsd <
            lowest.montoUsd
              ? item
              : lowest,
          diasConIngreso[0],
        )
      : {
          dia: 0,
          montoUsd: 0,
        }
  const ytdTotal =
    monthly
      .slice(
        0,
        monthIndex + 1,
      )
      .reduce(
        (acc, item) =>
          acc +
          toNumber(
            item.montoDolares,
          ),
        0,
      )

  const promedioDiarioUsd =
    diasConMovimiento > 0
      ? ingresoUsd /
        diasConMovimiento
      : 0

  const participacionEnAno =
    ytdTotal > 0
      ? (
          ingresoUsd /
          ytdTotal
        ) * 100
      : 0

  const meta =
    calculateGoalMetrics(
      ingresoUsd,
      getFrozenGoal(
        goals,
        year,
        monthIndex,
      ),
    )

  return {
    monthIndex,
    monthKey,
    monthLabel,

    label:
      monthLabel +
      ' ' +
      year,

    ingresoUsd:
      round(ingresoUsd),

    equivalenteBs:
      round(equivalenteBs),

    diasConMovimiento,

    promedioDiarioUsd:
      round(
        promedioDiarioUsd,
      ),

    mejorDia: {
      dia:
        mejorDiaItem.dia,

      montoUsd:
        round(
          mejorDiaItem.montoUsd,
        ),
    },

    menorDia: {
      dia:
        menorDiaItem.dia,

      montoUsd:
        round(
          menorDiaItem.montoUsd,
        ),
    },
    participacionEnAno:
      round(
        participacionEnAno,
      ),

    recibidoBs:
      round(recibidoBs),

    recibidoCop:
      round(recibidoCop),

    recibidoUsd:
      round(recibidoUsd),

    meta,

    serieDiaria,
  }
}

function buildComparativa(
  monthly = [],
  currentMonth,
) {
  const current =
    monthly[
      currentMonth.monthIndex
    ] || {
      montoDolares: 0,
      mes:
        currentMonth.monthLabel,
      mesNumero:
        currentMonth.monthIndex +
        1,
    }

  const previous =
    currentMonth.monthIndex > 0
      ? monthly[
          currentMonth.monthIndex -
            1
        ]
      : null

  const previous3 =
    monthly.slice(
      Math.max(
        0,
        currentMonth.monthIndex -
          3,
      ),
      currentMonth.monthIndex,
    )

  const promedio3 =
    previous3.length > 0
      ? previous3.reduce(
          (acc, item) =>
            acc +
            toNumber(
              item.montoDolares,
            ),
          0,
        ) / previous3.length
      : 0

  const deltaVsMesAnterior =
    current.montoDolares -
    toNumber(
      previous?.montoDolares,
    )

  const variacionVsMesAnterior =
    toNumber(
      previous?.montoDolares,
    ) > 0
      ? (
          deltaVsMesAnterior /
          previous.montoDolares
        ) * 100
      : 0

  const deltaVsPromedio3 =
    current.montoDolares -
    promedio3

  const variacionVsPromedio3 =
    promedio3 > 0
      ? (
          deltaVsPromedio3 /
          promedio3
        ) * 100
      : 0

  const ranking =
    monthly
      .filter(
        (item) =>
          toNumber(
            item.montoDolares,
          ) > 0,
      )
      .slice()
      .sort(
        (a, b) =>
          b.montoDolares -
          a.montoDolares,
      )

  const rankingMesActual =
    ranking.findIndex(
      (item) =>
        item.mesNumero ===
        current.mesNumero,
    ) + 1

  const serieBase =
    monthly
      .slice(
        Math.max(
          0,
          currentMonth.monthIndex - 5,
        ),
        currentMonth.monthIndex + 1,
      )
      .sort(
        (left, right) =>
          left.mesNumero -
          right.mesNumero,
      )

  const serie =
    serieBase.map(
      (item, index) => {
        const previous =
          index > 0
            ? serieBase[index - 1]
            : null

        const previousAmount =
          toNumber(
            previous?.montoDolares,
          )

        const variacionMesPct =
          previousAmount > 0
            ? (
                (
                  toNumber(
                    item.montoDolares,
                  ) -
                  previousAmount
                ) /
                previousAmount
              ) * 100
            : null

        return {
          key: item.key,
          mes: item.mes,
          mesCorto: item.mesCorto,
          mesNumero: item.mesNumero,

          montoDolares:
            round(
              item.montoDolares,
            ),

          variacionMesPct:
            variacionMesPct === null
              ? null
              : round(
                  variacionMesPct,
                ),

          metaFacturacionUsd:
            item.metaFacturacionUsd,

          cumplimientoMetaPct:
            item.cumplimientoMetaPct,

          metaDisponible:
            item.metaDisponible,

          esActual:
            item.mesNumero ===
            current.mesNumero,
        }
      },
    )
  return {
    mesActual: {
      mes: current.mes,

      montoDolares:
        round(
          current.montoDolares,
        ),

      metaFacturacionUsd:
        current.metaFacturacionUsd,

      metaDisponible:
        current.metaDisponible,

      cumplimientoMetaPct:
        current.cumplimientoMetaPct,
    },

    mesAnterior:
      previous
        ? {
            mes:
              previous.mes,

            montoDolares:
              round(
                previous.montoDolares,
              ),

            metaFacturacionUsd:
              previous.metaFacturacionUsd,

            metaDisponible:
              previous.metaDisponible,

            cumplimientoMetaPct:
              previous.cumplimientoMetaPct,
          }
        : null,

    deltaVsMesAnterior:
      round(
        deltaVsMesAnterior,
      ),

    variacionVsMesAnterior:
      round(
        variacionVsMesAnterior,
      ),

    promedioUltimos3Meses:
      round(promedio3),

    deltaVsPromedioUltimos3Meses:
      round(
        deltaVsPromedio3,
      ),

    variacionVsPromedioUltimos3Meses:
      round(
        variacionVsPromedio3,
      ),

    rankingMesActual:
      rankingMesActual > 0
        ? rankingMesActual
        : null,

    totalMesesConMovimiento:
      ranking.length,

    serie,
  }
}

function buildYearProgress(
  monthly = [],
  summary = {},
  currentMonth,
) {
  const monthsWithData =
    monthly.filter(
      (item) =>
        toNumber(
          item.montoDolares,
        ) > 0,
    )

  const ytdUsd =
    monthly
      .slice(
        0,
        currentMonth.monthIndex +
          1,
      )
      .reduce(
        (acc, item) =>
          acc +
          toNumber(
            item.montoDolares,
          ),
        0,
      )

  const promedioMensual =
    monthsWithData.length > 0
      ? ytdUsd /
        monthsWithData.length
      : 0

  const bestMonth =
    monthsWithData.reduce(
      (best, item) =>
        toNumber(
          item.montoDolares,
        ) >
        toNumber(
          best.montoDolares,
        )
          ? item
          : best,
      {
        mes: '',
        montoDolares: 0,
      },
    )

  return {
    totalUsd:
      round(ytdUsd),

    totalBs:
      round(
        summary.totalBolivares,
      ),

    promedioMensualUsd:
      round(
        promedioMensual,
      ),

    mejorMes: {
      mes:
        bestMonth.mes,

      montoDolares:
        round(
          bestMonth.montoDolares,
        ),
    },

    mesesConMovimiento:
      monthsWithData.length,

    distribucion:
      summary.distribucion || [],
  }
}

function buildRecentDailyChart(
  matrix = [],
  monthly = [],
) {
  const withData =
    monthly
      .filter(
        (item) =>
          toNumber(
            item.montoDolares,
          ) > 0,
      )
      .sort(
        (a, b) =>
          a.mesNumero -
          b.mesNumero,
      )

  const selected =
    withData
      .slice(-4)
      .sort(
        (left, right) =>
          left.mesNumero -
          right.mesNumero,
      )

  return {
    months:
      selected.map(
        (item) => ({
          key: item.key,

          label:
            item.mes,

          shortLabel:
            item.mesCorto,

          mesNumero:
            item.mesNumero,
        }),
      ),

    rows:
      matrix.map((row) => {
        const item = {
          dia: row.dia,
        }

        selected.forEach(
          (month) => {
            item[
              month.key
            ] =
              row[
                month.key
              ]
          },
        )

        return item
      }),
  }
}

async function getFinanzasDashboard(
  options = {},
) {
  const year =
    normalizeYear(
      options.year,
    )

  const result =
    await totalnetQuery(
      FINANZAS_QUERY,
      [year],
    )

  const rows =
    result.rows.map(
      normalizeRow,
    )

  const goals =
    readFrozenGoals()

  const resumen =
    buildSummary(rows)

  const mensual =
    buildMonthly(
      rows,
      year,
      goals,
    )

  const diario =
    buildDailyMatrix(
      rows,
      year,
    )

  const mesActual =
    buildCurrentMonth(
      rows,
      mensual,
      year,
      goals,
    )

  const comparativa =
    buildComparativa(
      mensual,
      mesActual,
    )

  const ano =
    buildYearProgress(
      mensual,
      resumen,
      mesActual,
    )

  const graficoDiario =
    buildRecentDailyChart(
      diario,
      mensual,
    )

  return {
    year,
    resumen,
    mensual,
    diario,
    mesActual,
    comparativa,
    ano,
    graficoDiario,

    metas: {
      file:
        'backend/src/data/finanzas-metas.json',

      periodos:
        Object.keys(goals)
          .sort(),
    },

    meta: {
      generatedAt:
        new Date().toISOString(),

      totalRegistros:
        rows.length,

      source:
        'powerbi.ingreso_consolidado',
    },
  }
}

module.exports = {
  getFinanzasDashboard,
}