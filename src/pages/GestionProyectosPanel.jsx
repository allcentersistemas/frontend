import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { DetailModal } from '../components/DetailModal.jsx'
import { ModuleFilterGrid, ModuleListCard } from '../components/module/ModuleChrome.jsx'
import { SearchableSelect } from '../components/SearchableSelect.jsx'
import { ROLE_VENTAS } from '../auth/roles.js'
import {
  ESTADOS_PROYECTO,
  emptyProyectoFilters,
  estadoTagClass,
  formatEstadoProyecto,
  formatProyectoDate,
} from '../utils/proyectoOptimizacion.js'

function clientOptionLabel(c) {
  if (c.juridica && c.razonSocial) return c.razonSocial
  if (c.displayName) return c.displayName
  if (c.nombre) return c.nombre
  return c.email || c.username || `Cliente ${c.id}`
}

function clientOptionHint(c) {
  return [c.email, c.ruc, c.numeroDocumento].filter(Boolean).join(' · ')
}

function EstadoTiemposList({ tiempos }) {
  if (!tiempos) return null
  const items = [
    ['Enviado', tiempos.enviado],
    ['En atención', tiempos.enAtencion],
    ['Cotizado', tiempos.cotizado],
    ['Vendido', tiempos.vendido],
    ['Cancelado', tiempos.cancelado],
  ].filter(([, value]) => value)
  if (!items.length) return null
  return (
    <dl className="detail-dl" style={{ marginTop: '1rem' }}>
      <div>
        <dt>Historial de estados</dt>
        <dd>
          <ul className="stack gap-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map(([label, value]) => (
              <li key={label} className="small">
                <strong>{label}:</strong> {formatProyectoDate(value)}
              </li>
            ))}
          </ul>
        </dd>
      </div>
    </dl>
  )
}

export function GestionProyectosPanel() {
  const [filters, setFilters] = useState(emptyProyectoFilters())
  const [applied, setApplied] = useState(emptyProyectoFilters())
  const [rows, setRows] = useState([])
  const [clients, setClients] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const buildParams = useCallback(() => {
    const params = {
      scope: 'todos',
      nombre: applied.nombre || undefined,
      cliente: applied.cliente || undefined,
      vendedor: applied.vendedor || undefined,
      fechaDesde: applied.fechaDesde || undefined,
      fechaHasta: applied.fechaHasta || undefined,
    }
    if (applied.estado) params.estado = applied.estado
    return params
  }, [applied])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await systemApi.listProyectosOptimizacion(buildParams())
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los proyectos.')
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void Promise.all([
      systemApi.listClients(),
      systemApi.listEmployeesCatalogByRole(ROLE_VENTAS),
      systemApi.listMaquinasOptimizacion(true),
    ])
      .then(([clientRows, ventasRows, maq]) => {
        setClients(Array.isArray(clientRows) ? clientRows : [])
        setVendedores(Array.isArray(ventasRows) ? ventasRows : [])
        setMaquinas(Array.isArray(maq) ? maq : [])
      })
      .catch(() => {
        setClients([])
        setVendedores([])
        setMaquinas([])
      })
  }, [])

  const clientOptions = useMemo(() => {
    const base = clients
      .filter((c) => c.active !== false)
      .map((c) => ({
        id: c.id,
        label: clientOptionLabel(c),
        hint: clientOptionHint(c),
      }))
    if (editForm?.clientUserId) {
      const id = Number(editForm.clientUserId)
      if (!base.some((c) => c.id === id)) {
        const hit = clients.find((c) => c.id === id)
        base.unshift({
          id,
          label: hit ? clientOptionLabel(hit) : editForm.clienteLegacy || `Cliente ${id}`,
          hint: hit ? clientOptionHint(hit) : undefined,
        })
      }
    }
    return base.sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [clients, editForm?.clientUserId, editForm?.clienteLegacy])

  const vendedorOptions = useMemo(() => {
    const base = vendedores.map((v) => ({
      id: v.id,
      label: v.displayName || v.email || `ID ${v.id}`,
      hint: v.email && v.displayName ? v.email : undefined,
    }))
    if (editForm?.vendedorId) {
      const id = Number(editForm.vendedorId)
      if (!base.some((v) => v.id === id) && editRow?.vendedorNombre) {
        base.unshift({
          id,
          label: `${editRow.vendedorNombre} (sin rol ventas)`,
          hint: 'Reasigne a un vendedor activo',
        })
      }
    }
    return base
  }, [vendedores, editForm?.vendedorId, editRow?.vendedorNombre])

  function applyFilters(e) {
    e?.preventDefault?.()
    setApplied({ ...filters })
  }

  function resetFilters() {
    const empty = emptyProyectoFilters()
    setFilters(empty)
    setApplied(empty)
  }

  function openEdit(row) {
    setEditRow(row)
    setEditForm({
      nombre: row.nombre || '',
      clientUserId: row.clientUserId ? String(row.clientUserId) : '',
      clienteLegacy: row.cliente || '',
      referencia: '',
      descripcion: row.descripcion || '',
      vendedorId: row.vendedorId ? String(row.vendedorId) : '',
      maquinaId: row.maquinaId ? String(row.maquinaId) : '',
    })
    void systemApi.getProyectoOptimizacion(row.id).then((tree) => {
      const project = tree?.project
      if (!project) return
      setEditForm((prev) =>
        prev
          ? {
              ...prev,
              clientUserId: project.clientUserId ? String(project.clientUserId) : prev.clientUserId,
              referencia: project.referencia || '',
              descripcion: project.descripcion || '',
              vendedorId: project.vendedorId ? String(project.vendedorId) : '',
              maquinaId: project.maquinaId ? String(project.maquinaId) : '',
            }
          : prev,
      )
    })
  }

  function closeEdit() {
    setEditRow(null)
    setEditForm(null)
  }

  async function handleSaveEdit() {
    if (!editRow || !editForm) return
    if (!editForm.clientUserId) {
      setActionMsg('Seleccione un cliente del listado.')
      return
    }
    setBusyId(editRow.id)
    setActionMsg('')
    try {
      await systemApi.updateProyectoGestion(editRow.id, {
        nombre: editForm.nombre.trim(),
        clientUserId: Number(editForm.clientUserId),
        referencia: editForm.referencia.trim() || null,
        descripcion: editForm.descripcion.trim() || null,
        vendedorId: editForm.vendedorId ? Number(editForm.vendedorId) : null,
        maquinaId: editForm.maquinaId ? Number(editForm.maquinaId) : null,
      })
      setActionMsg(`Proyecto «${editForm.nombre}» actualizado.`)
      closeEdit()
      await load()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo guardar el proyecto.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(row) {
    const nombre = row.nombre || `proyecto ${row.id}`
    if (
      !window.confirm(
        `¿Cancelar el proyecto «${nombre}»? El cliente verá el estado Cancelado y no podrá continuar el flujo.`,
      )
    ) {
      return
    }
    setBusyId(row.id)
    setActionMsg('')
    try {
      await systemApi.cancelProyectoOptimizacion(row.id)
      setActionMsg(`Proyecto «${nombre}» cancelado.`)
      if (editRow?.id === row.id) closeEdit()
      await load()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'No se pudo cancelar el proyecto.')
    } finally {
      setBusyId(null)
    }
  }

  function canCancel(row) {
    return row.estado === 'ENVIADO' || row.estado === 'EN_ATENCION'
  }

  function canEdit(row) {
    return row.estado !== 'VENDIDO' && row.estado !== 'CANCELADO'
  }

  return (
    <>
      {actionMsg ? (
        <p className="card pad small" style={{ marginBottom: '1rem' }}>
          {actionMsg}
        </p>
      ) : null}

      <ModuleListCard
        title="Proyectos de optimización"
        toolbar={
          <form onSubmit={applyFilters}>
            <ModuleFilterGrid>
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
              <label className="field">
                <span>Nombre</span>
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
              <label className="field">
                <span>Vendedor</span>
                <input
                  value={filters.vendedor}
                  onChange={(e) => setFilters((f) => ({ ...f, vendedor: e.target.value }))}
                  placeholder="Nombre del vendedor"
                />
              </label>
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
                  <th>Enviado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.nombre}</td>
                    <td>{row.cliente || '—'}</td>
                    <td>
                      <span className={estadoTagClass(row.estado)}>{formatEstadoProyecto(row.estado)}</span>
                    </td>
                    <td>{row.vendedorNombre || '—'}</td>
                    <td>{row.cantidadOrdenes ?? 0}</td>
                    <td className="small whitespace-nowrap">
                      {formatProyectoDate(row.estadoTiempos?.enviado || row.fechaCreacion)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {canEdit(row) ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={busyId === row.id}
                            onClick={() => openEdit(row)}
                          >
                            Gestionar
                          </button>
                        ) : null}
                        {canCancel(row) ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={busyId === row.id}
                            style={{ color: 'var(--danger, #b00020)' }}
                            onClick={() => void handleCancel(row)}
                          >
                            Cancelar
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
        open={Boolean(editRow)}
        title={editRow ? `Gestionar · ${editRow.nombre}` : 'Gestionar proyecto'}
        subtitle={editRow ? formatEstadoProyecto(editRow.estado) : ''}
        onClose={closeEdit}
      >
        {editForm ? (
          <div className="stack gap-3">
            <label className="field">
              <span>Nombre</span>
              <input
                value={editForm.nombre}
                onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Cliente</span>
              <SearchableSelect
                value={editForm.clientUserId}
                onChange={(clientUserId) => setEditForm((f) => ({ ...f, clientUserId }))}
                options={clientOptions}
                placeholder="Seleccionar cliente…"
              />
              {!editForm.clientUserId && editForm.clienteLegacy ? (
                <span className="small muted">Actual (sin vincular): {editForm.clienteLegacy}</span>
              ) : null}
            </label>
            <label className="field">
              <span>Referencia</span>
              <input
                value={editForm.referencia}
                onChange={(e) => setEditForm((f) => ({ ...f, referencia: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Descripción</span>
              <input
                value={editForm.descripcion}
                onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Vendedor asignado</span>
              <SearchableSelect
                value={editForm.vendedorId}
                onChange={(vendedorId) => setEditForm((f) => ({ ...f, vendedorId }))}
                options={vendedorOptions}
                placeholder="Seleccionar vendedor…"
                emptyLabel="Sin asignar"
              />
            </label>
            <label className="field">
              <span>Máquina (P_PARAMS)</span>
              <select
                value={editForm.maquinaId}
                onChange={(e) => setEditForm((f) => ({ ...f, maquinaId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.codigo})
                  </option>
                ))}
              </select>
            </label>
            <EstadoTiemposList tiempos={editRow?.estadoTiempos} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn--primary"
                disabled={busyId === editRow?.id || !editForm.nombre.trim() || !editForm.clientUserId}
                onClick={() => void handleSaveEdit()}
              >
                Guardar cambios
              </button>
              {editRow && canCancel(editRow) ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busyId === editRow.id}
                  style={{ color: 'var(--danger, #b00020)' }}
                  onClick={() => void handleCancel(editRow)}
                >
                  Cancelar proyecto
                </button>
              ) : null}
              <button type="button" className="btn btn--ghost" onClick={closeEdit}>
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </DetailModal>
    </>
  )
}
