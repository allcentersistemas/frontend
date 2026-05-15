import { employeeJson } from './http'

/* ——— Auth ——— */

export async function login(body) {
  return employeeJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

/** GET /api/auth/first-setup/status */
export async function firstSetupStatus() {
  return employeeJson('/api/auth/first-setup/status', { skipAuth: true })
}

/**
 * POST /api/auth/first-setup
 * Opcional: cabecera `X-First-Setup-Secret` si está configurado en backend.
 */
export async function completeFirstSetup(body, options = {}) {
  const headers = {}
  if (options.setupSecret != null && String(options.setupSecret).trim() !== '') {
    headers['X-First-Setup-Secret'] = String(options.setupSecret).trim()
  }
  return employeeJson('/api/auth/first-setup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: Object.keys(headers).length ? headers : undefined,
    skipAuth: true,
  })
}

export async function register(body) {
  return employeeJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function refreshSession(body) {
  return employeeJson('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function logout(body) {
  await employeeJson('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

/** POST /api/auth/logout-all */
export async function logoutAll() {
  await employeeJson('/api/auth/logout-all', {
    method: 'POST',
  })
}

export async function fetchMe() {
  return employeeJson('/api/auth/me')
}

/** POST /api/auth/change-password */
export async function changePassword(body) {
  await employeeJson('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* ——— Catálogo API (documentación backend) ——— */

export async function fetchApiCatalog() {
  return employeeJson('/api', { skipAuth: true })
}

/* ——— Perfil / empleados ——— */

export async function patchMyProfile(body) {
  return employeeJson('/api/employees/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** GET /api/employees/me (misma info que `/api/auth/me` en backend) */
export async function fetchMeAsEmployee() {
  return employeeJson('/api/employees/me')
}

export async function listEmployees() {
  return employeeJson('/api/employees')
}

/** GET /api/employees/{id} */
export async function getEmployeeById(employeeId) {
  return employeeJson(`/api/employees/${employeeId}`)
}

export async function createEmployee(body) {
  return employeeJson('/api/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchEmployee(employeeId, body) {
  return employeeJson(`/api/employees/${employeeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** PUT /api/employees/{id}/roles — body: { roleIds: number[] } */
export async function replaceEmployeeRoles(employeeId, roleIds) {
  return employeeJson(`/api/employees/${employeeId}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds }),
  })
}

export async function deleteEmployee(employeeId) {
  await employeeJson(`/api/employees/${employeeId}`, {
    method: 'DELETE',
  })
}

/* ——— Roles ——— */

export async function listRoles() {
  return employeeJson('/api/roles')
}

/** GET /api/roles/{id} */
export async function getRoleById(roleId) {
  return employeeJson(`/api/roles/${roleId}`)
}

export async function createRole(body) {
  return employeeJson('/api/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchRole(roleId, body) {
  return employeeJson(`/api/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteRole(roleId) {
  await employeeJson(`/api/roles/${roleId}`, {
    method: 'DELETE',
  })
}

/* ——— Auditoría ——— */

/**
 * Spring Data Pageable: page, size, sort (ej. occurredAt,desc).
 * Compatibilidad: `auditEntries(0, 30)` sigue válido.
 * @param {number|object} pageOrOpts
 * @param {number} [size]
 */
export async function auditEntries(pageOrOpts = 0, size) {
  const opts =
    typeof pageOrOpts === 'object' && pageOrOpts !== null && !Array.isArray(pageOrOpts)
      ? pageOrOpts
      : { page: pageOrOpts, size }
  const q = new URLSearchParams()
  q.set('page', String(opts.page ?? 0))
  q.set('size', String(opts.size ?? 50))
  if (opts.sort != null && String(opts.sort).trim() !== '') {
    q.append('sort', String(opts.sort).trim())
  }
  return employeeJson(`/api/audit/entries?${q}`)
}

/** GET /api/audit/entries/{id} */
export async function getAuditEntryById(id) {
  return employeeJson(`/api/audit/entries/${id}`)
}
