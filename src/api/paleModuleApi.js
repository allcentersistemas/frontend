import { paleModuleJson } from './http'

/**
 * Palés expuestos por **module-pale** (`/api/pallets/…`).
 * No confundir con `orderApi` (`/api/order/pallets/…`) si usas module-order.
 */

/** GET /api/pallets/catalogs */
export async function getPalletCatalogs() {
  return paleModuleJson('/api/pallets/catalogs')
}

/** GET /api/pallets */
export async function listPallets() {
  return paleModuleJson('/api/pallets')
}

/** GET /api/pallets/audit */
export async function listPalletAudit(params = {}) {
  const q = new URLSearchParams()
  if (params.paleId != null && String(params.paleId).trim() !== '') q.set('paleId', String(params.paleId).trim())
  if (params.action != null && String(params.action).trim() !== '') q.set('action', String(params.action).trim())
  q.set('limit', String(params.limit ?? 100))
  return paleModuleJson(`/api/pallets/audit?${q}`)
}

/** POST /api/pallets */
export async function createPallet(body) {
  return paleModuleJson('/api/pallets', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** GET /api/pallets/{id} */
export async function getPalletById(id) {
  return paleModuleJson(`/api/pallets/${id}`)
}

/** PATCH /api/pallets/{id} */
export async function updatePallet(palletId, body) {
  return paleModuleJson(`/api/pallets/${palletId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** GET /api/pallets/by-code/{code} */
export async function getPalletByCode(code) {
  return paleModuleJson(`/api/pallets/by-code/${encodeURIComponent(code)}`)
}

/** POST /api/pallets/{id}/scan-piece — requiere Authorization */
export async function scanPieceToPallet(palletId, body) {
  return paleModuleJson(`/api/pallets/${palletId}/scan-piece`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** POST /api/pallets/{id}/close */
export async function closePallet(palletId, body) {
  return paleModuleJson(`/api/pallets/${palletId}/close`, {
    method: 'POST',
    body: body == null ? undefined : JSON.stringify(body),
  })
}

/** DELETE /api/pallets/{id}/details/{detailId} */
export async function deletePalletDetail(palletId, detailId) {
  return paleModuleJson(`/api/pallets/${palletId}/details/${detailId}`, {
    method: 'DELETE',
  })
}
