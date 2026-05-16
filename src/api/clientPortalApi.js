import { clientPortalJson } from './http'

/** module-system (`/api/auth/…`, `/api/clients/…`) */

export async function login(body) {
  return clientPortalJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function register(body) {
  return clientPortalJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function refresh(body) {
  return clientPortalJson('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function logout(body) {
  await clientPortalJson('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

/** Revoca todas las sesiones del usuario autenticado (Bearer). */
export async function logoutAll() {
  await clientPortalJson('/api/auth/logout-all', {
    method: 'POST',
  })
}

export async function fetchMe() {
  return clientPortalJson('/api/auth/me')
}

export async function changePassword(body) {
  await clientPortalJson('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** GET /api/clients */
export async function listClients() {
  return clientPortalJson('/api/clients')
}

/** GET /api/clients/{id} */
export async function getClient(id) {
  return clientPortalJson(`/api/clients/${id}`)
}

/** POST /api/clients */
export async function createClient(body) {
  return clientPortalJson('/api/clients', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** PUT /api/clients/{id} */
export async function updateClient(id, body) {
  return clientPortalJson(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/** DELETE /api/clients/{id} */
export async function deleteClient(id) {
  await clientPortalJson(`/api/clients/${id}`, {
    method: 'DELETE',
  })
}
