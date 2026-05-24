import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { CanButton } from '../components/CanButton'
import { DetailModal } from '../components/DetailModal'

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

function vehiclePayload(form) {
  return {
    placa: form.placa.trim(),
    numeroSerie: form.numeroSerie.trim() || undefined,
    modelo: form.modelo.trim() || undefined,
    marca: form.marca.trim() || undefined,
    color: form.color.trim() || undefined,
    descripcion: form.descripcion.trim() || undefined,
    tipoVehiculo: form.tipoVehiculo.trim() || undefined,
    capacidad: toNumOrNull(form.capacidad) ?? undefined,
    activo: form.activo,
  }
}

/** Pestaña vehículos o auditoría de flota (sin cabecera de página). */
export function GestionFlotaPanel({ tab, initialVehiculoId = null, onVehiculoConsumed }) {
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const [vehiculos, setVehiculos] = useState([])
  const [vehiculosLoading, setVehiculosLoading] = useState(false)
  const [vehicleModal, setVehicleModal] = useState(null)
  const [vehicleForm, setVehicleForm] = useState(() => emptyVehicleForm())
  const [vehicleBusy, setVehicleBusy] = useState(false)

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

  function openCreateModal() {
    setVehicleForm(emptyVehicleForm())
    setVehicleModal({ mode: 'create' })
    setErr(null)
  }

  async function openEditModal(row) {
    const id = row.transporteId ?? row.id
    setVehicleModal({ mode: 'edit', id })
    setErr(null)
    try {
      const fresh = await systemApi.getVehiculo(id)
      setVehicleForm({
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
      setVehicleForm({
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
        await openEditModal(fresh)
      } catch {
        await openEditModal({ transporteId: initialVehiculoId, placa: '', marca: '' })
      } finally {
        onVehiculoConsumed?.()
      }
    })()
  }, [initialVehiculoId, onVehiculoConsumed])

  function closeVehicleModal() {
    setVehicleModal(null)
    setVehicleForm(emptyVehicleForm())
  }

  async function handleSubmitVehicle(e) {
    e.preventDefault()
    if (!vehicleModal) return
    setVehicleBusy(true)
    setErr(null)
    try {
      if (vehicleModal.mode === 'create') {
        await systemApi.createVehiculo(vehiclePayload(vehicleForm))
        showMsg('Vehículo registrado.')
      } else {
        await systemApi.updateVehiculo(vehicleModal.id, vehiclePayload(vehicleForm))
        showMsg('Vehículo actualizado.')
      }
      closeVehicleModal()
      await loadVehiculos()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo guardar el vehículo')
    } finally {
      setVehicleBusy(false)
    }
  }

  const vehicleModalTitle =
    vehicleModal?.mode === 'create'
      ? 'Nuevo vehículo'
      : vehicleModal?.mode === 'edit'
        ? `Editar vehículo #${vehicleModal.id}`
        : ''

  return (
    <>
      {msg ? <p className="muted" role="status">{msg}</p> : null}
      {err ? <p className="text-warn" role="alert">{err}</p> : null}

      {tab === 'vehiculos' ? (
        <>
          <div className="card" style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '1rem' }}>
              <h2 className="card__title" style={{ margin: 0 }}>
                Flota
              </h2>
              <CanButton I={ACTION.CREATE} a={FEATURE.TRANSPORT_VEHICLES} type="button" className="btn btn--primary" onClick={openCreateModal}>
                + Nuevo vehículo
              </CanButton>
            </div>
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
                            <CanButton
                              I={ACTION.UPDATE}
                              a={FEATURE.TRANSPORT_VEHICLES}
                              type="button"
                              className="linkish"
                              onClick={() => void openEditModal(v)}
                            >
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

          <DetailModal open={vehicleModal != null} title={vehicleModalTitle} subtitle="Gestión de flota" onClose={closeVehicleModal}>
            <form className="form-section pad" onSubmit={(e) => void handleSubmitVehicle(e)}>
              <label className="field">
                <span>Placa *</span>
                <input
                  value={vehicleForm.placa}
                  onChange={(e) => setVehicleForm((s) => ({ ...s, placa: e.target.value }))}
                  required
                />
              </label>
              {vehicleModal?.mode === 'edit' ? (
                <label className="field">
                  <span>N.º serie</span>
                  <input
                    value={vehicleForm.numeroSerie}
                    onChange={(e) => setVehicleForm((s) => ({ ...s, numeroSerie: e.target.value }))}
                  />
                </label>
              ) : null}
              <label className="field">
                <span>Modelo</span>
                <input value={vehicleForm.modelo} onChange={(e) => setVehicleForm((s) => ({ ...s, modelo: e.target.value }))} />
              </label>
              <label className="field">
                <span>Marca</span>
                <input value={vehicleForm.marca} onChange={(e) => setVehicleForm((s) => ({ ...s, marca: e.target.value }))} />
              </label>
              {vehicleModal?.mode === 'edit' ? (
                <>
                  <label className="field">
                    <span>Color</span>
                    <input value={vehicleForm.color} onChange={(e) => setVehicleForm((s) => ({ ...s, color: e.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Descripción</span>
                    <textarea
                      rows={2}
                      value={vehicleForm.descripcion}
                      onChange={(e) => setVehicleForm((s) => ({ ...s, descripcion: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Capacidad</span>
                    <input
                      inputMode="decimal"
                      value={vehicleForm.capacidad}
                      onChange={(e) => setVehicleForm((s) => ({ ...s, capacidad: e.target.value }))}
                    />
                  </label>
                </>
              ) : null}
              <label className="field">
                <span>Tipo vehículo</span>
                <input
                  value={vehicleForm.tipoVehiculo}
                  onChange={(e) => setVehicleForm((s) => ({ ...s, tipoVehiculo: e.target.value }))}
                />
              </label>
              <label className="field field--inline">
                <input
                  type="checkbox"
                  checked={vehicleForm.activo}
                  onChange={(e) => setVehicleForm((s) => ({ ...s, activo: e.target.checked }))}
                />
                <span>Activo</span>
              </label>
              <div className="form-actions">
                <CanButton
                  I={vehicleModal?.mode === 'create' ? ACTION.CREATE : ACTION.UPDATE}
                  a={FEATURE.TRANSPORT_VEHICLES}
                  type="submit"
                  className="btn btn--primary"
                  disabled={vehicleBusy}
                >
                  {vehicleBusy ? 'Guardando…' : vehicleModal?.mode === 'create' ? 'Registrar' : 'Guardar cambios'}
                </CanButton>
                <button type="button" className="btn btn--ghost" onClick={closeVehicleModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </DetailModal>
        </>
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
