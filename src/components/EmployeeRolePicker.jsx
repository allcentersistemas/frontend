/**
 * Asignación simple de roles a un empleado (los permisos vienen del rol).
 *
 * @param {object} props
 * @param {Array<{id: number, name: string, description?: string}>} props.roleOptions
 * @param {Set<number>} props.roleIds
 * @param {(ids: Set<number>) => void} props.onRoleIdsChange
 * @param {boolean} [props.disabled]
 */
export function EmployeeRolePicker({ roleOptions, roleIds, onRoleIdsChange, disabled = false }) {
  return (
    <div className="field">
      <span>Roles *</span>
      <p className="muted small form-hint">
        Los accesos al portal se heredan de los permisos definidos en cada rol (pestaña Roles).
      </p>
      {roleOptions.length === 0 ? (
        <p className="form-inline-error">
          No hay roles en el sistema. Crea roles en la pestaña «Roles» y vuelve aquí.
        </p>
      ) : (
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
                }}
              />
              {r.name}
              {r.description ? ` — ${r.description}` : ''}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
