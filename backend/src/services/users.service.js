const { env } = require('../config/env')
const {
  adminPocketBaseRequest,
  quoteFilterValue,
  recordsPath,
} = require('../config/pocketbase')
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
    name: record.name || '',
    email: record.email || '',
    role: roles,
    roles,
    created: record.created,
    updated: record.updated,
  }
}

function assertValidRoles(value) {
  const roles = normalizeRoles(value)

  if (roles.length === 0) {
    throw new AppError(
      'Debe seleccionar al menos un permiso para el usuario.',
      400,
      'USER_ROLE_REQUIRED'
    )
  }

  const invalidRoles = roles.filter((role) => !ROLE_VALUES.includes(role))

  if (invalidRoles.length > 0) {
    throw new AppError(
      `Permisos invalidos: ${invalidRoles.join(', ')}`,
      400,
      'USER_ROLE_INVALID'
    )
  }

  return roles
}

function isDuplicateEmailError(error) {
  const data = error?.details?.data || {}
  const emailError = data.email || data.username || null
  return Number(error?.details?.pocketbaseStatus || 0) === 400 && Boolean(emailError)
}

async function listUsers(params = {}) {
  const page = Math.max(Number(params.page || 1), 1)
  const perPage = Math.min(Math.max(Number(params.perPage || 25), 1), 100)
  const search = normalizeText(params.search)
  const role = normalizeText(params.role)
  const filters = []

  if (search) {
    const value = quoteFilterValue(search)
    filters.push(`(name ~ ${value} || email ~ ${value})`)
  }

  if (role) {
    filters.push(`role ?= ${quoteFilterValue(role)}`)
  }

  const result = await adminPocketBaseRequest(
    recordsPath(env.POCKETBASE_USERS_COLLECTION),
    {
      query: {
        page,
        perPage,
        sort: '-created,name',
        filter: filters.join(' && '),
      },
    }
  )

  return {
    page: Number(result?.page || page),
    perPage: Number(result?.perPage || perPage),
    totalItems: Number(result?.totalItems || 0),
    totalPages: Math.max(Number(result?.totalPages || 1), 1),
    items: Array.isArray(result?.items) ? result.items.map(sanitizeUser) : [],
  }
}

async function getUserById(id) {
  try {
    const record = await adminPocketBaseRequest(
      recordsPath(env.POCKETBASE_USERS_COLLECTION, id)
    )
    return sanitizeUser(record)
  } catch (error) {
    if (Number(error?.details?.pocketbaseStatus || 0) === 404) {
      throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
    }
    throw error
  }
}

async function createUser(payload = {}) {
  const name = normalizeText(payload.name)
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')
  const roles = assertValidRoles(payload.role || payload.roles)

  if (!name || !email || password.length < 8) {
    throw new AppError(
      'Nombre, correo y clave valida son requeridos.',
      400,
      'USER_INVALID_PAYLOAD'
    )
  }

  try {
    const record = await adminPocketBaseRequest(
      recordsPath(env.POCKETBASE_USERS_COLLECTION),
      {
        method: 'POST',
        body: {
          name,
          email,
          emailVisibility: true,
          verified: true,
          role: roles,
          password,
          passwordConfirm: password,
        },
      }
    )

    return sanitizeUser(record)
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new AppError(
        'Ya existe un usuario con ese correo.',
        409,
        'USER_EMAIL_EXISTS'
      )
    }
    throw error
  }
}

async function updateUser(id, payload = {}) {
  const name = normalizeText(payload.name)
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')
  const roles = assertValidRoles(payload.role || payload.roles)

  if (!name || !email) {
    throw new AppError(
      'Nombre y correo son requeridos.',
      400,
      'USER_INVALID_PAYLOAD'
    )
  }

  if (password && password.length < 8) {
    throw new AppError(
      'La clave debe tener al menos 8 caracteres.',
      400,
      'USER_PASSWORD_INVALID'
    )
  }

  const body = {
    name,
    email,
    emailVisibility: true,
    verified: true,
    role: roles,
  }

  if (password) {
    body.password = password
    body.passwordConfirm = password
  }

  try {
    const record = await adminPocketBaseRequest(
      recordsPath(env.POCKETBASE_USERS_COLLECTION, id),
      {
        method: 'PATCH',
        body,
      }
    )

    return sanitizeUser(record)
  } catch (error) {
    const status = Number(error?.details?.pocketbaseStatus || 0)

    if (status === 404) {
      throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
    }

    if (isDuplicateEmailError(error)) {
      throw new AppError(
        'Ya existe un usuario con ese correo.',
        409,
        'USER_EMAIL_EXISTS'
      )
    }

    throw error
  }
}

async function deleteUser(id, currentUser = {}) {
  if (String(currentUser?.id || '') === String(id || '')) {
    throw new AppError(
      'No puede eliminar su propio usuario.',
      400,
      'USER_SELF_DELETE_NOT_ALLOWED'
    )
  }

  try {
    await adminPocketBaseRequest(
      recordsPath(env.POCKETBASE_USERS_COLLECTION, id),
      { method: 'DELETE' }
    )
  } catch (error) {
    if (Number(error?.details?.pocketbaseStatus || 0) === 404) {
      throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
    }
    throw error
  }

  return { ok: true }
}

module.exports = {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
}
