import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import { normalizeRoleName } from '../auth/roles'
import { PUBLIC_AUTHENTICATED_PERMISSIONS, ROLE_PERMISSIONS } from './rolePermissions'

function roleSetFor(employee) {
  return new Set((employee?.roles ?? []).map((r) => normalizeRoleName(r.name)))
}

export function buildAbilityFor(employee) {
  const { can, build } = new AbilityBuilder(createMongoAbility)
  const roles = roleSetFor(employee)

  if (!employee) {
    return build()
  }

  for (const rule of PUBLIC_AUTHENTICATED_PERMISSIONS) {
    can(rule.action, rule.subject)
  }

  for (const role of roles) {
    for (const rule of ROLE_PERMISSIONS[role] ?? []) {
      can(rule.action, rule.subject)
    }
  }

  return build()
}
