import { transportJson } from './http'

/** GET /api/transport/vehiculos — lista para resolver etiquetas en inventario RM. */
export async function listTransporteVehiculos() {
  return transportJson('/api/transport/vehiculos')
}
