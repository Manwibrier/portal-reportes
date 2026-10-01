/**
 * Recupera el acceso del usuario analista: lo activa y le asigna la clave
 * indicada. Genera el hash con el mismo formato scrypt$... que valida auth.service.
 * Uso: npm run auth:reset-analista -- [clave]
 */
const { hashPassword } = require('../src/services/auth.service')
const { closePool, portalQuery } = require('../src/config/database')

const DEFAULT_EMAIL = 'analistadedatos@norteconecta.net'
const DEFAULT_PASSWORD = '12345678'

async function main() {
  const email = (process.argv[2] || DEFAULT_EMAIL).trim().toLowerCase()
  const password = process.argv[3] || DEFAULT_PASSWORD

  if (password.length < 8) {
    throw new Error('La clave debe tener al menos 8 caracteres.')
  }

  const result = await portalQuery(
    `
      UPDATE portal_auth.users
      SET
        password_hash = $2,
        is_active = TRUE,
        updated_at = NOW()
      WHERE LOWER(email) = $1
      RETURNING id, name, email, roles, is_active;
    `,
    [email, hashPassword(password)]
  )

  if (!result.rows[0]) {
    throw new Error(
      `No existe un usuario con el correo ${email}. Créelo con: npm run auth:create-admin -- ${email} "${password}" "Administrador"`
    )
  }

  console.log(
    `[auth:reset-analista] usuario activo: ${result.rows[0].email} (${result.rows[0].id})`
  )
}

main()
  .catch((error) => {
    console.error('[auth:reset-analista] falló:', error.message)
    process.exitCode = 1
  })
  .finally(closePool)