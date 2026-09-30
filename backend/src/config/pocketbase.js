const { env } = require('./env')
const { AppError } = require('../utils/app-error')

let PocketBaseConstructorPromise = null
let adminClient = null
let adminClientPromise = null

async function getPocketBaseConstructor() {
  if (!PocketBaseConstructorPromise) {
    PocketBaseConstructorPromise = import('pocketbase').then((module) => {
      const PocketBase = module.default || module

      if (typeof PocketBase !== 'function') {
        throw new AppError(
          'No se pudo cargar el SDK de PocketBase.',
          500,
          'POCKETBASE_SDK_LOAD_FAILED'
        )
      }

      return PocketBase
    })
  }

  return PocketBaseConstructorPromise
}

async function createPocketBaseClient() {
  if (!env.POCKETBASE_URL) {
    throw new AppError(
      'Falta POCKETBASE_URL en el archivo .env del backend.',
      500,
      'POCKETBASE_URL_NOT_CONFIGURED'
    )
  }

  const PocketBase = await getPocketBaseConstructor()
  const client = new PocketBase(env.POCKETBASE_URL)

  if (typeof client.autoCancellation === 'function') {
    client.autoCancellation(false)
  }

  return client
}

function assertAdminCredentials() {
  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new AppError(
      'Faltan POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD en el archivo .env del backend.',
      500,
      'POCKETBASE_ADMIN_NOT_CONFIGURED'
    )
  }
}

async function authenticateAdminClient(client) {
  assertAdminCredentials()

  try {
    await client
      .collection('_superusers')
      .authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD)

    return client
  } catch (error) {
    if (Number(error?.status) !== 404) {
      throw error
    }
  }

  if (client.admins?.authWithPassword) {
    await client.admins.authWithPassword(
      env.POCKETBASE_ADMIN_EMAIL,
      env.POCKETBASE_ADMIN_PASSWORD
    )

    return client
  }

  throw new AppError(
    'No se pudo autenticar el superusuario de PocketBase.',
    500,
    'POCKETBASE_ADMIN_AUTH_FAILED'
  )
}

async function getAdminPocketBase() {
  if (adminClient?.authStore?.isValid) {
    return adminClient
  }

  if (adminClientPromise) {
    return adminClientPromise
  }

  adminClientPromise = createPocketBaseClient()
    .then((client) => authenticateAdminClient(client))
    .then((client) => {
      adminClient = client
      return adminClient
    })
    .finally(() => {
      adminClientPromise = null
    })

  return adminClientPromise
}

module.exports = {
  createPocketBaseClient,
  getAdminPocketBase,
}
