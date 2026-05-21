import { FEATURE } from './permissionCatalog'

// Un solo menú para toda la app. La visibilidad sale de CASL/rolePermissions.js.
export const SIDEBAR_MENU = [
  { id: 'home', segment: '', label: 'Resumen', end: true },
  { id: 'orders', segment: 'ordenes', label: 'Órdenes', feature: FEATURE.BIESSE_ORDERS },
  { id: 'pales', segment: 'pales', label: 'Pales', feature: FEATURE.PALES_LIST },
  { id: 'transport', segment: 'transporte', label: 'Transporte · Guías', feature: FEATURE.TRANSPORT_LOADS },
  { id: 'management', segment: 'gestion', label: 'Gestión', feature: FEATURE.EMPLOYEE_ADMIN },
  { id: 'api', segment: 'api', label: 'Catálogo API', feature: FEATURE.API_CATALOG },
  { id: 'inventario', segment: 'inventario', label: 'Inventario', feature: FEATURE.INVENTORY },
  { id: 'profile', segment: 'perfil', label: 'Mi perfil', feature: FEATURE.EMPLOYEE_PROFILE },
  { id: 'proyectos', segment: 'proyectos', label: 'Proyectos', feature: FEATURE.PROJECT_LIST },


]

export function sidebarSectionsForDashboard(role, ability) {
  const base = `/dashboard/${role}`
  const items = SIDEBAR_MENU.filter(
    (item) => !item.feature || ability.can('view', item.feature) || ability.can('manage', 'all'),
  ).map((item) => ({
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
