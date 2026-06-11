import { canViewGestionMenu, canViewResumenMenu, roleNamesFromEmployee } from '../auth/roles'
import { FEATURE } from './permissionCatalog'

// Un solo menú para toda la app. La visibilidad sale de CASL/rolePermissions.js.
export const SIDEBAR_MENU = [
  { id: 'home', segment: '', label: 'Resumen', end: true, menu: 'resumen' },
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
      FEATURE.BIESSE_AUDIT,
      FEATURE.PALES_AUDIT,
      FEATURE.TRANSPORT_AUDIT,
      FEATURE.BIESSE_STICKER_AUDIT,
    ],
  },
  { id: 'api', segment: 'api', label: 'Catálogo API', feature: FEATURE.API_CATALOG },
  { id: 'profile', segment: 'perfil', label: 'Mi perfil', feature: FEATURE.EMPLOYEE_PROFILE },
  { id: 'proyectos', segment: 'proyecto-optimizacion', label: 'Proyecto optimización', menu: 'proyectos', feature: FEATURE.PROJECT_LIST },
]

export function sidebarSectionsForDashboard(role, ability, employee = null) {
  const base = `/dashboard/${role}`
  const roleNames = roleNamesFromEmployee(employee)

  const items = SIDEBAR_MENU.filter((item) => {
    if (ability.can('manage', 'all')) {
      if (item.menu === 'resumen') return canViewResumenMenu(roleNames)
      if (item.menu === 'gestion') return canViewGestionMenu(roleNames)
      return true
    }
    if (item.menu === 'resumen') {
      return canViewResumenMenu(roleNames)
    }
    if (item.menu === 'gestion') {
      return canViewGestionMenu(roleNames)
    }
    if (item.menu === 'inventario') {
      return item.features.some((f) => ability.can('view', f))
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
