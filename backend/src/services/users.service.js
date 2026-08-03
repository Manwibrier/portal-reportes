const { env } = require('../config/env')
const { getAdminPocketBase } = require('../config/pocketbase')
const { AppError } = require('../utils/app-error')
const { ROLE_VALUES, normalizeRoles } = require('../utils/roles')

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeEmail(value = '') {
  return normalizeText(value).toLowerCase()
}

function sanitizeUser(record = {}) {
  const roles = normalizeRoles(record.role || record.roles)

  return {
    id: record.id,
    name: record.name || record.nombre || '',
    email: record.email || '',
    role: roles,
    roles,
    created: record.created,
    updated: record.updated,
  }
}

function normalizePocketBaseError(error, fallbackMessage) {
  const status = Number(error?.status || error?.response?.code || 500)
  const safeStatus = status >= 400 && status <= 599 ? status : 500

  return new AppError(
    error?.response?.message || error?.message || fallbackMessage,
    safeStatus,
    'POCKETBASE_USERS_ERROR',
    error?.response?.data || undefined
  )
}

function escapeFilterValue(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildSearchFilter(params = {}) {
  const search = normalizeText(params.search)

  if (!search) {
    return ''
  }

  const safeSearch = escapeFilterValue(search)

  return `(name ~ "${safeSearch}" || email ~ "${safeSearch}")`
}

function buildCreatePayload(payload = {}) {
  const password = String(payload.password || '').trim()
  const roles = normalizeRoles(payload.role || payload.roles)

  if (roles.length === 0) {
    throw new AppError(
      'Debe seleccionar al menos un permiso para el usuario.',
      400,
      'USER_ROLE_REQUIRED'
    )
  }

  return {
    name: normalizeText(payload.name),
    email: normalizeEmail(payload.email),
    emailVisibility: true,
    verified: true,
    role: roles,
    password,
    passwordConfirm: password,
  }
}

function buildUpdatePayload(payload = {}) {
  const updatePayload = {
    name: normalizeText(payload.name),
    email: normalizeEmail(payload.email),
  }

  if (payload.role !== undefined || payload.roles !== undefined) {
    const roles = normalizeRoles(payload.role || payload.roles)

    if (roles.length === 0) {
      throw new AppError(
        'Debe seleccionar al menos un permiso para el usuario.',
        400,
        'USER_ROLE_REQUIRED'
      )
    }

    updatePayload.role = roles
  }

  if (payload.password) {
    updatePayload.password = String(payload.password)
    updatePayload.passwordConfirm = String(payload.password)
  }

  return updatePayload
}

function applyLocalRoleFilter(users = [], role = '') {
  const roles = normalizeRoles(role)

  if (roles.length === 0) {
    return users
  }

  return users.filter((user) => {
    const userRoles = normalizeRoles(user.role || user.roles)
    return roles.some((item) => userRoles.includes(item))
  })
}

async function listUsers(params = {}) {
  try {
    const client = await getAdminPocketBase()
    const page = Number(params.page || 1)
    const perPage = Number(params.perPage || 25)
    const filter = buildSearchFilter(params)

    const result = await client
      .collection(env.POCKETBASE_USERS_COLLECTION)
      .getList(page, perPage, {
        sort: 'name,email',
        filter: filter || undefined,
      })

    const items = applyLocalRoleFilter(
      result.items.map(sanitizeUser),
      params.role
    )

    return {
      page: result.page,
      perPage: result.perPage,
      totalItems: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / perPage)),
      items,
    }
  } catch (error) {
    throw normalizePocketBaseError(error, 'No se pudo listar usuarios.')
  }
}

async function getUserById(id) {
  try {
    const client = await getAdminPocketBase()
    const record = await client
      .collection(env.POCKETBASE_USERS_COLLECTION)
      .getOne(id)

    return sanitizeUser(record)
  } catch (error) {
    throw normalizePocketBaseError(error, 'No se pudo obtener el usuario.')
  }
}

async function createUser(payload = {}) {
  try {
    const client = await getAdminPocketBase()
    const record = await client
      .collection(env.POCKETBASE_USERS_COLLECTION)
      .create(buildCreatePayload(payload))

    return sanitizeUser(record)
  } catch (error) {
    throw normalizePocketBaseError(error, 'No se pudo crear el usuario.')
  }
}

async function updateUser(id, payload = {}) {
  try {
    const client = await getAdminPocketBase()
    const record = await client
      .collection(env.POCKETBASE_USERS_COLLECTION)
      .update(id, buildUpdatePayload(payload))

    return sanitizeUser(record)
  } catch (error) {
    throw normalizePocketBaseError(error, 'No se pudo actualizar el usuario.')
  }
}

async function deleteUser(id, actor = {}) {
  if (actor?.id && actor.id === id) {
    throw new AppError(
      'No puede eliminar su propio usuario autenticado.',
      400,
      'SELF_DELETE_NOT_ALLOWED'
    )
  }

  try {
    const client = await getAdminPocketBase()
    await client.collection(env.POCKETBASE_USERS_COLLECTION).delete(id)

    return {
      ok: true,
    }
  } catch (error) {
    throw normalizePocketBaseError(error, 'No se pudo eliminar el usuario.')
  }
}

module.exports = {
  ROLE_VALUES,
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
}
