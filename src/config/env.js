function trimSlash(s) {
  return String(s).replace(/\/+$/, '')
}

/**
 * Resuelve URL base de API: variable Vite, prefijo same-origin en prod, o default local.
 * @param {string} envKey - ej. VITE_EMPLOYEE_API_BASE
 * @param {string} prodPathPrefix - ej. /api-employee (nginx → microservicio)
 * @param {string} devDefault - ej. http://localhost:8080
 */
function resolveApiBase(envKey, prodPathPrefix, devDefault) {
  const raw = import.meta.env[envKey]
  if (raw !== undefined && raw !== '') {
    return trimSlash(raw)
  }
  if (import.meta.env.PROD || import.meta.env.MODE === 'staging') {
    return prodPathPrefix
  }
  return trimSlash(devDefault)
}

export const employeeApiBase = resolveApiBase(
  'VITE_EMPLOYEE_API_BASE',
  '/api-employee',
  'http://localhost:8080',
)

export const osiApiBase = resolveApiBase(
  'VITE_OSI_API_BASE',
  '/api-biesse',
  import.meta.env.VITE_EMPLOYEE_API_BASE
    ? trimSlash(import.meta.env.VITE_EMPLOYEE_API_BASE)
    : 'http://localhost:8086',
)

export const orderApiBase = resolveApiBase(
  'VITE_ORDER_API_BASE',
  '/api-order',
  'http://localhost:8083',
)

export const transportApiBase = resolveApiBase(
  'VITE_TRANSPORT_API_BASE',
  '/api-transport',
  'http://localhost:8085',
)

export const locationCatalogApiBase = resolveApiBase(
  'VITE_LOCATION_API_BASE',
  '/api-location',
  'http://localhost:8088',
)

export const paleServiceApiBase = resolveApiBase(
  'VITE_PALES_SERVICE_API_BASE',
  '/api-pale',
  'http://localhost:8087',
)

export const clientPortalApiBase = resolveApiBase(
  'VITE_CLIENT_API_BASE',
  '/api-client',
  'http://localhost:8084',
)

export const inventoryApiBase = resolveApiBase(
  'VITE_INVENTORY_API_BASE',
  '/api-inventory',
  'http://localhost:8089',
)

export const rmApiBase = resolveApiBase(
  'VITE_RM_API_BASE',
  '/api-rm',
  'http://localhost:8090',
)
