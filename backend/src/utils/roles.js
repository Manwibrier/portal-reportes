const ROLE_TREE = [
  {
    id: 'administracion',
    label: 'Administración',
    roles: [
      {
        value: 'admin',
        label: 'Administrador',
        description: 'Acceso total al portal, usuarios y todos los módulos.',
      },
    ],
  },
  {
    id: 'gerencia',
    label: 'Gerencia',
    roles: [
      {
        value: 'gerencia',
        label: 'Gerencia',
        description: 'Indicadores ejecutivos y visión gerencial.',
      },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operación',
    roles: [
      {
        value: 'operaciones.dashboard',
        label: 'Dashboard',
        description: 'Tablero integrado de operación.',
      },
      {
        value: 'operaciones.smartolt',
        label: 'SmartOLT',
        description: 'Análisis técnico, señal y capacidad SmartOLT.',
      },
      {
        value: 'operaciones.ordenes-servicio',
        label: 'Órdenes de Servicio',
        description: 'Órdenes operativas relacionadas desde TotalNet.',
      },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    roles: [
      {
        value: 'clientes.resumen-diario',
        label: 'Resumen Diario',
        description: 'Resumen diario operativo de clientes.',
      },
      {
        value: 'clientes.cierre-mensual',
        label: 'Cierre Mensual',
        description: 'Cierre mensual por zona, franquicia y servicio.',
      },
    ],
  },
  {
    id: 'tickets',
    label: 'Tickets',
    roles: [
      {
        value: 'tickets.operacional',
        label: 'Operacional',
        description: 'Tickets operativos, backlog y compromisos.',
      },
      {
        value: 'tickets.gerencial',
        label: 'Gerencial',
        description: 'Indicadores estratégicos de tickets.',
      },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    roles: [
      {
        value: 'finanzas',
        label: 'Finanzas',
        description: 'Indicadores financieros del portal.',
      },
    ],
  },
]

const ROLE_VALUES = ROLE_TREE.flatMap((group) => {
  return group.roles.map((role) => role.value)
})

const ROLE_LABELS = ROLE_TREE.reduce((acc, group) => {
  group.roles.forEach((role) => {
    acc[role.value] = role.label
  })

  return acc
}, {})

const LEGACY_ROLE_ALIASES = {
  administrador: ['admin'],
  admin: ['admin'],
  gerencia: ['gerencia'],
  proyectos: ['gerencia'],
  finanzas: ['finanzas'],
  clientes: ['clientes.resumen-diario', 'clientes.cierre-mensual'],
  operaciones: [
    'operaciones.dashboard',
    'operaciones.smartolt',
    'operaciones.ordenes-servicio',
  ],
  soporte: [
    'operaciones.dashboard',
    'operaciones.smartolt',
    'operaciones.ordenes-servicio',
    'tickets.operacional',
  ],
  tickets: ['tickets.operacional', 'tickets.gerencial'],
}

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase()
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function normalizeRoleInput(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

    return trimmed.includes(',')
      ? trimmed.split(',').map((item) => item.trim())
      : [trimmed]
  }

  return []
}

function expandRole(role) {
  const normalizedRole = normalizeText(role)

  if (ROLE_VALUES.includes(normalizedRole)) {
    return [normalizedRole]
  }

  return LEGACY_ROLE_ALIASES[normalizedRole] || []
}

function normalizeRoles(value, options = {}) {
  const { collapseAdmin = true } = options
  const rawRoles = normalizeRoleInput(value)
  const expandedRoles = rawRoles.flatMap(expandRole)
  const roles = unique(expandedRoles)

  if (collapseAdmin && roles.includes('admin')) {
    return ['admin']
  }

  return roles
}

function normalizeAllowedRoles(value) {
  return normalizeRoles(value, { collapseAdmin: false })
}

function hasAdminRole(value) {
  return normalizeRoles(value).includes('admin')
}

function hasAnyRole(userRoles = [], allowedRoles = []) {
  const normalizedUserRoles = normalizeRoles(userRoles)
  const normalizedAllowedRoles = normalizeAllowedRoles(allowedRoles)

  if (normalizedUserRoles.includes('admin')) {
    return true
  }

  if (normalizedAllowedRoles.length === 0) {
    return true
  }

  return normalizedUserRoles.some((role) => normalizedAllowedRoles.includes(role))
}

function formatRoles(value) {
  const roles = normalizeRoles(value)

  if (!roles.length) {
    return 'Sin permisos'
  }

  return roles.map((role) => ROLE_LABELS[role] || role).join(', ')
}

module.exports = {
  LEGACY_ROLE_ALIASES,
  ROLE_LABELS,
  ROLE_TREE,
  ROLE_VALUES,
  formatRoles,
  hasAdminRole,
  hasAnyRole,
  normalizeAllowedRoles,
  normalizeRoles,
}