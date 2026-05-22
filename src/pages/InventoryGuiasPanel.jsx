import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as systemApi from '../api/systemApi'
import { CanButton } from '../components/CanButton'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { useAuth } from '../auth/AuthContext'
import { printGuiaDespacho } from '../utils/printGuiaDespacho'

const ESTADOS_GUIA = ['CREADA', 'EN_CAMINO', 'BORRADOR', 'CERRADA']
const UNIDAD_PIEZAS = 'piezas'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function formatGuiaOrigen(h) {
  if (!h) return '—'
  if (h.sucursalOrigenNombre) return h.sucursalOrigenNombre
  return '—'
}

function formatGuiaDestino(h) {
  if (!h) return '—'
  if (h.ubicacionDestinoNombre) return `Obra: ${h.ubicacionDestinoNombre}`
  if (h.sucursalDestinoNombre) return `Sucursal: ${h.sucursalDestinoNombre}`
  return '—'
}

function paleLineFromPale(p) {
  const resumen = (p.ordenesResumen ?? '').trim()
  const descripcion = resumen || (p.codigo ?? '').trim() || `Palé ${p.paleId ?? p.id}`
  const piezas = p.cantidadPiezas ?? 0
  return {
    descripcion,
    unidadMedida: UNIDAD_PIEZAS,
    cantidad: String(piezas),
  }
}

function resolveGuiaSub(raw) {
  return raw === 'create' ? 'create' : 'list'
}

function newCreateRow() {
  return { key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, paleId: '' }
}

function paleOptionLabel(p) {
  const codigo = (p.codigo ?? '').trim() || `#${p.paleId ?? p.id}`
  const resumen = (p.ordenesResumen ?? '').trim()
  return resumen ? `${codigo} — ${resumen}` : codigo
}

function findPaleById(pales, paleId) {
  if (paleId === '' || paleId == null) return null
  const id = Number(paleId)
  if (!Number.isFinite(id)) return null
  return pales.find((p) => (p.paleId ?? p.id) === id) ?? null
}

export function InventoryGuiasPanel() {
  const { employee } = useAuth()
  const creadoPor = employee?.id ?? null
  const [searchParams, setSearchParams] = useSearchParams()

  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const [guiaSub, setGuiaSubState] = useState(() => resolveGuiaSub(searchParams.get('sub')))

  const [guias, setGuias] = useState([])
  const [guiasLoading, setGuiasLoading] = useState(false)
  const [selectedGuiaId, setSelectedGuiaId] = useState(null)
  const [guiaDetail, setGuiaDetail] = useState(null)
  const [guiaDetailLoading, setGuiaDetailLoading] = useState(false)

  const [branches, setBranches] = useState([])
  const [locations, setLocations] = useState([])
  const [destinoEsObra, setDestinoEsObra] = useState(false)
  const [newGuia, setNewGuia] = useState({
    notas: '',
    destinationBranchId: '',
    destinationLocationId: '',
  })
  const [createRows, setCreateRows] = useState(() => [newCreateRow()])
  const [creatingGuia, setCreatingGuia] = useState(false)

  const [guiaEdit, setGuiaEdit] = useState({ estado: 'CREADA', notas: '' })

  const [palesEscaneados, setPalesEscaneados] = useState([])
  const [palesLoading, setPalesLoading] = useState(false)
  const [draftPaleCodigo, setDraftPaleCodigo] = useState('')
  const [addingPale, setAddingPale] = useState(false)

  const setGuiaSub = useCallback(
    (next) => {
      setGuiaSubState(next)
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('area', 'guias')
          if (next === 'list') {
            p.delete('sub')
          } else {
            p.set('sub', next)
          }
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    setGuiaSubState(resolveGuiaSub(searchParams.get('sub')))
  }, [searchParams])

  const showMsg = useCallback((text) => {
    setErr(null)
    setMsg(text)
    window.setTimeout(() => setMsg(null), 4000)
  }, [])

  const loadGuias = useCallback(async () => {
    setGuiasLoading(true)
    setErr(null)
    try {
      const list = await systemApi.listGuias()
      setGuias(Array.isArray(list) ? list : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar guías')
    } finally {
      setGuiasLoading(false)
    }
  }, [])

  const loadCatalogs = useCallback(async () => {
    try {
      const [b, l] = await Promise.all([systemApi.listBranches(), systemApi.listLocations()])
      setBranches(Array.isArray(b) ? b : [])
      setLocations(Array.isArray(l) ? l : [])
    } catch {
      setBranches([])
      setLocations([])
    }
  }, [])

  const loadPalesEscaneados = useCallback(async (codigoQuery) => {
    setPalesLoading(true)
    try {
      const list = await systemApi.listGuiasPalesEscaneados(codigoQuery)
      setPalesEscaneados(Array.isArray(list) ? list : [])
    } catch (e) {
      setPalesEscaneados([])
      if (!codigoQuery) {
        setErr(e instanceof Error ? e.message : 'No se pudieron cargar palés escaneados')
      }
    } finally {
      setPalesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGuias()
    void loadCatalogs()
  }, [loadGuias, loadCatalogs])

  const loadGuiaDetail = useCallback(async (id) => {
    if (id == null) {
      setGuiaDetail(null)
      return
    }
    setGuiaDetailLoading(true)
    setErr(null)
    try {
      const data = await systemApi.getGuia(id)
      setGuiaDetail(data)
      const h = data?.guia
      if (h) {
        setGuiaEdit({
          estado: h.estado ?? 'CREADA',
          notas: h.notas ?? '',
        })
      }
    } catch (e) {
      setGuiaDetail(null)
      setErr(e instanceof Error ? e.message : 'Error al cargar la guía')
    } finally {
      setGuiaDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (guiaSub === 'list') {
      void loadGuiaDetail(selectedGuiaId)
    }
  }, [selectedGuiaId, loadGuiaDetail, guiaSub])

  useEffect(() => {
    if (guiaSub === 'list' && selectedGuiaId != null) {
      void loadPalesEscaneados(draftPaleCodigo.trim() || undefined)
    }
  }, [guiaSub, selectedGuiaId, draftPaleCodigo, loadPalesEscaneados])

  useEffect(() => {
    if (guiaSub === 'create') {
      void loadPalesEscaneados('')
    }
  }, [guiaSub, loadPalesEscaneados])

  const createPaleIdsUsed = useMemo(
    () => new Set(createRows.map((r) => r.paleId).filter((id) => id !== '' && id != null)),
    [createRows],
  )

  function palesForCreateRow(rowPaleId) {
    return palesEscaneados.filter((p) => {
      const pid = String(p.paleId ?? p.id)
      return pid === String(rowPaleId) || !createPaleIdsUsed.has(pid)
    })
  }

  const header = guiaDetail?.guia
  const detalles = useMemo(
    () => (Array.isArray(guiaDetail?.detalles) ? guiaDetail.detalles : []),
    [guiaDetail],
  )
  const paleIdsEnGuia = useMemo(
    () => new Set(detalles.map((d) => d.paleId).filter((id) => id != null)),
    [detalles],
  )
  const guiaCerrada = header?.estado === 'CERRADA'

  const palesDisponibles = useMemo(
    () =>
      palesEscaneados.filter((p) => {
        const pid = p.paleId ?? p.id
        return pid != null && !paleIdsEnGuia.has(pid)
      }),
    [palesEscaneados, paleIdsEnGuia],
  )

  const paleByCodigo = useMemo(() => {
    const m = new Map()
    for (const p of palesEscaneados) {
      const codigo = (p.codigo ?? '').trim()
      if (codigo) {
        m.set(codigo.toLowerCase(), p)
      }
    }
    return m
  }, [palesEscaneados])

  async function handleCreateGuia(e) {
    e.preventDefault()
    setErr(null)
    const paleIds = createRows
      .map((r) => Number(r.paleId))
      .filter((id) => Number.isFinite(id) && id > 0)
    if (!paleIds.length) {
      setErr('Agregue al menos un palé escaneado en la tabla.')
      return
    }
    const body = {
      notas: newGuia.notas.trim() || undefined,
      creadoPor: creadoPor ?? undefined,
      paleIds,
    }
    if (destinoEsObra) {
      const loc = Number(newGuia.destinationLocationId)
      if (Number.isFinite(loc) && loc > 0) {
        body.destinationLocationId = loc
      }
    } else {
      const branch = Number(newGuia.destinationBranchId)
      if (Number.isFinite(branch) && branch > 0) {
        body.destinationBranchId = branch
      }
    }
    setCreatingGuia(true)
    try {
      const created = await systemApi.createGuia(body)
      setNewGuia({ notas: '', destinationBranchId: '', destinationLocationId: '' })
      setDestinoEsObra(false)
      setCreateRows([newCreateRow()])
      const newId = created?.guia?.guiaId
      showMsg(`Guía creada: ${created?.guia?.numeroGuia ?? '—'} (${created?.detalles?.length ?? paleIds.length} líneas)`)
      await loadGuias()
      await loadPalesEscaneados('')
      if (newId != null) {
        setSelectedGuiaId(newId)
        setGuiaSub('list')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear la guía')
    } finally {
      setCreatingGuia(false)
    }
  }

  async function handleUpdateGuia(e) {
    e.preventDefault()
    if (selectedGuiaId == null) return
    setErr(null)
    try {
      await systemApi.updateGuia(selectedGuiaId, {
        estado: guiaEdit.estado,
        notas: guiaEdit.notas.trim() || undefined,
      })
      showMsg('Guía actualizada.')
      await loadGuias()
      await loadGuiaDetail(selectedGuiaId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo actualizar')
    }
  }

  async function commitDraftPale(codigoInput) {
    const codigo = (codigoInput ?? draftPaleCodigo).trim()
    if (!codigo || selectedGuiaId == null || guiaCerrada || addingPale) return
    const pale = paleByCodigo.get(codigo.toLowerCase())
    if (!pale) {
      setErr(`No hay palé escaneado con número «${codigo}».`)
      return
    }
    const pid = pale.paleId ?? pale.id
    if (paleIdsEnGuia.has(pid)) {
      setErr('Ese palé ya está en la guía.')
      setDraftPaleCodigo('')
      return
    }
    setAddingPale(true)
    setErr(null)
    try {
      await systemApi.addGuiaDetallePale(selectedGuiaId, { paleId: pid })
      setDraftPaleCodigo('')
      showMsg(`Palé ${codigo} agregado.`)
      await loadGuias()
      await loadGuiaDetail(selectedGuiaId)
      await loadPalesEscaneados('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo agregar el palé')
    } finally {
      setAddingPale(false)
    }
  }

  function handleDraftKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitDraftPale()
    }
  }

  async function handleRemoveDetalle(detalleId) {
    if (selectedGuiaId == null || guiaCerrada) return
    if (!window.confirm('¿Quitar esta línea de la guía?')) return
    setErr(null)
    try {
      await systemApi.removeGuiaDetalle(selectedGuiaId, detalleId)
      showMsg('Línea eliminada.')
      await loadGuias()
      await loadGuiaDetail(selectedGuiaId)
      await loadPalesEscaneados(draftPaleCodigo.trim() || undefined)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo quitar la línea')
    }
  }

  function handlePrintHoja() {
    if (!header || !detalles.length) return
    void printGuiaDespacho(header, detalles)
  }

  const draftPreview = draftPaleCodigo.trim()
    ? paleByCodigo.get(draftPaleCodigo.trim().toLowerCase())
    : null
  const draftFields = draftPreview ? paleLineFromPale(draftPreview) : null

  return (
    <div>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h1 className="card__title">Guías de despacho</h1>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Número <strong>automático</strong> (sin vehículo ni chofer). En «Crear guía» defina destino y palés
          escaneados en un solo formulario; al pulsar <strong>Crear</strong> se guarda la guía y todas las líneas.
        </p>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <button
          type="button"
          className={guiaSub === 'list' ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => setGuiaSub('list')}
        >
          Guías
        </button>
        <button
          type="button"
          className={guiaSub === 'create' ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => setGuiaSub('create')}
        >
          Crear guía
        </button>
      </div>

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

      {guiaSub === 'create' ? (
        <div className="card pad">
          <h2 className="card__title">Nueva guía de despacho</h2>
          <p className="muted small">
            El número correlativo (G-000001, …) se asigna al guardar. El <strong>origen</strong> es la sucursal del
            empleado logueado. Elija <strong>destino</strong> y palés con estado de envío escaneado (cerrados en Android).
          </p>
          <form className="form-section" onSubmit={handleCreateGuia} style={{ marginTop: '1rem' }}>
            <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="field" style={{ marginBottom: '0.5rem' }}>
                <span>Destino</span>
              </legend>
              <label className="field field--inline">
                <input
                  type="checkbox"
                  checked={destinoEsObra}
                  onChange={(e) => {
                    setDestinoEsObra(e.target.checked)
                    if (e.target.checked) {
                      setNewGuia((s) => ({ ...s, destinationBranchId: '' }))
                    } else {
                      setNewGuia((s) => ({ ...s, destinationLocationId: '' }))
                    }
                  }}
                />
                <span>Destino es obra (ubicación)</span>
              </label>
              {!destinoEsObra ? (
                <label className="field" style={{ maxWidth: '24rem' }}>
                  <span>Sucursal destino</span>
                  <select
                    value={newGuia.destinationBranchId}
                    onChange={(e) => setNewGuia((s) => ({ ...s, destinationBranchId: e.target.value }))}
                  >
                    <option value="">— Sin destino —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="field" style={{ maxWidth: '24rem' }}>
                  <span>Obra / ubicación destino</span>
                  <select
                    value={newGuia.destinationLocationId}
                    onChange={(e) => setNewGuia((s) => ({ ...s, destinationLocationId: e.target.value }))}
                  >
                    <option value="">— Elegir —</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 className="detail__h" style={{ margin: 0 }}>
                  Palés escaneados
                </h3>
                {palesLoading ? <span className="muted small">Cargando palés…</span> : null}
                <button
                  type="button"
                  className="btn btn--ghost small"
                  onClick={() => setCreateRows((rows) => [...rows, newCreateRow()])}
                >
                  + Agregar fila
                </button>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Descripción (palé)</th>
                      <th>Unidad de medida</th>
                      <th>Cantidad</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {createRows.map((row) => {
                      const pale = findPaleById(palesEscaneados, row.paleId)
                      const line = pale ? paleLineFromPale(pale) : null
                      const options = palesForCreateRow(row.paleId)
                      return (
                        <tr key={row.key}>
                          <td>
                            <select
                              className="field__input"
                              value={row.paleId}
                              onChange={(e) => {
                                const paleId = e.target.value
                                setCreateRows((rows) =>
                                  rows.map((r) => (r.key === row.key ? { ...r, paleId } : r)),
                                )
                              }}
                            >
                              <option value="">— Elegir palé —</option>
                              {options.map((p) => {
                                const pid = p.paleId ?? p.id
                                return (
                                  <option key={pid} value={pid}>
                                    {paleOptionLabel(p)}
                                  </option>
                                )
                              })}
                            </select>
                          </td>
                          <td className="small">
                            <input
                              type="text"
                              className="field__input"
                              readOnly
                              value={line?.unidadMedida ?? UNIDAD_PIEZAS}
                              tabIndex={-1}
                            />
                          </td>
                          <td className="small">
                            <input
                              type="text"
                              className="field__input"
                              readOnly
                              value={line?.cantidad ?? ''}
                              placeholder="—"
                              tabIndex={-1}
                            />
                          </td>
                          <td>
                            {createRows.length > 1 ? (
                              <button
                                type="button"
                                className="linkish small"
                                onClick={() => setCreateRows((rows) => rows.filter((r) => r.key !== row.key))}
                              >
                                Quitar
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {!palesLoading && !palesEscaneados.length ? (
                <p className="muted small" style={{ marginTop: '0.35rem' }}>
                  No hay palés con estado de envío ESCANEADO disponibles.
                </p>
              ) : (
                <p className="muted small" style={{ marginTop: '0.35rem' }}>
                  Descripción = órdenes del palé; unidad fija en piezas; cantidad = piezas del palé.
                </p>
              )}
            </div>

            <label className="field" style={{ maxWidth: '36rem', marginTop: '1rem' }}>
              <span>Notas (opcional)</span>
              <textarea rows={2} value={newGuia.notas} onChange={(e) => setNewGuia((s) => ({ ...s, notas: e.target.value }))} />
            </label>
            <div className="form-actions">
              <CanButton
                I={ACTION.CREATE}
                a={FEATURE.INVENTORY}
                type="submit"
                className="btn btn--primary"
                disabled={creatingGuia}
              >
                {creatingGuia ? 'Creando…' : 'Crear'}
              </CanButton>
              <button type="button" className="btn btn--ghost" onClick={() => setGuiaSub('list')}>
                Ver listado
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="split" style={{ marginTop: '0' }}>
          <div className="card card--table">
            <h2 className="card__title pad">Listado</h2>
            {guiasLoading ? (
              <p className="muted pad">Cargando…</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>N° guía</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Estado</th>
                      <th>Líneas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guias.map((c) => {
                      const id = c.guiaId ?? c.id
                      return (
                        <tr key={id} className={selectedGuiaId === id ? 'table__row--active' : undefined}>
                          <td>
                            <button type="button" className="linkish" onClick={() => setSelectedGuiaId(id)}>
                              {id}
                            </button>
                          </td>
                          <td className="small">{c.numeroGuia ?? '—'}</td>
                          <td className="small">{formatGuiaOrigen(c)}</td>
                          <td className="small">{formatGuiaDestino(c)}</td>
                          <td>{c.estado}</td>
                          <td>{c.totalLineas ?? 0}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!guias.length ? <p className="muted pad">No hay guías. Use «Crear guía».</p> : null}
              </div>
            )}
            <div className="pad">
              <button type="button" className="btn btn--ghost" onClick={() => setGuiaSub('create')}>
                + Crear guía
              </button>
            </div>
          </div>

          <aside className="card detail-panel">
            <h2 className="card__title">Detalle</h2>
            {selectedGuiaId == null ? (
              <p className="muted pad">Selecciona una guía del listado para agregar palés y generar la hoja.</p>
            ) : guiaDetailLoading ? (
              <p className="muted pad">Cargando…</p>
            ) : header ? (
              <div className="detail pad">
                <dl className="kv">
                  <div>
                    <dt>N° guía</dt>
                    <dd>
                      <strong>{header.numeroGuia ?? '—'}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{header.estado}</dd>
                  </div>
                  <div>
                    <dt>Origen</dt>
                    <dd>{formatGuiaOrigen(header)}</dd>
                  </div>
                  <div>
                    <dt>Destino</dt>
                    <dd>{formatGuiaDestino(header)}</dd>
                  </div>
                  <div>
                    <dt>Creada</dt>
                    <dd>{formatDateTime(header.fechaCreacion)}</dd>
                  </div>
                </dl>

                {!guiaCerrada ? (
                  <form className="form-section" onSubmit={handleUpdateGuia} style={{ marginTop: '0.75rem' }}>
                    <label className="field">
                      <span>Estado</span>
                      <select value={guiaEdit.estado} onChange={(e) => setGuiaEdit((s) => ({ ...s, estado: e.target.value }))}>
                        {ESTADOS_GUIA.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Notas</span>
                      <textarea rows={2} value={guiaEdit.notas} onChange={(e) => setGuiaEdit((s) => ({ ...s, notas: e.target.value }))} />
                    </label>
                    <div className="form-actions">
                      <CanButton I={ACTION.UPDATE} a={FEATURE.INVENTORY} type="submit" className="btn">
                        Guardar cabecera
                      </CanButton>
                    </div>
                  </form>
                ) : (
                  <p className="muted small" style={{ marginTop: '0.75rem' }}>
                    Guía cerrada.
                  </p>
                )}

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 className="detail__h" style={{ margin: 0 }}>
                      Líneas ({detalles.length})
                    </h3>
                    <CanButton
                      I={ACTION.VIEW}
                      a={FEATURE.INVENTORY}
                      type="button"
                      className="btn btn--primary small"
                      disabled={!detalles.length}
                      onClick={handlePrintHoja}
                    >
                      Generar hoja
                    </CanButton>
                  </div>

                  <div className="table-wrap" style={{ marginTop: '0.5rem' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>N° palé</th>
                          <th>Descripción</th>
                          <th>Unidad</th>
                          <th>Cant.</th>
                          {!guiaCerrada ? <th /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((d) => (
                          <tr key={d.id}>
                            <td className="small">
                              <strong>{d.paleCodigo ?? (d.paleId != null ? `#${d.paleId}` : '—')}</strong>
                            </td>
                            <td className="small">{d.descripcion ?? '—'}</td>
                            <td className="small">{d.unidadMedida ?? '—'}</td>
                            <td className="small">{d.cantidad ?? '—'}</td>
                            {!guiaCerrada ? (
                              <td>
                                <CanButton
                                  I={ACTION.DELETE}
                                  a={FEATURE.INVENTORY}
                                  type="button"
                                  className="linkish small"
                                  onClick={() => void handleRemoveDetalle(d.id)}
                                >
                                  Quitar
                                </CanButton>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                        {!guiaCerrada ? (
                          <tr>
                            <td>
                              <input
                                type="text"
                                className="field__input"
                                list="pales-escaneados-datalist"
                                placeholder="N° palé…"
                                value={draftPaleCodigo}
                                disabled={addingPale}
                                onChange={(e) => setDraftPaleCodigo(e.target.value)}
                                onKeyDown={handleDraftKeyDown}
                                onBlur={() => {
                                  if (draftPaleCodigo.trim()) {
                                    void commitDraftPale()
                                  }
                                }}
                              />
                              <datalist id="pales-escaneados-datalist">
                                {palesDisponibles.map((p) => {
                                  const codigo = p.codigo ?? ''
                                  const pid = p.paleId ?? p.id
                                  return (
                                    <option key={pid} value={codigo} label={`${p.cantidadPiezas ?? 0} pzas`} />
                                  )
                                })}
                              </datalist>
                            </td>
                            <td className="small muted">{draftFields?.descripcion ?? '—'}</td>
                            <td className="small muted">{draftFields?.unidadMedida ?? UNIDAD_PIEZAS}</td>
                            <td className="small muted">{draftFields?.cantidad ?? '—'}</td>
                            <td>
                              <CanButton
                                I={ACTION.CREATE}
                                a={FEATURE.INVENTORY}
                                type="button"
                                className="btn btn--ghost small"
                                disabled={!draftPreview || addingPale}
                                onClick={() => void commitDraftPale()}
                              >
                                {addingPale ? '…' : 'Agregar'}
                              </CanButton>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  {!guiaCerrada ? (
                    <p className="muted small" style={{ marginTop: '0.35rem' }}>
                      Busque el palé escaneado en la última fila y pulse Agregar.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-warn pad">No se pudo cargar el detalle.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
