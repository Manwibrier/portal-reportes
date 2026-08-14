const { Pool } = require('pg')
const { env } = require('./env')

const WRITE_SQL_PATTERN = /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY|CALL|DO)\b/i

function assertReadOnlySql(text) {
  if (!env.DB_READ_ONLY) return

  const sql = String(text || '')
    .replace(/--.*$/gm, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')

  if (WRITE_SQL_PATTERN.test(sql)) {
    const error = new Error('La conexion PostgreSQL de reportes es de solo lectura.')
    error.code = 'READ_ONLY_DATABASE_WRITE_BLOCKED'
    throw error
  }
}

const pool = new Pool({
  host: env.DB_HOST,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  query_timeout: env.DB_QUERY_TIMEOUT_MS,
  application_name: env.DB_APP_NAME,
  options: env.DB_READ_ONLY ? '-c default_transaction_read_only=on' : undefined,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
})

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', {
    message: error.message,
    code: error.code,
  })
})

async function query(text, params = []) {
  assertReadOnlySql(text)

  try {
    return await pool.query(text, params)
  } catch (error) {
    console.error('Error ejecutando consulta SQL de reportes:', {
      message: error.message,
      code: error.code,
    })
    throw error
  }
}

async function closePool() {
  await pool.end()
}

module.exports = {
  pool,
  query,
  closePool,
  assertReadOnlySql,
}
