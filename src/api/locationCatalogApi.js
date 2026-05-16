import { locationCatalogJson } from './http'

/**
 * Catálogo de sucursales y ubicaciones servido por **module-system**
 * (`/api/location/…`).
 */

/** GET /api/location/branches */
export async function listBranches() {
  return locationCatalogJson('/api/location/branches')
}

/** POST /api/location/branch */
export async function createBranch(body) {
  return locationCatalogJson('/api/location/branch', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** GET /api/location/locations */
export async function listLocations() {
  return locationCatalogJson('/api/location/locations')
}

/** POST /api/location/location */
export async function createLocation(body) {
  return locationCatalogJson('/api/location/location', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
