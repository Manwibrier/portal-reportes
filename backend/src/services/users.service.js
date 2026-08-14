const crypto = require('crypto')
const { db } = require('../config/auth-database')
const { AppError } = require('../utils/app-error')
const { ROLE_VALUES, normalizeRoles } = require('../utils/roles')
const { hashPassword } = require('../utils/password')

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeEmail(value = '') {
  return normalizeText(value).toLowerCase()
}

function parseRoles(value) {
  try {
    return normalizeRoles(JSON.parse(String(value || '[]')))
  } catch (_error) {
    return []
  }
}

function sanitizeUser(record = {}) {
  const roles = parseRoles(record.roles_json)

  return {
    id: record.id,
    name: record.name || '',
    email: record.email || '',
    role: roles,
    roles,
    created: record.created_at,
    updated: record.updated_at,
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

function getRawUserById(id) {
  return db.prepare(`
    SELECT id, name, email, password_hash, roles_json, active, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `).get(id)
}

function getRawUserByEmail(email) {
  return db.prepare(`
    SELECT id, name, email, password_hash, roles_json, active, created_at, updated_at
    FROM users
    WHERE email = ? COLLATE NOCASE
    LIMIT 1
  `).get(email)
}

async function listUsers(params = {}) {
  const page = Math.max(Number(params.page || 1), 1)
  const perPage = Math.min(Math.max(Number(params.perPage || 25), 1), 100)
  const search = normalizeText(params.search)
  const role = normalizeText(params.role)
  const where = ['active = 1']
  const bind = []

  if (search) {
    where.push('(name LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE)')
    const pattern = `%${search}%`
    bind.push(pattern, pattern)
  }

  if (role) {
    where.push('roles_json LIKE ?')
    bind.push(`%"${role}"%`)
  }

  const whereSql = `WHERE ${where.join(' AND ')}`
  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM users ${whereSql}`).get(...bind)
  const totalItems = Number(totalRow?.total || 0)
  const totalPages = Math.max(Math.ceil(totalItems / perPage), 1)
  const offset = (page - 1) * perPage

  const rows = db.prepare(`
    SELECT id, name, email, roles_json, created_at, updated_at
    FROM users
    ${whereSql}
    ORDER BY created_at DESC, name ASC
    LIMIT ? OFFSET ?
  `).all(...bind, perPage, offset)

  return {
    page,
    perPage,
    totalItems,
    totalPages,
    items: rows.map(sanitizeUser),
  }
}

async function getUserById(id) {
  const record = getRawUserById(id)
  if (!record || Number(record.active) !== 1) {
    throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
  }
  return sanitizeUser(record)
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

  if (getRawUserByEmail(email)) {
    throw new AppError(
      'Ya existe un usuario con ese correo.',
      409,
      'USER_EMAIL_EXISTS'
    )
  }

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)

  try {
    db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, roles_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, email, passwordHash, JSON.stringify(roles), now, now)
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE constraint failed')) {
      throw new AppError(
        'Ya existe un usuario con ese correo.',
        409,
        'USER_EMAIL_EXISTS'
      )
    }
    throw error
  }

  return sanitizeUser(getRawUserById(id))
}

async function updateUser(id, payload = {}) {
  const existing = getRawUserById(id)
  if (!existing || Number(existing.active) !== 1) {
    throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
  }

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

  const duplicate = getRawUserByEmail(email)
  if (duplicate && duplicate.id !== id) {
    throw new AppError(
      'Ya existe un usuario con ese correo.',
      409,
      'USER_EMAIL_EXISTS'
    )
  }

  const now = new Date().toISOString()

  if (password) {
    const passwordHash = await hashPassword(password)
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, roles_json = ?, password_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(name, email, JSON.stringify(roles), passwordHash, now, id)
  } else {
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, roles_json = ?, updated_at = ?
      WHERE id = ?
    `).run(name, email, JSON.stringify(roles), now, id)
  }

  return sanitizeUser(getRawUserById(id))
}

async function deleteUser(id, currentUser = {}) {
  if (String(currentUser?.id || '') === String(id || '')) {
    throw new AppError(
      'No puede eliminar su propio usuario.',
      400,
      'USER_SELF_DELETE_NOT_ALLOWED'
    )
  }

  const existing = getRawUserById(id)
  if (!existing || Number(existing.active) !== 1) {
    throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND')
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id)

  return { ok: true }
}

module.exports = {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
}
