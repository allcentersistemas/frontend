import { orderJson } from './http'

/**
 * module-order (`VITE_ORDER_API_BASE`, típico 8083): palés `/api/order/pallets/**`, proyectos `/api/order/projects/**`.
 * Para el mismo ERP con microservicios: transporte (`transportApi.js`), catálogo geográfico (`locationCatalogApi.js`),
 * pale alternativo (`paleModuleApi.js`).
 */



/** GET /api/order/projects */
export async function listProjects() {
  return orderJson('/api/order/projects')
}

/** POST /api/order/projects */
export async function createProject(body) {
  return orderJson('/api/order/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** GET /api/order/projects/{id} */
export async function getProjectById(id) {
  return orderJson(`/api/order/projects/${id}`)
}

/** POST /api/order/projects/{id}/orders */
export async function createOrderInProject(projectId, body) {
  return orderJson(`/api/order/projects/${projectId}/orders`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** POST /api/order/orders/{id}/details */
export async function createOrderDetail(orderId, body) {
  return orderJson(`/api/order/orders/${orderId}/details`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
