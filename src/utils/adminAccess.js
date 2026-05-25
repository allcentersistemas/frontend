import { normalizeRoleName } from '../auth/roles'

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
