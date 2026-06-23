/** Coincide con nombres de rol en BD; guiones se normalizan a guión bajo. */
export const ROLE_MASTER = 'MASTER'
export const ROLE_ADMIN = 'ADMIN'
export const ROLE_ADMINISTRADOR = 'ADMINISTRADOR'
export const ROLE_SISTEMAS = 'SISTEMAS'
export const ROLE_GERENCIA = 'GERENCIA'
export const ROLE_SEGURIDAD = 'SEGURIDAD'
export const ROLE_PROCESOS = 'PROCESOS'
export const ROLE_LOGISTICA = 'LOGISTICA'
export const ROLE_CALIDAD = 'CALIDAD'
export const ROLE_DESPACHO = 'DESPACHO'
export const ROLE_PRODUCCION = 'PRODUCCION'
export const ROLE_VENTAS = 'VENTAS'
/** @deprecated Usar GERENCIA o ADMIN */
export const ROLE_ADMIN_PRODUCCION = 'ADMIN_PRODUCCION'

export function normalizeRoleName(name) {
  return String(name ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
}

export function roleNamesFromEmployee(employee) {
  return (employee?.roles ?? []).map((r) => normalizeRoleName(r.name)).filter(Boolean)
}

/** Resumen del dashboard: solo Sistemas y Administrador (incl. Master). */
export function canViewResumenMenu(roleNames) {
  const set = new Set(roleNames.map(normalizeRoleName))
  return (
    set.has(ROLE_MASTER) ||
    set.has(ROLE_SISTEMAS) ||
    set.has(ROLE_ADMIN) ||
    set.has(ROLE_ADMINISTRADOR)
  )
}

/** Menú Gestión (flota, empleados, auditoría): solo Sistemas y Administrador. */
export function canViewGestionMenu(roleNames) {
  return canViewResumenMenu(roleNames)
}

/** Backups de BD: solo rol MASTER. */
export function canViewBackupMenu(roleNames) {
  const set = new Set(roleNames.map(normalizeRoleName))
  return set.has(ROLE_MASTER)
}

/**
 * Shell de dashboard según rol principal.
 * Todos los roles operativos entran por uno de estos tres paths existentes.
 */
export function dashboardForRoles(roleNames) {
  const set = new Set(roleNames.map(normalizeRoleName))
  if (set.size === 0) return null

  if (set.has(ROLE_DESPACHO) || set.has(ROLE_LOGISTICA)) {
    return 'despacho'
  }
  if (
    set.has(ROLE_PRODUCCION) ||
    set.has(ROLE_PROCESOS) ||
    set.has(ROLE_VENTAS) ||
    set.has(ROLE_CALIDAD)
  ) {
    return 'produccion'
  }

  return 'admin-produccion'
}

export function shellSubtitle(roleNames, routeDashboard) {
  if (routeDashboard === 'despacho') return 'Despacho / Logística'
  if (routeDashboard === 'produccion') return 'Producción'
  const set = new Set(roleNames.map(normalizeRoleName))
  if (set.has(ROLE_MASTER)) return 'Master'
  if (set.has(ROLE_SISTEMAS)) return 'Sistemas'
  if (set.has(ROLE_ADMIN) || set.has(ROLE_ADMINISTRADOR)) return 'Administración'
  if (set.has(ROLE_GERENCIA)) return 'Gerencia'
  if (set.has(ROLE_SEGURIDAD)) return 'Seguridad'
  return 'Operaciones'
}

export function dashboardPath(role) {
  return `/dashboard/${role}`
}
