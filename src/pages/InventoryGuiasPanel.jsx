import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { CanButton } from '../components/CanButton'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { useAuth } from '../auth/AuthContext'

const ESTADOS_GUIA = ['BORRADOR', 'CERRADA']

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function formatGuiaDestino(h) {
  if (!h) return '—'
  if (h.ubicacionDestinoNombre) return `Obra: ${h.ubicacionDestinoNombre}`
  if (h.sucursalDestinoNombre) return `Sucursal: ${h.sucursalDestinoNombre}`
  return '—'
}

export function InventoryGuiasPanel() {
  const { employee } = useAuth()
  const creadoPor = employee?.id ?? null

  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

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

  const [guiaEdit, setGuiaEdit] = useState({ estado: 'BORRADOR', notas: '' })

  const [manualLine, setManualLine] = useState({
    descripcion: '',
    unidadMedida: '',
    cantidad: '',
  })

  const [palesEscaneados, setPalesEscaneados] = useState([])
  const [palesLoading, setPalesLoading] = useState(false)

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

  const loadPalesEscaneados = useCallback(async () => {
    setPalesLoading(true)
    try {
      const list = await systemApi.listGuiasPalesEscaneados()
      setPalesEscaneados(Array.isArray(list) ? list : [])
    } catch (e) {
      setPalesEscaneados([])
      setErr(e instanceof Error ? e.message : 'No se pudieron cargar palés escaneados')
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
          estado: h.estado ?? 'BORRADOR',
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
    void loadGuiaDetail(selectedGuiaId)
  }, [selectedGuiaId, loadGuiaDetail])

  useEffect(() => {
    if (selectedGuiaId != null) {
      void loadPalesEscaneados()
    }
  }, [selectedGuiaId, loadPalesEscaneados])

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

  async function handleCreateGuia(e) {
    e.preventDefault()
    setErr(null)
    const body = {
      notas: newGuia.notas.trim() || undefined,
      creadoPor: creadoPor ?? undefined,
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
    try {
      const created = await systemApi.createGuia(body)
      setNewGuia({ notas: '', destinationBranchId: '', destinationLocationId: '' })
      setDestinoEsObra(false)
      showMsg(`Guía creada: ${created?.guia?.numeroGuia ?? '—'}`)
      await loadGuias()
      const newId = created?.guia?.guiaId
      if (newId != null) {
        setSelectedGuiaId(newId)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear la guía')
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

  async function handleAddManual(e) {
    e.preventDefault()
    if (selectedGuiaId == null || guiaCerrada) return
    setErr(null)
    try {
      await systemApi.addGuiaDetalleManual(selectedGuiaId, {
        descripcion: manualLine.descripcion.trim(),
        unidadMedida: manualLine.unidadMedida.trim(),
        cantidad: manualLine.cantidad.trim(),
      })
      setManualLine({ descripcion: '', unidadMedida: '', cantidad: '' })
      showMsg('Línea agregada.')
      await loadGuias()
      await loadGuiaDetail(selectedGuiaId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo agregar la línea')
    }
  }

  async function handleAddPale(paleId) {
    if (selectedGuiaId == null || guiaCerrada) return
    setErr(null)
    try {
      await systemApi.addGuiaDetallePale(selectedGuiaId, { paleId })
      showMsg('Palé agregado a la guía.')
      await loadGuias()
      await loadGuiaDetail(selectedGuiaId)
      await loadPalesEscaneados()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo agregar el palé')
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
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo quitar la línea')
    }
  }

  return (
    <div>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h1 className="card__title">Guías de despacho</h1>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          El número de guía es <strong>automático</strong> (correlativo <code>G-000001</code>, …). No se registra
          vehículo ni chofer. Puede agregar líneas manuales o palés con estado de envío{' '}
          <strong>ESCANEADO</strong> (descripción = código + resumen de órdenes; cantidad = piezas; unidad = piezas).
        </p>
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

      <div className="split" style={{ marginTop: '1rem' }}>
        <div className="card card--table">
          <h2 className="card__title pad">Guías</h2>
          {guiasLoading ? (
            <p className="muted pad">Cargando…</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>N° guía</th>
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
                        <td className="small">{formatGuiaDestino(c)}</td>
                        <td>{c.estado}</td>
                        <td>{c.totalLineas ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!guias.length ? <p className="muted pad">No hay guías.</p> : null}
            </div>
          )}

          <h3 className="card__title pad" style={{ borderTop: '1px solid var(--border, #e5e5e5)' }}>
            Nueva guía
          </h3>
          <form className="form-section pad" onSubmit={handleCreateGuia}>
            <p className="muted small">El número se asignará al guardar (sin vehículo ni chofer).</p>

            <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="field" style={{ marginBottom: '0.5rem' }}>
                <span>Destino (opcional)</span>
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
                <label className="field">
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
                <label className="field">
                  <span>Obra / ubicación</span>
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

            <label className="field">
              <span>Notas</span>
              <textarea rows={2} value={newGuia.notas} onChange={(e) => setNewGuia((s) => ({ ...s, notas: e.target.value }))} />
            </label>
            <div className="form-actions">
              <CanButton I={ACTION.CREATE} a={FEATURE.INVENTORY} type="submit" className="btn btn--primary">
                Crear guía
              </CanButton>
            </div>
          </form>
        </div>

        <aside className="card detail-panel">
          <h2 className="card__title">Detalle de guía</h2>
          {selectedGuiaId == null ? (
            <p className="muted pad">Selecciona una guía en la tabla.</p>
          ) : guiaDetailLoading ? (
            <p className="muted pad">Cargando…</p>
          ) : header ? (
            <div className="detail pad">
              <dl className="kv">
                <div>
                  <dt>ID</dt>
                  <dd>{header.guiaId ?? selectedGuiaId}</dd>
                </div>
                <div>
                  <dt>N° guía</dt>
                  <dd>{header.numeroGuia ?? '—'}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{header.estado}</dd>
                </div>
                <div>
                  <dt>Destino</dt>
                  <dd>{formatGuiaDestino(header)}</dd>
                </div>
                <div>
                  <dt>Líneas</dt>
                  <dd>{header.totalLineas ?? detalles.length}</dd>
                </div>
              </dl>

              {!guiaCerrada ? (
                <form className="form-section" onSubmit={handleUpdateGuia} style={{ marginTop: '1rem' }}>
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
                    <CanButton I={ACTION.UPDATE} a={FEATURE.INVENTORY} type="submit" className="btn btn--primary">
                      Guardar guía
                    </CanButton>
                  </div>
                </form>
              ) : (
                <p className="muted small" style={{ marginTop: '1rem' }}>
                  Guía cerrada: no admite más líneas ni cambios de contenido.
                </p>
              )}

              {!guiaCerrada ? (
                <>
                  <h3 className="detail__h">Línea manual</h3>
                  <form className="form-section" onSubmit={handleAddManual}>
                    <label className="field">
                      <span>Descripción *</span>
                      <input
                        value={manualLine.descripcion}
                        onChange={(e) => setManualLine((s) => ({ ...s, descripcion: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Unidad de medida *</span>
                      <input
                        value={manualLine.unidadMedida}
                        onChange={(e) => setManualLine((s) => ({ ...s, unidadMedida: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Cantidad *</span>
                      <input
                        value={manualLine.cantidad}
                        onChange={(e) => setManualLine((s) => ({ ...s, cantidad: e.target.value }))}
                        required
                      />
                    </label>
                    <div className="form-actions">
                      <CanButton I={ACTION.CREATE} a={FEATURE.INVENTORY} type="submit" className="btn btn--primary">
                        Agregar línea
                      </CanButton>
                    </div>
                  </form>

                  <h3 className="detail__h">Palés escaneados</h3>
                  {palesLoading ? (
                    <p className="muted small">Cargando palés…</p>
                  ) : (
                    <ul className="detail-list">
                      {palesEscaneados.map((p) => {
                        const pid = p.paleId ?? p.id
                        const enGuia = paleIdsEnGuia.has(pid)
                        return (
                          <li key={pid}>
                            <span className="detail-list__code">
                              <strong>{p.codigo ?? pid}</strong> · {p.cantidadPiezas ?? 0} pzas
                              {p.ordenesResumen ? (
                                <span className="muted small"> — {p.ordenesResumen}</span>
                              ) : null}
                            </span>
                            {enGuia ? (
                              <span className="muted small"> (en guía)</span>
                            ) : (
                              <CanButton
                                I={ACTION.CREATE}
                                a={FEATURE.INVENTORY}
                                type="button"
                                className="linkish small"
                                style={{ marginLeft: '0.5rem' }}
                                onClick={() => void handleAddPale(pid)}
                              >
                                Agregar
                              </CanButton>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {!palesEscaneados.length && !palesLoading ? (
                    <p className="muted small">No hay palés con estado de envío ESCANEADO.</p>
                  ) : null}
                </>
              ) : null}

              <h3 className="detail__h">Líneas de la guía ({detalles.length})</h3>
              <ul className="detail-list">
                {detalles.map((d) => (
                  <li key={d.id}>
                    <span className="detail-list__code">
                      <strong>{d.descripcion ?? '—'}</strong>
                      {d.cantidad != null ? ` · ${d.cantidad}` : ''}
                      {d.unidadMedida ? ` ${d.unidadMedida}` : ''}
                      {d.paleId != null ? ` (palé #${d.paleId})` : ''}
                    </span>
                    <span className="muted small">{formatDateTime(d.fechaRegistro)}</span>
                    {!guiaCerrada ? (
                      <CanButton
                        I={ACTION.DELETE}
                        a={FEATURE.INVENTORY}
                        type="button"
                        className="linkish small"
                        style={{ marginLeft: '0.5rem' }}
                        onClick={() => void handleRemoveDetalle(d.id)}
                      >
                        Quitar
                      </CanButton>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!detalles.length ? <p className="muted small">Sin líneas aún.</p> : null}
            </div>
          ) : (
            <p className="text-warn pad">No se pudo cargar el detalle.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
