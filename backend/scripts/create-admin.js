/**
 * Crea un administrador.
 * Uso: npm run auth:create-admin -- correo@dominio.com claveMin8 "Nombre"
 */
const { createUser } = require('../src/services/users.service')
const { closePool } = require('../src/config/database')

function fail(message) {
  console.error(`[auth:create-admin] ${message}`)
  console.error('Uso: npm run auth:create-admin -- correo@dominio.com claveMin8 "Nombre"')
  process.exit(1)
}

async function main() {
  const [emailArg, passwordArg, nameArg] = process.argv.slice(2)

  if (!emailArg || !passwordArg) {
    fail('faltan argumentos.')
  }

  if (passwordArg.length < 8) {
    fail('la clave debe tener al menos 8 caracteres.')
  }

  const user = await createUser({
    name: nameArg?.trim() || 'Administrador',
    email: emailArg.trim().toLowerCase(),
    password: passwordArg,
    role: ['admin'],
  })

  console.log(`[auth:create-admin] administrador creado: ${user.email} (${user.id})`)
}

main()
  .catch((error) => {
    console.error('[auth:create-admin] no se pudo crear el usuario:', {
      message: error.message,
      code: error.code,
    })
    process.exitCode = 1
  })
  .finally(closePool)