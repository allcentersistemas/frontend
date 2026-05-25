import { useMemo, useState } from 'react'
import { buildAbilityFor } from '../access/ability'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION, ROLE_PERMISSIONS } from '../access/rolePermissions'
import {
  ACCESS_TEMPLATES,
  ACTION_LABELS,
  PORTAL_ACCESS_MODULES,
  isAdminRoleName,
  moduleIdsForRoleNames,
  roleIdsFromNames,
  roleNamesForModules,
} from '../access/accessCatalog'
import { SIDEBAR_MENU } from '../access/navigationConfig'
import { normalizeRoleName } from '../auth/roles'

function featureLabel(feature) {
  const mod = PORTAL_ACCESS_MODULES.find((m) => m.features?.includes(feature))
  if (mod) return mod.label
  return feature
}

function rulesForRoles(roleNames) {
  const rules = []
  const seen = new Set()
  for (const name of roleNames.map(normalizeRoleName)) {
    for (const rule of ROLE_PERMISSIONS[name] ?? []) {
      const actions = Array.isArray(rule.action) ? rule.action : [rule.action]
      for (const action of actions) {
        const key = `${action}:${rule.subject}`
        if (seen.has(key)) continue
        seen.add(key)
        rules.push({ action, subject: rule.subject })
      }
    }
  }
  return rules
}

/**
 * Selector de accesos al portal (módulos + plantillas) sincronizado con roleIds.
 *
 * @param {object} props
 * @param {Array<{id: number, name: string}>} props.roleOptions
 * @param {Set<number>} props.roleIds
 * @param {(ids: Set<number>) => void} props.onRoleIdsChange
 * @param {boolean} [props.disabled]
 */
export function EmployeeAccessPicker({ roleOptions, roleIds, onRoleIdsChange, disabled = false }) {
  const selectedRoleNames = useMemo(
    () =>
      roleOptions
        .filter((r) => roleIds.has(r.id))
        .map((r) => normalizeRoleName(r.name)),
    [roleOptions, roleIds],
  )

  const [moduleIds, setModuleIds] = useState(() => moduleIdsForRoleNames(selectedRoleNames))

  const ability = useMemo(
    () => buildAbilityFor({ roles: roleOptions.filter((r) => roleIds.has(r.id)).map((r) => ({ name: r.name })) }),
    [roleOptions, roleIds],
  )

  const menuPreview = useMemo(() => {
    return SIDEBAR_MENU.filter((item) => {
      if (ability.can(ACTION.MANAGE, 'all')) return true
      if (item.features?.length) {
        return item.features.some((f) => ability.can(ACTION.VIEW, f))
      }
      return !item.feature || ability.can(ACTION.VIEW, item.feature)
    }).map((item) => item.label)
  }, [ability])

  const actionPreview = useMemo(() => {
    const rules = rulesForRoles(selectedRoleNames)
    const byFeature = new Map()
    for (const { action, subject } of rules) {
      if (subject === 'all') return [{ feature: 'Todo el sistema', actions: ['manage'] }]
      const list = byFeature.get(subject) ?? []
      if (!list.includes(action)) list.push(action)
      byFeature.set(subject, list)
    }
    return [...byFeature.entries()]
      .slice(0, 12)
      .map(([subject, actions]) => ({
        feature: featureLabel(subject),
        actions: actions.map((a) => ACTION_LABELS[a] ?? a).join(', '),
      }))
  }, [selectedRoleNames])

  const hasAdmin = selectedRoleNames.some(isAdminRoleName)

  function applyRoleNames(names) {
    const ids = roleIdsFromNames(roleOptions, names)
    onRoleIdsChange(new Set(ids))
    setModuleIds(moduleIdsForRoleNames(names))
  }

  function toggleModule(modId) {
    const next = moduleIds.includes(modId) ? moduleIds.filter((id) => id !== modId) : [...moduleIds, modId]
    setModuleIds(next)
    applyRoleNames(roleNamesForModules(next))
  }

  function applyTemplate(tpl) {
    setModuleIds(tpl.moduleIds)
    applyRoleNames(tpl.roleNames)
  }

  return (
    <div className="employee-access-picker">
      <p className="muted small form-hint" style={{ marginBottom: '0.75rem' }}>
        Marca los <strong>módulos</strong> del portal que podrá usar. Los <strong>roles</strong> se asignan
        automáticamente (puedes afinarlos abajo). Los <strong>botones</strong> (crear, editar, eliminar…) dependen
        del rol — un admin ve y hace más que un operario.
      </p>

      <div className="employee-access-picker__templates">
        <span className="small" style={{ fontWeight: 600 }}>
          Plantillas rápidas:
        </span>
        <div className="employee-access-picker__template-btns">
          {ACCESS_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="btn btn--ghost small"
              disabled={disabled}
              onClick={() => applyTemplate(tpl)}
              title={tpl.description}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <div className="role-checks employee-access-picker__modules">
        {PORTAL_ACCESS_MODULES.map((mod) => (
          <label key={mod.id} className="employee-access-picker__module">
            <input
              type="checkbox"
              disabled={disabled}
              checked={moduleIds.includes(mod.id)}
              onChange={() => toggleModule(mod.id)}
            />
            <span>
              <strong>{mod.label}</strong>
              <span className="muted small block">{mod.description}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="field" style={{ marginTop: '1rem' }}>
        <span>Roles asignados (técnico)</span>
        <p className="muted small form-hint">
          Generados desde los módulos. MASTER / ADMIN = administrador con acceso total.
        </p>
        <div className="role-checks">
          {roleOptions.map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={roleIds.has(r.id)}
                onChange={() => {
                  const next = new Set(roleIds)
                  if (next.has(r.id)) next.delete(r.id)
                  else next.add(r.id)
                  onRoleIdsChange(next)
                  const names = roleOptions.filter((ro) => next.has(ro.id)).map((ro) => ro.name)
                  setModuleIds(moduleIdsForRoleNames(names))
                }}
              />
              {r.name}
              {isAdminRoleName(r.name) ? ' (admin)' : ''}
            </label>
          ))}
        </div>
      </div>

      {hasAdmin ? (
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Este usuario es <strong>administrador</strong>: verá todas las opciones del menú y podrá usar casi todos
          los botones (gestión de empleados, roles, etc.).
        </p>
      ) : null}

      <details className="employee-access-picker__preview" style={{ marginTop: '1rem' }}>
        <summary className="linkish small">Vista previa de menú y acciones</summary>
        <div className="pad" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <p className="small" style={{ marginBottom: '0.5rem' }}>
            <strong>Menú lateral:</strong>{' '}
            {menuPreview.length ? menuPreview.join(' · ') : '— (sin accesos)'}
          </p>
          <p className="small" style={{ marginBottom: '0.35rem' }}>
            <strong>Acciones en pantalla</strong> (ejemplos):
          </p>
          <ul className="muted small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {actionPreview.length === 0 ? (
              <li>Selecciona al menos un módulo o rol.</li>
            ) : (
              actionPreview.map((row) => (
                <li key={row.feature}>
                  {row.feature}: {row.actions}
                </li>
              ))
            )}
          </ul>
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            Si falta un botón concreto, se ajusta en código (`rolePermissions.js`) o en una fase posterior con
            permisos guardados en base de datos por usuario.
          </p>
        </div>
      </details>
    </div>
  )
}
