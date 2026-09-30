const { Pool } = require('pg')
const { env } = require('./env')

function readBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  return String(value).trim().toLowerCase() === 'true'
}

function readNumber(value, defaultValue) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : defaultValue
}

function buildPortalPoolConfig() {
  return {
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
  }
}

function buildTotalnetPoolConfig() {
  return {
    host: process.env.TOTALNET_DB_HOST || env.DB_HOST,
    database: process.env.TOTALNET_DB_NAME || env.DB_NAME,
    user: process.env.TOTALNET_DB_USER || env.DB_USER,
    password:
      process.env.TOTALNET_DB_PASSWORD !== undefined
        ? process.env.TOTALNET_DB_PASSWORD
        : env.DB_PASSWORD,
    port: readNumber(process.env.TOTALNET_DB_PORT, env.DB_PORT),
    max: readNumber(process.env.TOTALNET_DB_POOL_MAX, 6),
    idleTimeoutMillis: readNumber(
      process.env.TOTALNET_DB_IDLE_TIMEOUT_MS,
      env.DB_IDLE_TIMEOUT_MS,
    ),
    connectionTimeoutMillis: readNumber(
      process.env.TOTALNET_DB_CONNECTION_TIMEOUT_MS,
      env.DB_CONNECTION_TIMEOUT_MS,
    ),
    statement_timeout: readNumber(
      process.env.TOTALNET_DB_STATEMENT_TIMEOUT_MS,
      env.DB_STATEMENT_TIMEOUT_MS,
    ),
    query_timeout: readNumber(
      process.env.TOTALNET_DB_QUERY_TIMEOUT_MS,
      env.DB_QUERY_TIMEOUT_MS,
    ),
    application_name:
      process.env.TOTALNET_DB_APP_NAME || 'portal-reportes-totalnet-readonly',
    ssl: readBoolean(process.env.TOTALNET_DB_SSL, env.DB_SSL)
      ? { rejectUnauthorized: false }
      : false,
  }
}

const pool = new Pool(buildPortalPoolConfig())
const totalnetPool = new Pool(buildTotalnetPoolConfig())

pool.on('error', (error) => {
  console.error('Error inesperado en el pool PostgreSQL Portal:', error)
})

totalnetPool.on('error', (error) => {
  console.error('Error inesperado en el pool PostgreSQL Totalnet:', error)
})

async function runQuery(targetPool, text, params = [], label = 'SQL') {
  try {
    return await targetPool.query(text, params)
  } catch (error) {
    console.error(`Error ejecutando consulta ${label}:`, {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    })
    throw error
  }
}

async function query(text, params = []) {
  return runQuery(pool, text, params, 'Portal')
}

async function portalQuery(text, params = []) {
  return runQuery(pool, text, params, 'Portal')
}

async function totalnetQuery(text, params = []) {
  return runQuery(totalnetPool, text, params, 'Totalnet')
}

async function closePool() {
  await Promise.allSettled([pool.end(), totalnetPool.end()])
}

module.exports = {
  pool,
  totalnetPool,
  query,
  portalQuery,
  totalnetQuery,
  closePool,
}
