/**
 * Matriz rol → permisos (CASL). Resumen visual: ./PERMISSIONS_MATRIX.md
 * Menú lateral: navigationConfig.js · Botones: CanButton / useAppAbility()
 */
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
} from '../auth/roles'
import { FEATURE } from './permissionCatalog'

export const ACTION = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  CANCEL: 'cancel',
  SCAN: 'scan',
  CLOSE: 'close',
  PRINT: 'print',
  AUDIT: 'audit',
  MANAGE: 'manage',
}

const readCreate = [ACTION.VIEW, ACTION.CREATE]
const adminOps = [ACTION.VIEW, ACTION.CREATE, ACTION.UPDATE, ACTION.CANCEL, ACTION.PRINT]
const auditView = [ACTION.VIEW, ACTION.AUDIT]
const allActions = [
  ACTION.VIEW,
  ACTION.CREATE,
  ACTION.UPDATE,
  ACTION.DELETE,
  ACTION.CANCEL,
  ACTION.SCAN,
  ACTION.CLOSE,
  ACTION.PRINT,
  ACTION.AUDIT,
]

function rules(actions, ...subjects) {
  return subjects.flatMap((subject) => [{ action: actions, subject }])
}

const OPS_FEATURES = [
  FEATURE.BIESSE_ORDERS,
  FEATURE.BIESSE_SCAN,
  FEATURE.BIESSE_STICKERS,
  FEATURE.BIESSE_TOOLS,
  FEATURE.PALES_LIST,
  FEATURE.PALES_OPERACIONES,
  FEATURE.PALES_PRINT,
  FEATURE.INVENTORY_GUIAS,
  FEATURE.INVENTORY_STOCK,
  FEATURE.INVENTORY_RM,
  FEATURE.TRANSPORT_LOADS,
  FEATURE.TRANSPORT_VEHICLES,
  FEATURE.PROJECT_LIST,
]

const AUDIT_FEATURES = [
  FEATURE.BIESSE_AUDIT,
  FEATURE.PALES_AUDIT,
  FEATURE.TRANSPORT_AUDIT,
  FEATURE.BIESSE_STICKER_AUDIT,
]

const READ_CREATE_OPS = rules(readCreate, ...OPS_FEATURES)
const ADMIN_OPS = rules(adminOps, ...OPS_FEATURES)
const AUDIT_RULES = rules(auditView, ...AUDIT_FEATURES)

const GESTION_ADMIN = [
  { action: allActions, subject: FEATURE.EMPLOYEE_ADMIN },
  { action: allActions, subject: FEATURE.LOCATION_CATALOG },
  { action: ACTION.VIEW, subject: FEATURE.API_CATALOG },
  ...rules(allActions, FEATURE.TRANSPORT_VEHICLES),
]

/** Roles con solo crear y leer en operaciones. */
const READ_CREATE_ROLE_RULES = [...READ_CREATE_OPS]

/** Gerencia / admin operativo: editar, cancelar, imprimir (sin eliminar). */
const MANAGER_OPS = [...ADMIN_OPS]

export const ROLE_PERMISSIONS = {
  [ROLE_MASTER]: [{ action: ACTION.MANAGE, subject: 'all' }, { action: ACTION.VIEW, subject: FEATURE.DASHBOARD_RESUMEN }],

  [ROLE_SISTEMAS]: [
    { action: ACTION.MANAGE, subject: 'all' },
    { action: ACTION.VIEW, subject: FEATURE.DASHBOARD_RESUMEN },
    ...GESTION_ADMIN,
    ...AUDIT_RULES,
    ...rules(allActions, ...OPS_FEATURES),
  ],

  [ROLE_ADMIN]: [
    { action: ACTION.VIEW, subject: FEATURE.DASHBOARD_RESUMEN },
    ...GESTION_ADMIN,
    ...AUDIT_RULES,
    ...MANAGER_OPS,
  ],

  [ROLE_ADMINISTRADOR]: [
    { action: ACTION.VIEW, subject: FEATURE.DASHBOARD_RESUMEN },
    ...GESTION_ADMIN,
    ...AUDIT_RULES,
    ...MANAGER_OPS,
  ],

  [ROLE_GERENCIA]: [...MANAGER_OPS, ...AUDIT_RULES],

  [ROLE_SEGURIDAD]: READ_CREATE_ROLE_RULES,
  [ROLE_PROCESOS]: READ_CREATE_ROLE_RULES,
  [ROLE_LOGISTICA]: READ_CREATE_ROLE_RULES,
  [ROLE_CALIDAD]: READ_CREATE_ROLE_RULES,
  [ROLE_DESPACHO]: READ_CREATE_ROLE_RULES,
  [ROLE_PRODUCCION]: READ_CREATE_ROLE_RULES,
  [ROLE_VENTAS]: READ_CREATE_ROLE_RULES,

  /** Compatibilidad con roles previos en BD */
  [ROLE_ADMIN_PRODUCCION]: [...MANAGER_OPS, ...AUDIT_RULES],
}

export const PUBLIC_AUTHENTICATED_PERMISSIONS = [
  { action: ACTION.VIEW, subject: FEATURE.EMPLOYEE_PROFILE },
  { action: ACTION.UPDATE, subject: FEATURE.EMPLOYEE_PROFILE },
]
