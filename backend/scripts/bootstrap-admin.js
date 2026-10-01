/**
 * Crea el administrador inicial. Idempotente: si ya existe uno, no hace nada,
 * para poder correrlo en cada arranque del contenedor.
 * Variables: PORTAL_ADMIN_NAME / PORTAL_ADMIN_EMAIL / PORTAL_ADMIN_PASSWORD
 * (las mismas que declara compose.yaml).
 * Uso: npm run auth:bootstrap
 */
const { createUser, listUsers } = require('../src/services/users.service')
const { closePool } = require('../src/config/database')

function required(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`${name} es obligatorio para el bootstrap.`)
  return value
}

async function main() {
  const email = required('PORTAL_ADMIN_EMAIL').toLowerCase()
  const password = required('PORTAL_ADMIN_PASSWORD')

  if (password.length < 8) {
    throw new Error('PORTAL_ADMIN_PASSWORD debe tener al menos 8 caracteres.')
  }

  const existingAdmins = await listUsers({ page: 1, perPage: 1, role: 'admin' })

  if (existingAdmins.totalItems > 0) {
    console.log('[auth:bootstrap] omitido: ya existe un administrador.')
    return
  }

  await createUser({
    name: process.env.PORTAL_ADMIN_NAME?.trim() || 'Administrador',
    email,
    password,
    role: ['admin'],
  })

  console.log(`[auth:bootstrap] administrador inicial creado: ${email}`)
}

main()
  .catch((error) => {
    console.error('[auth:bootstrap] no se pudo crear el administrador inicial:', {
      message: error.message,
      code: error.code,
    })
    process.exitCode = 1
  })
  .finally(closePool)