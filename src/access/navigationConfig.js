import { canViewGestionMenu, roleNamesFromEmployee } from '../auth/roles'
import { FEATURE } from './permissionCatalog'
import { ACTION } from './rolePermissions'

// Un solo menú para toda la app. La visibilidad sale de CASL/rolePermissions.js.
export const SIDEBAR_MENU = [
  { id: 'home', segment: 'resumen', label: 'Resumen', end: true, menu: 'resumen', feature: FEATURE.DASHBOARD_RESUMEN },
  {
    id: 'inventario',
    segment: 'inventario',
    label: 'Inventario',
    menu: 'inventario',
    features: [
      FEATURE.BIESSE_ORDERS,
      FEATURE.PALES_LIST,
      FEATURE.INVENTORY_GUIAS,
      FEATURE.INVENTORY_STOCK,
      FEATURE.INVENTORY_TABLEROS,
      FEATURE.INVENTORY_CANTOS,
      FEATURE.INVENTORY_RM,
    ],
  },
  {
    id: 'gestion',
    segment: 'gestion',
    label: 'Gestión',
    menu: 'gestion',
    features: [
      FEATURE.TRANSPORT_VEHICLES,
      FEATURE.EMPLOYEE_ADMIN,
      FEATURE.GESTION_CLIENTES_PORTAL,
      FEATURE.GESTION_PROYECTOS,
      FEATURE.BIESSE_AUDIT,
      FEATURE.PALES_AUDIT,
      FEATURE.TRANSPORT_AUDIT,
      FEATURE.BIESSE_STICKER_AUDIT,
    ],
  },
  { id: 'api', segment: 'api', label: 'Catálogo API', feature: FEATURE.API_CATALOG },
  { id: 'profile', segment: 'perfil', label: 'Mi perfil', feature: FEATURE.EMPLOYEE_PROFILE },
  {
    id: 'proyecto-optimizacion',
    segment: 'proyecto-optimizacion',
    label: 'Proyecto optimización',
    menu: 'proyecto-optimizacion',
    feature: FEATURE.PROJECT_LIST,
  },
]

export function sidebarSectionsForDashboard(role, ability, employee = null) {
  const base = `/dashboard/${role}`
  const roleNames = roleNamesFromEmployee(employee)

  const items = SIDEBAR_MENU.filter((item) => {
    if (ability.can('manage', 'all')) {
      if (item.menu === 'gestion') return canViewGestionMenu(roleNames)
      if (item.menu === 'resumen' || item.feature === FEATURE.DASHBOARD_RESUMEN) {
        return ability.can('view', FEATURE.DASHBOARD_RESUMEN)
      }
      return true
    }
    if (item.menu === 'resumen' || item.feature === FEATURE.DASHBOARD_RESUMEN) {
      return ability.can('view', FEATURE.DASHBOARD_RESUMEN)
    }
    if (item.menu === 'gestion') {
      if (canViewGestionMenu(roleNames)) return true
      return (
        ability.can('view', FEATURE.GESTION_CLIENTES_PORTAL) ||
        ability.can('view', FEATURE.GESTION_PROYECTOS)
      )
    }
    if (item.menu === 'inventario') {
      return item.features.some((f) => ability.can('view', f))
    }
    if (item.menu === 'proyecto-optimizacion') {
      return ability.can('view', FEATURE.PROJECT_LIST) || ability.can('manage', 'all')
    }
    if (item.features?.length) {
      return item.features.some((f) => ability.can('view', f))
    }
    return !item.feature || ability.can('view', item.feature)
  }).map((item) => ({
    ...item,
    to: item.segment ? `${base}/${item.segment}` : base,
  }))

  return [
    {
      id: 'main',
      title: null,
      items,
    },
  ]
}
