import { ROLE_ADMIN, ROLE_MASTER, normalizeRoleName } from '../auth/roles'

/** Administración del sistema (MASTER / ADMIN). No incluye admin producción ni despacho. */
export function isSystemAdmin(employee) {
  const roles = employee?.roles ?? []
  const set = new Set(roles.map((r) => normalizeRoleName(r.name ?? r)))
  return set.has(ROLE_ADMIN) || set.has(ROLE_MASTER)
}

const ROLE_LABELS = {
  MASTER: 'Master',
  ADMIN: 'Administración',
  ADMIN_PRODUCCION: 'Admin producción',
  DESPACHO: 'Despacho',
  PRODUCCION: 'Producción',
}

export function roleDisplayName(roleName) {
  const key = normalizeRoleName(roleName ?? '')
  return ROLE_LABELS[key] ?? String(roleName ?? '—')
}
