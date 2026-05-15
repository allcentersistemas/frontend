import { rmJson } from './http'

function qs(params) {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

/** Respuesta paginada Spring Data (content, totalElements, totalPages, number, size). */
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

/** GET /api/rm/registros-entrada */
export async function listRegistrosEntrada({ page = 0, size = 20 } = {}) {
  return rmJson(`/api/rm/registros-entrada${qs({ page, size })}`)
}

/** GET /api/rm/registros-entrada/{id} */
export async function getRegistroEntrada(id) {
  return rmJson(`/api/rm/registros-entrada/${id}`)
}

/** GET /api/rm/registros-salida */
export async function listRegistrosSalida({ page = 0, size = 20 } = {}) {
  return rmJson(`/api/rm/registros-salida${qs({ page, size })}`)
}

/** GET /api/rm/registros-salida/{id} */
export async function getRegistroSalida(id) {
  return rmJson(`/api/rm/registros-salida/${id}`)
}

/** GET /api/rm/registros-vehiculo */
export async function listRegistrosVehiculo({ page = 0, size = 20 } = {}) {
  return rmJson(`/api/rm/registros-vehiculo${qs({ page, size })}`)
}

/** GET /api/rm/registros-vehiculo/{id} */
export async function getRegistroVehiculo(id) {
  return rmJson(`/api/rm/registros-vehiculo/${id}`)
}

/** GET /api/rm/actas-conformidad */
export async function listActasConformidad({ page = 0, size = 20 } = {}) {
  return rmJson(`/api/rm/actas-conformidad${qs({ page, size })}`)
}

/** GET /api/rm/actas-conformidad/{id} */
export async function getActaConformidad(id) {
  return rmJson(`/api/rm/actas-conformidad/${id}`)
}
