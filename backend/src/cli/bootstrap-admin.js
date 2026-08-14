const { env } = require('../config/env')
const { createUser, listUsers } = require('../services/users.service')

function required(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`${name} es obligatorio para el bootstrap.`)
  return value
}

async function main() {
  void env

  const name = required('BOOTSTRAP_ADMIN_NAME')
  const email = required('BOOTSTRAP_ADMIN_EMAIL').toLowerCase()
  const password = required('BOOTSTRAP_ADMIN_PASSWORD')

  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 12 caracteres.')
  }

  const existingAdmins = await listUsers({
    page: 1,
    perPage: 1,
    role: 'admin',
  })

  if (existingAdmins.totalItems > 0) {
    console.log('Bootstrap omitido: ya existe un administrador.')
    return
  }

  await createUser({
    name,
    email,
    password,
    roles: ['admin'],
  })

  console.log('Administrador inicial creado correctamente en PocketBase.')
}

main().catch((error) => {
  console.error('No se pudo crear el administrador inicial:', {
    message: error.message,
    code: error.code,
  })
  process.exitCode = 1
})
