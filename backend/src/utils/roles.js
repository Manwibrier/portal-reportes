const ROLE_TREE = [
  {
    id: 'administracion',
    label: 'Administraci\u00f3n',
    roles: [
      {
        value: 'admin',
        label: 'Administrador',
        description: 'Acceso total al portal, usuarios y todos los m\u00f3dulos.',
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
        description: 'Indicadores ejecutivos y visi\u00f3n gerencial.',
      },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaci\u00f3n',
    roles: [
      {
        value: 'operaciones.dashboard',
        label: 'Dashboard',
        description: 'Tablero integrado de operaci\u00f3n.',
      },
      {
        value: 'operaciones.smartolt',
        label: 'SmartOLT',
        description: 'An\u00e1lisis t\u00e9cnico, se\u00f1al y capacidad SmartOLT.',
      },
      {
        value: 'operaciones.ordenes-servicio',
        label: '\u00d3rdenes de Servicio',
        description: '\u00d3rdenes operativas relacionadas desde Totalnet.',
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
    id: 'cobranza',
    label: 'Cobranza',
    roles: [
      {
        value: 'cobranza.resumen',
        label: 'Resumen',
        description: 'Indicadores principales de cargos, cobrado y por cobrar.',
      },
      {
        value: 'cobranza.detalle',
        label: 'Detalle',
        description: 'Detalle de clientes, cargos y saldos pendientes.',
      },
      {
        value: 'cobranza.historico',
        label: 'Hist\u00f3rico',
        description: 'Snapshots diarios y comparativos de cobranza.',
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
        description: 'Indicadores estrat\u00e9gicos de tickets.',
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
  cobranza: [
    'cobranza.resumen',
    'cobranza.detalle',
    'cobranza.historico',
  ],
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

function getRoleOptions() {
  return ROLE_TREE
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role
}

module.exports = {
  ROLE_TREE,
  ROLE_VALUES,
  ROLE_LABELS,
  formatRoles,
  getRoleLabel,
  getRoleOptions,
  hasAdminRole,
  hasAnyRole,
  normalizeAllowedRoles,
  normalizeRoles,
}
