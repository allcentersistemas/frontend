import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import * as systemApi from '../api/systemApi'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { Can } from '../access/AbilityContext'
import { CanButton } from '../components/CanButton'
import { DetailModal } from '../components/DetailModal'
import {
  ModuleFilterGrid,
  ModuleListCard,
  ModulePage,
} from '../components/module/ModuleChrome.jsx'
import {
  downloadPalletOrderSummaryPdf,
  printPalletOrderSummary,
} from '../utils/printPaleSummary.js'
import { formatDimPair, formatMedidaText } from '../utils/formatDim.js'

const PALE_ESTADOS = ['ABIERTO', 'CERRADO', 'EN_TRANSITO', 'ENTREGADO', 'CANCELADO']

function palletId(row) {
  return row?.paleenvioid ?? row?.id
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function isPalletClosed(estado) {
  return String(estado ?? '').trim().toUpperCase() === 'CERRADO'
}

function partDescripcion0(line) {
  return (
    line.partDescripcion ??
    line.part_descripcion ??
    line.orderDescripcion ??
    line.order_descripcion ??
    null
  )
}

function partDescripcion1(line) {
  return (
    line.partDescripcion1 ??
    line.part_descripcion1 ??
    line.orderDescripcion1 ??
    line.order_descripcion1 ??
    null
  )
}

function piezasPlanParte(line) {
  return line.piezasPlanParte ?? line.piezas_plan_parte ?? line.totalPiezas ?? line.total_piezas ?? null
}

function partMedida(line) {
  const lon = line.longitud ?? line.longitudParte ?? line.longitud_parte
  const ancho = line.ancho ?? line.anchoParte ?? line.ancho_parte
  const fromRaw = formatDimPair(lon, ancho)
  if (fromRaw) return fromRaw
  return formatMedidaText(line.medida)
}

function pieceFractionText(line) {
  const n = line.numeroPieza
  const total = piezasPlanParte(line)
  if (n != null && total != null && Number(total) > 0) {
    return `${n}/${total}`
  }
  if (n != null) return String(n)
  return '—'
}

function formFromHeader(header) {
  return {
    code: header?.codigo ?? '',
    estado: header?.estado ?? 'ABIERTO',
    notes: header?.notas ?? '',
  }
}

/**
 * @param {{ embedded?: boolean }} props — dentro de Inventario (sin cabecera duplicada)
 */
export function PalesPage({ embedded = false }) {
  const { allowedDashboard } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const inventarioBase = useMemo(
    () =>
      allowedDashboard
        ? `/dashboard/${allowedDashboard}/inventario`
        : location.pathname.replace(/\/pales\/?$/, '/inventario'),
    [allowedDashboard, location.pathname],
  )

  const guiasHref = `${inventarioBase}?area=guias`
  const gestionAuditoriaHref = useMemo(
    () =>
      allowedDashboard
        ? `/dashboard/${allowedDashboard}/gestion?tab=auditoria&audit=pales`
        : '/gestion?tab=auditoria&audit=pales',
    [allowedDashboard],
  )

  useEffect(() => {
    if (searchParams.get('tab') === 'auditoria') {
      navigate(gestionAuditoriaHref, { replace: true })
    }
  }, [searchParams, navigate, gestionAuditoriaHref])

  const [pallets, setPallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [fromDateFilter, setFromDateFilter] = useState('')
  const [toDateFilter, setToDateFilter] = useState('')

  const [selectedId, setSelectedId] = useState(null)
  const [modalMode, setModalMode] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editForm, setEditForm] = useState(() => formFromHeader(null))
  const [editBusy, setEditBusy] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [opMsg, setOpMsg] = useState(null)
  const [opErr, setOpErr] = useState(null)
  const [printIncludePiezas, setPrintIncludePiezas] = useState(() => {
    try {
      return localStorage.getItem('pale-print-include-piezas') === '1'
    } catch {
      return false
    }
  })
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    const fromUrl = searchParams.get('id')
    if (fromUrl && /^\d+$/.test(fromUrl)) {
      setSelectedId(Number(fromUrl))
      setModalMode(searchParams.get('mode') === 'edit' ? 'edit' : 'view')
      return
    }
    if (!searchParams.get('id')) {
      setSelectedId(null)
      setModalMode(null)
    }
  }, [searchParams])

  async function refreshList() {
    const list = await systemApi.listPallets()
    setPallets(Array.isArray(list) ? list : [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const list = await systemApi.listPallets()
        if (!cancelled) setPallets(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error al cargar pales')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setDetailLoading(true)
      setOpErr(null)
      try {
        const d = await systemApi.getPalletById(selectedId)
        if (!cancelled) {
          setDetail(d)
          setEditForm(formFromHeader(d?.pallet))
        }
      } catch {
        if (!cancelled) setDetail(null)
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const header = detail?.pallet ?? null
  const details = Array.isArray(detail?.details) ? detail.details : []
  const closed = header ? isPalletClosed(header.estado) : false

  const filteredPallets = useMemo(() => {
    const needle = searchInput.trim().toLowerCase()
    const fromTime = fromDateFilter ? new Date(`${fromDateFilter}T00:00:00`).getTime() : null
    const toTime = toDateFilter ? new Date(`${toDateFilter}T23:59:59`).getTime() : null

    return pallets.filter((row) => {
      const createdValue = row.fechaCreacion ?? row.fechacreacion ?? row.createdAt ?? row.fecha
      const createdTime = createdValue ? new Date(createdValue).getTime() : null
      if (fromTime != null && (createdTime == null || createdTime < fromTime)) return false
      if (toTime != null && (createdTime == null || createdTime > toTime)) return false
      if (!needle) return true
      return [
        row.codigo,
        row.estado,
        row.estadoEnvio,
        row.ordenesResumen,
        row.notas,
        row.guiaNumero,
        String(palletId(row) ?? ''),
      ].some((value) => String(value ?? '').toLowerCase().includes(needle))
    })
  }, [pallets, searchInput, fromDateFilter, toDateFilter])

  function patchPaleParams(patch) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('area', 'pales')
        p.delete('tab')
        if (patch.id != null) p.set('id', String(patch.id))
        else p.delete('id')
        if (patch.mode === 'edit') p.set('mode', 'edit')
        else p.delete('mode')
        return p
      },
      { replace: true },
    )
  }

  function openDetail(id, mode) {
    setSelectedId(id)
    setModalMode(mode)
    setOpErr(null)
    patchPaleParams({ id, mode: mode === 'edit' ? 'edit' : null })
  }

  function closeDetail() {
    setSelectedId(null)
    setModalMode(null)
    setDetail(null)
    setOpErr(null)
    patchPaleParams({ id: null, mode: null })
  }

  async function handleDeletePale(id, codigo) {
    if (!window.confirm(`¿Eliminar el pale ${codigo ?? id}? Esta acción no se puede deshacer.`)) return
    setOpErr(null)
    try {
      await systemApi.deletePallet(id)
      if (selectedId === id) closeDetail()
      await refreshList()
      setOpMsg('Pale eliminado.')
    } catch (ex) {
      setOpErr(ex instanceof Error ? ex.message : 'No se pudo eliminar el pale')
    }
  }

  async function handleSavePale(e) {
    e.preventDefault()
    if (selectedId == null) return
    setEditBusy(true)
    setOpErr(null)
    try {
      const updated = await systemApi.updatePallet(selectedId, {
        code: editForm.code.trim(),
        estado: editForm.estado,
        notes: editForm.notes,
      })
      setDetail(updated)
      setEditForm(formFromHeader(updated?.pallet))
      await refreshList()
      setOpMsg('Pale actualizado.')
      setModalMode('view')
    } catch (ex) {
      setOpErr(ex instanceof Error ? ex.message : 'No se pudo editar el pale')
    } finally {
      setEditBusy(false)
    }
  }

  async function handleDeleteDetail(detailId) {
    if (selectedId == null || !window.confirm('¿Eliminar esta línea del pale?')) return
    setDeletingId(detailId)
    setOpErr(null)
    try {
      const updated = await systemApi.deletePalletDetail(selectedId, detailId)
      setDetail(updated)
      setEditForm(formFromHeader(updated?.pallet))
      await refreshList()
      setOpMsg('Línea eliminada. La pieza quedó libre para volver a escanearse en la orden.')
    } catch (ex) {
      setOpErr(ex instanceof Error ? ex.message : 'No se pudo eliminar la línea')
    } finally {
      setDeletingId(null)
    }
  }

  const guiaLink = header?.guiaInventarioId != null ? `${inventarioBase}?area=guias` : null

  const body = (
    <>
      {!embedded ? (
        <div className="card pad" style={{ marginBottom: '1rem' }}>
          <h1 className="card__title">Pales</h1>
          <p className="muted small" style={{ marginTop: '0.35rem' }}>
            Para despachar palés escaneados, créalos en una guía en{' '}
            <Link to={guiasHref} className="linkish">
              Inventario → Guías de despacho
            </Link>
            . También puedes agregar líneas manuales a la guía. La{' '}
            <Link to={gestionAuditoriaHref} className="linkish">
              auditoría
            </Link>{' '}
            está en Gestión.
          </p>
        </div>
      ) : (
        <p className="muted small" style={{ marginBottom: '1rem' }}>
          Palés escaneados y asignación a{' '}
          <Link to={guiasHref} className="linkish">
            guías de despacho
          </Link>
          .{' '}
          <Link to={gestionAuditoriaHref} className="linkish">
            Ver auditoría
          </Link>
          .
        </p>
      )}

      {opMsg ? (
            <p className="muted small" style={{ marginBottom: '0.75rem' }} role="status">
              {opMsg}
            </p>
          ) : null}

          <ModuleListCard
            title="Listado de pales"
            error={err || opErr}
            loading={loading}
            toolbar={
              <ModuleFilterGrid>
                <label className="field">
                  <span className="small">Buscar pale</span>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Código, estado, guía, orden…"
                  />
                </label>
                <label className="field">
                  <span className="small">Desde</span>
                  <input type="date" value={fromDateFilter} onChange={(e) => setFromDateFilter(e.target.value)} />
                </label>
                <label className="field">
                  <span className="small">Hasta</span>
                  <input type="date" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} />
                </label>
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <span className="small" style={{ visibility: 'hidden' }}>
                    .
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setSearchInput('')
                      setFromDateFilter('')
                      setToDateFilter('')
                    }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </ModuleFilterGrid>
            }
          >
            {!loading ? (
              <>
                <p className="pad small muted" style={{ paddingTop: 0, margin: 0 }}>
                  {filteredPallets.length} pale{filteredPallets.length !== 1 ? 's' : ''}
                </p>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Estado</th>
                        <th>En guía</th>
                        <th>Guía</th>
                        <th>Piezas</th>
                        <th>Creación</th>
                        <th>Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPallets.map((row) => {
                        const id = palletId(row)
                        return (
                          <tr key={id} className={selectedId === id ? 'inv-row-selected' : undefined}>
                            <td>{row.codigo}</td>
                            <td>
                              <span className="tag">{row.estado}</span>
                            </td>
                            <td>{row.enGuia ? 'Sí' : 'No'}</td>
                            <td className="small">{row.guiaNumero ?? '—'}</td>
                            <td>{row.cantidadPiezas ?? 0}</td>
                            <td className="small">{formatDateTime(row.fechaCreacion)}</td>
                            <td>
                              <div className="table-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                <CanButton
                                  I={ACTION.VIEW}
                                  a={FEATURE.PALES_LIST}
                                  type="button"
                                  className="linkish small"
                                  onClick={() => openDetail(id, 'view')}
                                >
                                  Ver detalle
                                </CanButton>
                                <CanButton
                                  I={ACTION.UPDATE}
                                  a={FEATURE.PALES_OPERACIONES}
                                  type="button"
                                  className="linkish small"
                                  onClick={() => openDetail(id, 'edit')}
                                >
                                  Editar
                                </CanButton>
                                <CanButton
                                  I={ACTION.DELETE}
                                  a={FEATURE.PALES_OPERACIONES}
                                  type="button"
                                  className="linkish small text-warn"
                                  onClick={() => void handleDeletePale(id, row.codigo)}
                                >
                                  Eliminar
                                </CanButton>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {!filteredPallets.length ? (
                  <p className="muted pad">No hay pales para la búsqueda actual.</p>
                ) : null}
              </>
            ) : null}
          </ModuleListCard>

          <DetailModal
            open={selectedId != null && modalMode != null}
            title={
              modalMode === 'edit'
                ? `Editar pale ${header?.codigo ?? selectedId ?? ''}`
                : header?.codigo
                  ? `Palé ${header.codigo}`
                  : `Palé #${selectedId ?? ''}`
            }
            subtitle={header?.sucursalOrigenNombre ? `Sucursal: ${header.sucursalOrigenNombre}` : undefined}
            onClose={closeDetail}
          >
            {detailLoading ? <p className="muted pad">Cargando…</p> : null}
            {!detailLoading && !header ? <p className="pad form-error">No se pudo cargar el detalle.</p> : null}
            {header ? (
              <div className="pad">
                <dl className="inv-dl">
                  <dt>Piezas / órdenes</dt>
                  <dd>
                    {header.cantidadPiezas ?? 0} piezas · {header.cantidadOrdenes ?? 0} órdenes
                  </dd>
                  <dt>Resumen órdenes</dt>
                  <dd>{header.ordenesResumen || '—'}</dd>
                  <dt>Estado envío</dt>
                  <dd>{header.estadoEnvio ?? '—'}</dd>
                  <dt>En guía</dt>
                  <dd>{header.enGuia ? 'Sí' : 'No'}</dd>
                  <dt>Guía de despacho</dt>
                  <dd>
                    {header.guiaNumero ? (
                      guiaLink ? (
                        <Link to={guiaLink} className="linkish">
                          {header.guiaNumero}
                        </Link>
                      ) : (
                        header.guiaNumero
                      )
                    ) : (
                      '—'
                    )}
                  </dd>
                  <dt>Creación</dt>
                  <dd>{formatDateTime(header.fechaCreacion)}</dd>
                  <dt>Cierre</dt>
                  <dd>{formatDateTime(header.fechaCierre)}</dd>
                </dl>

                {modalMode === 'edit' ? (
                  <Can I={ACTION.UPDATE} a={FEATURE.PALES_OPERACIONES}>
                  <form className="form-section" style={{ marginTop: '1rem' }} onSubmit={(e) => void handleSavePale(e)}>
                    <h3 className="card__title" style={{ fontSize: '1rem' }}>
                      Editar pale
                    </h3>
                  <label className="field">
                    <span>Código</span>
                    <input
                      value={editForm.code}
                      onChange={(e) => setEditForm((s) => ({ ...s, code: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Estado</span>
                    <select value={editForm.estado} onChange={(e) => setEditForm((s) => ({ ...s, estado: e.target.value }))}>
                      {PALE_ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Notas</span>
                    <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((s) => ({ ...s, notes: e.target.value }))} />
                  </label>
                  <div className="form-actions">
                    <CanButton
                      I={ACTION.UPDATE}
                      a={FEATURE.PALES_OPERACIONES}
                      type="submit"
                      className="btn btn--primary"
                      disabled={editBusy}
                    >
                      {editBusy ? 'Guardando…' : 'Guardar cambios'}
                    </CanButton>
                    </div>
                  </form>
                  </Can>
                ) : null}

                {closed ? (
                  <div className="form-actions" style={{ flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                    <label
                      className="muted small"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={printIncludePiezas}
                        onChange={(e) => {
                          const on = e.target.checked
                          setPrintIncludePiezas(on)
                          try {
                            localStorage.setItem('pale-print-include-piezas', on ? '1' : '0')
                          } catch {
                            /* ignore */
                          }
                        }}
                      />
                      Incluir detalle de piezas al imprimir / PDF
                    </label>
                    <CanButton
                      I={ACTION.PRINT}
                      a={FEATURE.PALES_PRINT}
                      type="button"
                      className="btn btn--primary"
                      onClick={() =>
                        void printPalletOrderSummary(header, details, {
                          includePiezas: printIncludePiezas,
                        })
                      }
                    >
                      Imprimir resumen (orden de envío)
                    </CanButton>
                    <CanButton
                      I={ACTION.PRINT}
                      a={FEATURE.PALES_PRINT}
                      type="button"
                      className="btn"
                      disabled={pdfBusy}
                      onClick={() => {
                        setPdfBusy(true)
                        void downloadPalletOrderSummaryPdf(header, details, {
                          includePiezas: printIncludePiezas,
                        })
                          .catch((e) => {
                            window.alert(e?.message || 'No se pudo generar el PDF.')
                          })
                          .finally(() => setPdfBusy(false))
                      }}
                    >
                      {pdfBusy ? 'Generando PDF…' : 'Descargar PDF'}
                    </CanButton>
                  </div>
                ) : (
                  <p className="muted small">
                    El resumen imprimible solo está disponible cuando el pale está <strong>cerrado</strong>.
                  </p>
                )}

                <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                  Líneas ({details.length})
                </h3>
                <ul className="detail-list">
                  {details.map((line) => {
                    const lineId = line.paleenviodetalleid ?? line.id
                    return (
                      <li key={lineId ?? `${line.piezaId}-${line.partId}`}>
                        <span className="detail-list__code">
                          {line.partCode ?? line.partId} · pieza {pieceFractionText(line)}
                        </span>
                        <span className="small muted block mt-1">
                          {line.orderName ?? line.orderId}
                          {partDescripcion0(line) ? ` · ${partDescripcion0(line)}` : ''}
                          {partDescripcion1(line) ? ` · ${partDescripcion1(line)}` : ''}
                          {partMedida(line) ? ` · ${partMedida(line)}` : ''}
                        </span>
                        {lineId != null && modalMode === 'edit' ? (
                          <CanButton
                            I={ACTION.DELETE}
                            a={FEATURE.PALES_OPERACIONES}
                            type="button"
                            className="linkish small"
                            style={{ marginTop: '0.35rem' }}
                            disabled={deletingId === lineId}
                            onClick={() => void handleDeleteDetail(lineId)}
                          >
                            {deletingId === lineId ? 'Eliminando…' : 'Quitar línea'}
                          </CanButton>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
                {!details.length ? <p className="muted small">Sin líneas en este pale.</p> : null}
              </div>
            ) : null}
          </DetailModal>
    </>
  )

  return embedded ? body : <ModulePage>{body}</ModulePage>
}
