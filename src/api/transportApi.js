import { transportJson } from './http'

/** GET /api/transport/vehiculos */
export async function listVehiculos() {
  return transportJson('/api/transport/vehiculos')
}

/** GET /api/transport/vehiculos/{id} */
export async function getVehiculo(id) {
  return transportJson(`/api/transport/vehiculos/${id}`)
}

/**
 * POST /api/transport/vehiculos
 * Body: placa (req), numeroSerie, modelo, color, descripcion, tipoVehiculo, capacidad, activo
 */
export async function createVehiculo(body) {
  return transportJson('/api/transport/vehiculos', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * PUT /api/transport/vehiculos/{id}
 * Partial update — enviar solo campos a cambiar.
 */
export async function updateVehiculo(id, body) {
  return transportJson(`/api/transport/vehiculos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/** GET /api/transport/cargas */
export async function listCargas() {
  return transportJson('/api/transport/cargas')
}

/** GET /api/transport/cargas/{id} */
export async function getCarga(id) {
  return transportJson(`/api/transport/cargas/${id}`)
}

/**
 * POST /api/transport/cargas
 * Body: transporteId, choferNombre (req), choferDocumento, notas, fechaSalida, creadoPor
 */
export async function createCarga(body) {
  return transportJson('/api/transport/cargas', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * PUT /api/transport/cargas/{id}
 * Estados: BORRADOR | CONFIRMADA | EN_RUTA | ENTREGADA | CANCELADA
 */
export async function updateCarga(id, body) {
  return transportJson(`/api/transport/cargas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/**
 * POST /api/transport/cargas/{id}/detalles
 * Body: paleEnvioId, paleCodigo?, cantidad (req), observacion?
 * Valida pale cerrado vía module-system (pale).
 */
export async function addCargaDetalle(cargaId, body) {
  return transportJson(`/api/transport/cargas/${cargaId}/detalles`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** DELETE /api/transport/cargas/{id}/detalles/{detalleId} */
export async function removeCargaDetalle(cargaId, detalleId) {
  return transportJson(`/api/transport/cargas/${cargaId}/detalles/${detalleId}`, {
    method: 'DELETE',
  })
}

/**
 * GET /api/transport/auditoria — trazabilidad (paginado Spring Data).
 * @param {object} params
 * @param {string} [params.entityType] Transporte | TransporteCarga | TransporteCargaDetalle
 * @param {string} [params.entityId]
 * @param {string} [params.correlationId] — ID de carga para ver todo el historial de una expedición
 */
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
  return transportJson(`/api/transport/auditoria${suffix}`)
}
