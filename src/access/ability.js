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
    if (Array.isArray(fromApi) && fromApi.length > 0) {
      for (const rule of fromApi) {
        applyRule(can, rule)
      }
      continue
    }
    const name = normalizeRoleName(role.name)
    for (const rule of ROLE_PERMISSIONS[name] ?? []) {
      applyRule(can, rule)
    }
  }

  return build()
}
