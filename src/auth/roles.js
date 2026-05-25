/** Coincide con nombres de rol en BD; guiones se normalizan a guión bajo. */
export const ROLE_MASTER = 'MASTER'
export const ROLE_ADMIN = 'ADMIN'
export const ROLE_PRODUCCION = 'PRODUCCION'
export const ROLE_ADMIN_PRODUCCION = 'ADMIN_PRODUCCION'
export const ROLE_DESPACHO = 'DESPACHO'

export function normalizeRoleName(name) {
  return name.trim().toUpperCase().replace(/-/g, '_')
}

/**
 * MASTER / ADMIN → panel administrativo completo (roles, empleados, auditoría en API).
 * ADMIN_PRODUCCION → mismo panel. DESPACHO → tablero operativo de despacho.
 * PRODUCCION → solo operaciones de línea.
 */
export function dashboardForRoles(roleNames) {
  const set = new Set(roleNames.map(normalizeRoleName))
  if (set.has(ROLE_MASTER) || set.has(ROLE_ADMIN) || set.has(ROLE_ADMIN_PRODUCCION)) {
    return 'admin-produccion'
  }
  if (set.has(ROLE_DESPACHO)) return 'despacho'
  if (set.has(ROLE_PRODUCCION)) return 'produccion'
  return null
}

/** Texto del lateral según rol real (MASTER vs admin de módulo vs admin producción). */
export function shellSubtitle(roleNames, routeDashboard) {
  if (routeDashboard === 'despacho') return 'Despacho'
  if (routeDashboard === 'produccion') return 'Producción'
  const set = new Set(roleNames.map(normalizeRoleName))
  if (set.has(ROLE_MASTER)) return 'Master'
  if (set.has(ROLE_ADMIN)) return 'Administración'
  return 'Admin producción'
}

export function dashboardPath(role) {
  return `/dashboard/${role}`
}

