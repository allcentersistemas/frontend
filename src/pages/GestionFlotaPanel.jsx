import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { useAppAbility } from '../access/useAppAbility'
import { CanButton } from '../components/CanButton'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function emptyVehicleForm() {
  return {
    placa: '',
    numeroSerie: '',
    modelo: '',
    marca: '',
    color: '',
    descripcion: '',
    tipoVehiculo: '',
    capacidad: '',
    activo: true,
  }
}

function toNumOrNull(s) {
  if (s == null || String(s).trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Pestaña vehículos o auditoría de flota (sin cabecera de página). */
export function GestionFlotaPanel({ tab, initialVehiculoId = null, onVehiculoConsumed }) {
  const ability = useAppAbility()
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const [vehiculos, setVehiculos] = useState([])
  const [vehiculosLoading, setVehiculosLoading] = useState(false)
  const [newVehiculo, setNewVehiculo] = useState(() => emptyVehicleForm())
  const [editingVehiculoId, setEditingVehiculoId] = useState(null)
  const [editVehiculo, setEditVehiculo] = useState(() => emptyVehicleForm())

  const [auditFilters, setAuditFilters] = useState({ entityType: '', entityId: '', correlationId: '' })
  const [auditPage, setAuditPage] = useState(0)
  const [auditData, setAuditData] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  const showMsg = useCallback((text) => {
    setErr(null)
    setMsg(text)
    window.setTimeout(() => setMsg(null), 4000)
  }, [])

  const loadVehiculos = useCallback(async () => {
    setVehiculosLoading(true)
    setErr(null)
    try {
      const list = await systemApi.listVehiculos()
      setVehiculos(Array.isArray(list) ? list : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar vehículos')
    } finally {
      setVehiculosLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'vehiculos') {
      void loadVehiculos()
    }
  }, [tab, loadVehiculos])

  const loadAuditoria = useCallback(async () => {
    setAuditLoading(true)
    setErr(null)
    try {
      const data = await systemApi.listTransportAuditoria({
        entityType: auditFilters.entityType.trim() || undefined,
        entityId: auditFilters.entityId.trim() || undefined,
        correlationId: auditFilters.correlationId.trim() || undefined,
        page: auditPage,
        size: 30,
      })
      setAuditData(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setAuditData(null)
      setErr(e instanceof Error ? e.message : 'Error al cargar auditoría')
    } finally {
      setAuditLoading(false)
    }
  }, [auditFilters.entityType, auditFilters.entityId, auditFilters.correlationId, auditPage])

  useEffect(() => {
    if (tab === 'auditoria') {
      void loadAuditoria()
    }
  }, [tab, loadAuditoria])

  async function handleCreateVehiculo(e) {
    e.preventDefault()
    setErr(null)
    try {
      await systemApi.createVehiculo({
        placa: newVehiculo.placa.trim(),
        numeroSerie: newVehiculo.numeroSerie.trim() || undefined,
        modelo: newVehiculo.modelo.trim() || undefined,
        marca: newVehiculo.marca.trim() || undefined,
        color: newVehiculo.color.trim() || undefined,
        descripcion: newVehiculo.descripcion.trim() || undefined,
        tipoVehiculo: newVehiculo.tipoVehiculo.trim() || undefined,
        capacidad: toNumOrNull(newVehiculo.capacidad) ?? undefined,
        activo: newVehiculo.activo,
      })
      setNewVehiculo(emptyVehicleForm())
      showMsg('Vehículo registrado.')
      await loadVehiculos()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear el vehículo')
    }
  }

  async function startEditVehiculo(row) {
    const id = row.transporteId ?? row.id
    setEditingVehiculoId(id)
    setErr(null)
    try {
      const fresh = await systemApi.getVehiculo(id)
      setEditVehiculo({
        placa: fresh.placa ?? '',
        numeroSerie: fresh.numeroSerie ?? '',
        modelo: fresh.modelo ?? '',
        marca: fresh.marca ?? '',
        color: fresh.color ?? '',
        descripcion: fresh.descripcion ?? '',
        tipoVehiculo: fresh.tipoVehiculo ?? '',
        capacidad: fresh.capacidad != null ? String(fresh.capacidad) : '',
        activo: fresh.activo !== false,
      })
    } catch {
      setEditVehiculo({
        placa: row.placa ?? '',
        numeroSerie: row.numeroSerie ?? '',
        modelo: row.modelo ?? '',
        marca: row.marca ?? '',
        color: row.color ?? '',
        descripcion: row.descripcion ?? '',
        tipoVehiculo: row.tipoVehiculo ?? '',
        capacidad: row.capacidad != null ? String(row.capacidad) : '',
        activo: row.activo !== false,
      })
    }
  }

  useEffect(() => {
    if (initialVehiculoId == null || !Number.isFinite(initialVehiculoId) || initialVehiculoId <= 0) {
      return
    }
    void (async () => {
      try {
        const fresh = await systemApi.getVehiculo(initialVehiculoId)
        await startEditVehiculo(fresh)
      } catch {
        await startEditVehiculo({ transporteId: initialVehiculoId, placa: '', marca: '' })
      } finally {
        onVehiculoConsumed?.()
      }
    })()
  }, [initialVehiculoId, onVehiculoConsumed])

  async function handleSaveVehiculo(e) {
    e.preventDefault()
    if (editingVehiculoId == null) return
    setErr(null)
    try {
      await systemApi.updateVehiculo(editingVehiculoId, {
        placa: editVehiculo.placa.trim() || undefined,
        numeroSerie: editVehiculo.numeroSerie.trim() || undefined,
        modelo: editVehiculo.modelo.trim() || undefined,
        marca: editVehiculo.marca.trim() || undefined,
        color: editVehiculo.color.trim() || undefined,
        descripcion: editVehiculo.descripcion.trim() || undefined,
        tipoVehiculo: editVehiculo.tipoVehiculo.trim() || undefined,
        capacidad: toNumOrNull(editVehiculo.capacidad) ?? undefined,
        activo: editVehiculo.activo,
      })
      setEditingVehiculoId(null)
      showMsg('Vehículo actualizado.')
      await loadVehiculos()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo actualizar')
    }
  }

  return (
    <>
      {msg ? <p className="muted" role="status">{msg}</p> : null}
      {err ? <p className="text-warn" role="alert">{err}</p> : null}

      {tab === 'vehiculos' ? (
        <div className="split" style={{ marginTop: '0.5rem' }}>
          <div className="card">
            <h2 className="card__title pad">Flota</h2>
            {vehiculosLoading ? (
              <p className="muted pad">Cargando…</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Placa</th>
                      <th>Modelo</th>
                      <th>Marca</th>
                      <th>Tipo</th>
                      <th>Activo</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {vehiculos.map((v) => {
                      const id = v.transporteId ?? v.id
                      return (
                        <tr key={id}>
                          <td>{v.placa}</td>
                          <td className="small">{v.modelo ?? '—'}</td>
                          <td className="small">{v.marca ?? '—'}</td>
                          <td className="small">{v.tipoVehiculo ?? '—'}</td>
                          <td>{v.activo === false ? 'No' : 'Sí'}</td>
                          <td>
                            <CanButton I={ACTION.UPDATE} a={FEATURE.TRANSPORT_VEHICLES} type="button" className="linkish" onClick={() => void startEditVehiculo(v)}>
                              Editar
                            </CanButton>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!vehiculos.length ? <p className="muted pad">No hay vehículos.</p> : null}
              </div>
            )}
          </div>
          <div className="card detail-panel">
            <h2 className="card__title">Nuevo vehículo</h2>
            <form className="form-section pad" onSubmit={handleCreateVehiculo}>
              <label className="field">
                <span>Placa *</span>
                <input value={newVehiculo.placa} onChange={(e) => setNewVehiculo((s) => ({ ...s, placa: e.target.value }))} required />
              </label>
              <label className="field">
                <span>Modelo</span>
                <input value={newVehiculo.modelo} onChange={(e) => setNewVehiculo((s) => ({ ...s, modelo: e.target.value }))} />
              </label>
              <label className="field">
                <span>Marca</span>
                <input value={newVehiculo.marca} onChange={(e) => setNewVehiculo((s) => ({ ...s, marca: e.target.value }))} />
              </label>
              <label className="field">
                <span>Tipo vehículo</span>
                <input value={newVehiculo.tipoVehiculo} onChange={(e) => setNewVehiculo((s) => ({ ...s, tipoVehiculo: e.target.value }))} />
              </label>
              <label className="field field--inline">
                <input type="checkbox" checked={newVehiculo.activo} onChange={(e) => setNewVehiculo((s) => ({ ...s, activo: e.target.checked }))} />
                <span>Activo</span>
              </label>
              <div className="form-actions">
                <CanButton I={ACTION.CREATE} a={FEATURE.TRANSPORT_VEHICLES} type="submit" className="btn btn--primary">
                  Registrar
                </CanButton>
              </div>
            </form>
            {editingVehiculoId != null ? (
              <>
                <h2 className="card__title" style={{ marginTop: '1.25rem' }}>
                  Editar vehículo #{editingVehiculoId}
                </h2>
                <form className="form-section pad" onSubmit={handleSaveVehiculo}>
                  <label className="field">
                    <span>Placa</span>
                    <input value={editVehiculo.placa} onChange={(e) => setEditVehiculo((s) => ({ ...s, placa: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span>N.º serie</span>
                    <input value={editVehiculo.numeroSerie} onChange={(e) => setEditVehiculo((s) => ({ ...s, numeroSerie: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Modelo</span>
                    <input value={editVehiculo.modelo} onChange={(e) => setEditVehiculo((s) => ({ ...s, modelo: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Marca</span>
                    <input value={editVehiculo.marca} onChange={(e) => setEditVehiculo((s) => ({ ...s, marca: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Color</span>
                    <input value={editVehiculo.color} onChange={(e) => setEditVehiculo((s) => ({ ...s, color: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Descripción</span>
                    <textarea rows={2} value={editVehiculo.descripcion} onChange={(e) => setEditVehiculo((s) => ({ ...s, descripcion: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Capacidad</span>
                    <input inputMode="decimal" value={editVehiculo.capacidad} onChange={(e) => setEditVehiculo((s) => ({ ...s, capacidad: e.target.value }))} />
                  </label>
                  <label className="field field--inline">
                    <input type="checkbox" checked={editVehiculo.activo} onChange={(e) => setEditVehiculo((s) => ({ ...s, activo: e.target.checked }))} />
                    <span>Activo</span>
                  </label>
                  <div className="form-actions">
                    <CanButton I={ACTION.UPDATE} a={FEATURE.TRANSPORT_VEHICLES} type="submit" className="btn btn--primary">
                      Guardar cambios
                    </CanButton>
                    <button type="button" className="btn" onClick={() => setEditingVehiculoId(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <Can I="view" a={FEATURE.TRANSPORT_AUDIT}>
          <div className="card card--table pad" style={{ marginTop: '0.5rem' }}>
            <h2 className="card__title">Auditoría de flota</h2>
            <form
              className="form-row-2"
              onSubmit={(e) => {
                e.preventDefault()
                setAuditPage(0)
                void loadAuditoria()
              }}
            >
              <label className="field">
                <span>Tipo entidad</span>
                <select value={auditFilters.entityType} onChange={(e) => setAuditFilters((f) => ({ ...f, entityType: e.target.value }))}>
                  <option value="">(todos)</option>
                  <option value="Transporte">Vehículo / flota</option>
                </select>
              </label>
              <label className="field">
                <span>Entity ID</span>
                <input value={auditFilters.entityId} onChange={(e) => setAuditFilters((f) => ({ ...f, entityId: e.target.value }))} />
              </label>
              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <CanButton I={ACTION.AUDIT} a={FEATURE.TRANSPORT_AUDIT} type="submit" className="btn btn--primary">
                  Buscar
                </CanButton>
                <CanButton I={ACTION.AUDIT} a={FEATURE.TRANSPORT_AUDIT} type="button" className="btn" onClick={() => void loadAuditoria()}>
                  Actualizar
                </CanButton>
              </div>
            </form>
            {auditLoading ? (
              <p className="muted pad">Cargando…</p>
            ) : (
              <div className="table-wrap" style={{ marginTop: '1rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Acción</th>
                      <th>Entidad</th>
                      <th>ID</th>
                      <th>Actor</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(auditData?.content) ? auditData.content : []).map((row) => (
                      <tr key={row.id}>
                        <td className="small">{formatDateTime(row.occurredAt)}</td>
                        <td>{row.action}</td>
                        <td className="small">{row.entityType}</td>
                        <td className="small">{row.entityId ?? '—'}</td>
                        <td className="small">{row.actorEmail ?? '—'}</td>
                        <td className="small">{row.details ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Can>
      )}
    </>
  )
}
