function trimSlash(s) {
  return String(s).replace(/\/+$/, '')
}

/**
 * URL base del monolito module-system (y opcionalmente overrides por módulo).
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

/** Monolito AllCenter (empleados, órdenes, pales, transporte, inventario, RM, clientes). */
export const systemApiBase = resolveApiBase(
  'VITE_SYSTEM_API_BASE',
  '/api-system',
  'http://localhost:8080',
)

/** Integración Biesse / escaneo OSI (servicio aparte). */
export const osiApiBase = resolveApiBase(
  'VITE_OSI_API_BASE',
  '/api-biesse',
  import.meta.env.VITE_OSI_API_BASE
    ? trimSlash(import.meta.env.VITE_OSI_API_BASE)
    : 'http://localhost:8086',
)

// Aliases (misma API; overrides opcionales por VITE_*_API_BASE)
export const employeeApiBase = resolveApiBase('VITE_EMPLOYEE_API_BASE', '/api-system', systemApiBase)
export const orderApiBase = resolveApiBase('VITE_ORDER_API_BASE', '/api-system', systemApiBase)
export const transportApiBase = resolveApiBase('VITE_TRANSPORT_API_BASE', '/api-system', systemApiBase)
export const locationCatalogApiBase = resolveApiBase('VITE_LOCATION_API_BASE', '/api-system', systemApiBase)
export const paleServiceApiBase = resolveApiBase('VITE_PALES_SERVICE_API_BASE', '/api-system', systemApiBase)
export const clientPortalApiBase = resolveApiBase('VITE_CLIENT_API_BASE', '/api-system', systemApiBase)
export const inventoryApiBase = resolveApiBase('VITE_INVENTORY_API_BASE', '/api-system', systemApiBase)
export const rmApiBase = resolveApiBase('VITE_RM_API_BASE', '/api-system', systemApiBase)
