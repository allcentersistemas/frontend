import { ROLE_ADMIN, ROLE_MASTER, normalizeRoleName } from '../auth/roles'

/** Solo administración (MASTER / ADMIN), no admin producción ni despacho. */
export function isPaleSystemAdmin(employee) {
  const roles = employee?.roles ?? []
  const set = new Set(roles.map((r) => normalizeRoleName(r.name ?? r)))
  return set.has(ROLE_ADMIN) || set.has(ROLE_MASTER)
}
