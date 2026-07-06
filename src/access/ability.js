import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import { normalizeRoleName } from '../auth/roles'
import { PUBLIC_AUTHENTICATED_PERMISSIONS, ROLE_PERMISSIONS } from './rolePermissions'

function applyRule(can, rule) {
  if (!rule?.action || !rule?.subject) return
  const actions = Array.isArray(rule.action) ? rule.action : [rule.action]
  for (const action of actions) {
    can(action, rule.subject)
  }
}

export function buildAbilityFor(employee) {
  const { can, build } = new AbilityBuilder(createMongoAbility)

  if (!employee) {
    return build()
  }

  for (const rule of PUBLIC_AUTHENTICATED_PERMISSIONS) {
    applyRule(can, rule)
  }

  for (const role of employee.roles ?? []) {
    const fromApi = role.permissions
    const name = normalizeRoleName(role.name)
    const staticRules = ROLE_PERMISSIONS[name] ?? []

    if (Array.isArray(fromApi) && fromApi.length > 0) {
      for (const rule of fromApi) {
        applyRule(can, rule)
      }
      // Si el rol en BD no incluye permisos de operación, completar con la plantilla conocida
      // (evita quedar sin menú tras migración parcial de role_permissions).
      if (staticRules.length > 0 && !roleRulesGrantPortalAccess(fromApi)) {
        for (const rule of staticRules) {
          applyRule(can, rule)
        }
      }
      continue
    }

    for (const rule of staticRules) {
      applyRule(can, rule)
    }
  }

  return build()
}

function roleRulesGrantPortalAccess(rules) {
  const opsSubjects = new Set([
    'biesse.orders',
    'pales.list',
    'inventory.rm',
    'project.list',
    'gestion.clientes',
    'gestion.proyectos',
    'employee.admin',
    'dashboard.resumen',
    'dashboard.ventas',
  ])
  return rules.some((r) => r?.subject === 'all' || opsSubjects.has(r?.subject))
}
