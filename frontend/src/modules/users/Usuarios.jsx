import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../components/ModulePage'
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from './services/users.service'

const ROLE_GROUPS = [
  {
    id: 'administracion',
    label: 'Administración',
    description: 'Acceso total y gestión del portal.',
    roles: [
      { value: 'admin', label: 'Administrador' },
    ],
  },
  {
    id: 'gerencia',
    label: 'Gerencia',
    description: 'Indicadores ejecutivos y visión gerencial.',
    roles: [
      { value: 'gerencia', label: 'Gerencia' },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operación',
    description: 'Módulos técnicos y operativos.',
    roles: [
      { value: 'operaciones.dashboard', label: 'Dashboard' },
      { value: 'operaciones.smartolt', label: 'SmartOLT' },
      { value: 'operaciones.ordenes-servicio', label: 'Órdenes de Servicio' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    description: 'Resumen diario y cierre mensual.',
    roles: [
      { value: 'clientes.resumen-diario', label: 'Resumen Diario' },
      { value: 'clientes.cierre-mensual', label: 'Cierre Mensual' },
    ],
  },
  {
    id: 'tickets',
    label: 'Tickets',
    description: 'Gestión operativa y gerencial.',
    roles: [
      { value: 'tickets.operacional', label: 'Operacional' },
      { value: 'tickets.gerencial', label: 'Gerencial' },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    description: 'Indicadores financieros.',
    roles: [
      { value: 'finanzas', label: 'Finanzas' },
    ],
  },
]

const ROLE_OPTIONS = ROLE_GROUPS.flatMap((group) => group.roles)

const EMPTY_FORM = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: [],
}

function normalizeRoleValue(value = '') {
  return String(value || '').trim().toLowerCase()
}

function normalizeRoles(value) {
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

function roleValuesFromGroup(group) {
  return group.roles.map((item) => item.value)
}

function areAllGroupRolesSelected(group, selectedRoles) {
  const values = roleValuesFromGroup(group)
  return values.every((value) => selectedRoles.includes(value))
}

function hasAnyGroupRoleSelected(group, selectedRoles) {
  const values = roleValuesFromGroup(group)
  return values.some((value) => selectedRoles.includes(value))
}

function Usuarios() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isEditing = Boolean(form.id)
  const selectedRoles = normalizeRoles(form.role)

  const roleLabelByValue = useMemo(() => {
    return ROLE_OPTIONS.reduce((acc, item) => {
      acc[item.value] = item.label
      return acc
    }, {})
  }, [])

  async function loadUsers(params = {}) {
    setLoading(true)
    setError('')

    try {
      const data = await listUsers({
        page: 1,
        perPage: 50,
        search,
        role,
        ...params,
      })
      setUsers(Array.isArray(data?.items) ? data.items : [])
    } catch (loadError) {
      setError(loadError.message || 'No se pudo cargar la lista de usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // La carga inicial usa filtros vacíos; las siguientes cargas son manuales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
  }

  function startEdit(user) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: normalizeRoles(user.role || user.roles),
    })
    setMessage('')
    setError('')
  }

  function toggleRole(value) {
    const normalizedValue = normalizeRoleValue(value)

    setForm((prev) => {
      const currentRoles = normalizeRoles(prev.role)
      const exists = currentRoles.includes(normalizedValue)
      const nextRoles = exists
        ? currentRoles.filter((item) => item !== normalizedValue)
        : [...currentRoles, normalizedValue]

      return {
        ...prev,
        role: nextRoles.includes('admin') ? ['admin'] : nextRoles,
      }
    })
  }

  function toggleGroup(group) {
    setForm((prev) => {
      const currentRoles = normalizeRoles(prev.role)
      const groupRoles = roleValuesFromGroup(group)
      const allSelected = groupRoles.every((item) => currentRoles.includes(item))
      const nextRoles = allSelected
        ? currentRoles.filter((item) => !groupRoles.includes(item))
        : Array.from(new Set([...currentRoles, ...groupRoles]))

      return {
        ...prev,
        role: nextRoles.includes('admin') ? ['admin'] : nextRoles,
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const roles = normalizeRoles(form.role)

      if (!roles.length) {
        setError('Debe seleccionar al menos un permiso para el usuario.')
        return
      }

      const payload = {
        name: form.name,
        email: form.email,
        role: roles,
      }

      if (form.password) {
        payload.password = form.password
      }

      if (isEditing) {
        await updateUser(form.id, payload)
        setMessage('Usuario actualizado correctamente.')
      } else {
        await createUser({
          ...payload,
          password: form.password,
        })
        setMessage('Usuario creado correctamente.')
      }

      resetForm()
      await loadUsers({ force: true })
    } catch (saveError) {
      setError(saveError.message || 'No se pudo guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(`¿Eliminar el usuario ${user.email}?`)

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await deleteUser(user.id)
      setMessage('Usuario eliminado correctamente.')
      await loadUsers({ force: true })
    } catch (deleteError) {
      setError(deleteError.message || 'No se pudo eliminar el usuario.')
    }
  }

  function renderRoleBadges(value) {
    const roles = normalizeRoles(value)

    if (!roles.length) {
      return <span className="users-role-muted">Sin permisos</span>
    }

    return (
      <div className="users-role-badges">
        {roles.map((item) => (
          <span className="users-role-badge" key={item}>
            {roleLabelByValue[item] || item}
          </span>
        ))}
      </div>
    )
  }

  return (
    <ModulePage
      title="Gestión de Usuarios"
      description="Administración de accesos, roles y credenciales del portal."
    >
      <section className="portal-card users-panel">
        <header className="portal-card__header users-panel__header">
          <div className="portal-card__header-row">
            <div className="portal-card__heading">
              <h2 className="portal-card__title">Usuarios</h2>
              <p className="portal-card__subtitle">
                Alta, edición y eliminación de usuarios autenticados por PocketBase.
              </p>
            </div>
          </div>
        </header>

        <div className="portal-card__body users-panel__body">
          <form className="users-form" onSubmit={handleSubmit}>
            <div className="users-form__grid">
              <label className="portal-field users-field">
                <span>Nombre</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={120}
                  autoComplete="name"
                />
              </label>

              <label className="portal-field users-field">
                <span>Correo</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  maxLength={160}
                  autoComplete="email"
                />
              </label>

              <label className="portal-field users-field">
                <span>{isEditing ? 'Nueva clave opcional' : 'Clave'}</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required={!isEditing}
                  minLength={isEditing && !form.password ? undefined : 8}
                  maxLength={200}
                  autoComplete="new-password"
                />
              </label>
            </div>

            <fieldset className="users-role-tree">
              <legend>Permisos por módulo</legend>
              <p className="users-role-tree__hint">
                Selecciona uno o varios accesos. El permiso Administrador otorga acceso total.
              </p>

              <div className="users-role-tree__grid">
                {ROLE_GROUPS.map((group) => {
                  const groupSelected = areAllGroupRolesSelected(group, selectedRoles)
                  const groupPartial =
                    !groupSelected && hasAnyGroupRoleSelected(group, selectedRoles)

                  return (
                    <section
                      className={`users-role-group ${groupPartial ? 'users-role-group--partial' : ''}`}
                      key={group.id}
                    >
                      <label className="users-role-group__header">
                        <input
                          type="checkbox"
                          checked={groupSelected}
                          onChange={() => toggleGroup(group)}
                        />
                        <span>
                          <strong>{group.label}</strong>
                          <small>{group.description}</small>
                        </span>
                      </label>

                      <div className="users-role-group__items">
                        {group.roles.map((item) => (
                          <label className="users-role-option" key={item.value}>
                            <input
                              type="checkbox"
                              checked={selectedRoles.includes(item.value)}
                              onChange={() => toggleRole(item.value)}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </fieldset>

            <div className="users-form__actions users-form__actions--main">
              <button
                className="portal-action-button portal-action-button--primary"
                disabled={saving}
              >
                {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className="portal-action-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>

          <div className="users-filters">
            <label className="portal-field users-field">
              <span>Buscar</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o correo"
              />
            </label>

            <label className="portal-field users-field">
              <span>Permiso</span>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">Todos</option>
                {ROLE_GROUPS.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {group.roles.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="portal-action-button portal-action-button--primary users-filter-button"
              onClick={() => loadUsers({ force: true })}
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Filtrar'}
            </button>
          </div>

          {error ? <div className="portal-feedback portal-feedback--danger">{error}</div> : null}
          {message ? <div className="portal-feedback portal-feedback--success">{message}</div> : null}

          <div className="portal-table-responsive users-table-wrap">
            <table className="portal-table users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Permisos</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name || '-'}</td>
                    <td>{user.email || '-'}</td>
                    <td>{renderRoleBadges(user.role || user.roles)}</td>
                    <td>{user.updated ? new Date(user.updated).toLocaleString('es-VE') : '-'}</td>
                    <td>
                      <div className="users-table__actions">
                        <button
                          type="button"
                          className="portal-action-button"
                          onClick={() => startEdit(user)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="portal-action-button portal-action-button--danger"
                          onClick={() => handleDelete(user)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && users.length === 0 ? (
                  <tr>
                    <td colSpan="5">No hay usuarios para mostrar.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </ModulePage>
  )
}

export default Usuarios
