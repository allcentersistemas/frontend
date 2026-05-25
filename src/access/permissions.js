import { dashboardPath } from '../auth/roles'
import { buildAbilityFor } from './ability'
import { FEATURE } from './permissionCatalog'
import { ACTION } from './rolePermissions'

/** Construye la ability CASL del empleado (misma lógica que el menú y los botones). */
export function abilityFor(employee) {
  return buildAbilityFor(employee)
}

/** Comprueba permiso sin React (login, redirects). */
export function canAccessFeature(employee, feature, action = ACTION.VIEW) {
  const ability = buildAbilityFor(employee)
  return ability.can(action, feature) || ability.can(ACTION.MANAGE, 'all')
}

export function canViewResumen(employee) {
  return canAccessFeature(employee, FEATURE.DASHBOARD_RESUMEN, ACTION.VIEW)
}

export function canManageEmployees(employee) {
  return canAccessFeature(employee, FEATURE.EMPLOYEE_ADMIN, ACTION.VIEW)
}

/** Ruta inicial tras login (CASL: resumen vs órdenes). */
export function defaultDashboardPath(dashboardRole, employee) {
  const base = dashboardPath(dashboardRole)
  if (canViewResumen(employee)) {
    return base
  }
  return `${base}/ordenes`
}
