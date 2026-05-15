import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as employeeApi from '../api/employeeApi'
import * as transportApi from '../api/transportApi'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
import { normalizeRoleName } from '../auth/roles'
import { CanButton } from '../components/CanButton'

const ESTADOS_CARGA = ['BORRADOR', 'CONFIRMADA', 'EN_RUTA', 'ENTREGADA', 'CANCELADA']
const DRIVER_ROLES = new Set(['CONDUCTOR', 'CHOFER', 'DRIVER', 'ROLE_CONDUCTOR', 'ROLE_CHOFER'])

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

function isDriverEmployee(row) {
  if (row?.active === false) return false
  return (row?.roles ?? []).some((role) => {
    const normalized = normalizeRoleName(String(role?.name ?? role ?? ''))
    return DRIVER_ROLES.has(normalized) || normalized.includes('CHOFER') || normalized.includes('CONDUCTOR')
  })
}

function employeeFullName(row) {
  return [row?.firstName ?? row?.nombres ?? row?.name, row?.lastName ?? row?.apellidos, row?.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function employeeDocument(row) {
  return row?.documentNumber ?? row?.documento ?? row?.dni ?? row?.identityNumber ?? ''
}

export function TransportPage() {
  const { employee } = useAuth()
  const ability = useAppAbility()
  const creadoPor = employee?.id ?? null
  const [searchParams, setSearchParams] = useSearchParams()
  const vehiculoQueryHandled = useRef(false)

  const [tab, setTab] = useState('vehiculos')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const [vehiculos, setVehiculos] = useState([])
  const [vehiculosLoading, setVehiculosLoading] = useState(false)
  const [conductores, setConductores] = useState([])
  const [newVehiculo, setNewVehiculo] = useState(() => emptyVehicleForm())
  const [editingVehiculoId, setEditingVehiculoId] = useState(null)
  const [editVehiculo, setEditVehiculo] = useState(() => emptyVehicleForm())

  const [cargas, setCargas] = useState([])
  const [cargasLoading, setCargasLoading] = useState(false)
  const [selectedCargaId, setSelectedCargaId] = useState(null)
  const [cargaDetail, setCargaDetail] = useState(null)
  const [cargaDetailLoading, setCargaDetailLoading] = useState(false)

  const [newCarga, setNewCarga] = useState({
    transporteId: '',
    choferEmployeeId: '',
    choferNombre: '',
    choferDocumento: '',
    notas: '',
    fechaSalida: '',
  })

  const [cargaEdit, setCargaEdit] = useState({
    choferNombre: '',
    choferDocumento: '',
    estado: 'BORRADOR',
    notas: '',
    fechaSalida: '',
    fechaEntrega: '',
  })

  const [addPale, setAddPale] = useState({
    paleEnvioId: '',
    paleCodigo: '',
    cantidad: '1',
    observacion: '',
  })

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
      const list = await transportApi.listVehiculos()
      setVehiculos(Array.isArray(list) ? list : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar vehículos')
    } finally {
      setVehiculosLoading(false)
    }
  }, [])

  const loadCargas = useCallback(async () => {
    setCargasLoading(true)
    setErr(null)
    try {
      const list = await transportApi.listCargas()
      setCargas(Array.isArray(list) ? list : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar cargas')
    } finally {
      setCargasLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVehiculos()
    void loadCargas()
  }, [loadVehiculos, loadCargas])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await employeeApi.listEmployees()
        if (!cancelled) setConductores((Array.isArray(list) ? list : []).filter(isDriverEmployee))
      } catch {
        if (!cancelled) setConductores([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadAuditoria = useCallback(async () => {
    setAuditLoading(true)
    setErr(null)
    try {
      const data = await transportApi.listTransportAuditoria({
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

  const loadCargaDetail = useCallback(async (id) => {
    if (id == null) {
      setCargaDetail(null)
      return
    }
    setCargaDetailLoading(true)
    setErr(null)
    try {
      const data = await transportApi.getCarga(id)
      setCargaDetail(data)
      const h = data?.carga
      if (h) {
        setCargaEdit({
          choferNombre: h.choferNombre ?? '',
          choferDocumento: h.choferDocumento ?? '',
          estado: h.estado ?? 'BORRADOR',
          notas: h.notas ?? '',
          fechaSalida: h.fechaSalida ? String(h.fechaSalida).slice(0, 16) : '',
          fechaEntrega: h.fechaEntrega ? String(h.fechaEntrega).slice(0, 16) : '',
        })
      }
    } catch (e) {
      setCargaDetail(null)
      setErr(e instanceof Error ? e.message : 'Error al cargar la carga')
    } finally {
      setCargaDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCargaDetail(selectedCargaId)
  }, [selectedCargaId, loadCargaDetail])

  const header = cargaDetail?.carga
  const detalles = useMemo(
    () => (Array.isArray(cargaDetail?.detalles) ? cargaDetail.detalles : []),
    [cargaDetail],
  )

  async function handleCreateVehiculo(e) {
    e.preventDefault()
    setErr(null)
    try {
      await transportApi.createVehiculo({
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
      const fresh = await transportApi.getVehiculo(id)
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
    setTab('vehiculos')
    void (async () => {
      try {
        const fresh = await transportApi.getVehiculo(id)
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
  }, [searchParams, setSearchParams])

  async function handleSaveVehiculo(e) {
    e.preventDefault()
    if (editingVehiculoId == null) return
    setErr(null)
    try {
      await transportApi.updateVehiculo(editingVehiculoId, {
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

  async function handleCreateCarga(e) {
    e.preventDefault()
    const tid = Number(newCarga.transporteId)
    if (!Number.isFinite(tid) || tid <= 0) {
      setErr('Selecciona un vehículo válido.')
      return
    }
    setErr(null)
    try {
      const body = {
        transporteId: tid,
        choferNombre: newCarga.choferNombre.trim(),
        choferDocumento: newCarga.choferDocumento.trim() || undefined,
        notas: newCarga.notas.trim() || undefined,
        creadoPor: creadoPor ?? undefined,
      }
      if (newCarga.fechaSalida.trim()) {
        body.fechaSalida = `${newCarga.fechaSalida.trim()}:00`
      }
      const created = await transportApi.createCarga(body)
      setNewCarga({
        transporteId: '',
        choferEmployeeId: '',
        choferNombre: '',
        choferDocumento: '',
        notas: '',
        fechaSalida: '',
      })
      showMsg('Carga creada (estado BORRADOR).')
      await loadCargas()
      const newId = created?.carga?.transporteCargaId
      if (newId != null) setSelectedCargaId(newId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear la carga')
    }
  }

  async function handleUpdateCarga(e) {
    e.preventDefault()
    if (selectedCargaId == null) return
    setErr(null)
    try {
      const body = {
        choferNombre: cargaEdit.choferNombre.trim() || undefined,
        choferDocumento: cargaEdit.choferDocumento.trim() || undefined,
        estado: cargaEdit.estado,
        notas: cargaEdit.notas.trim() || undefined,
      }
      if (cargaEdit.fechaSalida.trim()) {
        body.fechaSalida = `${cargaEdit.fechaSalida.trim()}:00`
      }
      if (cargaEdit.fechaEntrega.trim()) {
        body.fechaEntrega = `${cargaEdit.fechaEntrega.trim()}:00`
      }
      await transportApi.updateCarga(selectedCargaId, body)
      showMsg('Carga actualizada.')
      await loadCargas()
      await loadCargaDetail(selectedCargaId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo actualizar la carga')
    }
  }

  async function handleAddPale(e) {
    e.preventDefault()
    if (selectedCargaId == null) return
    const paleId = Number(addPale.paleEnvioId)
    const qty = Number(addPale.cantidad)
    if (!Number.isFinite(paleId) || paleId <= 0) {
      setErr('Indica el ID del pale (envío) a cargar.')
      return
    }
    if (!Number.isFinite(qty) || qty < 1) {
      setErr('La cantidad debe ser al menos 1.')
      return
    }
    setErr(null)
    try {
      await transportApi.addCargaDetalle(selectedCargaId, {
        paleEnvioId: paleId,
        paleCodigo: addPale.paleCodigo.trim() || undefined,
        cantidad: qty,
        observacion: addPale.observacion.trim() || undefined,
      })
      setAddPale({ paleEnvioId: '', paleCodigo: '', cantidad: '1', observacion: '' })
      showMsg('Pale agregado a la carga (debe estar cerrado en el servicio de pales).')
      await loadCargas()
      await loadCargaDetail(selectedCargaId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo agregar el pale')
    }
  }

  async function handleRemoveDetalle(detalleId) {
    if (selectedCargaId == null) return
    if (!window.confirm('¿Quitar este pale de la carga?')) return
    setErr(null)
    try {
      await transportApi.removeCargaDetalle(selectedCargaId, detalleId)
      showMsg('Pale quitado de la carga.')
      await loadCargas()
      await loadCargaDetail(selectedCargaId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo quitar')
    }
  }

  const vehiculosActivos = useMemo(
    () => vehiculos.filter((v) => v.activo !== false),
    [vehiculos],
  )

  return (
    <div className="page">
      <header className="page__head">
        <h1>Transporte</h1>
        <p className="page__lead">
          Vehículos, cargas y <strong>auditoría</strong> desde{' '}
          <code className="code-inline">module-transport</code>. Cada cambio queda registrado con actor
          (empleado en sesión), instante y detalle. Los pales deben estar cerrados según validación del
          backend.
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

      <div className="tabs" role="tablist" aria-label="Sección transporte">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'vehiculos'}
          className={tab === 'vehiculos' ? 'tabs__btn tabs__btn--on' : 'tabs__btn'}
          onClick={() => setTab('vehiculos')}
        >
          Vehículos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cargas'}
          className={tab === 'cargas' ? 'tabs__btn tabs__btn--on' : 'tabs__btn'}
          onClick={() => setTab('cargas')}
        >
          Cargas
        </button>
        <Can I="view" a={FEATURE.TRANSPORT_AUDIT}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'auditoria'}
            className={tab === 'auditoria' ? 'tabs__btn tabs__btn--on' : 'tabs__btn'}
            onClick={() => setTab('auditoria')}>
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
                      <th/>
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
                <input
                    value={newVehiculo.marca}
                    onChange={(e) => setNewVehiculo((s) => ({ ...s, marca: e.target.value }))}
                />
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
                    <input
                      value={editVehiculo.placa}
                      onChange={(e) => setEditVehiculo((s) => ({ ...s, placa: e.target.value }))}
                    />
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
                    <input
                        value={editVehiculo.marca}
                        onChange={(e) => setEditVehiculo((s) => ({ ...s, marca: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Color</span>
                    <input
                      value={editVehiculo.color}
                      onChange={(e) => setEditVehiculo((s) => ({ ...s, color: e.target.value }))}
                    />
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
      ) : tab === 'cargas' ? (
        <div className="split" style={{ marginTop: '1rem' }}>
          <div className="card card--table">
            <h2 className="card__title pad">Cargas</h2>
            {cargasLoading ? (
              <p className="muted pad">Cargando…</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Placa</th>
                      <th>Chofer</th>
                      <th>Estado</th>
                      <th>Pales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargas.map((c) => {
                      const id = c.transporteCargaId ?? c.id
                      return (
                        <tr
                          key={id}
                          className={selectedCargaId === id ? 'table__row--active' : undefined}
                        >
                          <td>
                            <button type="button" className="linkish" onClick={() => setSelectedCargaId(id)}>
                              {id}
                            </button>
                          </td>
                          <td>{c.placa ?? '—'}</td>
                          <td className="small">{c.choferNombre}</td>
                          <td>{c.estado}</td>
                          <td>{c.totalPales ?? 0}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!cargas.length ? <p className="muted pad">No hay cargas.</p> : null}
              </div>
            )}

            <h3 className="card__title pad" style={{ borderTop: '1px solid var(--border, #e5e5e5)' }}>
              Nueva carga
            </h3>
            <form className="form-section pad" onSubmit={handleCreateCarga}>
              <label className="field">
                <span>Vehículo *</span>
                <select
                  value={newCarga.transporteId}
                  onChange={(e) => setNewCarga((s) => ({ ...s, transporteId: e.target.value }))}
                  required
                >
                  <option value="">— Elegir —</option>
                  {vehiculosActivos.map((v) => {
                    const id = v.transporteId ?? v.id
                    return (
                      <option key={id} value={id}>
                        {v.placa}
                        {v.modelo ? ` · ${v.modelo}` : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="field">
                <span>Chofer empleado *</span>
                <select
                  value={newCarga.choferEmployeeId}
                  onChange={(e) => {
                    const selected = conductores.find((row) => String(row.id) === e.target.value)
                    setNewCarga((s) => ({
                      ...s,
                      choferEmployeeId: e.target.value,
                      choferNombre: selected ? employeeFullName(selected) || selected.email || '' : '',
                      choferDocumento: selected ? employeeDocument(selected) : '',
                    }))
                  }}
                  required
                >
                  <option value="">— Elegir chofer —</option>
                  {conductores.map((row) => (
                    <option key={row.id} value={row.id}>
                      {employeeFullName(row) || row.email || `Empleado #${row.id}`}
                      {employeeDocument(row) ? ` · ${employeeDocument(row)}` : ''}
                    </option>
                  ))}
                </select>
                {!conductores.length ? (
                  <small className="text-warn">No hay empleados activos con rol Chofer/Conductor.</small>
                ) : (
                  <small className="muted">Solo se listan empleados con rol de chofer o conductor.</small>
                )}
              </label>

              <label className="field">
                <span>Notas</span>
                <textarea
                  rows={2}
                  value={newCarga.notas}
                  onChange={(e) => setNewCarga((s) => ({ ...s, notas: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Salida programada</span>
                <input
                  type="datetime-local"
                  value={newCarga.fechaSalida}
                  onChange={(e) => setNewCarga((s) => ({ ...s, fechaSalida: e.target.value }))}
                />
              </label>
              {creadoPor == null ? (
                <p className="muted small">Sin sesión de empleado: la carga se creará sin creadoPor.</p>
              ) : null}
              <div className="form-actions">
                <CanButton I={ACTION.CREATE} a={FEATURE.TRANSPORT_LOADS} type="submit" className="btn btn--primary">
                  Crear carga
                </CanButton>
              </div>
            </form>
          </div>

          <aside className="card detail-panel">
            <h2 className="card__title">Detalle de carga</h2>
            {selectedCargaId == null ? (
              <p className="muted pad">Selecciona una carga en la tabla.</p>
            ) : cargaDetailLoading ? (
              <p className="muted pad">Cargando…</p>
            ) : header ? (
              <div className="detail pad">
                <dl className="kv">
                  <div>
                    <dt>ID</dt>
                    <dd>{header.transporteCargaId ?? selectedCargaId}</dd>
                  </div>
                  <div>
                    <dt>Vehículo</dt>
                    <dd>
                      {header.placa ?? '—'} (#{header.transporteId ?? '—'})
                    </dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{header.estado}</dd>
                  </div>
                  <div>
                    <dt>Pales en carga</dt>
                    <dd>{header.totalPales ?? detalles.length}</dd>
                  </div>
                </dl>



                <form className="form-section" onSubmit={handleUpdateCarga} style={{ marginTop: '1rem' }}>
                  <label className="field">
                    <span>Chofer</span>
                    <input
                      value={cargaEdit.choferNombre}
                      onChange={(e) => setCargaEdit((s) => ({ ...s, choferNombre: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Documento</span>
                    <input
                      value={cargaEdit.choferDocumento}
                      onChange={(e) => setCargaEdit((s) => ({ ...s, choferDocumento: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Estado</span>
                    <select
                      value={cargaEdit.estado}
                      onChange={(e) => setCargaEdit((s) => ({ ...s, estado: e.target.value }))}
                    >
                      {ESTADOS_CARGA.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Notas</span>
                    <textarea
                      rows={2}
                      value={cargaEdit.notas}
                      onChange={(e) => setCargaEdit((s) => ({ ...s, notas: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Salida</span>
                    <input
                      type="datetime-local"
                      value={cargaEdit.fechaSalida}
                      onChange={(e) => setCargaEdit((s) => ({ ...s, fechaSalida: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Entrega</span>
                    <input
                      type="datetime-local"
                      value={cargaEdit.fechaEntrega}
                      onChange={(e) => setCargaEdit((s) => ({ ...s, fechaEntrega: e.target.value }))}
                    />
                  </label>
                  <div className="form-actions">
                    <CanButton I={ACTION.UPDATE} a={FEATURE.TRANSPORT_LOADS} type="submit" className="btn btn--primary">
                      Guardar carga
                    </CanButton>
                  </div>
                </form>

                <h3 className="detail__h">Agregar pale</h3>
                <p className="muted small">
                  Usa el mismo ID que en la pantalla de pales (columna interna). El pale debe estar{' '}
                  <strong>cerrado</strong>.
                </p>
                <form className="form-section" onSubmit={handleAddPale}>
                  <label className="field">
                    <span>ID pale (envío) *</span>
                    <input
                      inputMode="numeric"
                      value={addPale.paleEnvioId}
                      onChange={(e) => setAddPale((s) => ({ ...s, paleEnvioId: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Código (opcional)</span>
                    <input
                      value={addPale.paleCodigo}
                      onChange={(e) => setAddPale((s) => ({ ...s, paleCodigo: e.target.value }))}
                      placeholder="Se autocompleta si lo dejas vacío"
                    />
                  </label>
                  <label className="field">
                    <span>Cantidad *</span>
                    <input
                      inputMode="numeric"
                      value={addPale.cantidad}
                      onChange={(e) => setAddPale((s) => ({ ...s, cantidad: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Observación</span>
                    <input
                      value={addPale.observacion}
                      onChange={(e) => setAddPale((s) => ({ ...s, observacion: e.target.value }))}
                    />
                  </label>
                  <div className="form-actions">
                    <CanButton I={ACTION.CREATE} a={FEATURE.TRANSPORT_LOADS} type="submit" className="btn btn--primary">
                      Añadir a la carga
                    </CanButton>
                  </div>
                </form>

                <h3 className="detail__h">Pales en esta carga ({detalles.length})</h3>
                <ul className="detail-list">
                  {detalles.map((d) => {
                    const did = d.transporteCargaDetalleId ?? d.id
                    return (
                      <li key={did}>
                        <span className="detail-list__code">
                          {d.paleCodigo ?? '—'} · ID {d.paleEnvioId} ×{d.cantidad ?? 1}
                        </span>
                        <span className="muted small">{formatDateTime(d.fechaRegistro)}</span>
                        <CanButton
                          I={ACTION.DELETE}
                          a={FEATURE.TRANSPORT_LOADS}
                          type="button"
                          className="linkish small"
                          style={{ marginLeft: '0.5rem' }}
                          onClick={() => void handleRemoveDetalle(did)}
                        >
                          Quitar
                        </CanButton>
                      </li>
                    )
                  })}
                </ul>
                {!detalles.length ? <p className="muted small">Aún no hay pales asignados.</p> : null}
              </div>
            ) : (
              <p className="text-warn pad">No se pudo cargar el detalle.</p>
            )}
          </aside>
        </div>
      ) : (
        <Can I="view" a={FEATURE.TRANSPORT_AUDIT}>
        <div className="card card--table pad" style={{ marginTop: '1rem' }}>
          <h2 className="card__title">Auditoría y trazabilidad</h2>
          <p className="muted small form-hint">
            Filtra por tipo de entidad, ID concreto o por <strong>correlation ID</strong> (= ID de carga) para ver
            todo el historial de una expedición. El actor se toma del empleado en sesión (cabeceras enviadas por la
            app).
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
                <option value="Transporte">Transporte</option>
                <option value="TransporteCarga">TransporteCarga</option>
                <option value="TransporteCargaDetalle">TransporteCargaDetalle</option>
              </select>
            </label>
            <label className="field">
              <span>Entity ID</span>
              <input
                value={auditFilters.entityId}
                onChange={(e) => setAuditFilters((f) => ({ ...f, entityId: e.target.value }))}
                placeholder="p. ej. ID vehículo o detalle"
              />
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>Correlation ID (ID de carga)</span>
              <input
                value={auditFilters.correlationId}
                onChange={(e) => setAuditFilters((f) => ({ ...f, correlationId: e.target.value }))}
                placeholder="Mismo ID que seleccionas en la pestaña Cargas"
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
                {!auditData?.content?.length ? (
                  <p className="muted pad">Sin registros para los filtros actuales.</p>
                ) : null}
              </div>
              {auditData && typeof auditData.totalPages === 'number' ? (
                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <span className="muted small">
                    Página {(auditData.number ?? 0) + 1} de {auditData.totalPages ?? 1} ·{' '}
                    {auditData.totalElements ?? 0} eventos
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
