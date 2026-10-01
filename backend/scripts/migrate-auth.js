/**
 * Aplica las migraciones de portal_auth.
 * Idempotente: todos los CREATE son IF NOT EXISTS, se puede correr en cada arranque.
 * Uso: npm run auth:migrate
 */
const fs = require('fs')
const path = require('path')
const { closePool, pool } = require('../src/config/database')

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'db', 'migrations')

async function applyMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('No hay migraciones en db/migrations.')
    return
  }

  for (const file of files) {
    // El BOM (\uFEFF) que traen algunos .sql rompe la primera sentencia.
    const sql = fs
      .readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      .replace(/^\uFEFF/, '')
    // Pool directo (sin array de params): las migraciones traen varias sentencias
    // y el protocolo extendido de node-postgres solo admite una por consulta.
    await pool.query(sql)
    console.log(`[auth:migrate] aplicado ${file}`)
  }
}

applyMigrations()
  .then(() => {
    console.log('[auth:migrate] esquema portal_auth listo.')
  })
  .catch((error) => {
    console.error('[auth:migrate] falló:', {
      message: error.message,
      code: error.code,
    })
    process.exitCode = 1
  })
  .finally(closePool)