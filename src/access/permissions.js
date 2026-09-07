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
  return canAccessFeature(employee, FEATURE.DASHBOARD_RESUMEN)
}

export function canViewVentasResumen(employee) {
  return canAccessFeature(employee, FEATURE.DASHBOARD_VENTAS)
}

/** Acceso a la página Resumen (operación y/o ventas). */
export function canViewResumenPage(employee) {
  return canViewResumen(employee) || canViewVentasResumen(employee)
}

/** Toda feature que desbloquea al menos una pestaña de GestionPage (ver tabs en GestionPage.jsx). */
const GESTION_HUB_FEATURES = [
  FEATURE.TRANSPORT_VEHICLES,
  FEATURE.EMPLOYEE_ADMIN,
  FEATURE.GESTION_CLIENTES_PORTAL,
  FEATURE.GESTION_PROYECTOS,
  FEATURE.BIESSE_AUDIT,
  FEATURE.PALES_AUDIT,
  FEATURE.TRANSPORT_AUDIT,
  FEATURE.BIESSE_STICKER_AUDIT,
]

/**
 * Acceso al hub Gestión: basta con poder ver al menos una de sus pestañas.
 * Antes se decidía con una whitelist de roles aparte (canViewGestionMenu) que no
 * cubría a Gerencia/Admin_Producción pese a que sí tienen permiso de auditoría y
 * flota — quedaban con el permiso pero sin poder entrar al hub.
 */
export function canAccessGestionHub(employee) {
  return GESTION_HUB_FEATURES.some((f) => canAccessFeature(employee, f))
}

export function canManageEmployees(employee) {
  return canAccessFeature(employee, FEATURE.EMPLOYEE_ADMIN, ACTION.VIEW)
}

/** Hub Producción: órdenes Biesse y palés. */
export function canViewProduccionHub(employee) {
  return (
    canAccessFeature(employee, FEATURE.BIESSE_ORDERS) || canAccessFeature(employee, FEATURE.PALES_LIST)
  )
}

/** Hub Almacén: guías, stock, catálogos y recepción de mercadería. */
export function canViewAlmacenHub(employee) {
  return (
    canAccessFeature(employee, FEATURE.INVENTORY_GUIAS) ||
    canAccessFeature(employee, FEATURE.INVENTORY_STOCK) ||
    canAccessFeature(employee, FEATURE.INVENTORY_TABLEROS) ||
    canAccessFeature(employee, FEATURE.INVENTORY_CANTOS) ||
    canAccessFeature(employee, FEATURE.INVENTORY_RM)
  )
}

/** Al menos un área de Producción o Almacén (antiguo hub único "Inventario"). */
export function canViewInventoryHub(employee) {
  return canViewProduccionHub(employee) || canViewAlmacenHub(employee)
}

export function defaultInventoryPath(base, employee) {
  if (canAccessFeature(employee, FEATURE.INVENTORY_RM)) return `${base}/almacen?area=rm`
  if (canAccessFeature(employee, FEATURE.BIESSE_ORDERS)) return `${base}/produccion?area=ordenes`
  if (canAccessFeature(employee, FEATURE.PALES_LIST)) return `${base}/produccion?area=pales`
  if (canAccessFeature(employee, FEATURE.INVENTORY_GUIAS)) return `${base}/almacen?area=guias`
  if (canAccessFeature(employee, FEATURE.INVENTORY_STOCK)) return `${base}/almacen?area=stock`
  if (canAccessFeature(employee, FEATURE.INVENTORY_TABLEROS)) return `${base}/almacen?area=tableros`
  if (canAccessFeature(employee, FEATURE.INVENTORY_CANTOS)) return `${base}/almacen?area=cantos`
  return null
}

/** Ruta inicial tras login (CASL: resumen vs inventario vs proyectos). */
export function defaultDashboardPath(dashboardRole, employee) {
  const base = dashboardPath(dashboardRole)
  if (canViewResumenPage(employee)) {
    return `${base}/resumen`
  }
  if (canViewInventoryHub(employee)) {
    const inv = defaultInventoryPath(base, employee)
    if (inv) return inv
  }
  if (canAccessFeature(employee, FEATURE.PROJECT_LIST)) {
    return `${base}/proyecto-optimizacion`
  }
  if (canAccessGestionHub(employee)) {
    return `${base}/gestion`
  }
  return `${base}/perfil`
}
