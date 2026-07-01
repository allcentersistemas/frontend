import { canViewGestionMenu, canViewResumenMenu, dashboardPath, roleNamesFromEmployee } from '../auth/roles'
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
  return canViewResumenMenu(roleNamesFromEmployee(employee))
}

export function canViewGestion(employee) {
  return canViewGestionMenu(roleNamesFromEmployee(employee))
}

/** Acceso al hub Gestión (admin completo o solo clientes/proyectos ventas). */
export function canAccessGestionHub(employee) {
  return (
    canViewGestion(employee) ||
    canAccessFeature(employee, FEATURE.GESTION_CLIENTES_PORTAL) ||
    canAccessFeature(employee, FEATURE.GESTION_PROYECTOS)
  )
}

export function canManageEmployees(employee) {
  return canAccessFeature(employee, FEATURE.EMPLOYEE_ADMIN, ACTION.VIEW)
}

/** Al menos una pestaña del hub Inventario. */
export function canViewInventoryHub(employee) {
  return (
    canAccessFeature(employee, FEATURE.BIESSE_ORDERS) ||
    canAccessFeature(employee, FEATURE.PALES_LIST) ||
    canAccessFeature(employee, FEATURE.INVENTORY_GUIAS) ||
    canAccessFeature(employee, FEATURE.INVENTORY_STOCK) ||
    canAccessFeature(employee, FEATURE.INVENTORY_TABLEROS) ||
    canAccessFeature(employee, FEATURE.INVENTORY_CANTOS) ||
    canAccessFeature(employee, FEATURE.INVENTORY_RM)
  )
}

export function defaultInventoryPath(base, employee) {
  if (canAccessFeature(employee, FEATURE.INVENTORY_RM)) return `${base}/inventario?area=rm`
  if (canAccessFeature(employee, FEATURE.BIESSE_ORDERS)) return `${base}/inventario?area=ordenes`
  if (canAccessFeature(employee, FEATURE.PALES_LIST)) return `${base}/inventario?area=pales`
  if (canAccessFeature(employee, FEATURE.INVENTORY_GUIAS)) return `${base}/inventario?area=guias`
  if (canAccessFeature(employee, FEATURE.INVENTORY_STOCK)) return `${base}/inventario?area=stock`
  return `${base}/inventario`
}

/** Ruta inicial tras login (CASL: resumen vs inventario vs proyectos). */
export function defaultDashboardPath(dashboardRole, employee) {
  const base = dashboardPath(dashboardRole)
  if (canViewResumen(employee)) {
    return base
  }
  if (canViewInventoryHub(employee)) {
    return defaultInventoryPath(base, employee)
  }
  if (canAccessFeature(employee, FEATURE.PROJECT_LIST)) {
    return `${base}/proyecto-optimizacion`
  }
  return `${base}/perfil`
}
