import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import * as biesseApi from '../api/biesseApi'
import { useAuth } from '../auth/AuthContext'
import {
  normalizeRoleName,
  ROLE_ADMIN,
  ROLE_ADMIN_PRODUCCION,
  ROLE_MASTER,
} from '../auth/roles'

const DOCUMENT_TYPES = ['DNI', 'NIE', 'PASSPORT', 'RESIDENCE_PERMIT', 'OTHER']

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Hombre' },
  { value: 'FEMALE', label: 'Mujer' },
]

function auditMatches(row, text) {
  const needle = text.trim().toLowerCase()
  if (!needle) return true
  return [row.source, row.action, row.entityType, row.entityId, row.actorEmail, row.details]
    .some((value) => String(value ?? '').toLowerCase().includes(needle))
}

function normalizeAuditRows(source, payload) {
  if (source === 'employee') {
    const rows = Array.isArray(payload?.content) ? payload.content : []
    return rows.map((a) => ({
      raw: a,
      source: 'employee',
      id: a.id,
      occurredAt: a.occurredAt,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      actorEmail: a.actorEmail,
      details: a.details,
    }))
  }
  if (source === 'transport') {
    const rows = Array.isArray(payload?.content) ? payload.content : []
    return rows.map((a) => ({
      raw: a,
      source: 'transport',
      id: a.id,
      occurredAt: a.occurredAt,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      actorEmail: a.actorEmail ?? (a.actorEmployeeId != null ? `#${a.actorEmployeeId}` : null),
      details: a.details,
    }))
  }
  return (Array.isArray(payload) ? payload : []).map((a) => ({
    raw: a,
    source: 'biesse',
    id: a.auditoriaid ?? a.id,
    occurredAt: a.fecha,
    action: a.accion,
    entityType: 'Orden/Biesse',
    entityId: a.orderid ?? a.partid,
    actorEmail: a.usuarioid != null ? `empleado #${a.usuarioid}` : null,
    details: a.detalles,
  }))
}

/**
 * @param {object} [props]
 * @param {boolean} [props.embedded] - Sin cabecera propia (dentro de Gestión unificada)
 * @param {string} [props.panel] - Pestaña activa controlada por el padre
 * @param {(id: string) => void} [props.onPanelChange]
 */
export function AdminToolsPage({ embedded = false, panel: panelProp, onPanelChange }) {
  const { employee } = useAuth()
  const canManage =
    employee?.roles.some((r) => {
      const n = normalizeRoleName(r.name)
      return n === ROLE_MASTER || n === ROLE_ADMIN || n === ROLE_ADMIN_PRODUCCION
    }) ?? false

  const [panelInternal, setPanelInternal] = useState('employees')
  const panel = panelProp ?? panelInternal
  const setPanel = onPanelChange ?? setPanelInternal
  const [refreshKey, setRefreshKey] = useState(0)

  const [emp, setEmp] = useState(null)
  const [roleOptions, setRoleOptions] = useState([])
  const [branchOptions, setBranchOptions] = useState(null)
  const [roles, setRoles] = useState(null)
  const [audit, setAudit] = useState(null)
  const [auditPage, setAuditPage] = useState(0)
  const [auditPageData, setAuditPageData] = useState(null)
  const [auditDetail, setAuditDetail] = useState(null)
  const [auditDetailLoading, setAuditDetailLoading] = useState(false)
  const [auditSource, setAuditSource] = useState('all')
  const [auditText, setAuditText] = useState('')

  const [locations, setLocations] = useState(null)
  const [ubNombre, setUbNombre] = useState('')
  const [ubDir, setUbDir] = useState('')
  const [ubDist, setUbDist] = useState('')
  const [ubDept, setUbDept] = useState('')
  const [ubCiudad, setUbCiudad] = useState('')
  const [ubBusy, setUbBusy] = useState(false)
  const [ubErr, setUbErr] = useState(null)
  const [ubOk, setUbOk] = useState(null)

  const [brNombre, setBrNombre] = useState('')
  const [brDir, setBrDir] = useState('')
  const [brCiudad, setBrCiudad] = useState('')
  const [brDept, setBrDept] = useState('')
  const [brBusy, setBrBusy] = useState(false)
  const [brErr, setBrErr] = useState(null)
  const [brOk, setBrOk] = useState(null)

  const [editingRoleId, setEditingRoleId] = useState(null)
  const [erDesc, setErDesc] = useState('')
  const [erBusy, setErBusy] = useState(false)
  const [erErr, setErErr] = useState(null)
  const [erOk, setErOk] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  const [crName, setCrName] = useState('')
  const [crDesc, setCrDesc] = useState('')
  const [crBusy, setCrBusy] = useState(false)
  const [crErr, setCrErr] = useState(null)
  const [crOk, setCrOk] = useState(null)

  const [ceUsername, setCeUsername] = useState('')
  const [ceEmail, setCeEmail] = useState('')
  const [cePassword, setCePassword] = useState('')
  const [ceFirstName, setCeFirstName] = useState('')
  const [ceSecondLastName, setCeSecondLastName] = useState('')
  const [ceLastName, setCeLastName] = useState('')
  const [ceDocType, setCeDocType] = useState('DNI')
  const [ceDocNum, setCeDocNum] = useState('')
  const [ceMobile, setCeMobile] = useState('')
  const [ceBirth, setCeBirth] = useState('')
  const [ceGender, setCeGender] = useState('')
  const [ceBranchId, setCeBranchId] = useState('')
  const [ceRoleIds, setCeRoleIds] = useState(() => new Set())
  const [ceBusy, setCeBusy] = useState(false)
  const [ceErr, setCeErr] = useState(null)
  const [ceOk, setCeOk] = useState(null)

  const [editingEmployeeId, setEditingEmployeeId] = useState(null)
  const [eeFirstName, setEeFirstName] = useState('')
  const [eeLastName, setEeLastName] = useState('')
  const [eeSecondLastName, setEeSecondLastName] = useState('')
  const [eeMobile, setEeMobile] = useState('')
  const [eeBranchId, setEeBranchId] = useState('')
  const [eeRoleIds, setEeRoleIds] = useState(() => new Set())
  const [eeActive, setEeActive] = useState(true)
  const [eeResetPassword, setEeResetPassword] = useState('')
  const [eeNotifyEmail, setEeNotifyEmail] = useState(false)
  const [eeResetBusy, setEeResetBusy] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const [eeBusy, setEeBusy] = useState(false)
  const [eeErr, setEeErr] = useState(null)
  const [eeOk, setEeOk] = useState(null)

  const bump = useCallback(() => setRefreshKey((k) => k + 1), [])

  const toggleCeRole = (id) => {
    setCeRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleEeRole = (id) => {
    setEeRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (panel !== 'employees' || !canManage) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const ro = await systemApi.listRoles()
        if (!cancelled) setRoleOptions(Array.isArray(ro) ? ro : [])
      } catch {
        if (!cancelled) setRoleOptions([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [panel, canManage, refreshKey])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setErr(null)
      setLoading(true)
      try {
        if (panel === 'employees') {
          const [list, branches] = await Promise.all([
            systemApi.listEmployees({ activeOnly: true, q: empSearch }),
            systemApi.listBranches(),
          ])
          if (!cancelled) {
            setEmp(list)
            setBranchOptions(branches)
          }
        } else if (panel === 'roles') {
          const r = await systemApi.listRoles()
          if (!cancelled) setRoles(r)
        } else if (panel === 'ubicaciones') {
          const [br, loc] = await Promise.all([
            systemApi.listBranches(),
            systemApi.listLocations(),
          ])
          if (!cancelled) {
            setBranchOptions(br)
            setLocations(loc)
          }
        } else {
          const requests = []
          if (auditSource === 'all' || auditSource === 'employee') {
            requests.push(systemApi.auditEntries({ page: auditPage, size: 30, sort: 'occurredAt,desc' }).then((data) => ['employee', data]))
          }
          if (auditSource === 'all' || auditSource === 'transport') {
            requests.push(systemApi.listTransportAuditoria({ page: auditPage, size: 30 }).then((data) => ['transport', data]))
          }
          if (auditSource === 'all' || auditSource === 'biesse') {
            requests.push(biesseApi.listBiesseAudit({ limit: 30, offset: auditPage * 30 }).then((data) => ['biesse', data]))
          }
          const settled = await Promise.allSettled(requests)
          const rows = settled.flatMap((result) => {
            if (result.status !== 'fulfilled') return []
            const [source, payload] = result.value
            return normalizeAuditRows(source, payload)
          }).filter((row) => auditMatches(row, auditText))
          const page = settled.find((result) => result.status === 'fulfilled' && result.value[0] === 'employee')?.value[1] ?? null
          if (!cancelled) {
            setAuditPageData(page)
            setAudit(rows)
          }
        }
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : 'Sin permiso o error de red')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [panel, refreshKey, auditPage, auditSource, auditText, empSearch])

  async function submitCreateRole(e) {
    e.preventDefault()
    setCrErr(null)
    setCrOk(null)
    setCrBusy(true)
    try {
      const created = await systemApi.createRole({
        name: crName.trim(),
        description: crDesc.trim() || undefined,
      })
      setCrOk(`Rol "${created.name}" creado.`)
      setCrName('')
      setCrDesc('')
      bump()
    } catch (ex) {
      setCrErr(ex instanceof Error ? ex.message : 'Error al crear rol')
    } finally {
      setCrBusy(false)
    }
  }

  async function submitCreateEmployee(e) {
    e.preventDefault()
    setCeErr(null)
    setCeOk(null)
    if (ceUsername.trim().length < 2) {
      setCeErr('El usuario de login debe tener al menos 2 caracteres.')
      return
    }
    if (cePassword.length < 8) {
      setCeErr('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (ceRoleIds.size === 0) {
      setCeErr('Selecciona al menos un rol para el usuario.')
      return
    }
    setCeBusy(true)
    try {
      const body = {
        username: ceUsername.trim(),
        email: ceEmail.trim(),
        password: cePassword,
        firstName: ceFirstName.trim(),
        lastName: ceLastName.trim(),
        documentType: ceDocType,
        documentNumber: ceDocNum.trim(),
        roleIds: Array.from(ceRoleIds),
      }
      const s2 = ceSecondLastName.trim()
      if (s2) body.secondLastName = s2
      const mob = ceMobile.trim()
      if (mob) body.mobilePhone = mob
      if (ceBirth) body.birthDate = ceBirth
      if (ceGender) body.gender = ceGender
      if (ceBranchId.trim()) {
        const parsed = Number(ceBranchId)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error('Selecciona una sucursal válida.')
        }
        body.branchId = parsed
      }

      const created = await systemApi.createEmployee(body)
      setCeOk(
        `Usuario creado: login «${created.samAccountName || ceUsername.trim()}» (${created.employeeCode}). Correo: ${created.email}.`,
      )
      setCePassword('')
      setCeUsername('')
      setCeEmail('')
      setCeFirstName('')
      setCeSecondLastName('')
      setCeLastName('')
      setCeDocNum('')
      setCeMobile('')
      setCeBirth('')
      setCeGender('')
      setCeBranchId('')
      setCeRoleIds(new Set())
      bump()
    } catch (ex) {
      setCeErr(ex instanceof Error ? ex.message : 'Error al crear usuario')
    } finally {
      setCeBusy(false)
    }
  }

  function startEditEmployee(row) {
    setEditingEmployeeId(row.id)
    setEeFirstName(row.firstName ?? '')
    setEeLastName(row.lastName ?? '')
    setEeSecondLastName(row.secondLastName ?? '')
    setEeMobile(row.mobilePhone ?? '')
    setEeBranchId(row.branchId != null ? String(row.branchId) : '')
    setEeRoleIds(new Set((row.roles ?? []).map((r) => r.id)))
    setEeActive(Boolean(row.active))
    setEeResetPassword('')
    setEeNotifyEmail(false)
    setEeErr(null)
    setEeOk(null)
  }

  function cancelEditEmployee() {
    setEditingEmployeeId(null)
    setEeResetPassword('')
    setEeNotifyEmail(false)
    setEeErr(null)
    setEeOk(null)
  }

  async function submitResetPassword() {
    if (!editingEmployeeId) return
    if (eeResetPassword.length < 8) {
      setEeErr('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    const row = emp?.find((e) => e.id === editingEmployeeId)
    const label = row?.email ?? `empleado #${editingEmployeeId}`
    if (
      !window.confirm(
        `¿Restablecer la contraseña de ${label}? El usuario no necesitará la contraseña anterior.`,
      )
    ) {
      return
    }
    setEeErr(null)
    setEeOk(null)
    setEeResetBusy(true)
    try {
      await systemApi.resetEmployeePassword(editingEmployeeId, {
        newPassword: eeResetPassword,
        notifyByEmail: eeNotifyEmail,
      })
      setEeOk(
        eeNotifyEmail
          ? 'Contraseña restablecida. Si SMTP está activo, se envió un correo al usuario.'
          : 'Contraseña restablecida correctamente.',
      )
      setEeResetPassword('')
    } catch (ex) {
      setEeErr(ex instanceof Error ? ex.message : 'Error al restablecer contraseña')
    } finally {
      setEeResetBusy(false)
    }
  }

  async function submitEditEmployee(e) {
    e.preventDefault()
    if (!editingEmployeeId) return
    setEeErr(null)
    setEeOk(null)
    if (eeRoleIds.size === 0) {
      setEeErr('Selecciona al menos un rol para el usuario.')
      return
    }
    setEeBusy(true)
    try {
      const body = {
        firstName: eeFirstName.trim(),
        lastName: eeLastName.trim(),
        secondLastName: eeSecondLastName.trim() || '',
        mobilePhone: eeMobile.trim() || '',
        active: eeActive,
        roleIds: Array.from(eeRoleIds),
      }
      if (eeBranchId.trim()) {
        const parsed = Number(eeBranchId)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error('Selecciona una sucursal válida.')
        }
        body.branchId = parsed
      }
      await systemApi.patchEmployee(editingEmployeeId, body)
      setEeOk('Empleado actualizado correctamente.')
      bump()
    } catch (ex) {
      setEeErr(ex instanceof Error ? ex.message : 'Error al actualizar empleado')
    } finally {
      setEeBusy(false)
    }
  }

  async function submitCreateBranch(e) {
    e.preventDefault()
    setBrErr(null)
    setBrOk(null)
    setBrBusy(true)
    try {
      await systemApi.createBranch({
        nombre: brNombre.trim(),
        direccion: brDir.trim() || undefined,
        ciudad: brCiudad.trim() || undefined,
        departamento: brDept.trim() || undefined,
      })
      setBrOk('Sucursal creada.')
      setBrNombre('')
      setBrDir('')
      setBrCiudad('')
      setBrDept('')
      bump()
    } catch (ex) {
      setBrErr(ex instanceof Error ? ex.message : 'Error al crear sucursal')
    } finally {
      setBrBusy(false)
    }
  }

  async function submitCreateLocation(e) {
    e.preventDefault()
    setUbErr(null)
    setUbOk(null)
    setUbBusy(true)
    try {
      await systemApi.createLocation({
        nombre: ubNombre.trim(),
        direccion: ubDir.trim() || undefined,
        distrito: ubDist.trim() || undefined,
        departamento: ubDept.trim() || undefined,
        ciudad: ubCiudad.trim() || undefined,
      })
      setUbOk('Ubicación creada.')
      setUbNombre('')
      setUbDir('')
      setUbDist('')
      setUbDept('')
      setUbCiudad('')
      bump()
    } catch (ex) {
      setUbErr(ex instanceof Error ? ex.message : 'Error al crear ubicación')
    } finally {
      setUbBusy(false)
    }
  }

  function startEditRole(row) {
    setEditingRoleId(row.id)
    setErDesc(row.description ?? '')
    setErErr(null)
    setErOk(null)
  }

  useEffect(() => {
    if (panel !== 'audit') {
      setAuditPage(0)
      setAuditDetail(null)
    }
    if (panel !== 'roles') {
      setEditingRoleId(null)
      setErErr(null)
      setErOk(null)
      setErDesc('')
    }
  }, [panel])

  function cancelEditRole() {
    setEditingRoleId(null)
    setErErr(null)
    setErOk(null)
    setErDesc('')
  }

  async function submitEditRole(e) {
    e.preventDefault()
    if (!editingRoleId) return
    setErErr(null)
    setErOk(null)
    setErBusy(true)
    try {
      await systemApi.patchRole(editingRoleId, {
        description: erDesc.trim() || undefined,
      })
      setErOk('Rol actualizado.')
      setEditingRoleId(null)
      setErDesc('')
      bump()
    } catch (ex) {
      setErErr(ex instanceof Error ? ex.message : 'Error al actualizar rol')
    } finally {
      setErBusy(false)
    }
  }

  async function onDeleteRole(row) {
    const ok = window.confirm(`¿Eliminar el rol "${row.name}"? Solo funciona si ningún empleado lo usa.`)
    if (!ok) return
    try {
      await systemApi.deleteRole(row.id)
      bump()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo eliminar el rol')
    }
  }

  async function loadAuditDetail(id) {
    setAuditDetailLoading(true)
    setAuditDetail(null)
    try {
      const d = await systemApi.getAuditEntryById(id)
      setAuditDetail(d)
    } catch {
      setAuditDetail(null)
    } finally {
      setAuditDetailLoading(false)
    }
  }

  async function onDeleteEmployee(row) {
    const ok = window.confirm(
      `Se desactivará el usuario ${row.email}. Podrás reactivarlo luego editando "Activo". ¿Continuar?`,
    )
    if (!ok) return
    try {
      await systemApi.deleteEmployee(row.id)
      if (editingEmployeeId === row.id) {
        cancelEditEmployee()
      }
      bump()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Error al desactivar empleado')
    }
  }

  const tabs = [
    ['employees', 'Empleados'],
    ['roles', 'Roles'],
    ['ubicaciones', 'Sucursales / ubicaciones'],
    ['audit', 'Auditoría'],
  ]

  const body = (
    <>
      {!embedded ? (
        <div className="card pad" style={{ marginBottom: '1rem' }}>
          <h1 className="card__title">Administración</h1>
          <p className="muted small" style={{ marginTop: '0.35rem' }}>
            Como <strong>Master</strong> o <strong>Admin</strong> puedes crear roles y empleados desde aquí. El backend
            valida los mismos permisos en cada petición.
          </p>
        </div>
      ) : null}

      {!embedded ? (
        <div className="tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panel === id}
              className={panel === id ? 'btn btn--primary' : 'btn btn--ghost'}
              onClick={() => setPanel(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {err ? (
        <div className="card pad">
          <p className="text-warn">{err}</p>
        </div>
      ) : loading ? (
        <p className="muted">Cargando…</p>
      ) : panel === 'employees' && emp ? (
        <>
          {canManage ? (
            <div className="card pad form-section">
              <h2>Nuevo empleado</h2>
              <form onSubmit={(e) => void submitCreateEmployee(e)}>
                <div className="form-row-2">
                  <label className="field">
                    <span>Usuario (login)</span>
                    <input
                      type="text"
                      autoComplete="off"
                      value={ceUsername}
                      onChange={(e) => setCeUsername(e.target.value)}
                      required
                      placeholder=""
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="off"
                      value={ceEmail}
                      onChange={(e) => setCeEmail(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Contraseña inicial (mín. 8)</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={cePassword}
                      onChange={(e) => setCePassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </label>
                </div>
                <div className="field">
                  <span>Roles *</span>
                  <p className="muted small form-hint">Marca uno o más roles para el usuario.</p>
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
                            checked={ceRoleIds.has(r.id)}
                            onChange={() => toggleCeRole(r.id)}
                          />
                          {r.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Nombre</span>
                    <input
                      value={ceFirstName}
                      onChange={(e) => setCeFirstName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Segundo apellido (opcional)</span>
                    <input
                      value={ceSecondLastName}
                      onChange={(e) => setCeSecondLastName(e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Primer apellido</span>
                    <input
                      value={ceLastName}
                      onChange={(e) => setCeLastName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Tipo de documento</span>
                    <select
                      value={ceDocType}
                      onChange={(e) => setCeDocType(e.target.value)}
                    >
                      {DOCUMENT_TYPES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Número de documento</span>
                    <input
                      value={ceDocNum}
                      onChange={(e) => setCeDocNum(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Móvil (opcional)</span>
                    <input
                      value={ceMobile}
                      onChange={(e) => setCeMobile(e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Fecha de nacimiento (opcional)</span>
                    <input
                      type="date"
                      value={ceBirth}
                      onChange={(e) => setCeBirth(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Género (opcional)</span>
                    <select
                      value={ceGender}
                      onChange={(e) => setCeGender(e.target.value)}
                    >
                      <option value="">—</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Sucursal</span>
                    <select
                      value={ceBranchId}
                      onChange={(e) => setCeBranchId(e.target.value)}
                      required
                    >
                      <option value="">Selecciona sucursal…</option>
                      {(branchOptions ?? []).map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {ceErr ? <p className="form-inline-error">{ceErr}</p> : null}
                {ceOk ? <p className="form-success">{ceOk}</p> : null}
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={ceBusy || roleOptions.length === 0}
                  >
                    {ceBusy ? 'Creando…' : 'Crear empleado'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card pad">
              <p className="muted">
                Solo usuarios con rol Master, Admin o Admin producción pueden dar de alta empleados.
              </p>
            </div>
          )}

          <div className="card pad" style={{ paddingBottom: 0 }}>
            <label className="field">
              <span>Buscar usuario</span>
              <input
                type="search"
                placeholder="Nombre, email, código o usuario de login…"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                autoComplete="off"
              />
            </label>
            <p className="muted small form-hint" style={{ marginTop: '0.25rem' }}>
              Solo se listan empleados activos.
            </p>
          </div>

          <div className="card card--table">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Email</th>
                    <th>Nombre</th>
                    <th>Sucursal</th>
                    <th>Roles</th>
                    {canManage ? <th>Acciones</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {emp.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="muted small">
                        No hay usuarios activos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : null}
                  {emp.map((e) => (
                    <tr key={e.id}>
                      <td>{e.employeeCode}</td>
                      <td>{e.email}</td>
                      <td>
                        {[e.firstName, e.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td>
                        {e.branchId != null
                          ? (branchOptions ?? []).find((b) => b.id === e.branchId)?.nombre ??
                            `#${e.branchId}`
                          : '—'}
                      </td>
                      <td className="small">{e.roles.map((r) => r.name).join(', ')}</td>
                      {canManage ? (
                        <td className="small">
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => startEditEmployee(e)}
                          >
                            Editar
                          </button>{' '}
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => void onDeleteEmployee(e)}
                          >
                            Borrar
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {canManage && editingEmployeeId ? (
            <div className="card pad form-section">
              <h2>Editar empleado</h2>
              <form onSubmit={(e) => void submitEditEmployee(e)}>
                <div className="form-row-2">
                  <label className="field">
                    <span>Nombre</span>
                    <input
                      value={eeFirstName}
                      onChange={(e) => setEeFirstName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Primer apellido</span>
                    <input
                      value={eeLastName}
                      onChange={(e) => setEeLastName(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Segundo apellido (opcional)</span>
                    <input
                      value={eeSecondLastName}
                      onChange={(e) => setEeSecondLastName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Móvil (opcional)</span>
                    <input value={eeMobile} onChange={(e) => setEeMobile(e.target.value)} />
                  </label>
                </div>
                <div className="form-row-2">
                  <label className="field">
                    <span>Sucursal</span>
                    <select
                      value={eeBranchId}
                      onChange={(e) => setEeBranchId(e.target.value)}
                    >
                      <option value="">Sin sucursal</option>
                      {(branchOptions ?? []).map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Activo</span>
                    <select
                      value={eeActive ? 'true' : 'false'}
                      onChange={(e) => setEeActive(e.target.value === 'true')}
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                </div>
                <div className="field">
                  <span>Roles *</span>
                  <p className="muted small form-hint">Modifica los permisos del usuario.</p>
                  <div className="role-checks">
                    {roleOptions.map((r) => (
                      <label key={r.id}>
                        <input
                          type="checkbox"
                          checked={eeRoleIds.has(r.id)}
                          onChange={() => toggleEeRole(r.id)}
                        />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field" style={{ marginTop: '1rem' }}>
                  <span>Restablecer contraseña (admin)</span>
                  <p className="muted small form-hint">
                    No se pide la contraseña anterior. Opcionalmente se notifica por correo si SMTP está
                    configurado.
                  </p>
                  <div className="form-row-2" style={{ alignItems: 'flex-end' }}>
                    <label className="field">
                      <span>Nueva contraseña (mín. 8)</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={eeResetPassword}
                        onChange={(e) => setEeResetPassword(e.target.value)}
                        minLength={8}
                        placeholder="••••••••"
                      />
                    </label>
                    <label
                      className="field"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <input
                        type="checkbox"
                        checked={eeNotifyEmail}
                        onChange={(e) => setEeNotifyEmail(e.target.checked)}
                      />
                      <span>Enviar por correo</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={eeResetBusy || eeResetPassword.length < 8}
                    onClick={() => void submitResetPassword()}
                  >
                    {eeResetBusy ? 'Restableciendo…' : 'Restablecer contraseña'}
                  </button>
                </div>
                {eeErr ? <p className="form-inline-error">{eeErr}</p> : null}
                {eeOk ? <p className="form-success">{eeOk}</p> : null}
                <div className="form-actions">
                  <button type="submit" className="btn btn--primary" disabled={eeBusy}>
                    {eeBusy ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={cancelEditEmployee}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </>
      ) : panel === 'ubicaciones' && branchOptions != null && locations != null ? (
        <>
          {canManage ? (
            <div className="split" style={{ alignItems: 'flex-start' }}>
              <div className="card pad form-section">
                <h2>Nueva sucursal</h2>
                <p className="muted small form-hint">
                  <code className="code-inline">POST /api/location/branch</code> en module-system.
                </p>
                <form onSubmit={(e) => void submitCreateBranch(e)}>
                  <label className="field">
                    <span>Nombre *</span>
                    <input value={brNombre} onChange={(e) => setBrNombre(e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Dirección</span>
                    <input value={brDir} onChange={(e) => setBrDir(e.target.value)} />
                  </label>
                  <div className="form-row-2">
                    <label className="field">
                      <span>Ciudad</span>
                      <input value={brCiudad} onChange={(e) => setBrCiudad(e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Departamento</span>
                      <input value={brDept} onChange={(e) => setBrDept(e.target.value)} />
                    </label>
                  </div>
                  {brErr ? <p className="form-inline-error">{brErr}</p> : null}
                  {brOk ? <p className="form-success">{brOk}</p> : null}
                  <div className="form-actions">
                    <button type="submit" className="btn btn--primary" disabled={brBusy}>
                      {brBusy ? 'Guardando…' : 'Crear sucursal'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="card pad form-section">
                <h2>Nueva ubicación (obra / almacén)</h2>
                <p className="muted small form-hint">
                  <code className="code-inline">POST /api/location/location</code>
                </p>
                <form onSubmit={(e) => void submitCreateLocation(e)}>
                  <label className="field">
                    <span>Nombre *</span>
                    <input value={ubNombre} onChange={(e) => setUbNombre(e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Dirección</span>
                    <input value={ubDir} onChange={(e) => setUbDir(e.target.value)} />
                  </label>
                  <div className="form-row-2">
                    <label className="field">
                      <span>Distrito</span>
                      <input value={ubDist} onChange={(e) => setUbDist(e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Departamento</span>
                      <input value={ubDept} onChange={(e) => setUbDept(e.target.value)} />
                    </label>
                  </div>
                  <label className="field">
                    <span>Ciudad</span>
                    <input value={ubCiudad} onChange={(e) => setUbCiudad(e.target.value)} />
                  </label>
                  {ubErr ? <p className="form-inline-error">{ubErr}</p> : null}
                  {ubOk ? <p className="form-success">{ubOk}</p> : null}
                  <div className="form-actions">
                    <button type="submit" className="btn btn--primary" disabled={ubBusy}>
                      {ubBusy ? 'Guardando…' : 'Crear ubicación'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="card pad">
              <p className="muted">Solo Master o Admin pueden crear sucursales y ubicaciones.</p>
            </div>
          )}

          <div className="card card--table" style={{ marginTop: '1rem' }}>
            <h2 className="card__title pad">Sucursales ({branchOptions.length})</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Departamento</th>
                  </tr>
                </thead>
                <tbody>
                  {branchOptions.map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.nombre}</td>
                      <td className="small">{b.ciudad ?? '—'}</td>
                      <td className="small">{b.departamento ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card card--table" style={{ marginTop: '1rem' }}>
            <h2 className="card__title pad">Ubicaciones ({locations.length})</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Distrito</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.nombre}</td>
                      <td className="small">{u.ciudad ?? '—'}</td>
                      <td className="small">{u.distrito ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : panel === 'roles' && roles ? (
        <>
          {canManage ? (
            <div className="card pad form-section">
              <h2>Nuevo rol</h2>
              <p className="muted small form-hint">
                Nombre: letras, números, guión y guión bajo. Se guardará en mayúsculas.
              </p>
              <form onSubmit={(e) => void submitCreateRole(e)}>
                <div className="form-row-2">
                  <label className="field">
                    <span>Nombre</span>
                    <input
                      value={crName}
                      onChange={(e) => setCrName(e.target.value)}
                      pattern="[A-Za-z0-9_-]+"
                      title="Solo letras, números, guión y guión bajo"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Descripción (opcional)</span>
                    <input
                      value={crDesc}
                      onChange={(e) => setCrDesc(e.target.value)}
                    />
                  </label>
                </div>
                {crErr ? <p className="form-inline-error">{crErr}</p> : null}
                {crOk ? <p className="form-success">{crOk}</p> : null}
                <div className="form-actions">
                  <button type="submit" className="btn btn--primary" disabled={crBusy}>
                    {crBusy ? 'Creando…' : 'Crear rol'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card pad">
              <p className="muted">
                Solo usuarios con rol Master o Admin pueden crear roles.
              </p>
            </div>
          )}

          <div className="card card--table">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    {canManage ? <th>Acciones</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.description ?? '—'}</td>
                      {canManage ? (
                        <td className="small">
                          <button type="button" className="btn btn--ghost" onClick={() => startEditRole(r)}>
                            Editar
                          </button>{' '}
                          <button type="button" className="btn btn--ghost" onClick={() => void onDeleteRole(r)}>
                            Eliminar
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {erOk && !editingRoleId ? (
            <p className="form-success pad" style={{ marginTop: '0.75rem' }}>
              {erOk}
            </p>
          ) : null}

          {canManage && editingRoleId != null ? (
            <div className="card pad form-section" style={{ marginTop: '1rem' }}>
              <h2>Editar rol #{editingRoleId}</h2>
              <form onSubmit={(e) => void submitEditRole(e)}>
                <label className="field">
                  <span>Descripción</span>
                  <input value={erDesc} onChange={(e) => setErDesc(e.target.value)} />
                </label>
                {erErr ? <p className="form-inline-error">{erErr}</p> : null}
                {erOk ? <p className="form-success">{erOk}</p> : null}
                <div className="form-actions">
                  <button type="submit" className="btn btn--primary" disabled={erBusy}>
                    {erBusy ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={cancelEditRole}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </>
      ) : panel === 'audit' && audit ? (
        <div className="card card--table pad">
          <p className="muted small" style={{ marginBottom: '1rem' }}>
            Auditoría centralizada del aplicativo: empleados/roles, flota (gestión) y trazabilidad Biesse.
          </p>
          <div className="toolbar--wrap" style={{ marginBottom: '1rem' }}>
            <label className="field">
              <span>Fuente</span>
              <select
                value={auditSource}
                onChange={(e) => {
                  setAuditSource(e.target.value)
                  setAuditPage(0)
                  setAuditDetail(null)
                }}
              >
                <option value="all">Todas</option>
                <option value="employee">Gestión / empleados</option>
                <option value="transport">Gestión / flota</option>
                <option value="biesse">Biesse / órdenes</option>
              </select>
            </label>
            <label className="field">
              <span>Filtro texto</span>
              <input
                value={auditText}
                onChange={(e) => {
                  setAuditText(e.target.value)
                  setAuditPage(0)
                }}
                placeholder="acción, entidad, actor, detalle…"
              />
            </label>
            <button type="button" className="btn btn--ghost" onClick={bump}>
              Actualizar
            </button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fuente</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr
                    key={`${a.source}-${a.id}`}
                    className={auditDetail?.id === a.id ? 'table__row--active' : undefined}
                    style={{ cursor: a.source === 'employee' ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (a.source === 'employee') void loadAuditDetail(a.id)
                    }}
                  >
                    <td className="small">{a.source}</td>
                    <td className="small">{String(a.occurredAt ?? '—')}</td>
                    <td>{String(a.action)}</td>
                    <td>
                      {a.entityType} {a.entityId ? `#${a.entityId}` : ''}
                    </td>
                    <td className="small">{a.actorEmail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {auditDetailLoading ? (
            <p className="muted pad">Cargando detalle…</p>
          ) : auditDetail ? (
            <div className="card pad" style={{ marginTop: '1rem', background: 'var(--surface-2, #f7f7f8)' }}>
              <h3 className="card__title">Detalle auditoría #{auditDetail.id}</h3>
              <dl className="kv">
                <div>
                  <dt>Detalles</dt>
                  <dd className="small" style={{ whiteSpace: 'pre-wrap' }}>
                    {auditDetail.details ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt>IP cliente</dt>
                  <dd className="small">{auditDetail.clientIpPublic ?? auditDetail.directRemoteIp ?? '—'}</dd>
                </div>
                <div>
                  <dt>User-Agent</dt>
                  <dd className="small">{auditDetail.userAgent ?? '—'}</dd>
                </div>
              </dl>
            </div>
          ) : null}
          {auditPageData && typeof auditPageData.totalPages === 'number' ? (
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <span className="muted small">
                Página {(auditPageData.number ?? auditPage) + 1}
                {auditSource === 'employee' ? ` de ${auditPageData.totalPages ?? 1} · ${auditPageData.totalElements ?? 0} eventos` : ''}
              </span>
              <button
                type="button"
                className="btn"
                disabled={auditPage <= 0}
                onClick={() => {
                  setAuditPage((p) => Math.max(0, p - 1))
                  setAuditDetail(null)
                }}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn"
                disabled={
                  auditPageData.last === true ||
                  (auditPageData.totalPages != null && auditPage >= auditPageData.totalPages - 1)
                }
                onClick={() => {
                  setAuditPage((p) => p + 1)
                  setAuditDetail(null)
                }}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )

  if (embedded) {
    return <div style={{ marginTop: '0.5rem' }}>{body}</div>
  }

  return <div>{body}</div>
}
