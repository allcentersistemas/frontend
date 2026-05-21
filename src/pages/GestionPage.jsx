import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as systemApi from '../api/systemApi'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
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

function resolveGestionTab(raw) {
  if (raw === 'vehiculos' || raw === 'auditoria') return raw
  return 'vehiculos'
}

export function GestionPage() {
  const { allowedDashboard } = useAuth()
  const ability = useAppAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const vehiculoQueryHandled = useRef(false)

  const inventarioGuiasHref = allowedDashboard
    ? `/dashboard/${allowedDashboard}/inventario?area=guias`
    : '/inventario?area=guias'

  const [tab, setTab] = useState(() => resolveGestionTab(searchParams.get('tab')))
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const [vehiculos, setVehiculos] = useState([])
  const [vehiculosLoading, setVehiculosLoading] = useState(false)
  const [newVehiculo, setNewVehiculo] = useState(() => emptyVehicleForm())
  const [editingVehiculoId, setEditingVehiculoId] = useState(null)
  const [editVehiculo, setEditVehiculo] = useState(() => emptyVehicleForm())

  const selectTab = useCallback(
    (next) => {
      setTab(next)
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'auditoria') {
            p.set('tab', 'auditoria')
          } else if (next === 'vehiculos') {
            p.set('tab', 'vehiculos')
          } else {
            p.delete('tab')
          }
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    const fromUrl = resolveGestionTab(searchParams.get('tab'))
    setTab((current) => (current === fromUrl ? current : fromUrl))
  }, [searchParams])

  const [auditFilters, setAuditFilters] = useState({
    entityType: '',
    entityId: '',
    correlationId: '',
  })
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
    void loadVehiculos()
  }, [loadVehiculos])

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
    if (tab === 'auditoria' && !ability.can('view', FEATURE.TRANSPORT_AUDIT)) {
      setTab('vehiculos')
    }
  }, [ability, tab])

  useEffect(() => {
    if (tab !== 'auditoria') return
    void loadAuditoria()
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
    const fromRow = () =>
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
      fromRow()
    }
  }

  useEffect(() => {
    const raw = searchParams.get('vehiculo')
    if (!raw) {
      vehiculoQueryHandled.current = false
      return
    }
    if (vehiculoQueryHandled.current) return
    const id = Number(raw)
    if (!Number.isFinite(id) || id <= 0) return
    vehiculoQueryHandled.current = true
    selectTab('vehiculos')
    void (async () => {
      try {
        const fresh = await systemApi.getVehiculo(id)
        await startEditVehiculo(fresh)
      } catch {
        await startEditVehiculo({ transporteId: id, placa: '', marca: '' })
      } finally {
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev)
            p.delete('vehiculo')
            return p
          },
          { replace: true },
        )
      }
    })()
  }, [searchParams, setSearchParams, selectTab])

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
    <div className="page">
      <header className="page__head">
        <h1>Gestión</h1>
        <p className="page__lead">
          Flota de vehículos y auditoría operativa. Las <strong>guías de despacho</strong> (número automático, palés
          escaneados y hoja imprimible) están en{' '}
          <Link to={inventarioGuiasHref}>Inventario → Guías de despacho</Link>.
        </p>
      </header>

      {msg ? (
        <p className="muted" role="status">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="text-warn" role="alert">
          {err}
        </p>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Sección gestión">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'vehiculos'}
          className={tab === 'vehiculos' ? 'tabs__btn tabs__btn--on' : 'tabs__btn'}
          onClick={() => selectTab('vehiculos')}
        >
          Vehículos
        </button>
        <Can I="view" a={FEATURE.TRANSPORT_AUDIT}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'auditoria'}
            className={tab === 'auditoria' ? 'tabs__btn tabs__btn--on' : 'tabs__btn'}
            onClick={() => selectTab('auditoria')}
          >
            Auditoría
          </button>
        </Can>
      </div>

      {tab === 'vehiculos' ? (
        <div className="split" style={{ marginTop: '1rem' }}>
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
                            <CanButton
                              I={ACTION.UPDATE}
                              a={FEATURE.TRANSPORT_VEHICLES}
                              type="button"
                              className="linkish"
                              onClick={() => void startEditVehiculo(v)}
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

          <div className="card detail-panel">
            <h2 className="card__title">Nuevo vehículo</h2>
            <form className="form-section pad" onSubmit={handleCreateVehiculo}>
              <label className="field">
                <span>Placa *</span>
                <input
                  value={newVehiculo.placa}
                  onChange={(e) => setNewVehiculo((s) => ({ ...s, placa: e.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Modelo</span>
                <input
                  value={newVehiculo.modelo}
                  onChange={(e) => setNewVehiculo((s) => ({ ...s, modelo: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Marca</span>
                <input value={newVehiculo.marca} onChange={(e) => setNewVehiculo((s) => ({ ...s, marca: e.target.value }))} />
              </label>
              <label className="field">
                <span>Tipo vehículo</span>
                <input
                  value={newVehiculo.tipoVehiculo}
                  onChange={(e) => setNewVehiculo((s) => ({ ...s, tipoVehiculo: e.target.value }))}
                />
              </label>
              <label className="field field--inline">
                <input
                  type="checkbox"
                  checked={newVehiculo.activo}
                  onChange={(e) => setNewVehiculo((s) => ({ ...s, activo: e.target.checked }))}
                />
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
                    <input
                      value={editVehiculo.numeroSerie}
                      onChange={(e) => setEditVehiculo((s) => ({ ...s, numeroSerie: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Modelo</span>
                    <input
                      value={editVehiculo.modelo}
                      onChange={(e) => setEditVehiculo((s) => ({ ...s, modelo: e.target.value }))}
                    />
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
                    <textarea
                      rows={2}
                      value={editVehiculo.descripcion}
                      onChange={(e) => setEditVehiculo((s) => ({ ...s, descripcion: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Capacidad</span>
                    <input
                      inputMode="decimal"
                      value={editVehiculo.capacidad}
                      onChange={(e) => setEditVehiculo((s) => ({ ...s, capacidad: e.target.value }))}
                    />
                  </label>
                  <label className="field field--inline">
                    <input
                      type="checkbox"
                      checked={editVehiculo.activo}
                      onChange={(e) => setEditVehiculo((s) => ({ ...s, activo: e.target.checked }))}
                    />
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
          <div className="card card--table pad" style={{ marginTop: '1rem' }}>
            <h2 className="card__title">Auditoría y trazabilidad</h2>
            <p className="muted small form-hint">
              Historial de cambios en la flota (vehículos). El actor se toma del empleado en sesión.
            </p>
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
                <select
                  value={auditFilters.entityType}
                  onChange={(e) => setAuditFilters((f) => ({ ...f, entityType: e.target.value }))}
                >
                  <option value="">(todos)</option>
                  <option value="Transporte">Vehículo / flota</option>
                </select>
              </label>
              <label className="field">
                <span>Entity ID</span>
                <input
                  value={auditFilters.entityId}
                  onChange={(e) => setAuditFilters((f) => ({ ...f, entityId: e.target.value }))}
                  placeholder="ID del vehículo"
                />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Correlation ID</span>
                <input
                  value={auditFilters.correlationId}
                  onChange={(e) => setAuditFilters((f) => ({ ...f, correlationId: e.target.value }))}
                  placeholder="Opcional"
                />
              </label>
              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <CanButton I={ACTION.AUDIT} a={FEATURE.TRANSPORT_AUDIT} type="submit" className="btn btn--primary">
                  Buscar
                </CanButton>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setAuditFilters({ entityType: '', entityId: '', correlationId: '' })
                    setAuditPage(0)
                  }}
                >
                  Limpiar filtros
                </button>
                <CanButton I={ACTION.AUDIT} a={FEATURE.TRANSPORT_AUDIT} type="button" className="btn" onClick={() => void loadAuditoria()}>
                  Actualizar
                </CanButton>
              </div>
            </form>

            {auditLoading ? (
              <p className="muted pad">Cargando auditoría…</p>
            ) : (
              <>
                <div className="table-wrap" style={{ marginTop: '1rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Acción</th>
                        <th>Entidad</th>
                        <th>ID</th>
                        <th>Correlation</th>
                        <th>Actor</th>
                        <th>IP origen</th>
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
                          <td className="small">{row.correlationId ?? '—'}</td>
                          <td className="small">
                            {row.actorEmail ?? (row.actorEmployeeId != null ? `#${row.actorEmployeeId}` : '—')}
                          </td>
                          <td className="small font-mono" title={row.clientIpPublic ?? ''}>
                            {row.clientIpPublic ?? '—'}
                          </td>
                          <td className="small" style={{ maxWidth: '280px', wordBreak: 'break-word' }}>
                            {row.details ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!auditData?.content?.length ? <p className="muted pad">Sin registros para los filtros actuales.</p> : null}
                </div>
                {auditData && typeof auditData.totalPages === 'number' ? (
                  <div className="form-actions" style={{ marginTop: '1rem' }}>
                    <span className="muted small">
                      Página {(auditData.number ?? 0) + 1} de {auditData.totalPages ?? 1} · {auditData.totalElements ?? 0}{' '}
                      eventos
                    </span>
                    <button
                      type="button"
                      className="btn"
                      disabled={auditPage <= 0}
                      onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={
                        auditData.last === true ||
                        (auditData.totalPages != null && auditPage >= auditData.totalPages - 1)
                      }
                      onClick={() => setAuditPage((p) => p + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </Can>
      )}
    </div>
  )
}
