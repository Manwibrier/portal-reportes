import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../services/auth'

function normalizeRoleValue(value = '') {
  return String(value || '').trim().toLowerCase()
}

function normalizeRoles(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeRoleValue).filter(Boolean)))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) return []

    return trimmed.includes(',')
      ? Array.from(new Set(trimmed.split(',').map(normalizeRoleValue).filter(Boolean)))
      : [normalizeRoleValue(trimmed)]
  }

  return []
}

function hasAccess(userRoles = [], allowedRoles = []) {
  const normalizedUserRoles = normalizeRoles(userRoles)
  const normalizedAllowedRoles = normalizeRoles(allowedRoles)

  if (normalizedUserRoles.includes('admin')) {
    return true
  }

  if (normalizedAllowedRoles.length === 0) {
    return true
  }

  return normalizedUserRoles.some((role) => normalizedAllowedRoles.includes(role))
}

function AccessDenied() {
  return (
    <section className="portal-page">
      <div className="portal-page__header">
        <h1>Acceso restringido</h1>
        <p>No tienes permisos para acceder a este módulo.</p>
      </div>
    </section>
  )
}

function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation()
  const user = getCurrentUser()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (hasAccess(user.role || user.roles, allowedRoles)) {
    return children
  }

  return <AccessDenied />
}

export default ProtectedRoute
