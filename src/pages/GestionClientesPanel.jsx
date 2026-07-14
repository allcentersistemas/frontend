import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { ClientAuditSummary, ClientLoginHistorySection } from '../components/ClientLoginHistorySection.jsx'
import { isStrongPassword, validatePassword } from '../utils/passwordPolicy'
import { formatAppDateTime } from '../utils/appDateTime'

const TIPOS_DOCUMENTO = ['DNI', 'CE', 'PASAPORTE']

function rowToEditForm(row) {
  return {
    email: row.email || '',
    username: row.username || '',
    displayName: row.displayName || '',
    phone: row.phone || '',
    juridica: Boolean(row.juridica),
    tipoDocumento: row.tipoDocumento || 'DNI',
    numeroDocumento: row.numeroDocumento || '',
    direccion: row.direccion || '',
    ciudad: row.ciudad || '',
    distrito: row.distrito || '',
    departamento: row.departamento || '',
    razonSocial: row.razonSocial || '',
    ruc: row.ruc || '',
    nombre: row.nombre || '',
    active: Boolean(row.active),
  }
}

function emptyCreateForm() {
  return {
    email: '',
    username: '',
    password: '',
    displayName: '',
    phone: '',
    active: true,
  }
}

export function GestionClientesPanel() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('list')
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState(null)
  const [createOk, setCreateOk] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState(null)
  const [editOk, setEditOk] = useState(null)
  const [auditClient, setAuditClient] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await systemApi.listClients()
      setClients(Array.isArray(rows) ? rows : [])
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'No se pudieron cargar los clientes')
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => {
      const hay = [
        c.email,
        c.username,
        c.displayName,
        c.razonSocial,
        c.ruc,
        c.numeroDocumento,
        c.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [clients, search])

  function startCreate() {
    setMode('create')
    setCreateForm(emptyCreateForm())
    setCreateErr(null)
    setCreateOk(null)
    setEditingId(null)
  }

  function startEdit(row) {
    setMode('edit')
    setEditingId(row.id)
    setEditForm(rowToEditForm(row))
    setAuditClient(row)
    setResetPassword('')
    setEditErr(null)
    setEditOk(null)
    setCreateErr(null)
    setCreateOk(null)
    void systemApi.getClient(row.id).then(setAuditClient).catch(() => setAuditClient(row))
  }

  function patchEdit(key, value) {
    setEditForm((f) => (f ? { ...f, [key]: value } : f))
  }

  function backToList() {
    setMode('list')
    setEditingId(null)
    setEditForm(null)
    setAuditClient(null)
    setResetPassword('')
    setCreateErr(null)
    setCreateOk(null)
    setEditErr(null)
    setEditOk(null)
  }

  async function submitCreate(e) {
    e.preventDefault()
    setCreateErr(null)
    setCreateOk(null)
    const pwdErr = validatePassword(createForm.password)
    if (pwdErr) {
      setCreateErr(pwdErr)
      return
    }
    setCreateBusy(true)
    try {
      const body = {
        email: createForm.email.trim(),
        password: createForm.password,
        displayName: createForm.displayName.trim(),
        active: createForm.active,
      }
      const u = createForm.username.trim()
      if (u) body.username = u
      const p = createForm.phone.trim()
      if (p) body.phone = p
      const created = await systemApi.createClient(body)
      setCreateOk(`Cliente creado: ${created.email}`)
      setCreateForm(emptyCreateForm())
      await load()
      setMode('list')
    } catch (ex) {
      setCreateErr(ex instanceof Error ? ex.message : 'Error al crear cliente')
    } finally {
      setCreateBusy(false)
    }
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingId || !editForm) return
    setEditErr(null)
    setEditOk(null)
    setEditBusy(true)
    try {
      await systemApi.updateClient(editingId, {
        email: editForm.email.trim(),
        username: editForm.username.trim(),
        displayName: editForm.displayName.trim(),
        phone: editForm.phone.trim() || null,
        juridica: editForm.juridica,
        tipoDocumento: editForm.tipoDocumento,
        numeroDocumento: editForm.numeroDocumento.trim() || null,
        direccion: editForm.direccion.trim() || null,
        ciudad: editForm.ciudad.trim() || null,
        distrito: editForm.distrito.trim() || null,
        departamento: editForm.departamento.trim() || null,
        razonSocial: editForm.razonSocial.trim() || null,
        ruc: editForm.ruc.trim() || null,
        nombre: editForm.nombre.trim() || null,
        active: editForm.active,
      })
      setEditOk('Cliente actualizado.')
      await load()
      backToList()
    } catch (ex) {
      setEditErr(ex instanceof Error ? ex.message : 'Error al guardar')
    } finally {
      setEditBusy(false)
    }
  }

  async function submitResetPassword() {
    if (!editingId || !resetPassword) return
    const pwdErr = validatePassword(resetPassword)
    if (pwdErr) {
      setEditErr(pwdErr)
      return
    }
    if (!window.confirm('¿Restablecer la contraseña de este cliente?')) return
    setEditErr(null)
    setResetBusy(true)
    try {
      await systemApi.resetClientPassword(editingId, { newPassword: resetPassword })
      setEditOk('Contraseña restablecida.')
      setResetPassword('')
    } catch (ex) {
      setEditErr(ex instanceof Error ? ex.message : 'No se pudo restablecer la contraseña')
    } finally {
      setResetBusy(false)
    }
  }

  async function onDelete(row) {
    const label = row.displayName || row.email
    if (!window.confirm(`¿Eliminar el cliente «${label}»? Esta acción no se puede deshacer.`)) {
      return
    }
    try {
      await systemApi.deleteClient(row.id)
      await load()
      if (editingId === row.id) backToList()
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'No se pudo eliminar')
    }
  }

  const editingRow = editingId ? clients.find((c) => c.id === editingId) : null

  return (
    <div className="page-stack">
      <div className="card pad" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ flex: '1 1 220px' }}>
          <h2 className="card__title">Clientes del portal</h2>
          <p className="muted small" style={{ marginTop: '0.35rem' }}>
            Cuentas registradas en el portal de clientes (planilla de corte).
          </p>
        </div>
        {mode === 'list' ? (
          <button type="button" className="btn btn--primary" onClick={startCreate}>
            Nuevo cliente
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={backToList}>
            ← Volver al listado
          </button>
        )}
      </div>

      {error ? (
        <div className="card pad">
          <p className="form-error">{error}</p>
        </div>
      ) : null}

      {mode === 'create' ? (
        <div className="card pad form-section">
          <h3 className="card__title mb-4">Alta de cliente</h3>
          <form onSubmit={(e) => void submitCreate(e)}>
            <div className="form-row-2">
              <label className="field">
                <span>Correo *</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Usuario (opcional)</span>
                <input
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="Por defecto: parte local del correo"
                />
              </label>
            </div>
            <div className="form-row-2">
              <label className="field">
                <span>Nombre para mostrar *</span>
                <input
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Teléfono</span>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
            </div>
            <label className="field">
              <span>Contraseña inicial *</span>
              <input
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <span className="muted small form-hint">
                Mín. 8 caracteres, mayúscula, número y símbolo.
              </span>
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={createForm.active}
                onChange={(e) => setCreateForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <span>Activo</span>
            </label>
            {createErr ? <p className="form-inline-error">{createErr}</p> : null}
            {createOk ? <p className="form-success">{createOk}</p> : null}
            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={createBusy}>
                {createBusy ? 'Creando…' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {mode === 'edit' && editingRow && editForm ? (
        <div className="card pad form-section">
          <h3 className="card__title mb-4">Editar cliente</h3>
          <form onSubmit={(e) => void submitEdit(e)}>
            <div className="form-row-2">
              <label className="field">
                <span>Correo</span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => patchEdit('email', e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Usuario</span>
                <input
                  value={editForm.username}
                  onChange={(e) => patchEdit('username', e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={editForm.juridica}
                onChange={(e) => patchEdit('juridica', e.target.checked)}
              />
              <span>Persona jurídica</span>
            </label>
            {editForm.juridica ? (
              <div className="form-row-2">
                <label className="field">
                  <span>Razón social</span>
                  <input
                    value={editForm.razonSocial}
                    onChange={(e) => patchEdit('razonSocial', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>RUC</span>
                  <input value={editForm.ruc} onChange={(e) => patchEdit('ruc', e.target.value)} />
                </label>
                <label className="field">
                  <span>Nombre de contacto</span>
                  <input value={editForm.nombre} onChange={(e) => patchEdit('nombre', e.target.value)} />
                </label>
                <label className="field">
                  <span>Nombre para mostrar</span>
                  <input
                    value={editForm.displayName}
                    onChange={(e) => patchEdit('displayName', e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className="form-row-2">
                <label className="field">
                  <span>Nombre para mostrar</span>
                  <input
                    value={editForm.displayName}
                    onChange={(e) => patchEdit('displayName', e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Tipo documento</span>
                  <select
                    value={editForm.tipoDocumento}
                    onChange={(e) => patchEdit('tipoDocumento', e.target.value)}
                  >
                    {TIPOS_DOCUMENTO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Número documento</span>
                  <input
                    value={editForm.numeroDocumento}
                    onChange={(e) => patchEdit('numeroDocumento', e.target.value)}
                  />
                </label>
              </div>
            )}
            <div className="form-row-2">
              <label className="field">
                <span>Teléfono</span>
                <input value={editForm.phone} onChange={(e) => patchEdit('phone', e.target.value)} />
              </label>
              <label className="field">
                <span>Estado</span>
                <select
                  value={editForm.active ? 'true' : 'false'}
                  onChange={(e) => patchEdit('active', e.target.value === 'true')}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </label>
            </div>
            <div className="form-row-2">
              <label className="field">
                <span>Dirección</span>
                <input value={editForm.direccion} onChange={(e) => patchEdit('direccion', e.target.value)} />
              </label>
              <label className="field">
                <span>Ciudad</span>
                <input value={editForm.ciudad} onChange={(e) => patchEdit('ciudad', e.target.value)} />
              </label>
              <label className="field">
                <span>Distrito</span>
                <input value={editForm.distrito} onChange={(e) => patchEdit('distrito', e.target.value)} />
              </label>
              <label className="field">
                <span>Departamento</span>
                <input
                  value={editForm.departamento}
                  onChange={(e) => patchEdit('departamento', e.target.value)}
                />
              </label>
            </div>
            <div className="field" style={{ marginTop: '1rem' }}>
              <span>Restablecer contraseña</span>
              <p className="muted small form-hint">No se pide la contraseña anterior del cliente.</p>
              <div className="form-row-2" style={{ alignItems: 'flex-end' }}>
                <label className="field">
                  <span>Nueva contraseña</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={resetBusy || !isStrongPassword(resetPassword)}
                  onClick={() => void submitResetPassword()}
                >
                  {resetBusy ? 'Restableciendo…' : 'Restablecer contraseña'}
                </button>
              </div>
            </div>
            {editErr ? <p className="form-inline-error">{editErr}</p> : null}
            {editOk ? <p className="form-success">{editOk}</p> : null}
            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={editBusy}>
                {editBusy ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <div className="card pad" style={{ marginTop: '1rem' }}>
            <h3 className="card__title">Actividad de la cuenta</h3>
            <ClientAuditSummary client={auditClient || editingRow} />
          </div>

          <div className="card pad" style={{ marginTop: '1rem' }}>
            <ClientLoginHistorySection clientId={editingId} />
          </div>
        </div>
      ) : null}

      {mode === 'list' ? (
        <>
          <div className="card pad" style={{ paddingBottom: 0 }}>
            <label className="field">
              <span>Buscar</span>
              <input
                type="search"
                placeholder="Correo, usuario, nombre, RUC, documento…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="card card--table">
            {loading ? (
              <p className="muted pad">Cargando clientes…</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Correo</th>
                      <th>Usuario</th>
                      <th>Nombre</th>
                      <th>Documento / RUC</th>
                      <th>Último acceso</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="muted small">
                          No hay clientes que coincidan.
                        </td>
                      </tr>
                    ) : null}
                    {filtered.map((c) => (
                      <tr key={c.id}>
                        <td>{c.email}</td>
                        <td>{c.username}</td>
                        <td>{c.displayName || c.razonSocial || '—'}</td>
                        <td className="small">
                          {c.juridica
                            ? c.ruc || '—'
                            : [c.tipoDocumento, c.numeroDocumento].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="small">{formatAppDateTime(c.lastLoginAt)}</td>
                        <td>{c.active ? 'Activo' : 'Inactivo'}</td>
                        <td className="small">
                          <button type="button" className="btn btn--ghost" onClick={() => startEdit(c)}>
                            Editar
                          </button>{' '}
                          <button type="button" className="btn btn--ghost" onClick={() => void onDelete(c)}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
