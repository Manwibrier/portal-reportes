import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { getCurrentUser } from '../services/auth'
import { ROLE_LABELS, normalizeRoles } from '../routes/modulesRegistry'
import MobileMenuButton from './MobileMenuButton'

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function formatRoles(value) {
  const roles = normalizeRoles(value)

  if (!roles.length) {
    return 'sin permisos'
  }

  if (roles.includes('admin')) {
    return 'Administrador'
  }

  if (roles.length <= 2) {
    return roles.map((role) => ROLE_LABELS[role] || role).join(', ')
  }

  const firstRoles = roles
    .slice(0, 2)
    .map((role) => ROLE_LABELS[role] || role)
    .join(', ')

  return `${firstRoles} +${roles.length - 2}`
}

function resolveSectionLabel(pathname = '/') {
  if (pathname === '/' || pathname === '/dashboard') {
    return 'Portal'
  }

  if (pathname === '/usuarios') {
    return 'Usuarios'
  }

  if (pathname === '/gerencia') {
    return 'Gerencia'
  }

  if (pathname === '/operaciones' || pathname === '/operaciones/dashboard') {
    return 'Operaciones • Dashboard'
  }

  if (pathname === '/operaciones/smartolt') {
    return 'Operaciones • SmartOLT'
  }

  if (pathname === '/operaciones/ordenes-servicio') {
    return 'Operaciones • Órdenes de Servicio'
  }

  if (pathname === '/tickets' || pathname === '/tickets/operacional') {
    return 'Tickets • Operacional'
  }

  if (pathname === '/tickets-gerencial' || pathname === '/tickets/gerencial') {
    return 'Tickets • Gerencial'
  }

  if (pathname === '/clientes' || pathname === '/clientes/resumen-diario') {
    return 'Clientes • Resumen Diario'
  }

  if (pathname === '/clientes/cierre-mensual') {
    return 'Clientes • Cierre Mensual'
  }

  if (pathname === '/finanzas') {
    return 'Finanzas'
  }

  return 'Portal'
}

function Header({ onMenuClick, menuOpen = false, onLogout, isLoggingOut = false }) {
  const location = useLocation()
  const user = getCurrentUser()

  const now = useMemo(() => new Date(), [])
  const fecha = now.toLocaleDateString('es-VE')
  const hora = now.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const sectionLabel = resolveSectionLabel(location.pathname)
  const userName = normalizeText(user?.name, 'Usuario')
  const userRoles = formatRoles(user?.role || user?.roles)

  return (
    <header className="header">
      <div className="header__main">
        <MobileMenuButton onClick={onMenuClick} isOpen={menuOpen} />

        <div className="header__info">
          <h1 className="header__title">Portal Modular de Reportes</h1>
          <p className="header__subtitle">
            Monitoreo táctico de cargas, backlog y compromisos.
          </p>
        </div>
      </div>

      <div className="header__actions">
        <div className="header__meta">{sectionLabel}</div>
        <div className="header__meta">Usuario: {userName}</div>
        <div className="header__meta">Permisos: {userRoles}</div>
        <div className="header__meta">
          Última actualización visual: {fecha} {hora}
        </div>

        <button
          type="button"
          className="header__logout"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Saliendo...' : 'Salir'}
        </button>
      </div>
    </header>
  )
}

export default Header
