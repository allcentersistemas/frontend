import { canAccessGestionHub } from './permissions'
import { FEATURE } from './permissionCatalog'

// Un solo menú para toda la app. La visibilidad sale de CASL/rolePermissions.js.
export const SIDEBAR_MENU = [
  {
    id: 'home',
    segment: 'resumen',
    label: 'Resumen',
    end: true,
    menu: 'resumen',
    features: [FEATURE.DASHBOARD_RESUMEN, FEATURE.DASHBOARD_VENTAS],
  },
  {
    id: 'produccion',
    segment: 'produccion',
    label: 'Producción',
    features: [FEATURE.BIESSE_ORDERS, FEATURE.PALES_LIST],
  },
  {
    id: 'almacen',
    segment: 'almacen',
    label: 'Almacén',
    features: [
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

  const items = SIDEBAR_MENU.filter((item) => {
    if (item.menu === 'resumen') {
      return (
        ability.can('view', FEATURE.DASHBOARD_RESUMEN) ||
        ability.can('view', FEATURE.DASHBOARD_VENTAS) ||
        ability.can('manage', 'all')
      )
    }
    if (item.menu === 'gestion') {
      return canAccessGestionHub(employee)
    }
    if (ability.can('manage', 'all')) return true
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
