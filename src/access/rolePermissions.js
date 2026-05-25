import {
  ROLE_ADMIN,
  ROLE_ADMIN_PRODUCCION,
  ROLE_DESPACHO,
  ROLE_MASTER,
  ROLE_PRODUCCION,
} from '../auth/roles'
import { FEATURE } from './permissionCatalog'

export const ACTION = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  SCAN: 'scan',
  CLOSE: 'close',
  PRINT: 'print',
  AUDIT: 'audit',
  MANAGE: 'manage',
}

const allActions = [
  ACTION.VIEW,
  ACTION.CREATE,
  ACTION.UPDATE,
  ACTION.DELETE,
  ACTION.SCAN,
  ACTION.CLOSE,
  ACTION.PRINT,
  ACTION.AUDIT,
]

// Matriz editable: para mostrar/ocultar botones, agrega o quita acciones por rol.
// Ejemplo: si PRODUCCION no debe cerrar pales, elimina `ACTION.CLOSE` de FEATURE.PALES_OPERACIONES.
export const ROLE_PERMISSIONS = {
  [ROLE_MASTER]: [
    { action: ACTION.MANAGE, subject: 'all' },
    { action: ACTION.VIEW, subject: FEATURE.DASHBOARD_RESUMEN },
  ],
  [ROLE_ADMIN]: [
    { action: ACTION.MANAGE, subject: 'all' },
    { action: ACTION.VIEW, subject: FEATURE.DASHBOARD_RESUMEN },
  ],

  [ROLE_ADMIN_PRODUCCION]: [
    { action: ACTION.VIEW, subject: FEATURE.API_CATALOG },
    { action: [ACTION.VIEW, ACTION.SCAN, ACTION.UPDATE], subject: FEATURE.BIESSE_ORDERS },
    { action: [ACTION.VIEW, ACTION.AUDIT], subject: FEATURE.BIESSE_AUDIT },
    { action: allActions, subject: FEATURE.BIESSE_SCAN },
    { action: [ACTION.VIEW, ACTION.PRINT, ACTION.CREATE], subject: FEATURE.BIESSE_STICKERS },
    { action: [ACTION.VIEW, ACTION.SCAN, ACTION.UPDATE, ACTION.PRINT], subject: FEATURE.BIESSE_TOOLS },
    { action: allActions, subject: FEATURE.LOCATION_CATALOG },
    { action: ACTION.VIEW, subject: FEATURE.PALES_LIST },
    { action: [ACTION.VIEW, ACTION.CREATE, ACTION.SCAN, ACTION.CLOSE, ACTION.UPDATE, ACTION.DELETE], subject: FEATURE.PALES_OPERACIONES },
    { action: [ACTION.VIEW, ACTION.AUDIT], subject: FEATURE.PALES_AUDIT },
    { action: ACTION.PRINT, subject: FEATURE.PALES_PRINT },
    { action: allActions, subject: FEATURE.TRANSPORT_LOADS },
    { action: allActions, subject: FEATURE.TRANSPORT_VEHICLES },
    { action: [ACTION.VIEW, ACTION.AUDIT], subject: FEATURE.TRANSPORT_AUDIT },
    { action: [ACTION.VIEW, ACTION.CREATE, ACTION.UPDATE], subject: FEATURE.INVENTORY },
  ],

  [ROLE_DESPACHO]: [
    { action: [ACTION.VIEW, ACTION.UPDATE], subject: FEATURE.BIESSE_ORDERS },
    { action: [ACTION.VIEW, ACTION.AUDIT], subject: FEATURE.BIESSE_AUDIT },
    { action: [ACTION.VIEW, ACTION.CREATE, ACTION.UPDATE, ACTION.DELETE, ACTION.SCAN, ACTION.CLOSE, ACTION.AUDIT], subject: FEATURE.PALES_OPERACIONES },
    { action: [ACTION.VIEW, ACTION.AUDIT], subject: FEATURE.PALES_AUDIT },
    { action: ACTION.VIEW, subject: FEATURE.PALES_LIST },
    { action: ACTION.PRINT, subject: FEATURE.PALES_PRINT },
    { action: [ACTION.VIEW, ACTION.CREATE, ACTION.UPDATE, ACTION.DELETE], subject: FEATURE.TRANSPORT_LOADS },
    { action: ACTION.VIEW, subject: FEATURE.TRANSPORT_VEHICLES },
    { action: ACTION.VIEW, subject: FEATURE.INVENTORY },
    { action: ACTION.VIEW, subject: FEATURE.PROJECT_LIST },

  ],

  [ROLE_PRODUCCION]: [
    { action: [ACTION.VIEW, ACTION.UPDATE], subject: FEATURE.BIESSE_ORDERS },
    { action: [ACTION.VIEW, ACTION.AUDIT], subject: FEATURE.BIESSE_AUDIT },
    { action: [ACTION.VIEW, ACTION.SCAN, ACTION.UPDATE], subject: FEATURE.BIESSE_SCAN },
    { action: [ACTION.VIEW, ACTION.SCAN, ACTION.UPDATE], subject: FEATURE.BIESSE_TOOLS },
    { action: [ACTION.VIEW, ACTION.CREATE], subject: FEATURE.INVENTORY },
    { action: ACTION.VIEW, subject: FEATURE.PALES_LIST },
    { action: [ACTION.VIEW, ACTION.UPDATE, ACTION.DELETE], subject: FEATURE.PALES_OPERACIONES },
    { action: [ACTION.VIEW, ACTION.AUDIT], subject: FEATURE.PALES_AUDIT },
  ],
}

export const PUBLIC_AUTHENTICATED_PERMISSIONS = [
  { action: ACTION.VIEW, subject: FEATURE.EMPLOYEE_PROFILE },
  { action: ACTION.UPDATE, subject: FEATURE.EMPLOYEE_PROFILE },
]
