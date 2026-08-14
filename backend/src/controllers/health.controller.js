const { env } = require('../config/env')
const { query } = require('../config/database')
const {
  adminPocketBaseRequest,
  getPocketBaseHealth,
  recordsPath,
} = require('../config/pocketbase')

const REQUIRED_REPORT_OBJECTS = [
  'powerbi.cargos_mensualidad_ingreso_mes',
  'powerbi.cliente',
  'powerbi.indicadores_operacionales_mes',
  'powerbi.ingreso_consolidado',
  'powerbi.resumen_ordenes_servicio',
  'powerbi.tickets',
]

function getHealth(_req, res) {
  res.json({
    status: 'ok',
    service: 'portal-reportes-backend',
    timestamp: new Date().toISOString(),
  })
}

async function checkPostgres() {
  const checksResult = await query(
    `
      SELECT object_name,
        to_regclass(object_name) IS NOT NULL AS object_exists,
        CASE
          WHEN to_regclass(object_name) IS NULL THEN FALSE
          ELSE has_table_privilege(current_user, object_name, 'SELECT')
        END AS can_select
      FROM unnest($1::text[]) AS required(object_name);
    `,
    [REQUIRED_REPORT_OBJECTS]
  )

  const readOnlyResult = await query('SHOW transaction_read_only;')
  const readOnly = String(readOnlyResult.rows[0]?.transaction_read_only || '') === 'on'
  const missingObjects = checksResult.rows
    .filter((row) => !row.object_exists)
    .map((row) => row.object_name)
  const missingSelect = checksResult.rows
    .filter((row) => row.object_exists && !row.can_select)
    .map((row) => row.object_name)

  return {
    readOnly,
    missingObjects,
    missingSelect,
  }
}

async function checkPocketBase() {
  await getPocketBaseHealth()

  const collections = [
    env.POCKETBASE_USERS_COLLECTION,
    env.POCKETBASE_SESSIONS_COLLECTION,
    env.POCKETBASE_SESSION_AUDITS_COLLECTION,
  ]

  await Promise.all(
    collections.map((collection) =>
      adminPocketBaseRequest(recordsPath(collection), {
        query: {
          page: 1,
          perPage: 1,
          fields: 'id',
        },
      })
    )
  )
}

async function getReadiness(_req, res) {
  try {
    const [postgres] = await Promise.all([
      checkPostgres(),
      checkPocketBase(),
    ])

    if (!postgres.readOnly) {
      res.status(503).json({
        status: 'not_ready',
        service: 'portal-reportes-backend',
        reason: 'postgres_not_read_only',
        timestamp: new Date().toISOString(),
      })
      return
    }

    if (postgres.missingObjects.length > 0 || postgres.missingSelect.length > 0) {
      res.status(503).json({
        status: 'not_ready',
        service: 'portal-reportes-backend',
        reason: postgres.missingObjects.length > 0
          ? 'missing_report_objects'
          : 'insufficient_report_read_privileges',
        missingObjects: postgres.missingObjects,
        missingSelect: postgres.missingSelect,
        timestamp: new Date().toISOString(),
      })
      return
    }

    res.json({
      status: 'ready',
      service: 'portal-reportes-backend',
      postgres: 'read_only_ready',
      pocketbase: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Readiness fallo:', {
      message: error.message,
      code: error.code,
    })

    res.status(503).json({
      status: 'not_ready',
      service: 'portal-reportes-backend',
      reason: 'dependency_check_failed',
      timestamp: new Date().toISOString(),
    })
  }
}

module.exports = { getHealth, getReadiness }
