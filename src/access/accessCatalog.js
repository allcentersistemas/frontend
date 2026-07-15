import { FEATURE } from './permissionCatalog'
import { ACTION } from './rolePermissions'
import {
  ROLE_ADMIN,
  ROLE_ADMINISTRADOR,
  ROLE_ADMIN_PRODUCCION,
  ROLE_CALIDAD,
  ROLE_DESPACHO,
  ROLE_GERENCIA,
  ROLE_LOGISTICA,
  ROLE_MASTER,
  ROLE_PROCESOS,
  ROLE_PRODUCCION,
  ROLE_SEGURIDAD,
  ROLE_SISTEMAS,
  ROLE_VENTAS,
  ROLE_ADMIN_VENTAS,
} from '../auth/roles'

/**
 * Módulos visibles al crear/editar empleado.
 * Cada módulo agrupa features CASL; suggestedRoles indica qué rol(es) suelen concederlo.
 */
export const PORTAL_ACCESS_MODULES = [
  {
    id: 'resumen',
    label: 'Resumen · Operación',
    description: 'Panel KPI de palés, guías y escaneo (administración)',
    features: [FEATURE.DASHBOARD_RESUMEN],
    suggestedRoles: [ROLE_MASTER, ROLE_ADMIN, ROLE_ADMINISTRADOR, ROLE_SISTEMAS],
  },
  {
    id: 'resumen_ventas',
    label: 'Resumen · Ventas',
    description: 'Tiempos de atención, cotización y venta en proyectos de optimización',
    features: [FEATURE.DASHBOARD_VENTAS],
    suggestedRoles: [
      ROLE_MASTER,
      ROLE_ADMIN,
      ROLE_ADMINISTRADOR,
      ROLE_SISTEMAS,
      ROLE_GERENCIA,
      ROLE_VENTAS,
      ROLE_ADMIN_VENTAS,
    ],
  },
  {
    id: 'ordenes',
    label: 'Inventario · Órdenes Biesse',
    description: 'Listado, detalle y edición de órdenes de producción',
    features: [FEATURE.BIESSE_ORDERS],
    suggestedRoles: [ROLE_PRODUCCION, ROLE_DESPACHO, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'pales',
    label: 'Inventario · Palés',
    description: 'Listado, escaneo, edición y eliminación de palés',
    features: [FEATURE.PALES_LIST, FEATURE.PALES_OPERACIONES],
    suggestedRoles: [ROLE_PRODUCCION, ROLE_DESPACHO, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'guias',
    label: 'Inventario · Guías de despacho',
    description: 'Crear y gestionar guías',
    features: [FEATURE.INVENTORY_GUIAS],
    suggestedRoles: [ROLE_DESPACHO, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'stock',
    label: 'Inventario · Stock almacén',
    description: 'Consulta kardex (palés/piezas)',
    features: [FEATURE.INVENTORY_STOCK],
    suggestedRoles: [ROLE_DESPACHO, ROLE_PRODUCCION, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'tableros',
    label: 'Inventario · Tableros (planilla cliente)',
    description: 'Alta manual del catálogo de tableros',
    features: [FEATURE.INVENTORY_TABLEROS],
    suggestedRoles: [ROLE_PRODUCCION, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'cantos',
    label: 'Inventario · Cantos (planilla cliente)',
    description: 'Alta manual del catálogo de cantos',
    features: [FEATURE.INVENTORY_CANTOS],
    suggestedRoles: [ROLE_PRODUCCION, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'gestion_clientes_portal',
    label: 'Gestión · Cliente portal',
    description: 'Alta y edición de usuarios del portal cliente',
    features: [FEATURE.GESTION_CLIENTES_PORTAL],
    suggestedRoles: [ROLE_ADMIN_VENTAS],
  },
  {
    id: 'gestion_proyectos',
    label: 'Gestión · Proyectos optimización',
    description: 'Asignación de clientes, vendedores y máquinas en proyectos',
    features: [FEATURE.GESTION_PROYECTOS],
    suggestedRoles: [ROLE_ADMIN_VENTAS],
  },
  {
    id: 'rm',
    label: 'Inventario · Recepción mercadería (RM)',
    description: 'Entradas, salidas y actas',
    features: [FEATURE.INVENTORY_RM],
    suggestedRoles: [ROLE_SEGURIDAD, ROLE_ADMIN_PRODUCCION, ROLE_SISTEMAS, ROLE_ADMIN],
  },
  {
    id: 'gestion_flota',
    label: 'Gestión · Vehículos y flota',
    description: 'Alta y edición de vehículos',
    features: [FEATURE.TRANSPORT_VEHICLES, FEATURE.TRANSPORT_LOADS],
    suggestedRoles: [ROLE_DESPACHO, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'gestion_admin',
    label: 'Gestión · Empleados, roles y auditoría',
    description: 'Alta de usuarios, roles y auditoría centralizada',
    features: [FEATURE.EMPLOYEE_ADMIN, FEATURE.BIESSE_AUDIT, FEATURE.PALES_AUDIT, FEATURE.TRANSPORT_AUDIT, FEATURE.BIESSE_STICKER_AUDIT],
    suggestedRoles: [ROLE_MASTER, ROLE_ADMIN, ROLE_ADMINISTRADOR, ROLE_SISTEMAS],
  },
  {
    id: 'proyecto-optimizacion',
    label: 'Proyecto optimización',
    description: 'Listado y gestión de proyectos de optimización / planilla de corte',
    features: [FEATURE.PROJECT_LIST],
    suggestedRoles: [ROLE_VENTAS, ROLE_ADMIN_VENTAS, ROLE_DESPACHO, ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'api',
    label: 'Catálogo API',
    description: 'Documentación de endpoints',
    features: [FEATURE.API_CATALOG],
    suggestedRoles: [ROLE_ADMIN_PRODUCCION],
  },
]

/** Plantillas rápidas al crear cuenta */
export const ACCESS_TEMPLATES = [
  {
    id: 'produccion',
    label: 'Operario producción',
    description: 'Órdenes y palés (sin guías ni admin)',
    moduleIds: ['ordenes', 'pales', 'stock'],
    roleNames: [ROLE_PRODUCCION],
  },
  {
    id: 'despacho',
    label: 'Operario despacho',
    description: 'Órdenes, palés, guías, stock y flota',
    moduleIds: ['ordenes', 'pales', 'guias', 'stock', 'gestion_flota', 'proyecto-optimizacion'],
    roleNames: [ROLE_DESPACHO],
  },
  {
    id: 'sistemas',
    label: 'Sistemas',
    description: 'Control total, resumen y gestión',
    moduleIds: PORTAL_ACCESS_MODULES.map((m) => m.id),
    roleNames: [ROLE_SISTEMAS],
  },
  {
    id: 'administrador',
    label: 'Administrador',
    description: 'Resumen, gestión y operación con editar/cancelar/imprimir',
    moduleIds: PORTAL_ACCESS_MODULES.map((m) => m.id),
    roleNames: [ROLE_ADMIN, ROLE_ADMINISTRADOR],
  },
  {
    id: 'gerencia',
    label: 'Gerencia',
    description: 'Operación con editar/cancelar/imprimir (sin gestión de usuarios)',
    moduleIds: ['ordenes', 'pales', 'guias', 'stock', 'rm', 'proyecto-optimizacion'],
    roleNames: [ROLE_GERENCIA],
  },
  {
    id: 'seguridad',
    label: 'Seguridad',
    description: 'Recepción mercadería (crear/leer)',
    moduleIds: ['rm'],
    roleNames: [ROLE_SEGURIDAD],
  },
  {
    id: 'logistica',
    label: 'Logística',
    description: 'Guías, stock y palés (crear/leer)',
    moduleIds: ['pales', 'guias', 'stock'],
    roleNames: [ROLE_LOGISTICA],
  },
  {
    id: 'procesos',
    label: 'Procesos',
    description: 'Consulta operativa (crear/leer)',
    moduleIds: ['ordenes', 'pales', 'stock'],
    roleNames: [ROLE_PROCESOS],
  },
  {
    id: 'calidad',
    label: 'Calidad',
    description: 'Consulta operativa (crear/leer)',
    moduleIds: ['ordenes', 'stock', 'rm'],
    roleNames: [ROLE_CALIDAD],
  },
  {
    id: 'ventas',
    label: 'Ventas',
    description: 'Proyecto optimización (crear/leer)',
    moduleIds: ['proyecto-optimizacion', 'resumen_ventas'],
    roleNames: [ROLE_VENTAS],
  },
  {
    id: 'admin_ventas',
    label: 'Admin ventas',
    description: 'Proyectos, clientes portal y gestión comercial',
    moduleIds: ['proyecto-optimizacion', 'gestion_clientes_portal', 'gestion_proyectos', 'resumen_ventas'],
    roleNames: [ROLE_ADMIN_VENTAS],
  },
  {
    id: 'admin_prod',
    label: 'Admin producción',
    description: 'Operación completa sin gestión de usuarios',
    moduleIds: ['ordenes', 'pales', 'guias', 'stock', 'rm', 'gestion_flota', 'api'],
    roleNames: [ROLE_ADMIN_PRODUCCION],
  },
  {
    id: 'admin_sistema',
    label: 'Administrador sistema',
    description: 'Acceso total + empleados y resumen',
    moduleIds: PORTAL_ACCESS_MODULES.map((m) => m.id),
    roleNames: [ROLE_ADMIN],
  },
  {
    id: 'master',
    label: 'Master',
    description: 'Control total del portal',
    moduleIds: PORTAL_ACCESS_MODULES.map((m) => m.id),
    roleNames: [ROLE_MASTER],
  },
]

const ADMIN_ROLE_NAMES = new Set([ROLE_MASTER, ROLE_ADMIN, ROLE_ADMINISTRADOR, ROLE_SISTEMAS])

export function isAdminRoleName(name) {
  return ADMIN_ROLE_NAMES.has(String(name ?? '').trim().toUpperCase().replace(/-/g, '_'))
}

/** Roles sugeridos para un conjunto de módulos marcados */
export function roleNamesForModules(moduleIds) {
  const set = new Set()
  for (const mod of PORTAL_ACCESS_MODULES) {
    if (!moduleIds.includes(mod.id)) continue
    for (const r of mod.suggestedRoles) set.add(r)
  }
  return [...set]
}

/** Módulos que cubren los roles seleccionados (aproximado) */
export function moduleIdsForRoleNames(roleNames) {
  const names = new Set(roleNames.map((n) => String(n).trim().toUpperCase().replace(/-/g, '_')))
  if (names.has(ROLE_MASTER) || names.has(ROLE_ADMIN) || names.has(ROLE_ADMINISTRADOR) || names.has(ROLE_SISTEMAS)) {
    return PORTAL_ACCESS_MODULES.map((m) => m.id)
  }
  const ids = []
  for (const mod of PORTAL_ACCESS_MODULES) {
    if (mod.suggestedRoles.some((r) => names.has(r))) ids.push(mod.id)
  }
  return ids
}

export function roleIdsFromNames(roleOptions, roleNames) {
  const wanted = new Set(roleNames.map((n) => String(n).trim().toUpperCase().replace(/-/g, '_')))
  return roleOptions.filter((r) => wanted.has(String(r.name).trim().toUpperCase().replace(/-/g, '_'))).map((r) => r.id)
}

/** Convierte módulos marcados en reglas CASL para persistir en el rol. */
export function permissionRulesFromModules(moduleIds) {
  const rules = []
  const seen = new Set()
  function push(action, subject) {
    const key = `${action}:${subject}`
    if (seen.has(key)) return
    seen.add(key)
    rules.push({ action, subject })
  }
  for (const mod of PORTAL_ACCESS_MODULES) {
    if (!moduleIds.includes(mod.id)) continue
    for (const feature of mod.features ?? []) {
      if (mod.id === 'gestion_admin') {
        push(ACTION.VIEW, feature)
        push(ACTION.AUDIT, feature)
        if (feature === FEATURE.EMPLOYEE_ADMIN) {
          for (const a of [ACTION.CREATE, ACTION.UPDATE, ACTION.DELETE]) push(a, feature)
        }
        if (feature === FEATURE.LOCATION_CATALOG) {
          for (const a of [ACTION.CREATE, ACTION.UPDATE, ACTION.DELETE]) push(a, feature)
        }
      } else if (mod.id === 'resumen' || mod.id === 'resumen_ventas' || mod.id === 'api') {
        push(ACTION.VIEW, feature)
      } else if (mod.id === 'gestion_clientes_portal' || mod.id === 'gestion_proyectos') {
        for (const a of [ACTION.VIEW, ACTION.CREATE, ACTION.UPDATE, ACTION.CANCEL]) push(a, feature)
      } else {
        for (const a of [ACTION.VIEW, ACTION.CREATE, ACTION.CLOSE]) push(a, feature)
      }
    }
  }
  return rules
}

/** Aproxima qué módulos cubren las reglas guardadas (para editar rol). */
export function moduleIdsFromPermissionRules(rules) {
  if (!rules?.length) return []
  const set = new Set(rules.map((r) => `${r.action}:${r.subject}`))
  if (set.has('manage:all')) return PORTAL_ACCESS_MODULES.map((m) => m.id)
  const ids = []
  for (const mod of PORTAL_ACCESS_MODULES) {
    const expected = permissionRulesFromModules([mod.id])
    if (expected.length > 0 && expected.every((r) => set.has(`${r.action}:${r.subject}`))) {
      ids.push(mod.id)
    }
  }
  return ids
}

/** Acciones resumidas para vista previa */
export const ACTION_LABELS = {
  [ACTION.VIEW]: 'Ver',
  [ACTION.CREATE]: 'Crear',
  [ACTION.UPDATE]: 'Editar',
  [ACTION.CANCEL]: 'Cancelar',
  [ACTION.DELETE]: 'Eliminar',
  [ACTION.SCAN]: 'Escanear',
  [ACTION.CLOSE]: 'Cerrar',
  [ACTION.PRINT]: 'Imprimir',
  [ACTION.AUDIT]: 'Auditoría',
  [ACTION.MANAGE]: 'Todo',
}
