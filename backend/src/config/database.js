const { Pool } = require('pg')
const { env } = require('./env')

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
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
})

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error)
})

/**
 * Ejecuta una consulta parametrizada sobre PostgreSQL.
 *
 * @param {string} text Consulta SQL parametrizada.
 * @param {Array<unknown>} [params=[]] Parámetros SQL.
 * @returns {Promise<import('pg').QueryResult>} Resultado de la consulta.
 */
async function query(text, params = []) {
  try {
    return await pool.query(text, params)
  } catch (error) {
    console.error('Error ejecutando consulta SQL:', {
      message: error.message,
      code: error.code,
    })
    throw error
  }
}

/**
 * Cierra el pool de conexiones.
 *
 * @returns {Promise<void>}
 */
async function closePool() {
  await pool.end()
}

module.exports = {
  pool,
  query,
  closePool,
}
