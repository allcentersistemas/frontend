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

const TAB_MIS = 'mis'
const TAB_TODOS = 'todos'

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'EN_ATENCION', label: 'En atención' },
  { value: 'COTIZADO', label: 'Cotizado' },
]

function formatEstado(value) {
  const map = {
    ENVIADO: 'Enviado',
    EN_ATENCION: 'En atención',
    COTIZADO: 'Cotizado',
  }
  return map[value] || value || '—'
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function emptyFilters() {
  return {
    estado: '',
    nombre: '',
    cliente: '',
    vendedor: '',
    fechaDesde: '',
    fechaHasta: '',
  }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ProyectoTreeSummary({ tree }) {
  if (!tree) return <p className="muted">Sin datos.</p>
  const orders = tree.orders ?? []
  return (
    <div className="stack gap-4">
      <dl className="detail-dl">
        <div>
          <dt>Cliente</dt>
          <dd>{tree.cliente || '—'}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{tree.referencia || '—'}</dd>
        </div>
        <div>
          <dt>Descripción</dt>
          <dd>{tree.descripcion || '—'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{formatEstado(tree.estado)}</dd>
        </div>
        <div>
          <dt>Vendedor</dt>
          <dd>{tree.vendedorNombre || 'Sin asignar'}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{formatDate(tree.fechaCreacion)}</dd>
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

  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailTree, setDetailTree] = useState(null)
  const [detailRow, setDetailRow] = useState(null)
  const [estadoDraft, setEstadoDraft] = useState('')

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === TAB_MIS) next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
    setFilters(emptyFilters())
    setApplied(emptyFilters())
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        scope: tab === TAB_MIS ? 'mis' : 'todos',
        estado: applied.estado || undefined,
        nombre: applied.nombre || undefined,
        cliente: applied.cliente || undefined,
        vendedor: tab === TAB_TODOS ? applied.vendedor || undefined : undefined,
        fechaDesde: applied.fechaDesde || undefined,
        fechaHasta: applied.fechaHasta || undefined,
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
    const empty = emptyFilters()
    setFilters(empty)
    setApplied(empty)
  }

  async function openDetail(row) {
    setDetailRow(row)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError('')
    setDetailTree(null)
    setEstadoDraft(row.estado || 'ENVIADO')
    try {
      const tree = await systemApi.getProyectoOptimizacion(row.id)
      setDetailTree(tree)
      setEstadoDraft(tree.estado || row.estado || 'ENVIADO')
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
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
      downloadJson(`${safeName}.json`, tree)
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
      setActionMsg(`Proyecto «${row.nombre}» capturado correctamente.`)
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
      setDetailRow((prev) => (prev ? { ...prev, estado: tree.estado } : prev))
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo actualizar el estado.')
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
            ? 'Proyectos asignados a usted como vendedor. Puede ver el detalle y descargar la planilla.'
            : 'Todos los proyectos enviados por clientes. Capture los que no tengan vendedor.'
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
              <label className="field">
                <span>Estado</span>
                <select
                  value={filters.estado}
                  onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
                >
                  {ESTADOS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
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
                      <span className="tag">{formatEstado(row.estado)}</span>
                    </td>
                    <td>{row.vendedorNombre || '—'}</td>
                    <td>{row.cantidadOrdenes ?? 0}</td>
                    <td className="small whitespace-nowrap">{formatDate(row.fechaCreacion)}</td>
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
                            onClick={() => void openDetail(row)}
                            title="Ver y actualizar estado (admin)"
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
        title={detailRow ? detailRow.nombre : 'Detalle del proyecto'}
        subtitle={detailRow ? `${formatEstado(detailRow.estado)} · ${formatDate(detailRow.fechaCreacion)}` : ''}
        onClose={closeDetail}
      >
        {detailLoading ? <p className="muted">Cargando detalle…</p> : null}
        {detailError ? <p className="form-error">{detailError}</p> : null}
        {!detailLoading && !detailError && detailTree ? (
          <>
            <ProyectoTreeSummary tree={detailTree} />
            {(tab === TAB_MIS || isAdmin) && (
              <div className="pad" style={{ paddingLeft: 0, paddingRight: 0, marginTop: '1rem' }}>
                <label className="field">
                  <span>Cambiar estado</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                    <select value={estadoDraft} onChange={(e) => setEstadoDraft(e.target.value)}>
                      {ESTADOS.filter((o) => o.value).map((o) => (
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
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: '1rem', flexWrap: 'wrap' }}>
              {detailRow ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void handleDownload(detailRow)}
                >
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
