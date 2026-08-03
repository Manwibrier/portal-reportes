import {
  Activity,
  BadgeDollarSign,
  BriefcaseBusiness,
  LayoutDashboard,
  Ticket,
  UserCog,
  Users,
} from 'lucide-react'
import Dashboard from '../../modules/dashboard/Dashboard'
import Finanzas from '../../modules/finanzas/Finanzas'
import Usuarios from '../../modules/users/Usuarios'
import { Gerencia } from '../../modules/gerencia'
import {
  OperacionesDashboard,
  OperacionesOrdenesServicio,
  OperacionesSmartOLT,
} from '../../modules/operaciones'
import TicketsGerencial from '../../modules/tickets/pages/TicketsGerencial'
import TicketsOperacional from '../../modules/tickets/pages/TicketsOperacional'
import {
  ClientesCierreMensual,
  ClientesResumenDiario,
} from '../../modules/clientes'

export const ROLE_TREE = [
  {
    id: 'administracion',
    name: 'Administración',
    roles: [
      { value: 'admin', label: 'Administrador' },
    ],
  },
  {
    id: 'gerencia',
    name: 'Gerencia',
    roles: [
      { value: 'gerencia', label: 'Gerencia' },
    ],
  },
  {
    id: 'operaciones',
    name: 'Operación',
    roles: [
      { value: 'operaciones.dashboard', label: 'Dashboard' },
      { value: 'operaciones.smartolt', label: 'SmartOLT' },
      { value: 'operaciones.ordenes-servicio', label: 'Órdenes de Servicio' },
    ],
  },
  {
    id: 'clientes',
    name: 'Clientes',
    roles: [
      { value: 'clientes.resumen-diario', label: 'Resumen Diario' },
      { value: 'clientes.cierre-mensual', label: 'Cierre Mensual' },
    ],
  },
  {
    id: 'tickets',
    name: 'Tickets',
    roles: [
      { value: 'tickets.operacional', label: 'Operacional' },
      { value: 'tickets.gerencial', label: 'Gerencial' },
    ],
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    roles: [
      { value: 'finanzas', label: 'Finanzas' },
    ],
  },
]

export const ROLE_LABELS = ROLE_TREE.reduce((acc, group) => {
  group.roles.forEach((role) => {
    acc[role.value] = role.label
  })

  return acc
}, {})

const PORTAL_ALLOWED_ROLES = ROLE_TREE.flatMap((group) => {
  return group.roles.map((role) => role.value)
})

const modulesRegistry = [
  {
    id: 'dashboard',
    name: 'Portal',
    path: '/dashboard',
    icon: LayoutDashboard,
    component: Dashboard,
    showInMenu: true,
    roles: PORTAL_ALLOWED_ROLES,
  },
  {
    id: 'usuarios',
    name: 'Usuarios',
    path: '/usuarios',
    icon: UserCog,
    component: Usuarios,
    showInMenu: true,
    roles: ['admin'],
  },
  {
    id: 'gerencia',
    name: 'Gerencia',
    path: '/gerencia',
    icon: BriefcaseBusiness,
    component: Gerencia,
    showInMenu: true,
    roles: ['admin', 'gerencia'],
  },
  {
    id: 'operaciones',
    name: 'Operaciones',
    icon: Activity,
    showInMenu: true,
    roles: [
      'admin',
      'operaciones.dashboard',
      'operaciones.smartolt',
      'operaciones.ordenes-servicio',
    ],
    children: [
      {
        id: 'operaciones-dashboard',
        name: 'Dashboard',
        path: '/operaciones',
        component: OperacionesDashboard,
        showInMenu: true,
        roles: ['admin', 'operaciones.dashboard'],
      },
      {
        id: 'operaciones-smartolt',
        name: 'SmartOLT',
        path: '/operaciones/smartolt',
        component: OperacionesSmartOLT,
        showInMenu: true,
        roles: ['admin', 'operaciones.smartolt'],
      },
      {
        id: 'operaciones-ordenes-servicio',
        name: 'Órdenes de Servicio',
        path: '/operaciones/ordenes-servicio',
        component: OperacionesOrdenesServicio,
        showInMenu: true,
        roles: ['admin', 'operaciones.ordenes-servicio'],
      },
    ],
  },
  {
    id: 'tickets',
    name: 'Tickets',
    icon: Ticket,
    showInMenu: true,
    roles: ['admin', 'tickets.operacional', 'tickets.gerencial'],
    children: [
      {
        id: 'tickets-operacional',
        name: 'Operacional',
        path: '/tickets',
        component: TicketsOperacional,
        showInMenu: true,
        roles: ['admin', 'tickets.operacional'],
      },
      {
        id: 'tickets-gerencial',
        name: 'Gerencial',
        path: '/tickets-gerencial',
        component: TicketsGerencial,
        showInMenu: true,
        roles: ['admin', 'tickets.gerencial'],
      },
    ],
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    path: '/finanzas',
    icon: BadgeDollarSign,
    component: Finanzas,
    showInMenu: true,
    roles: ['admin', 'finanzas'],
  },
  {
    id: 'clientes',
    name: 'Clientes',
    icon: Users,
    showInMenu: true,
    roles: ['admin', 'clientes.resumen-diario', 'clientes.cierre-mensual'],
    children: [
      {
        id: 'clientes-resumen-diario',
        name: 'Resumen Diario',
        path: '/clientes',
        component: ClientesResumenDiario,
        showInMenu: true,
        roles: ['admin', 'clientes.resumen-diario'],
      },
      {
        id: 'clientes-cierre-mensual',
        name: 'Cierre Mensual',
        path: '/clientes/cierre-mensual',
        component: ClientesCierreMensual,
        showInMenu: true,
        roles: ['admin', 'clientes.cierre-mensual'],
      },
    ],
  },
]

function normalizeRoleValue(value = '') {
  return String(value || '').trim().toLowerCase()
}

export function normalizeRoles(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeRoleValue).filter(Boolean)))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

    return trimmed.includes(',')
      ? Array.from(new Set(trimmed.split(',').map(normalizeRoleValue).filter(Boolean)))
      : [normalizeRoleValue(trimmed)]
  }

  return []
}

function resolveRoles(node, inheritedRoles = []) {
  const ownRoles = normalizeRoles(node?.roles)

  if (ownRoles.length > 0) {
    return ownRoles
  }

  return normalizeRoles(inheritedRoles)
}

function canAccess(userRoles, roles = []) {
  const normalizedUserRoles = normalizeRoles(userRoles)
  const normalizedRoles = normalizeRoles(roles)

  if (!normalizedUserRoles.length) {
    return false
  }

  if (normalizedUserRoles.includes('admin')) {
    return true
  }

  if (normalizedRoles.length === 0) {
    return true
  }

  return normalizedUserRoles.some((role) => normalizedRoles.includes(role))
}

export function flattenModuleRoutes(
  modules = modulesRegistry,
  inheritedRoles = [],
) {
  if (!Array.isArray(modules)) {
    return []
  }

  return modules.flatMap((module) => {
    const roles = resolveRoles(module, inheritedRoles)

    const ownRoute =
      module?.path && module?.component
        ? [
            {
              id: module.id ?? module.path,
              path: module.path,
              component: module.component,
              roles,
            },
          ]
        : []

    const childRoutes = Array.isArray(module?.children)
      ? flattenModuleRoutes(module.children, roles)
      : []

    return [...ownRoute, ...childRoutes]
  })
}

export function getMenuModules(
  userRoles,
  modules = modulesRegistry,
  inheritedRoles = [],
) {
  if (!Array.isArray(modules)) {
    return []
  }

  return modules.flatMap((module) => {
    const roles = resolveRoles(module, inheritedRoles)

    const visibleChildren = Array.isArray(module?.children)
      ? getMenuModules(userRoles, module.children, roles)
      : []

    const isVisibleInMenu =
      module.showInMenu !== false &&
      Boolean(module?.path && module?.component) &&
      canAccess(userRoles, roles)

    if (visibleChildren.length > 0) {
      return [
        {
          ...module,
          roles,
          children: visibleChildren,
        },
      ]
    }

    if (isVisibleInMenu) {
      return [
        {
          ...module,
          roles,
          children: [],
        },
      ]
    }

    return []
  })
}

export function getDefaultRoutePath(userRoles, modules = modulesRegistry) {
  const routes = flattenModuleRoutes(modules)

  const dashboardRoute = routes.find((route) => {
    return route.path === '/dashboard' && canAccess(userRoles, route.roles)
  })

  if (dashboardRoute) {
    return dashboardRoute.path
  }

  const firstAccessibleRoute = routes.find((route) => {
    return canAccess(userRoles, route.roles)
  })

  return firstAccessibleRoute?.path || '/login'
}

export function canAccessRoute(userRoles, routeRoles = []) {
  return canAccess(userRoles, routeRoles)
}

export default modulesRegistry
