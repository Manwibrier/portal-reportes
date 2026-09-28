const crypto = require('crypto')
const { query } = require('../config/database')
const { AppError } = require('../utils/app-error')
const { ROLE_VALUES, normalizeRoles } = require('../utils/roles')

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeEmail(value = '') {
  return normalizeText(value).toLowerCase()
}

function hashPassword(password = '') {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function sanitizeUser(record = {}) {
  const roles = normalizeRoles(record.role || record.roles)

  return {
    id: record.id,
    name: record.name || record.nombre || '',
    email: record.email || '',
    role: roles,
    roles,
    created: record.created_at || record.created,
    updated: record.updated_at || record.updated,
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
      `Permisos inválidos: ${invalidRoles.join(', ')}`,
      400,
      'USER_ROLE_INVALID'
    )
  }

  return roles
}

async function listUsers(params = {}) {
  const page = Math.max(Number(params.page || 1), 1)
  const perPage = Math.min(Math.max(Number(params.perPage || 25), 1), 100)
  const offset = (page - 1) * perPage
  const search = normalizeText(params.search)
  const role = normalizeText(params.role)

  const where = ['is_active = TRUE']
  const values = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    where.push(`(LOWER(name) LIKE $${values.length} OR LOWER(email) LIKE $${values.length})`)
  }

  if (role) {
    values.push(role)
    where.push(`$${values.length} = ANY(roles)`)
  }

  const whereSql = `WHERE ${where.join(' AND ')}`

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM portal_auth.users ${whereSql};`,
    values
  )

  values.push(perPage)
  const limitIndex = values.length
  values.push(offset)
  const offsetIndex = values.length

  const result = await query(
    `
      SELECT id, name, email, roles, created_at, updated_at
      FROM portal_auth.users
      ${whereSql}
      ORDER BY created_at DESC, name ASC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex};
    `,
    values
  )

  const totalItems = Number(countResult.rows[0]?.total || 0)

  return {
    page,
    perPage,
    totalItems,
    totalPages: Math.max(Math.ceil(totalItems / perPage), 1),
    items: result.rows.map(sanitizeUser),
  }
}

async function getUserById(id) {
  const result = await query(
    `
      SELECT id, name, email, roles, created_at, updated_at
      FROM portal_auth.users
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1;
    `,
    [id]
  )

  const user = result.rows[0]

  if (!user) {
    throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
  }

  return sanitizeUser(user)
}

async function createUser(payload = {}) {
  const name = normalizeText(payload.name)
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')
  const roles = assertValidRoles(payload.role || payload.roles)

  if (!name || !email || password.length < 8) {
    throw new AppError(
      'Nombre, correo y clave válida son requeridos.',
      400,
      'USER_INVALID_PAYLOAD'
    )
  }

  try {
    const result = await query(
      `
        INSERT INTO portal_auth.users
          (name, email, password_hash, roles, is_active)
        VALUES
          ($1, $2, $3, $4::text[], TRUE)
        RETURNING id, name, email, roles, created_at, updated_at;
      `,
      [name, email, hashPassword(password), roles]
    )

    return sanitizeUser(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(
        'Ya existe un usuario activo con ese correo.',
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

  const params = [id, name, email, roles]
  let passwordSql = ''

  if (password) {
    if (password.length < 8) {
      throw new AppError(
        'La clave debe tener al menos 8 caracteres.',
        400,
        'USER_PASSWORD_INVALID'
      )
    }

    params.push(hashPassword(password))
    passwordSql = `, password_hash = $${params.length}`
  }

  try {
    const result = await query(
      `
        UPDATE portal_auth.users
        SET
          name = $2,
          email = $3,
          roles = $4::text[],
          updated_at = NOW()
          ${passwordSql}
        WHERE id = $1
          AND is_active = TRUE
        RETURNING id, name, email, roles, created_at, updated_at;
      `,
      params
    )

    if (!result.rows[0]) {
      throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
    }

    return sanitizeUser(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(
        'Ya existe un usuario activo con ese correo.',
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

  const result = await query(
    `
      UPDATE portal_auth.users
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1
        AND is_active = TRUE
      RETURNING id;
    `,
    [id]
  )

  if (!result.rows[0]) {
    throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
  }

  await query(
    `
      UPDATE portal_auth.sessions
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL;
    `,
    [id]
  )

  return {
    ok: true,
  }
}

module.exports = {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
}
