import { apiDelete, apiGet, apiPost, apiPut } from '../../../core/services/api'

const USERS_ENDPOINT = '/api/users'

function withQueryString(endpoint, params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()

  return queryString ? `${endpoint}?${queryString}` : endpoint
}

export async function listUsers(params = {}) {
  const { force = false, ...queryParams } = params

  return apiGet(withQueryString(USERS_ENDPOINT, queryParams), {
    force,
    cache: false,
  })
}

export async function createUser(payload) {
  return apiPost(USERS_ENDPOINT, payload)
}

export async function updateUser(id, payload) {
  return apiPut(`${USERS_ENDPOINT}/${id}`, payload)
}

export async function deleteUser(id) {
  return apiDelete(`${USERS_ENDPOINT}/${id}`)
}
