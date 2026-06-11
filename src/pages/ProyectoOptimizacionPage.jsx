import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as systemApi from '../api/systemApi'
import { DetailModal } from '../components/DetailModal.jsx'
import {
  ModuleFilterGrid,
  ModuleHeader,
  ModuleListCard,
  ModulePage,
  ModuleTabs,
} from '../components/module/ModuleChrome.jsx'
import { useAppAbility } from '../access/useAppAbility'
import {
  ESTADOS_PROYECTO,
  downloadProyectoJson,
  emptyProyectoFilters,
  formatEstadoProyecto,
  formatProyectoDate,
  treeToSavePayload,
} from '../utils/proyectoOptimizacion.js'

const TAB_MIS = 'mis'
const TAB_TODOS = 'todos'

function ProyectoTreeSummary({ tree }) {
  const project = tree?.project
  const orders = tree?.orders ?? []
  if (!project) return <p className="muted">Sin datos.</p>

  return (
    <div className="stack gap-4">
      <dl className="detail-dl">
        <div>
          <dt>Cliente</dt>
          <dd>{project.cliente || '—'}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{project.referencia || '—'}</dd>
        </div>
        <div>
          <dt>Descripción</dt>
          <dd>{project.descripcion || '—'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{formatEstadoProyecto(project.estado)}</dd>
        </div>
        <div>
          <dt>Vendedor</dt>
          <dd>{project.vendedorNombre || 'Sin asignar'}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{formatProyectoDate(project.fechaCreacion)}</dd>
        </div>
      </dl>
      {orders.length ? (
        <div>
          <h3 className="card__title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            Órdenes ({orders.length})
          </h3>
          <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {orders.map((o) => (
              <li key={o.id} className="card pad" style={{ margin: 0 }}>
                <strong>{o.codigo || `Orden ${o.id}`}</strong>
                {o.descripcion ? <span className="muted small"> — {o.descripcion}</span> : null}
                <p className="small muted" style={{ marginTop: 4 }}>
                  {(o.detalles ?? []).length} pieza(s)
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted">Sin órdenes registradas.</p>
      )}
    </div>
  )
}

export function ProyectoOptimizacionPage() {
  const ability = useAppAbility()
  const isAdmin = ability.can('manage', 'all')
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === TAB_TODOS ? TAB_TODOS : TAB_MIS

  const [filters, setFilters] = useState(emptyProyectoFilters())
  const [applied, setApplied] = useState(emptyProyectoFilters())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailEditMode, setDetailEditMode] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailTree, setDetailTree] = useState(null)
  const [detailRow, setDetailRow] = useState(null)
  const [estadoDraft, setEstadoDraft] = useState('')
  const [projectDraft, setProjectDraft] = useState({ nombre: '', descripcion: '', cliente: '', referencia: '' })

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === TAB_MIS) next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
    const empty = emptyProyectoFilters()
    setFilters(empty)
    setApplied(empty)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        scope: tab === TAB_MIS ? 'mis' : 'todos',
        nombre: applied.nombre || undefined,
        cliente: applied.cliente || undefined,
        vendedor: tab === TAB_TODOS ? applied.vendedor || undefined : undefined,
        fechaDesde: applied.fechaDesde || undefined,
        fechaHasta: applied.fechaHasta || undefined,
      }
      if (tab === TAB_MIS && applied.estado) {
        params.estado = applied.estado
      }
      const list = await systemApi.listProyectosOptimizacion(params)
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los proyectos.')
    } finally {
      setLoading(false)
    }
  }, [tab, applied])

  useEffect(() => {
    void load()
  }, [load])

  const tabs = useMemo(
    () => [
      { id: TAB_MIS, label: 'Mis proyectos' },
      { id: TAB_TODOS, label: 'Todos los proyectos' },
    ],
    [],
  )

  function applyFilters(e) {
    e?.preventDefault?.()
    setApplied({ ...filters })
  }

  function resetFilters() {
    const empty = emptyProyectoFilters()
    setFilters(empty)
    setApplied(empty)
  }

  async function openDetail(row, { edit = false } = {}) {
    setDetailRow(row)
    setDetailEditMode(edit && isAdmin)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError('')
    setDetailTree(null)
    setEstadoDraft(row.estado || 'ENVIADO')
    try {
      const tree = await systemApi.getProyectoOptimizacion(row.id)
      setDetailTree(tree)
      const project = tree?.project
      setEstadoDraft(project?.estado || row.estado || 'ENVIADO')
      setProjectDraft({
        nombre: project?.nombre || row.nombre || '',
        descripcion: project?.descripcion || '',
        cliente: project?.cliente || row.cliente || '',
        referencia: project?.referencia || '',
      })
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
    setDetailEditMode(false)
    setDetailRow(null)
    setDetailTree(null)
    setDetailError('')
  }

  async function handleDownload(row) {
    setBusyId(row.id)
    setActionMsg('')
    try {
      const tree = await systemApi.getProyectoOptimizacion(row.id)
      const safeName = (row.nombre || `proyecto-${row.id}`).replace(/[^\w.-]+/g, '_')
      downloadProyectoJson(`${safeName}.json`, tree)
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo descargar el proyecto.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCapturar(row) {
    if (row.vendedorId != null) {
      setActionMsg('Este proyecto ya tiene un vendedor asignado.')
      return
    }
    setBusyId(row.id)
    setActionMsg('')
    try {
      await systemApi.capturarProyectoOptimizacion(row.id)
      setActionMsg(`Proyecto «${row.nombre}» capturado y asignado a usted.`)
      await load()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo capturar el proyecto.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleEstadoSave() {
    if (!detailRow || !estadoDraft) return
    setBusyId(detailRow.id)
    setActionMsg('')
    try {
      await systemApi.updateProyectoEstado(detailRow.id, estadoDraft)
      setActionMsg('Estado actualizado.')
      await load()
      const tree = await systemApi.getProyectoOptimizacion(detailRow.id)
      setDetailTree(tree)
      setDetailRow((prev) =>
        prev ? { ...prev, estado: tree?.project?.estado ?? estadoDraft } : prev,
      )
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo actualizar el estado.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleProjectSave() {
    if (!detailRow || !detailTree) return
    setBusyId(detailRow.id)
    setActionMsg('')
    try {
      const payload = treeToSavePayload(detailTree, projectDraft)
      await systemApi.saveProyectoOptimizacionCompleto(payload)
      if (estadoDraft && estadoDraft !== detailTree?.project?.estado) {
        await systemApi.updateProyectoEstado(detailRow.id, estadoDraft)
      }
      setActionMsg('Proyecto actualizado.')
      await load()
      const tree = await systemApi.getProyectoOptimizacion(detailRow.id)
      setDetailTree(tree)
      setDetailEditMode(false)
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo guardar el proyecto.')
    } finally {
      setBusyId(null)
    }
  }

  function canCapturar(row) {
    return row.vendedorId == null
  }

  return (
    <ModulePage>
      <ModuleHeader
        title="Proyecto optimización"
        lead={
          tab === TAB_MIS
            ? 'Proyectos asignados a usted como vendedor. Filtre por estado, cliente, nombre o fechas.'
            : 'Todos los proyectos enviados por clientes. Capture los que aún no tengan vendedor.'
        }
      />

      <ModuleTabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Ámbito de proyectos" />

      {actionMsg ? (
        <p className="card pad small" style={{ marginBottom: '1rem' }}>
          {actionMsg}
        </p>
      ) : null}

      <ModuleListCard
        title={tab === TAB_MIS ? 'Mis proyectos' : 'Todos los proyectos'}
        toolbar={
          <form onSubmit={applyFilters}>
            <ModuleFilterGrid>
              {tab === TAB_MIS ? (
                <label className="field">
                  <span>Estado</span>
                  <select
                    value={filters.estado}
                    onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                  >
                    {ESTADOS_PROYECTO.map((o) => (
                      <option key={o.value || 'all'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="field">
                <span>Nombre proyecto</span>
                <input
                  value={filters.nombre}
                  onChange={(e) => setFilters((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Buscar por nombre"
                />
              </label>
              <label className="field">
                <span>Cliente</span>
                <input
                  value={filters.cliente}
                  onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))}
                  placeholder="Nombre del cliente"
                />
              </label>
              {tab === TAB_TODOS ? (
                <label className="field">
                  <span>Vendedor</span>
                  <input
                    value={filters.vendedor}
                    onChange={(e) => setFilters((f) => ({ ...f, vendedor: e.target.value }))}
                    placeholder="Nombre del vendedor"
                  />
                </label>
              ) : null}
              <label className="field">
                <span>Desde</span>
                <input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => setFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Hasta</span>
                <input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => setFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
                />
              </label>
            </ModuleFilterGrid>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.75rem' }}>
              <button type="submit" className="btn btn--primary">
                Filtrar
              </button>
              <button type="button" className="btn btn--ghost" onClick={resetFilters}>
                Limpiar
              </button>
              <button type="button" className="btn btn--ghost" disabled={loading} onClick={() => void load()}>
                Actualizar
              </button>
            </div>
          </form>
        }
        error={error}
        loading={loading}
        loadingText="Cargando proyectos…"
      >
        {!loading && !rows.length ? <p className="pad muted">No hay proyectos con los filtros seleccionados.</p> : null}
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Vendedor</th>
                  <th>Órdenes</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.nombre}</td>
                    <td>{row.cliente || '—'}</td>
                    <td>
                      <span className="tag">{formatEstadoProyecto(row.estado)}</span>
                    </td>
                    <td>{row.vendedorNombre || '—'}</td>
                    <td>{row.cantidadOrdenes ?? 0}</td>
                    <td className="small whitespace-nowrap">{formatProyectoDate(row.fechaCreacion)}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={busyId === row.id}
                          onClick={() => void openDetail(row)}
                        >
                          Ver detalle
                        </button>
                        {tab === TAB_MIS ? (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={busyId === row.id}
                            onClick={() => void handleDownload(row)}
                          >
                            Descargar
                          </button>
                        ) : null}
                        {tab === TAB_TODOS && isAdmin ? (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={busyId === row.id}
                            onClick={() => void openDetail(row, { edit: true })}
                          >
                            Editar
                          </button>
                        ) : null}
                        {tab === TAB_TODOS && canCapturar(row) ? (
                          <button
                            type="button"
                            className="btn btn--primary"
                            disabled={busyId === row.id}
                            onClick={() => void handleCapturar(row)}
                          >
                            Capturar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ModuleListCard>

      <DetailModal
        open={detailOpen}
        title={
          detailRow
            ? detailEditMode
              ? `Editar · ${detailRow.nombre}`
              : detailRow.nombre
            : 'Detalle del proyecto'
        }
        subtitle={
          detailRow
            ? `${formatEstadoProyecto(detailRow.estado)} · ${formatProyectoDate(detailRow.fechaCreacion)}`
            : ''
        }
        onClose={closeDetail}
      >
        {detailLoading ? <p className="muted">Cargando detalle…</p> : null}
        {detailError ? <p className="form-error">{detailError}</p> : null}
        {!detailLoading && !detailError && detailTree ? (
          <>
            {detailEditMode ? (
              <div className="stack gap-3" style={{ marginBottom: '1rem' }}>
                <label className="field">
                  <span>Nombre</span>
                  <input
                    value={projectDraft.nombre}
                    onChange={(e) => setProjectDraft((p) => ({ ...p, nombre: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Cliente</span>
                  <input
                    value={projectDraft.cliente}
                    onChange={(e) => setProjectDraft((p) => ({ ...p, cliente: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Referencia</span>
                  <input
                    value={projectDraft.referencia}
                    onChange={(e) => setProjectDraft((p) => ({ ...p, referencia: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Descripción</span>
                  <input
                    value={projectDraft.descripcion}
                    onChange={(e) => setProjectDraft((p) => ({ ...p, descripcion: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Estado</span>
                  <select value={estadoDraft} onChange={(e) => setEstadoDraft(e.target.value)}>
                    {ESTADOS_PROYECTO.filter((o) => o.value).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <ProyectoTreeSummary tree={detailTree} />
            )}

            {!detailEditMode && tab === TAB_MIS ? (
              <div className="pad" style={{ paddingLeft: 0, paddingRight: 0, marginTop: '1rem' }}>
                <label className="field">
                  <span>Cambiar estado</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                    <select value={estadoDraft} onChange={(e) => setEstadoDraft(e.target.value)}>
                      {ESTADOS_PROYECTO.filter((o) => o.value).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={busyId === detailRow?.id}
                      onClick={() => void handleEstadoSave()}
                    >
                      Guardar estado
                    </button>
                  </div>
                </label>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 8, marginTop: '1rem', flexWrap: 'wrap' }}>
              {detailEditMode ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={busyId === detailRow?.id}
                  onClick={() => void handleProjectSave()}
                >
                  Guardar cambios
                </button>
              ) : null}
              {detailRow && tab === TAB_MIS ? (
                <button type="button" className="btn btn--ghost" onClick={() => void handleDownload(detailRow)}>
                  Descargar JSON
                </button>
              ) : null}
              <button type="button" className="btn btn--ghost" onClick={closeDetail}>
                Cerrar
              </button>
            </div>
          </>
        ) : null}
      </DetailModal>
    </ModulePage>
  )
}
