const crypto = require('crypto')
const { portalQuery, totalnetQuery } = require('../config/database')

const CACHE_TTL_MS = 2 * 60 * 1000
const cache = new Map()

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

const EXCLUDED_COBRANZA_FRANQUICIAS = new Set(['PRUEBA'])

function normalizeComparableText(value = '') {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function isExcludedCobranzaFranquicia(value = '') {
  return EXCLUDED_COBRANZA_FRANQUICIAS.has(normalizeComparableText(value))
}

function filterExcludedCobranzaFranquicias(rows = []) {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows.filter((row) => {
    const franquicia =
      row?.nombreFranquicia ??
      row?.nombre_franquicia ??
      row?.franquicia ??
      row?.name ??
      ''

    return !isExcludedCobranzaFranquicia(franquicia)
  })
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function round(value, decimals = 2) {
  const number = toNumber(value)
  const factor = 10 ** decimals
  return Math.round(number * factor) / factor
}

function pct(numerator, denominator) {
  const den = toNumber(denominator)
  if (den <= 0) return 0
  return round((toNumber(numerator) / den) * 100, 2)
}

function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function normalizePeriod(value) {
  const text = normalizeText(value, getCurrentPeriod())
  const match = text.match(/^(\d{4})-(\d{2})$/)

  if (!match) {
    return getCurrentPeriod()
  }

  const month = Number(match[2])
  if (month < 1 || month > 12) {
    return getCurrentPeriod()
  }

  return `${match[1]}-${match[2]}`
}

function buildPeriodDates(period) {
  const safePeriod = normalizePeriod(period)
  const [year, month] = safePeriod.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const next = new Date(Date.UTC(year, month, 1, 0, 0, 0))
  const cargaMasiva = new Date(Date.UTC(year, month - 1, 1, 1, 1, 0))

  return {
    period: safePeriod,
    periodoDate: `${safePeriod}-01`,
    mesDesde: start.toISOString().slice(0, 19).replace('T', ' '),
    mesHasta: next.toISOString().slice(0, 19).replace('T', ' '),
    finCargaMasiva: cargaMasiva.toISOString().slice(0, 19).replace('T', ' '),
    fechaTarifa: `${safePeriod}-01`,
  }
}

const COBRANZA_TASAS_MENSUALES_CONFIRMADAS = new Map([
  ['2026-08-01', 748.7864],
  ['2026-09-01', 798.3260],
])

function dateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return String(value ?? '').slice(0, 10)
}

async function getTasaCargoMensual(periodoDate) {
  const fechaPrimerDia = dateOnly(periodoDate)
  const tasaConfirmada = COBRANZA_TASAS_MENSUALES_CONFIRMADAS.get(fechaPrimerDia)

  if (tasaConfirmada) {
    return {
      tasa: tasaConfirmada,
      fechaTasa: fechaPrimerDia,
      origen: 'TASA_MENSUAL_CONFIRMADA',
    }
  }

  const result = await totalnetQuery(
    `
      SELECT
        tm.tasa::numeric AS tasa
      FROM administrativo.tasa_moneda_read(
        63,
        51,
        $1::date
      ) tm
      LIMIT 1;
    `,
    [fechaPrimerDia],
  )

  const row = result.rows[0]
  const tasa = toNumber(row?.tasa)

  if (tasa <= 0) {
    throw new Error(
      `No existe una tasa valida para el primer dia del periodo ${fechaPrimerDia}.`,
    )
  }

  return {
    tasa,
    fechaTasa: fechaPrimerDia,
    origen: 'TOTALNET_PRIMER_DIA',
  }
}

function getCacheKey(endpoint, filters = {}) {
  return JSON.stringify({
    endpoint,
    periodo: normalizePeriod(filters.periodo),
    zona: normalizeText(filters.zona),
    franquicia: normalizeText(filters.franquicia),
    servicio: normalizeText(filters.servicio),
    search: normalizeText(filters.search),
    tasaCargo: round(toNumber(filters.tasaCargo), 6),
    limit: toNumber(filters.limit, 300),
  })
}

function getCached(key) {
  const item = cache.get(key)
  if (!item) return null

  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return JSON.parse(JSON.stringify(item.value))
}

function setCached(key, value) {
  cache.set(key, {
    createdAt: Date.now(),
    value: JSON.parse(JSON.stringify(value)),
  })

  if (cache.size > 30) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
}

function hashPayload(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function isGeneratedCargo(row = {}) {
  return row.tipoCargo === 'GENERADO'
}

function isPosteriorCargo(row = {}) {
  return row.tipoCargo === 'POSTERIOR'
}

function isRecoveredCargo(row = {}) {
  return row.tipoCargo === 'RECUPERADO'
}

function isPaid(row = {}) {
  return row.estadoPago === 'PAGADO'
}

function isPendingCargo(row = {}) {
  return isGeneratedCargo(row) && !isPaid(row)
}

function isCollectedCargo(row = {}) {
  return isGeneratedCargo(row) && isPaid(row)
}

function isPendingPosteriorCargo(row = {}) {
  return isPosteriorCargo(row) && !isPaid(row)
}

function isCollectedPosteriorCargo(row = {}) {
  return isPosteriorCargo(row) && isPaid(row)
}

const COBRANZA_DETALLE_QUERY = `
WITH parametros AS (
    SELECT
        $1::timestamp AS mes_desde,
        $2::timestamp AS mes_hasta,
        $3::timestamp AS fin_carga_masiva,
        date_trunc('year', $1::timestamp) AS inicio_recuperados,
        $4::date AS fecha_tarifa,
        $5::numeric(12,4) AS tasa_cargo
),

-- Lee las facturas del mes una sola vez.
renglones_mes AS MATERIALIZED (
    SELECT
        rf.id_renglon_factura,
        rf.id_cargo_cliente,
        rf.id_factura,
        rf.id_tarifa_servicio,
        rf.id_moneda,
        rf.id_ajuste_estatico,
        rf.total_bruto::numeric AS total_bruto,
        mf.fecha_registro AS fecha_movimiento
    FROM administrativo.m_factura mf
    JOIN administrativo.d_renglon_factura rf
      ON rf.id_factura = mf.id_factura
    CROSS JOIN parametros p
    WHERE mf.fecha_registro >= p.mes_desde
      AND mf.fecha_registro < p.mes_hasta
      AND mf.id_estatus IN (50, 51, 90)
),

claves_tasa AS MATERIALIZED (
    SELECT DISTINCT
        rm.id_moneda,
        rm.fecha_movimiento::date AS fecha_tasa
    FROM renglones_mes rm
    WHERE rm.id_moneda IS NOT NULL
),

tasas_movimiento AS MATERIALIZED (
    SELECT
        ct.id_moneda,
        ct.fecha_tasa,
        tx.tasa
    FROM claves_tasa ct
    LEFT JOIN LATERAL (
        SELECT tm.tasa::numeric AS tasa
        FROM administrativo.tasa_moneda_read(
            ct.id_moneda,
            51,
            ct.fecha_tasa
        ) tm
        LIMIT 1
    ) tx ON true
),

movimientos_por_cargo AS MATERIALIZED (
    SELECT
        rm.id_cargo_cliente,
        max(rm.fecha_movimiento) FILTER (
            WHERE rm.id_ajuste_estatico IS NULL
        ) AS fecha_pago,
        max(rm.fecha_movimiento) FILTER (
            WHERE rm.id_ajuste_estatico > 0
        ) AS fecha_descuento,
        count(DISTINCT rm.id_factura)::integer AS cantidad_facturas,
        coalesce(sum(rm.total_bruto) FILTER (
            WHERE rm.id_ajuste_estatico IS NULL
        ), 0) AS monto_pago_bs,
        coalesce(sum(rm.total_bruto / nullif(tm.tasa, 0)) FILTER (
            WHERE rm.id_ajuste_estatico IS NULL
        ), 0) AS monto_pago_usd,
        abs(coalesce(sum(rm.total_bruto) FILTER (
            WHERE rm.id_ajuste_estatico > 0
        ), 0)) AS monto_descuento_bs,
        abs(coalesce(sum(rm.total_bruto / nullif(tm.tasa, 0)) FILTER (
            WHERE rm.id_ajuste_estatico > 0
        ), 0)) AS monto_descuento_usd,
        count(*) FILTER (
            WHERE tm.tasa IS NULL
        )::integer AS renglones_sin_tasa
    FROM renglones_mes rm
    LEFT JOIN tasas_movimiento tm
      ON tm.id_moneda = rm.id_moneda
     AND tm.fecha_tasa = rm.fecha_movimiento::date
    GROUP BY rm.id_cargo_cliente
),

-- Separa cargos del mes y recuperados para aprovechar los índices de fecha.
cargos_objetivo AS MATERIALIZED (
    SELECT
        dcc.id_cargo_cliente,
        CASE
            WHEN dcc.fecha_creacion < p.fin_carga_masiva THEN 'GENERADO'
            ELSE 'POSTERIOR'
        END AS tipo_cargo
    FROM administrativo.d_cargo_cliente dcc
    CROSS JOIN parametros p
    WHERE dcc.fecha_creacion >= p.mes_desde
      AND dcc.fecha_creacion < p.mes_hasta
      AND dcc.id_tipo_renglon IN (1, 9)

    UNION ALL

    SELECT
        dcc.id_cargo_cliente,
        'RECUPERADO'::text AS tipo_cargo
    FROM movimientos_por_cargo mp
    JOIN administrativo.d_cargo_cliente dcc
      ON dcc.id_cargo_cliente = mp.id_cargo_cliente
    CROSS JOIN parametros p
    WHERE dcc.fecha_creacion >= p.inicio_recuperados
      AND dcc.fecha_creacion < p.mes_desde
      AND dcc.id_tipo_renglon IN (1, 9)
),

zonas_franquicia AS MATERIALIZED (
    SELECT
        fz.id_franquicia,
        count(DISTINCT fz.id_zona)::integer AS cantidad_zonas,
        string_agg(DISTINCT z.zona, ' | ' ORDER BY z.zona) AS zona
    FROM operativo.m_franquicia_zona fz
    JOIN ubigeo.m_zona z
      ON z.id_zona = fz.id_zona
    WHERE fz.fecha_eliminacion IS NULL
      AND z.fecha_eliminacion IS NULL
    GROUP BY fz.id_franquicia
),

cargos_clasificados AS MATERIALIZED (
    SELECT
        dcc.id_cargo_cliente,
        dcc.id_cliente,
        dcc.id_contrato_detalle,
        cd.id_contrato,
        dcc.id_paquete,
        dcc.id_estatus,
        dcc.fecha_creacion AS fecha_cargo,
        dcc.fecha_registro,
        coalesce(dcc.cantidad_puntos, 1) AS cantidad_puntos,
        cd.fecha_corte,
        cd.id_franquicia,
        cd.id_sector,
        ctr.numero_contrato,
        cli.rif,
        cli.razon_social,
        srv.servicio,
        est.estatus AS estatus_cliente,
        fr.nombre_franquicia,
        zf.zona,
        coalesce(zf.cantidad_zonas, 0) AS cantidad_zonas,
        co.tipo_cargo
    FROM cargos_objetivo co
    JOIN administrativo.d_cargo_cliente dcc
      ON dcc.id_cargo_cliente = co.id_cargo_cliente
    JOIN operativo.m_contrato_detalle cd
      ON cd.id_contrato_detalle = dcc.id_contrato_detalle
    LEFT JOIN operativo.m_contrato ctr
      ON ctr.id_contrato = cd.id_contrato
    LEFT JOIN operativo.m_cliente cli
      ON cli.id_cliente = dcc.id_cliente
    LEFT JOIN operativo.m_franquicia fr
      ON fr.id_franquicia = cd.id_franquicia
    LEFT JOIN zonas_franquicia zf
      ON zf.id_franquicia = cd.id_franquicia
    LEFT JOIN operativo.m_tipo_servicio ts
      ON ts.id_tipo_servicio = cd.id_tipo_servicio
    LEFT JOIN operativo.m_servicio srv
      ON srv.id_servicio = ts.id_servicio
    LEFT JOIN comun.m_estatus est
      ON est.id_estatus = cd.id_estatus
),

-- Limita el catálogo al mes analizado antes de resolver la tarifa.
tarifas_mes_base AS MATERIALIZED (
    SELECT
        tas.id_tarifa_servicio,
        tas.id_paquete,
        tas.id_franquicia,
        tas.id_sector,
        tas.id_moneda_cobro,
        tas.monto_cobro::numeric AS monto_cobro
    FROM operativo.m_tarifa_servicio tas
    CROSS JOIN parametros p
    WHERE tas.fecha_eliminacion IS NULL
      AND tas.activo = true
      AND tas.fecha_vigencia >= p.fecha_tarifa
      AND tas.fecha_vigencia < p.mes_hasta::date
),

tasas_tarifa AS MATERIALIZED (
    SELECT
        m.id_moneda_cobro,
        (
            SELECT tm.tasa::numeric
            FROM administrativo.tasa_moneda_read(
                63,
                m.id_moneda_cobro,
                p.fecha_tarifa
            ) tm
            LIMIT 1
        ) AS tasa
    FROM (
        SELECT DISTINCT id_moneda_cobro
        FROM operativo.m_tarifa_servicio
        WHERE id_moneda_cobro IS NOT NULL
    ) m
    CROSS JOIN parametros p
),

-- Resuelve una sola tarifa por paquete, franquicia y grupo de sector.
tarifas_catalogo_ranked AS MATERIALIZED (
    SELECT
        tmb.id_tarifa_servicio,
        tmb.id_paquete,
        tmb.id_franquicia,
        CASE
            WHEN tmb.id_sector = 11362 THEN 1
            ELSE 0
        END AS grupo_sector,
        tmb.id_moneda_cobro,
        tmb.monto_cobro,
        coalesce(tt.tasa, 1) AS tasa,
        row_number() OVER (
            PARTITION BY
                tmb.id_paquete,
                tmb.id_franquicia,
                CASE WHEN tmb.id_sector = 11362 THEN 1 ELSE 0 END
            ORDER BY tmb.id_tarifa_servicio DESC
        ) AS orden_tarifa
    FROM tarifas_mes_base tmb
    LEFT JOIN tasas_tarifa tt
      ON tt.id_moneda_cobro = tmb.id_moneda_cobro
),

tarifas_catalogo AS MATERIALIZED (
    SELECT
        id_tarifa_servicio,
        id_paquete,
        id_franquicia,
        grupo_sector,
        id_moneda_cobro,
        monto_cobro,
        tasa
    FROM tarifas_catalogo_ranked
    WHERE orden_tarifa = 1
),

-- Conserva las columnas 'real' como referencia comparativa,
-- sin contaminar monto_cargo_usd, que usa únicamente catálogo.
tarifa_facturada AS MATERIALIZED (
    SELECT DISTINCT ON (rm.id_cargo_cliente)
        rm.id_cargo_cliente,
        tas.id_moneda_cobro,
        (
            tas.monto_cobro::numeric * coalesce(tt.tasa, 1)
        ) AS monto_cobro_unitario_bs
    FROM renglones_mes rm
    JOIN operativo.m_tarifa_servicio tas
      ON tas.id_tarifa_servicio = rm.id_tarifa_servicio
    LEFT JOIN tasas_tarifa tt
      ON tt.id_moneda_cobro = tas.id_moneda_cobro
    WHERE rm.id_ajuste_estatico IS NULL
      AND rm.id_tarifa_servicio IS NOT NULL
    ORDER BY
        rm.id_cargo_cliente,
        rm.fecha_movimiento DESC,
        rm.id_renglon_factura DESC
),

tarifa_configurada AS MATERIALIZED (
    SELECT
        cs.id_cargo_cliente,
        tc.id_moneda_cobro,
        (
            tc.monto_cobro * coalesce(tc.tasa, 1)
        ) AS monto_cobro_unitario_bs
    FROM cargos_clasificados cs
    JOIN tarifas_catalogo tc
      ON tc.id_paquete = cs.id_paquete
     AND tc.id_franquicia = cs.id_franquicia
     AND tc.grupo_sector = CASE
            WHEN cs.id_sector = 11362 THEN 1
            ELSE 0
         END
    WHERE cs.tipo_cargo IN ('GENERADO', 'POSTERIOR')
),

detalle AS MATERIALIZED (
    SELECT
        cs.*,
        CASE
            WHEN cs.id_estatus = 58
             AND mp.id_cargo_cliente IS NOT NULL
            THEN 'PAGADO'
            ELSE 'NO PAGADO'
        END AS estado_pago,
        coalesce(tc.id_moneda_cobro, tf.id_moneda_cobro, 0)::integer AS id_moneda_cargo,
        (
            coalesce(tc.monto_cobro_unitario_bs, 0)::numeric
            * cs.cantidad_puntos
        ) AS monto_cargo_teorico_bs,
        (
            coalesce(
                tf.monto_cobro_unitario_bs,
                tc.monto_cobro_unitario_bs,
                0
            )::numeric
            * cs.cantidad_puntos
        ) AS monto_cargo_real_bs,
        mp.fecha_pago,
        mp.fecha_descuento,
        coalesce(mp.cantidad_facturas, 0) AS cantidad_facturas,
        coalesce(mp.monto_pago_bs, 0) AS monto_pago_bs,
        coalesce(mp.monto_pago_usd, 0) AS monto_pago_usd,
        coalesce(mp.monto_descuento_bs, 0) AS monto_descuento_bs,
        coalesce(mp.monto_descuento_usd, 0) AS monto_descuento_usd,
        coalesce(mp.renglones_sin_tasa, 0) AS renglones_sin_tasa
    FROM cargos_clasificados cs
    LEFT JOIN tarifa_facturada tf
      ON tf.id_cargo_cliente = cs.id_cargo_cliente
    LEFT JOIN tarifa_configurada tc
      ON tc.id_cargo_cliente = cs.id_cargo_cliente
    LEFT JOIN movimientos_por_cargo mp
      ON mp.id_cargo_cliente = cs.id_cargo_cliente
)

SELECT
    d.id_cargo_cliente,
    d.id_cliente,
    d.rif,
    d.razon_social,
    d.id_contrato,
    d.id_contrato_detalle,
    d.numero_contrato,
    d.fecha_cargo,
    d.fecha_corte,
    d.fecha_pago,
    d.fecha_descuento,
    d.tipo_cargo,
    d.estado_pago,
    d.servicio,
    d.estatus_cliente,
    d.id_franquicia,
    d.nombre_franquicia,
    d.zona,
    d.cantidad_zonas,
    d.id_moneda_cargo,
    p.tasa_cargo::numeric(12,4) AS tasa_cargo,

    CASE
        WHEN d.tipo_cargo IN ('GENERADO', 'POSTERIOR')
        THEN d.monto_cargo_teorico_bs
        ELSE 0
    END AS monto_cargo_bs,

    CASE
        WHEN d.tipo_cargo IN ('GENERADO', 'POSTERIOR')
        THEN d.monto_cargo_teorico_bs / nullif(p.tasa_cargo, 0)
        ELSE 0
    END AS monto_cargo_usd,

    CASE
        WHEN d.tipo_cargo IN ('GENERADO', 'POSTERIOR')
        THEN d.monto_cargo_real_bs
        ELSE 0
    END AS monto_cargo_real_bs,

    CASE
        WHEN d.tipo_cargo IN ('GENERADO', 'POSTERIOR')
        THEN d.monto_cargo_real_bs / nullif(p.tasa_cargo, 0)
        ELSE 0
    END AS monto_cargo_real_usd,

    d.monto_pago_bs AS monto_pago_bs,
    d.monto_pago_usd AS monto_pago_usd,
    d.monto_descuento_bs AS monto_descuento_bs,
    d.monto_descuento_usd AS monto_descuento_usd,

    CASE
        WHEN d.tipo_cargo IN ('GENERADO', 'POSTERIOR')
        THEN
            (d.monto_cargo_teorico_bs / nullif(p.tasa_cargo, 0))
            - d.monto_pago_usd
            - d.monto_descuento_usd
        ELSE 0
    END AS saldo_pendiente_usd,

    CASE
        WHEN d.tipo_cargo IN ('GENERADO', 'POSTERIOR')
        THEN
            (d.monto_cargo_real_bs / nullif(p.tasa_cargo, 0))
            - d.monto_pago_usd
            - d.monto_descuento_usd
        ELSE 0
    END AS saldo_pendiente_real_usd,

    CASE
        WHEN d.tipo_cargo = 'RECUPERADO'
         AND d.estado_pago = 'PAGADO'
        THEN d.monto_pago_usd
        ELSE 0
    END AS monto_recuperado_usd,

    d.cantidad_facturas,
    d.renglones_sin_tasa
FROM detalle d
CROSS JOIN parametros p
WHERE ($6 = '' OR COALESCE(d.zona, '') = $6)
  AND ($7 = '' OR COALESCE(d.nombre_franquicia, '') = $7)
  AND ($8 = '' OR COALESCE(d.servicio, '') = $8)
  AND (
    $9 = ''
    OR COALESCE(d.rif, '') ILIKE '%' || $9 || '%'
    OR COALESCE(d.razon_social, '') ILIKE '%' || $9 || '%'
    OR COALESCE(d.numero_contrato::text, '') ILIKE '%' || $9 || '%'
  )
ORDER BY
    d.nombre_franquicia NULLS LAST,
    d.razon_social NULLS LAST,
    d.id_cargo_cliente;
`

function normalizeRow(row = {}) {
  return {
    idCargoCliente: row.id_cargo_cliente,
    idCliente: row.id_cliente,
    rif: normalizeText(row.rif),
    razonSocial: normalizeText(row.razon_social, 'SIN NOMBRE'),
    idContrato: row.id_contrato,
    idContratoDetalle: row.id_contrato_detalle,
    numeroContrato: normalizeText(row.numero_contrato),
    fechaCargo: row.fecha_cargo,
    fechaCorte: row.fecha_corte,
    fechaPago: row.fecha_pago,
    fechaDescuento: row.fecha_descuento,
    tipoCargo: normalizeText(row.tipo_cargo, 'SIN DATO'),
    estadoPago: normalizeText(row.estado_pago, 'SIN DATO'),
    servicio: normalizeText(row.servicio, 'SIN SERVICIO'),
    estatusCliente: normalizeText(row.estatus_cliente, 'SIN ESTATUS'),
    idFranquicia: row.id_franquicia,
    nombreFranquicia: normalizeText(row.nombre_franquicia, 'SIN FRANQUICIA'),
    franquicia: normalizeText(row.nombre_franquicia, 'SIN FRANQUICIA'),
    zona: normalizeText(row.zona, 'SIN ZONA'),
    cantidadZonas: toNumber(row.cantidad_zonas),
    idMonedaCargo: toNumber(row.id_moneda_cargo),
    tasaCargo: toNumber(row.tasa_cargo),
    montoCargoBs: round(row.monto_cargo_bs),
    montoCargoUsd: round(row.monto_cargo_usd),
    montoPagoBs: round(row.monto_pago_bs),
    montoPagoUsd: round(row.monto_pago_usd),
    montoDescuentoBs: round(row.descuento_bs ?? row.monto_descuento_bs),
    montoDescuentoUsd: round(row.descuento_usd ?? row.monto_descuento_usd),
    descuentoUsd: round(row.descuento_usd ?? row.monto_descuento_usd),
    saldoPendienteUsd: round(row.saldo_pendiente_usd),
    montoRecuperadoUsd: round(row.monto_recuperado_usd),
    cantidadFacturas: toNumber(row.cantidad_facturas),
    renglonesSinTasa: toNumber(row.renglones_sin_tasa),
  }
}

function buildFilters(options = {}) {
  const period = buildPeriodDates(options.periodo)

  return {
    periodo: period.period,
    periodoDate: period.periodoDate,
    mesDesde: period.mesDesde,
    mesHasta: period.mesHasta,
    finCargaMasiva: period.finCargaMasiva,
    fechaTarifa: period.fechaTarifa,
    zona: normalizeText(options.zona),
    franquicia: normalizeText(options.franquicia),
    servicio: normalizeText(options.servicio),
    search: normalizeText(options.search),
    limit: Math.min(Math.max(toNumber(options.limit, 300), 1), 50000),
  }
}

async function loadRows(options = {}, endpoint = 'base') {
  const filters = buildFilters(options)
  const tasaMensual = await getTasaCargoMensual(filters.periodoDate)
  filters.tasaCargo = tasaMensual.tasa
  filters.fechaTasaCargo = tasaMensual.fechaTasa
  filters.origenTasaCargo = tasaMensual.origen
  const cacheKey = getCacheKey(endpoint, filters)
  const cached = getCached(cacheKey)

  if (cached) {
    return cached
  }

  const result = await totalnetQuery(COBRANZA_DETALLE_QUERY, [
    filters.mesDesde,
    filters.mesHasta,
    filters.finCargaMasiva,
    filters.fechaTarifa,
    filters.tasaCargo,
    filters.zona,
    filters.franquicia,
    filters.servicio,
    filters.search,
  ])

  const rows = filterExcludedCobranzaFranquicias(result.rows.map(normalizeRow))
  const payload = { rows, filters }

  setCached(cacheKey, payload)
  return payload
}

function buildKpis(rows = []) {
  const totals = rows.reduce(
    (acc, row) => {
      if (isGeneratedCargo(row)) {
        acc.totalCargos += 1
        acc.montoCargosUsd += row.montoCargoUsd
        acc.montoDescuentoUsd += (row.descuentoUsd ?? row.montoDescuentoUsd ?? 0)

        if (isCollectedCargo(row)) {
          acc.totalCobrado += 1
          acc.montoCobradoUsd += row.montoPagoUsd
        }

        if (isPendingCargo(row)) {
          acc.totalXCobrar += 1
          acc.montoXCobrarUsd += row.saldoPendienteUsd
        }
      }

      if (isPosteriorCargo(row)) {
        acc.totalPosterior += 1
        acc.montoPosteriorUsd += row.montoCargoUsd

        if (isCollectedPosteriorCargo(row)) {
          acc.totalPosteriorCobrado += 1
          acc.montoPosteriorCobradoUsd += row.montoPagoUsd
        }

        if (isPendingPosteriorCargo(row)) {
          acc.totalPosteriorXCobrar += 1
          acc.montoPosteriorXCobrarUsd += row.saldoPendienteUsd
        }
      }

      if (isRecoveredCargo(row) && isPaid(row)) {
        acc.totalRecuperado += 1
        acc.montoRecuperadoUsd += row.montoRecuperadoUsd || row.montoPagoUsd
      }

      acc.renglonesSinTasa += row.renglonesSinTasa || 0
      return acc
    },
    {
      totalCargos: 0,
      montoCargosUsd: 0,
      totalXCobrar: 0,
      montoXCobrarUsd: 0,
      totalCobrado: 0,
      montoCobradoUsd: 0,
      totalPosterior: 0,
      montoPosteriorUsd: 0,
      totalPosteriorCobrado: 0,
      montoPosteriorCobradoUsd: 0,
      totalPosteriorXCobrar: 0,
      montoPosteriorXCobrarUsd: 0,
      totalRecuperado: 0,
      montoRecuperadoUsd: 0,
      montoDescuentoUsd: 0,
      renglonesSinTasa: 0,
    },
  )

  return {
    ...totals,
    montoCargosUsd: round(totals.montoCargosUsd),
    montoXCobrarUsd: round(totals.montoXCobrarUsd),
    montoCobradoUsd: round(totals.montoCobradoUsd),
    montoPosteriorUsd: round(totals.montoPosteriorUsd),
    montoPosteriorAjusteUsd: round(
      totals.montoPosteriorUsd - totals.montoPosteriorCobradoUsd - totals.montoPosteriorXCobrarUsd,
    ),
    montoPosteriorCobradoUsd: round(totals.montoPosteriorCobradoUsd),
    montoPosteriorXCobrarUsd: round(totals.montoPosteriorXCobrarUsd),
    montoRecuperadoUsd: round(totals.montoRecuperadoUsd),
    montoDescuentoUsd: round(totals.montoDescuentoUsd),
    descuentoUsd: round(totals.montoDescuentoUsd),
    pctXCobrar: pct(totals.totalXCobrar, totals.totalCargos),
    pctCobrado: pct(totals.totalCobrado, totals.totalCargos),
  }
}

function addRisk(item, totalPendienteGlobal) {
  const sharePending = pct(item.montoXCobrarUsd, totalPendienteGlobal)
  const gapCobranza = Math.max(0, 100 - toNumber(item.pctCobrado))
  const riskScore = round((gapCobranza * 0.65) + (sharePending * 0.35), 2)

  let riesgo = 'Bajo'
  if (riskScore >= 60 || item.pctCobrado < 45) {
    riesgo = 'Alto'
  } else if (riskScore >= 35 || item.pctCobrado < 70) {
    riesgo = 'Medio'
  }

  return {
    ...item,
    participacionPendiente: sharePending,
    riskScore,
    riesgo,
  }
}

function aggregateBy(rows = [], keyName, fallback) {
  const buckets = new Map()

  rows.forEach((row) => {
    const key = normalizeText(row[keyName], fallback)
    /* FIX: Inyectar explícitamente nombreFranquicia y conteo de clientes únicos para tablas agrupadas */
    const current = buckets.get(key) || {
      name: key,
      zona: row.zona || 'SIN ZONA',
      franquicia: row.franquicia || row.nombreFranquicia || 'SIN FRANQUICIA',
      nombreFranquicia: row.nombreFranquicia || row.franquicia || 'SIN FRANQUICIA',
      totalCargos: 0,
      montoCargosUsd: 0,
      totalXCobrar: 0,
      montoXCobrarUsd: 0,
      totalCobrado: 0,
      montoCobradoUsd: 0,
      totalPosterior: 0,
      montoPosteriorUsd: 0,
      totalPosteriorCobrado: 0,
      montoPosteriorCobradoUsd: 0,
      totalPosteriorXCobrar: 0,
      montoPosteriorXCobrarUsd: 0,
      totalRecuperado: 0,
      montoRecuperadoUsd: 0,
      montoDescuentoUsd: 0,
      total: 0,
      _clientesRecuperados: new Set(),
    }

    if (isGeneratedCargo(row)) {
      current.totalCargos += 1
      current.total += 1
      current.montoCargosUsd += row.montoCargoUsd
      current.montoDescuentoUsd += (row.descuentoUsd ?? row.montoDescuentoUsd ?? 0)

      if (isCollectedCargo(row)) {
        current.totalCobrado += 1
        current.montoCobradoUsd += row.montoPagoUsd
      }

      if (isPendingCargo(row)) {
        current.totalXCobrar += 1
        current.montoXCobrarUsd += row.saldoPendienteUsd
      }
    }

    if (isPosteriorCargo(row)) {
      current.totalPosterior += 1
      current.montoPosteriorUsd += row.montoCargoUsd

      if (isCollectedPosteriorCargo(row)) {
        current.totalPosteriorCobrado += 1
        current.montoPosteriorCobradoUsd += row.montoPagoUsd
      }

      if (isPendingPosteriorCargo(row)) {
        current.totalPosteriorXCobrar += 1
        current.montoPosteriorXCobrarUsd += row.saldoPendienteUsd
      }
    }

    if (isRecoveredCargo(row) && isPaid(row)) {
      current.totalRecuperado += 1
      current.montoRecuperadoUsd += row.montoRecuperadoUsd || row.montoPagoUsd
      if (row.idCliente) {
        current._clientesRecuperados.add(row.idCliente)
      }
    }

    buckets.set(key, current)
  })

  const base = Array.from(buckets.values())
    .map((item) => ({
      ...item,
      clientesRecuperados: item._clientesRecuperados.size,
      montoCargosUsd: round(item.montoCargosUsd),
      montoXCobrarUsd: round(item.montoXCobrarUsd),
      montoCobradoUsd: round(item.montoCobradoUsd),
      montoPosteriorUsd: round(item.montoPosteriorUsd),
      montoPosteriorAjusteUsd: round(
        item.montoPosteriorUsd - item.montoPosteriorCobradoUsd - item.montoPosteriorXCobrarUsd,
      ),
      montoPosteriorCobradoUsd: round(item.montoPosteriorCobradoUsd),
      montoPosteriorXCobrarUsd: round(item.montoPosteriorXCobrarUsd),
      montoRecuperadoUsd: round(item.montoRecuperadoUsd),
      montoDescuentoUsd: round(item.montoDescuentoUsd),
      descuentoUsd: round(item.montoDescuentoUsd),
      pctCobrado: pct(item.totalCobrado, item.totalCargos),
      pctXCobrar: pct(item.totalXCobrar, item.totalCargos),
    }))
    .sort((a, b) => b.totalXCobrar - a.totalXCobrar)

  // Limpieza del payload temporal
  base.forEach(item => delete item._clientesRecuperados)

  const totalPendienteGlobal = base.reduce((acc, item) => {
    return acc + item.montoXCobrarUsd
  }, 0)

  return base.map((item) => addRisk(item, totalPendienteGlobal))
}

function getUniqueOptions(rows = [], keyName) {
  return Array.from(
    new Set(rows.map((row) => normalizeText(row[keyName])).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

function getClientesXCobrarRows(rows = [], limit = 300) {
  return rows
    .filter((row) => isPendingCargo(row))
    .sort((a, b) => b.saldoPendienteUsd - a.saldoPendienteUsd)
    .slice(0, limit)
}

function buildDataQuality(rows = []) {
  const generatedOrPost = rows.filter((row) => {
    return isGeneratedCargo(row) || isPosteriorCargo(row)
  })

  const sinTasa = rows.reduce((acc, row) => acc + toNumber(row.renglonesSinTasa), 0)
  const sinMontoCargo = generatedOrPost.filter((row) => row.montoCargoUsd <= 0)
  const sinZona = rows.filter((row) => row.zona === 'SIN ZONA')
  const sinFranquicia = rows.filter((row) => row.nombreFranquicia === 'SIN FRANQUICIA')
  const sinServicio = rows.filter((row) => row.servicio === 'SIN SERVICIO')

  return {
    totalRegistros: rows.length,
    renglonesSinTasa: sinTasa,
    cargosSinMonto: sinMontoCargo.length,
    cargosSinZona: sinZona.length,
    cargosSinFranquicia: sinFranquicia.length,
    cargosSinServicio: sinServicio.length,
    alertas: [
      {
        name: 'Renglones sin tasa',
        value: sinTasa,
        severity: sinTasa > 0 ? 'Alta' : 'Normal',
      },
      {
        name: 'Cargos sin monto',
        value: sinMontoCargo.length,
        severity: sinMontoCargo.length > 0 ? 'Media' : 'Normal',
      },
      {
        name: 'Cargos sin zona',
        value: sinZona.length,
        severity: sinZona.length > 0 ? 'Media' : 'Normal',
      },
      {
        name: 'Cargos sin franquicia',
        value: sinFranquicia.length,
        severity: sinFranquicia.length > 0 ? 'Media' : 'Normal',
      },
      {
        name: 'Cargos sin servicio',
        value: sinServicio.length,
        severity: sinServicio.length > 0 ? 'Media' : 'Normal',
      },
    ],
    muestras: {
      sinMontoCargo: sinMontoCargo.slice(0, 50),
      sinZona: sinZona.slice(0, 50),
      sinFranquicia: sinFranquicia.slice(0, 50),
      sinServicio: sinServicio.slice(0, 50),
    },
  }
}

async function readHistorico(periodoDate) {
  try {
    const result = await portalQuery(
      `
        SELECT
          fecha_snapshot::text AS fecha,
          SUM(total_cargos)::integer AS total_cargos,
          SUM(total_x_cobrar)::integer AS total_x_cobrar,
          SUM(total_cobrado)::integer AS total_cobrado,
          SUM(monto_cargos_usd)::numeric(18,2) AS monto_cargos_usd,
          SUM(monto_x_cobrar_usd)::numeric(18,2) AS monto_x_cobrar_usd,
          SUM(monto_cobrado_usd)::numeric(18,2) AS monto_cobrado_usd,
          SUM(cargos_posteriores)::integer AS cargos_posteriores,
          SUM(COALESCE(monto_posterior_usd, 0))::numeric(18,2) AS monto_posterior_usd,
          SUM(COALESCE(cargos_recuperados, 0))::integer AS cargos_recuperados,
          SUM(COALESCE(monto_recuperado_usd, 0))::numeric(18,2) AS monto_recuperado_usd,
          CASE
            WHEN SUM(total_cargos) > 0
              THEN ROUND((SUM(total_cobrado)::numeric / SUM(total_cargos)::numeric) * 100, 2)
            ELSE 0
          END AS pct_cobrado,
          CASE
            WHEN SUM(total_cargos) > 0
              THEN ROUND((SUM(total_x_cobrar)::numeric / SUM(total_cargos)::numeric) * 100, 2)
            ELSE 0
          END AS pct_x_cobrar
        FROM cobranza.resumen_diario
        WHERE periodo = $1::date
          AND nivel = 'TOTAL'
        GROUP BY fecha_snapshot
        ORDER BY fecha_snapshot;
      `,
      [periodoDate],
    )

    return result.rows.map((row) => ({
      fecha: row.fecha,
      totalCargos: toNumber(row.total_cargos),
      totalXCobrar: toNumber(row.total_x_cobrar),
      totalCobrado: toNumber(row.total_cobrado),
      montoCargosUsd: round(row.monto_cargos_usd),
      montoXCobrarUsd: round(row.monto_x_cobrar_usd),
      montoCobradoUsd: round(row.monto_cobrado_usd),
      totalPosterior: toNumber(row.cargos_posteriores),
      montoPosteriorUsd: round(row.monto_posterior_usd),
      totalRecuperado: toNumber(row.cargos_recuperados),
      montoRecuperadoUsd: round(row.monto_recuperado_usd),
      pctCobrado: round(row.pct_cobrado),
      pctXCobrar: round(row.pct_x_cobrar),
    }))
  } catch (error) {
    if (error.code === '42P01' || error.code === '3F000' || error.code === '42703') {
      return []
    }

    throw error
  }
}

function buildMeta(filters, rows) {
  return {
    generatedAt: new Date().toISOString(),
    periodo: filters.periodo,
    totalRegistros: rows.length,
    source: 'totalnet-readonly',
    tasaCargo: round(filters.tasaCargo, 6),
    fechaTasaCargo: filters.fechaTasaCargo,
    origenTasaCargo: filters.origenTasaCargo,
  }
}

function buildCommonPayload(rows, filters) {
  const kpis = buildKpis(rows)
  const regiones = aggregateBy(rows, 'zona', 'SIN ZONA')
  const franquicias = aggregateBy(rows, 'nombreFranquicia', 'SIN FRANQUICIA')
  const servicios = aggregateBy(rows, 'servicio', 'SIN SERVICIO')

  return {
    kpis,
    filtrosDisponibles: {
      zonas: getUniqueOptions(rows, 'zona'),
      franquicias: getUniqueOptions(rows, 'nombreFranquicia'),
      servicios: getUniqueOptions(rows, 'servicio'),
    },
    filtrosAplicados: {
      periodo: filters.periodo,
      zona: filters.zona,
      franquicia: filters.franquicia,
      servicio: filters.servicio,
      search: filters.search,
    },
    regiones,
    franquicias,
    servicios,
    meta: buildMeta(filters, rows),
  }
}

async function getCobranzaDashboard(options = {}) {
  const { rows, filters } = await loadRows(options, 'dashboard')
  const common = buildCommonPayload(rows, filters)
  const historico = await readHistorico(filters.periodoDate)

  return {
    ...common,
    charts: {
      avance: [
        {
          name: 'Cobrado',
          value: common.kpis.totalCobrado,
          pct: common.kpis.pctCobrado,
          monto: common.kpis.montoCobradoUsd,
        },
        {
          name: 'X Cobrar',
          value: common.kpis.totalXCobrar,
          pct: common.kpis.pctXCobrar,
          monto: common.kpis.montoXCobrarUsd,
        },
      ],
      topRegiones: common.regiones.slice(0, 8),
      topFranquicias: common.franquicias.slice(0, 8),
      historico,
    },
  }
}

async function getCobranzaRegiones(options = {}) {
  const { rows, filters } = await loadRows(options, 'regiones')
  const common = buildCommonPayload(rows, filters)

  return {
    ...common,
    rows: common.regiones,
  }
}

async function getCobranzaFranquicias(options = {}) {
  const { rows, filters } = await loadRows(options, 'franquicias')
  const common = buildCommonPayload(rows, filters)

  return {
    ...common,
    rows: common.franquicias,
  }
}

async function getCobranzaClientesXCobrar(options = {}) {
  const { rows, filters } = await loadRows(options, 'clientes-x-cobrar')
  const common = buildCommonPayload(rows, filters)
  const clientes = getClientesXCobrarRows(rows, filters.limit)

  return {
    ...common,
    rows: clientes,
    meta: {
      ...common.meta,
      totalClientesPendientes: rows.filter((row) => {
        return isPendingCargo(row)
      }).length,
      registrosMostrados: clientes.length,
    },
  }
}

async function getCobranzaHistorico(options = {}) {
  const filters = buildFilters(options)
  const historico = await readHistorico(filters.periodoDate)

  return {
    rows: historico,
    filtrosAplicados: {
      periodo: filters.periodo,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      periodo: filters.periodo,
      totalRegistros: historico.length,
      source: 'portal-db',
    },
  }
}

async function getCobranzaAuditoria(options = {}) {
  const { rows, filters } = await loadRows(options, 'auditoria')
  const common = buildCommonPayload(rows, filters)
  const calidad = buildDataQuality(rows)

  return {
    ...common,
    calidad,
    rows: calidad.alertas,
  }
}

function toResumenRows(data, periodoDate, sourceHash) {
  const rows = []

  const pushRow = (nivel, item) => {
    rows.push({
      periodo: periodoDate,
      nivel,
      zona: nivel === 'ZONA' ? item.name : '',
      franquicia: nivel === 'FRANQUICIA' ? item.name : '',
      servicio: nivel === 'SERVICIO' ? item.name : '',
      totalCargos: item.totalCargos,
      montoCargosUsd: item.montoCargosUsd,
      totalXCobrar: item.totalXCobrar,
      montoXCobrarUsd: item.montoXCobrarUsd,
      totalCobrado: item.totalCobrado,
      montoCobradoUsd: item.montoCobradoUsd,
      pctXCobrar: item.pctXCobrar,
      pctCobrado: item.pctCobrado,
      totalPosterior: item.totalPosterior,
      montoPosteriorUsd: item.montoPosteriorUsd || 0,
      totalRecuperado: item.totalRecuperado || 0,
      montoRecuperadoUsd: item.montoRecuperadoUsd || 0,
      sourceHash,
    })
  }

  pushRow('TOTAL', {
    name: '',
    ...data.kpis,
  })

  data.regiones.forEach((item) => pushRow('ZONA', item))
  data.franquicias.forEach((item) => pushRow('FRANQUICIA', item))
  data.servicios.forEach((item) => pushRow('SERVICIO', item))

  return rows
}

async function saveResumenRow(row) {
  await portalQuery(
    `
      INSERT INTO cobranza.resumen_diario (
        fecha_snapshot,
        periodo,
        nivel,
        zona,
        franquicia,
        servicio,
        total_cargos,
        monto_cargos_usd,
        total_x_cobrar,
        monto_x_cobrar_usd,
        total_cobrado,
        monto_cobrado_usd,
        pct_x_cobrar,
        pct_cobrado,
        cargos_posteriores,
        monto_posterior_usd,
        cargos_recuperados,
        monto_recuperado_usd,
        source_hash,
        snapshot_at
      )
      VALUES (
        CURRENT_DATE,
        $1::date,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        now()
      )
      ON CONFLICT (
        fecha_snapshot,
        periodo,
        nivel,
        zona,
        franquicia,
        servicio
      )
      DO UPDATE SET
        total_cargos = EXCLUDED.total_cargos,
        monto_cargos_usd = EXCLUDED.monto_cargos_usd,
        total_x_cobrar = EXCLUDED.total_x_cobrar,
        monto_x_cobrar_usd = EXCLUDED.monto_x_cobrar_usd,
        total_cobrado = EXCLUDED.total_cobrado,
        monto_cobrado_usd = EXCLUDED.monto_cobrado_usd,
        pct_x_cobrar = EXCLUDED.pct_x_cobrar,
        pct_cobrado = EXCLUDED.pct_cobrado,
        cargos_posteriores = EXCLUDED.cargos_posteriores,
        monto_posterior_usd = EXCLUDED.monto_posterior_usd,
        cargos_recuperados = EXCLUDED.cargos_recuperados,
        monto_recuperado_usd = EXCLUDED.monto_recuperado_usd,
        source_hash = EXCLUDED.source_hash,
        snapshot_at = now();
    `,
    [
      row.periodo,
      row.nivel,
      row.zona,
      row.franquicia,
      row.servicio,
      row.totalCargos,
      row.montoCargosUsd,
      row.totalXCobrar,
      row.montoXCobrarUsd,
      row.totalCobrado,
      row.montoCobradoUsd,
      row.pctXCobrar,
      row.pctCobrado,
      row.totalPosterior,
      row.montoPosteriorUsd,
      row.totalRecuperado,
      row.montoRecuperadoUsd,
      row.sourceHash,
    ],
  )
}

async function captureCobranzaSnapshot(options = {}) {
  const data = await getCobranzaDashboard({
    ...options,
    limit: options.limit || 5000,
  })

  const periodoDate = `${data.meta.periodo}-01`
  const sourceHash = hashPayload({
    period: data.meta.periodo,
    kpis: data.kpis,
    totalRegistros: data.meta.totalRegistros,
  })

  const resumenRows = toResumenRows(data, periodoDate, sourceHash)

  for (const row of resumenRows) {
    await saveResumenRow(row)
  }

  await portalQuery(
    `
      INSERT INTO cobranza.control_carga (
        periodo,
        fecha_snapshot,
        registros,
        total_cargos,
        total_cobrado,
        total_x_cobrar,
        source_hash,
        created_at
      )
      VALUES ($1::date, CURRENT_DATE, $2, $3, $4, $5, $6, now());
    `,
    [
      periodoDate,
      data.meta.totalRegistros,
      data.kpis.totalCargos,
      data.kpis.totalCobrado,
      data.kpis.totalXCobrar,
      sourceHash,
    ],
  )

  return {
    ok: true,
    periodo: data.meta.periodo,
    registros: data.meta.totalRegistros,
    resumenGuardado: resumenRows.length,
    sourceHash,
    generatedAt: new Date().toISOString(),
  }
}

async function getCobranzaTablas(options = {}) {
  const { rows, filters } = await loadRows(options, 'tablas')
  const common = buildCommonPayload(rows, filters)
  
  const clientesXCobrar = getClientesXCobrarRows(rows, filters.limit)
  
  return {
    ...common,
    rows: rows,
    tablas: {
      detalleFranquicias: common.franquicias,
      clientesPorCobrar: clientesXCobrar,
      cargosPostFranquicia: common.franquicias,
      clientesRecuperadosFranquicia: common.franquicias,
      detalleClientes: rows,
    },
    metaTablas: {
      detalleFranquicias: { mostrados: common.franquicias.length, total: common.franquicias.length },
      clientesPorCobrar: { 
        mostrados: clientesXCobrar.length, 
        total: rows.filter((r) => isPendingCargo(r)).length,
        clientesUnicos: new Set(clientesXCobrar.map((r) => r.idCliente)).size
      },
      cargosPostFranquicia: { mostrados: common.franquicias.length, total: common.franquicias.length },
      clientesRecuperadosFranquicia: { mostrados: common.franquicias.length, total: common.franquicias.length },
      detalleClientes: { mostrados: rows.length, total: rows.length },
    }
  }
}

async function getCobranzaAnalisisComparativo(options = {}) {
  const { rows, filters } = await loadRows(options, 'analisis-comparativo')
  return buildCommonPayload(rows, filters)
}

module.exports = {
  captureCobranzaSnapshot,
  getCobranzaAnalisisComparativo,
  getCobranzaAuditoria,
  getCobranzaClientesXCobrar,
  getCobranzaDashboard,
  getCobranzaFranquicias,
  getCobranzaHistorico,
  getCobranzaRegiones,
  getCobranzaTablas,
}
