migrate((app) => {
  let users

  try {
    users = app.findCollectionByNameOrId('users')
  } catch (_) {
    throw new Error('La coleccion users debe existir antes de crear sessions.')
  }

  try {
    app.findCollectionByNameOrId('sessions')
  } catch (_) {
    const sessions = new Collection({
      type: 'base',
      name: 'sessions',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        {
          name: 'tokenHash',
          type: 'text',
          required: true,
          min: 64,
          max: 64,
          pattern: '^[a-f0-9]{64}$',
        },
        { name: 'expiresAt', type: 'date', required: true },
        { name: 'lastSeenAt', type: 'date', required: false },
        { name: 'revokedAt', type: 'date', required: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_sessions_token_hash ON sessions (tokenHash)',
        'CREATE INDEX idx_sessions_user ON sessions (user)',
        'CREATE INDEX idx_sessions_expires_at ON sessions (expiresAt)',
      ],
    })

    app.save(sessions)
  }
}, (app) => {
  // Sessions are not removed automatically to protect production data.
})
