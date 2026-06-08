import { sessionClientHeaders } from '../auth/clientSession'
import { systemJson } from './http'

/* ——— Auth ——— */

export async function login(body) {
  return systemJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
    headers: sessionClientHeaders(),
  })
}

export async function firstSetupStatus() {
  return systemJson('/api/auth/first-setup/status', { skipAuth: true })
}

export async function completeFirstSetup(body, options = {}) {
  const headers = {}
  if (options.setupSecret != null && String(options.setupSecret).trim() !== '') {
    headers['X-First-Setup-Secret'] = String(options.setupSecret).trim()
  }
  return systemJson('/api/auth/first-setup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: Object.keys(headers).length ? headers : undefined,
    skipAuth: true,
  })
}

export async function register(body) {
  return systemJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function refreshSession(body) {
  return systemJson('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function logout(body) {
  await systemJson('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function logoutAll() {
  await systemJson('/api/auth/logout-all', { method: 'POST' })
}

export async function fetchMe() {
  return systemJson('/api/auth/me')
}

export async function changePassword(body) {
  await systemJson('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchApiCatalog() {
  return systemJson('/api', { skipAuth: true })
}

/* ——— Empleados / roles ——— */

export async function patchMyProfile(body) {
  return systemJson('/api/employees/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function fetchMeAsEmployee() {
  return systemJson('/api/employees/me')
}

export async function listEmployees(params = {}) {
  const q = new URLSearchParams()
  if (params.activeOnly === false) {
    q.set('activeOnly', 'false')
  } else {
    q.set('activeOnly', 'true')
  }
  if (params.q != null && String(params.q).trim() !== '') {
    q.set('q', String(params.q).trim())
  }
  const suffix = q.toString() ? `?${q}` : ''
  return systemJson(`/api/employees${suffix}`)
}

export async function resetEmployeePassword(employeeId, body) {
  await systemJson(`/api/employees/${employeeId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getEmployeeById(employeeId) {
  return systemJson(`/api/employees/${employeeId}`)
}

export async function createEmployee(body) {
  return systemJson('/api/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchEmployee(employeeId, body) {
  return systemJson(`/api/employees/${employeeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function replaceEmployeeRoles(employeeId, roleIds) {
  return systemJson(`/api/employees/${employeeId}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds }),
  })
}

export async function deleteEmployee(employeeId) {
  await systemJson(`/api/employees/${employeeId}`, { method: 'DELETE' })
}

export async function recordStickerPrint(body) {
  return systemJson('/api/impresion/sticker', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listStickerPrints(params = {}) {
  const q = new URLSearchParams()
  if (params.orderId != null) q.set('orderId', String(params.orderId))
  if (params.fromDate) q.set('fromDate', String(params.fromDate))
  if (params.toDate) q.set('toDate', String(params.toDate))
  q.set('limit', String(params.limit ?? 100))
  const list = await systemJson(`/api/impresion/sticker?${q}`)
  return list
}

export async function listRoles() {
  return systemJson('/api/roles')
}

export async function getRoleById(roleId) {
  return systemJson(`/api/roles/${roleId}`)
}

export async function createRole(body) {
  return systemJson('/api/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchRole(roleId, body) {
  return systemJson(`/api/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteRole(roleId) {
  await systemJson(`/api/roles/${roleId}`, { method: 'DELETE' })
}

/* ——— Auditoría empleados ——— */

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
  return systemJson(`/api/audit/entries?${q}`)
}

export async function getAuditEntryById(id) {
  return systemJson(`/api/audit/entries/${id}`)
}

/* ——— Ubicaciones ——— */

export async function listBranches() {
  return systemJson('/api/location/branches')
}

export async function createBranch(body) {
  return systemJson('/api/location/branch', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listLocations() {
  return systemJson('/api/location/locations')
}

export async function createLocation(body) {
  return systemJson('/api/location/location', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* ——— Órdenes / proyectos ——— */

export async function listProjects() {
  return systemJson('/api/order/projects')
}

export async function createProject(body) {
  return systemJson('/api/order/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getProjectById(id) {
  return systemJson(`/api/order/projects/${id}`)
}

export async function createOrderInProject(projectId, body) {
  return systemJson(`/api/order/projects/${projectId}/orders`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function createOrderDetail(orderId, body) {
  return systemJson(`/api/order/orders/${orderId}/details`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* ——— Palés ——— */

export async function getPalletCatalogs() {
  return systemJson('/api/pallets/catalogs')
}

export async function listPallets() {
  return systemJson('/api/pallets')
}

export async function listPalletAudit(params = {}) {
  const q = new URLSearchParams()
  if (params.paleId != null && String(params.paleId).trim() !== '') q.set('paleId', String(params.paleId).trim())
  if (params.action != null && String(params.action).trim() !== '') q.set('action', String(params.action).trim())
  q.set('limit', String(params.limit ?? 100))
  return systemJson(`/api/pallets/audit?${q}`)
}

export async function createPallet(body) {
  return systemJson('/api/pallets', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listPalletsByOrder(orderId) {
  return systemJson(`/api/pallets/by-order/${orderId}`)
}

export async function getPalletById(id) {
  return systemJson(`/api/pallets/${id}`)
}

export async function updatePallet(palletId, body) {
  return systemJson(`/api/pallets/${palletId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function getPalletByCode(code) {
  return systemJson(`/api/pallets/by-code/${encodeURIComponent(code)}`)
}

export async function scanPieceToPallet(palletId, body) {
  return systemJson(`/api/pallets/${palletId}/scan-piece`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function closePallet(palletId, body) {
  return systemJson(`/api/pallets/${palletId}/close`, {
    method: 'POST',
    body: body == null ? undefined : JSON.stringify(body),
  })
}

export async function deletePalletDetail(palletId, detailId) {
  return systemJson(`/api/pallets/${palletId}/details/${detailId}`, {
    method: 'DELETE',
  })
}

export async function deletePallet(palletId) {
  return systemJson(`/api/pallets/${palletId}`, {
    method: 'DELETE',
  })
}

/* ——— Gestión (flota / vehículos) ——— */

export async function listVehiculos() {
  return systemJson('/api/transport/vehiculos')
}

export async function listTransporteVehiculos() {
  return systemJson('/api/transport/vehiculos')
}

export async function getVehiculo(id) {
  return systemJson(`/api/transport/vehiculos/${id}`)
}

export async function createVehiculo(body) {
  return systemJson('/api/transport/vehiculos', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateVehiculo(id, body) {
  return systemJson(`/api/transport/vehiculos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function listGuias() {
  return systemJson('/api/inventory/guias')
}

export async function listGuiasPalesEscaneados(q) {
  const params = new URLSearchParams()
  if (q != null && String(q).trim() !== '') {
    params.set('q', String(q).trim())
  }
  const suffix = params.toString() ? `?${params}` : ''
  return systemJson(`/api/inventory/guias/pales-escaneados${suffix}`)
}

export async function getGuia(id) {
  return systemJson(`/api/inventory/guias/${id}`)
}

export async function createGuia(body) {
  const created = await systemJson('/api/inventory/guias', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (created?.id != null) {
    return getGuia(created.id)
  }
  return created
}

export async function updateGuia(id, body) {
  return systemJson(`/api/inventory/guias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function addGuiaDetalleManual(guiaId, body) {
  return systemJson(`/api/inventory/guias/${guiaId}/detalles`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function addGuiaDetallePale(guiaId, body) {
  return systemJson(`/api/inventory/guias/${guiaId}/detalles/pale`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function removeGuiaDetalle(guiaId, detalleId) {
  return systemJson(`/api/inventory/guias/${guiaId}/detalles/${detalleId}`, {
    method: 'DELETE',
  })
}

export async function listTransportAuditoria(params = {}) {
  const q = new URLSearchParams()
  if (params.entityType != null && String(params.entityType).trim() !== '') {
    q.set('entityType', String(params.entityType).trim())
  }
  if (params.entityId != null && String(params.entityId).trim() !== '') {
    q.set('entityId', String(params.entityId).trim())
  }
  if (params.correlationId != null && String(params.correlationId).trim() !== '') {
    q.set('correlationId', String(params.correlationId).trim())
  }
  if (params.page != null) q.set('page', String(params.page))
  if (params.size != null) q.set('size', String(params.size))
  if (params.sort != null && String(params.sort).trim() !== '') {
    q.append('sort', String(params.sort).trim())
  } else {
    q.append('sort', 'occurredAt,desc')
  }
  const suffix = q.toString() ? `?${q}` : ''
  return systemJson(`/api/transport/auditoria${suffix}`)
}

/* ——— Inventario ——— */

function qs(params) {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

export async function listInventoryCategorias() {
  return systemJson('/api/inventory/categorias')
}

export async function listInventoryItems({ page = 0, size = 20, q, sucursalId, tipo } = {}) {
  return systemJson(`/api/inventory/items${qs({ page, size, q, sucursalId, tipo })}`)
}

export async function listTableros({ page = 0, size = 20, q } = {}) {
  return systemJson(`/api/inventory/tableros${qs({ page, size, q })}`)
}

export async function createTablero(body) {
  return systemJson('/api/inventory/tableros', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listCantos({ page = 0, size = 20, q } = {}) {
  return systemJson(`/api/inventory/cantos${qs({ page, size, q })}`)
}

export async function createCanto(body) {
  return systemJson('/api/inventory/cantos', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getInventoryItemDetail(id, { sucursalId } = {}) {
  return systemJson(`/api/inventory/items/${id}${qs({ sucursalId })}`)
}

export async function createInventoryItem(body) {
  return systemJson('/api/inventory/items', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function addInventoryMovement(itemId, body) {
  return systemJson(`/api/inventory/items/${itemId}/movements`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/* ——— RM ——— */

export function pageContent(body) {
  if (!body || typeof body !== 'object') return []
  const c = body.content
  return Array.isArray(c) ? c : []
}

export function pageMeta(body) {
  if (!body || typeof body !== 'object') {
    return { totalElements: 0, totalPages: 0, number: 0, size: 20 }
  }
  return {
    totalElements: Number(body.totalElements) || 0,
    totalPages: Number(body.totalPages) || 0,
    number: Number(body.number) || 0,
    size: Number(body.size) || 20,
  }
}

export async function listRegistrosEntrada({ page = 0, size = 20, q } = {}) {
  return systemJson(`/api/rm/registros-entrada${qs({ page, size, q: q?.trim() || undefined })}`)
}

export async function getRegistroEntrada(id) {
  return systemJson(`/api/rm/registros-entrada/${id}`)
}

export async function cancelRegistroEntrada(id, motivo) {
  return systemJson(`/api/rm/registros-entrada/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  })
}

export async function listRegistrosSalida({ page = 0, size = 20, q } = {}) {
  return systemJson(`/api/rm/registros-salida${qs({ page, size, q: q?.trim() || undefined })}`)
}

export async function getRegistroSalida(id) {
  return systemJson(`/api/rm/registros-salida/${id}`)
}

export async function cancelRegistroSalida(id, motivo) {
  return systemJson(`/api/rm/registros-salida/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  })
}

export async function listRegistrosVehiculo({ page = 0, size = 20, q } = {}) {
  return systemJson(`/api/rm/registros-vehiculo${qs({ page, size, q: q?.trim() || undefined })}`)
}

/** Recorre páginas Spring hasta traer todos los ítems (tope de seguridad). */
export async function fetchAllPaged(listFn, { size = 100, maxItems = 2000 } = {}) {
  const all = []
  let page = 0
  let totalPages = 1
  while (page < totalPages && all.length < maxItems) {
    const body = await listFn({ page, size })
    const chunk = pageContent(body)
    if (Array.isArray(chunk)) all.push(...chunk)
    const meta = pageMeta(body)
    totalPages = Math.max(1, meta.totalPages)
    page += 1
    if (!chunk?.length && page >= totalPages) break
  }
  return { items: all, truncated: all.length >= maxItems }
}

export async function getRegistroVehiculo(id) {
  return systemJson(`/api/rm/registros-vehiculo/${id}`)
}

export async function listActasConformidad({ page = 0, size = 20 } = {}) {
  return systemJson(`/api/rm/actas-conformidad${qs({ page, size })}`)
}

export async function getActaConformidad(id) {
  return systemJson(`/api/rm/actas-conformidad/${id}`)
}

export async function cancelActaConformidad(id, motivo) {
  return systemJson(`/api/rm/actas-conformidad/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  })
}

/* ——— Portal clientes (admin en SPA empleados) ——— */

export async function clientLogin(body) {
  return systemJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function clientRegister(body) {
  return systemJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function clientRefresh(body) {
  return systemJson('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function clientLogout(body) {
  await systemJson('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function clientLogoutAll() {
  await systemJson('/api/auth/logout-all', { method: 'POST' })
}

export async function clientFetchMe() {
  return systemJson('/api/auth/me')
}

export async function clientChangePassword(body) {
  await systemJson('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listClients() {
  return systemJson('/api/clients')
}

export async function getClient(id) {
  return systemJson(`/api/clients/${id}`)
}

export async function createClient(body) {
  return systemJson('/api/clients', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateClient(id, body) {
  return systemJson(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteClient(id) {
  await systemJson(`/api/clients/${id}`, { method: 'DELETE' })
}
