import { useEffect, useMemo, useState } from 'react'
import {
  ACCESS_TEMPLATES,
  OPTIONAL_ROLE_CAPABILITIES,
  PORTAL_ACCESS_MODULES,
  capabilityIdsFromPermissionRules,
  mergeModuleAndCapabilityPermissions,
  moduleIdsFromPermissionRules,
} from '../access/accessCatalog'

/**
 * Selector de módulos del portal → permisos CASL guardados en el rol.
 *
 * @param {object} props
 * @param {Array<{action: string, subject: string}>} props.permissions
 * @param {(rules: Array<{action: string, subject: string}>) => void} props.onPermissionsChange
 * @param {boolean} [props.disabled]
 */
export function RoleAccessPicker({ permissions, onPermissionsChange, disabled = false }) {
  const [moduleIds, setModuleIds] = useState(() => moduleIdsFromPermissionRules(permissions))
  const [capabilityIds, setCapabilityIds] = useState(() => capabilityIdsFromPermissionRules(permissions))

  useEffect(() => {
    setModuleIds(moduleIdsFromPermissionRules(permissions))
    setCapabilityIds(capabilityIdsFromPermissionRules(permissions))
  }, [permissions])

  const previewCount = useMemo(() => (permissions ?? []).length, [permissions])

  const visibleCapabilities = useMemo(
    () =>
      OPTIONAL_ROLE_CAPABILITIES.filter(
        (cap) => !cap.requiresModule || moduleIds.includes(cap.requiresModule),
      ),
    [moduleIds],
  )

  function emit(nextModuleIds, nextCapabilityIds) {
    onPermissionsChange(mergeModuleAndCapabilityPermissions(nextModuleIds, nextCapabilityIds))
  }

  function applyModules(nextIds) {
    setModuleIds(nextIds)
    const prunedCaps = capabilityIds.filter((id) => {
      const cap = OPTIONAL_ROLE_CAPABILITIES.find((c) => c.id === id)
      return cap && (!cap.requiresModule || nextIds.includes(cap.requiresModule))
    })
    setCapabilityIds(prunedCaps)
    emit(nextIds, prunedCaps)
  }

  function toggleModule(modId) {
    const next = moduleIds.includes(modId)
      ? moduleIds.filter((id) => id !== modId)
      : [...moduleIds, modId]
    applyModules(next)
  }

  function toggleCapability(capId) {
    const next = capabilityIds.includes(capId)
      ? capabilityIds.filter((id) => id !== capId)
      : [...capabilityIds, capId]
    setCapabilityIds(next)
    emit(moduleIds, next)
  }

  function applyTemplate(tpl) {
    applyModules(tpl.moduleIds)
  }

  return (
    <div className="employee-access-picker">
      <p className="muted small form-hint" style={{ marginBottom: '0.75rem' }}>
        Define a qué <strong>módulos</strong> del portal tendrá acceso cualquier empleado con este rol.
        Al crear o editar un empleado solo se asignan roles.
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

      {visibleCapabilities.length ? (
        <div style={{ marginTop: '1rem' }}>
          <p className="small" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
            Acciones adicionales
          </p>
          <div className="role-checks employee-access-picker__modules">
            {visibleCapabilities.map((cap) => (
              <label key={cap.id} className="employee-access-picker__module">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={capabilityIds.includes(cap.id)}
                  onChange={() => toggleCapability(cap.id)}
                />
                <span>
                  <strong>{cap.label}</strong>
                  <span className="muted small block">{cap.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <p className="muted small" style={{ marginTop: '0.75rem' }}>
        {previewCount > 0
          ? `${previewCount} permiso(s) CASL en este rol.`
          : 'Sin módulos seleccionados: el rol no concederá acceso al menú (salvo perfil propio).'}
      </p>
    </div>
  )
}
