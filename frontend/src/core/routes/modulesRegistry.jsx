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
import {
  CobranzaAuditoria,
  CobranzaClientesXCobrar,
  CobranzaFranquicias,
  CobranzaHistorico,
  CobranzaRegiones,
  CobranzaTablas,
  CobranzaAnalisisComparativo,
} from '../../modules/cobranza'
import Finanzas from '../../modules/finanzas/Finanzas'
import Usuarios from '../../modules/users/Usuarios'
import {
  Gerencia,
} from '../../modules/gerencia'
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
    id: 'cobranza',
    name: 'Cobranza',
    roles: [
      { value: 'cobranza.resumen', label: 'Resumen' },
      { value: 'cobranza.detalle', label: 'Detalle' },
      { value: 'cobranza.historico', label: 'Histórico' },
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

export function canAccess(userRoles = [], allowedRoles = []) {
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
    id: 'gerencia',
    name: 'Gerencia',
    path: '/gerencia',
    icon: BriefcaseBusiness,
    component: Gerencia,
    showInMenu: true,
    roles: ['admin', 'gerencia'],
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
    roles: [
      'admin',
      'clientes.resumen-diario',
      'clientes.cierre-mensual',
    ],
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

  {
    id: 'cobranza',
    name: 'Cobranza',
    icon: BadgeDollarSign,
    showInMenu: true,
    roles: [
      'admin',
      'cobranza.resumen',
      'cobranza.detalle',
      'cobranza.historico',
    ],
    children: [
      {
        id: 'cobranza-franquicias',
        name: 'Franquicias',
        path: '/cobranza/franquicias',
        component: CobranzaFranquicias,
        showInMenu: true,
        roles: [
          'admin',
          'cobranza.resumen',
        ],
      },
      {
        id: 'cobranza-analisis-comparativo',
        name: 'Análisis Diario',
        path: '/cobranza/analisis-comparativo',
        component: CobranzaAnalisisComparativo,
        showInMenu: true,
        roles: [
          'admin',
          'cobranza.historico',
          'cobranza.resumen',
        ],
      },
      {
        id: 'cobranza-regiones',
        name: 'Análisis Mensual',
        path: '/cobranza/regiones',
        component: CobranzaRegiones,
        showInMenu: true,
        roles: [
          'admin',
          'cobranza.historico',
          'cobranza.resumen',
        ],
      },
      {
        id: 'cobranza-tablas',
        name: 'Tablas',
        path: '/cobranza/tablas',
        component: CobranzaTablas,
        showInMenu: true,
        roles: [
          'admin',
          'cobranza.detalle',
          'cobranza.resumen',
        ],
      },
    ],
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
        id: 'operaciones-smartolt',
        name: 'SmartOLT',
        path: '/operaciones/smartolt',
        component: OperacionesSmartOLT,
        showInMenu: true,
        roles: [
          'admin',
          'operaciones.smartolt',
        ],
      },
      {
        id: 'operaciones-ordenes-servicio',
        name: 'Órdenes de Servicio',
        path: '/operaciones/ordenes-servicio',
        component: OperacionesOrdenesServicio,
        showInMenu: true,
        roles: [
          'admin',
          'operaciones.ordenes-servicio',
        ],
      },
    ],
  },

  {
    id: 'tickets',
    name: 'Tickets',
    icon: Ticket,
    showInMenu: true,
    roles: [
      'admin',
      'tickets.operacional',
      'tickets.gerencial',
    ],
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
    id: 'usuarios',
    name: 'Usuarios',
    path: '/usuarios',
    icon: UserCog,
    component: Usuarios,
    showInMenu: true,
    roles: ['admin'],
  },
]
export function flattenModuleRoutes(modules = modulesRegistry) {
  return modules.flatMap((module) => {
    const routes = []

    if (module.path && module.component) {
      routes.push(module)
    }

    if (Array.isArray(module.children)) {
      module.children.forEach((child) => routes.push(child))
    }

    return routes
  })
}

export function getMenuModules(userRoles, modules = modulesRegistry) {
  return modules
    .filter((module) => module.showInMenu !== false)
    .filter((module) => canAccess(userRoles, module.roles))
    .map((module) => {
      if (!Array.isArray(module.children)) {
        return module
      }

      return {
        ...module,
        children: module.children
          .filter((child) => child.showInMenu !== false)
          .filter((child) => canAccess(userRoles, child.roles)),
      }
    })
    .filter((module) => {
      if (!Array.isArray(module.children)) {
        return true
      }

      return module.children.length > 0
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

export const ROLE_LABELS = ROLE_TREE.reduce((acc, group) => {
  group.roles.forEach((role) => {
    acc[role.value] = role.label
  })

  return acc
}, {})

export const ROLE_VALUES = ROLE_TREE.flatMap((group) => {
  return group.roles.map((role) => role.value)
})

export { normalizeRoles }
