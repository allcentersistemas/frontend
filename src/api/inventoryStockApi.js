import { inventoryJson } from './http'

function qs(params) {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

/** GET /api/inventory/items */
export async function listInventoryItems({ page = 0, size = 20, q } = {}) {
  return inventoryJson(`/api/inventory/items${qs({ page, size, q })}`)
}

/** GET /api/inventory/items/{id} */
export async function getInventoryItemDetail(id) {
  return inventoryJson(`/api/inventory/items/${id}`)
}

/** POST /api/inventory/items */
export async function createInventoryItem(body) {
  return inventoryJson('/api/inventory/items', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** POST /api/inventory/items/{id}/movements */
export async function addInventoryMovement(itemId, body) {
  return inventoryJson(`/api/inventory/items/${itemId}/movements`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
