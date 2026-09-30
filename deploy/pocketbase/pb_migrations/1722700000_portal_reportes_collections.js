migrate((app) => {
  const roleValues = [
    'admin',
    'gerencia',
    'operaciones.dashboard',
    'operaciones.smartolt',
    'operaciones.ordenes-servicio',
    'clientes.resumen-diario',
    'clientes.cierre-mensual',
    'tickets.operacional',
    'tickets.gerencial',
    'finanzas',
  ]

  let users

  try {
    users = app.findCollectionByNameOrId('users')
  } catch (_) {
    users = new Collection({
      type: 'auth',
      name: 'users',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          min: 2,
          max: 120,
          presentable: true,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          maxSelect: roleValues.length,
          values: roleValues,
        },
      ],
      passwordAuth: {
        enabled: true,
        identityFields: ['email'],
      },
      indexes: [
        'CREATE INDEX idx_users_name ON users (name)',
      ],
    })

    app.save(users)
  }

  try {
    app.findCollectionByNameOrId('session_audits')
  } catch (_) {
    const audits = new Collection({
      type: 'base',
      name: 'session_audits',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: false,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: false,
        },
        { name: 'action', type: 'text', required: true, max: 80 },
        { name: 'success', type: 'bool' },
        { name: 'email', type: 'text', max: 160 },
        { name: 'role', type: 'text', max: 500 },
        { name: 'tokenHash', type: 'text', max: 64 },
        { name: 'ip', type: 'text', max: 100 },
        { name: 'userAgent', type: 'text', max: 1000 },
        { name: 'message', type: 'text', max: 1000 },
      ],
      indexes: [
        'CREATE INDEX idx_session_audits_email ON session_audits (email)',
        'CREATE INDEX idx_session_audits_action ON session_audits (action)',
      ],
    })

    app.save(audits)
  }

  const adminEmail = String($os.getenv('PORTAL_ADMIN_EMAIL') || '').trim().toLowerCase()
  const adminPassword = String($os.getenv('PORTAL_ADMIN_PASSWORD') || '')
  const adminName = String($os.getenv('PORTAL_ADMIN_NAME') || 'Administrador').trim()

  if (adminEmail && adminPassword) {
    let existing = null

    try {
      existing = app.findAuthRecordByEmail('users', adminEmail)
    } catch (_) {
      existing = null
    }

    if (!existing) {
      const record = new Record(users)
      record.set('name', adminName || 'Administrador')
      record.set('email', adminEmail)
      record.set('emailVisibility', true)
      record.set('verified', true)
      record.set('role', ['admin'])
      record.set('password', adminPassword)
      app.save(record)
    }
  }
}, (app) => {
  // No se eliminan colecciones automáticamente para proteger datos productivos.
})
