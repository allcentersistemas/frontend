import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as biesseApi from '../api/biesseApi'
import * as systemApi from '../api/systemApi'
import { useAuth } from '../auth/AuthContext'
import { DetailModal } from '../components/DetailModal'
import {
  ModuleFilterGrid,
  ModuleListCard,
  ModulePage,
  ModulePagination,
} from '../components/module/ModuleChrome.jsx'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { BiesseStickerPrintButton } from '../components/BiesseStickerPrintButton'
import { CanButton } from '../components/CanButton'
import { OrderPartsDetail } from '../components/OrderPartsDetail'
import { printBiesseOrderDetail } from '../utils/printBiesseOrderDetail'
import { applyAgentCutsToOrderDetail } from '../utils/applyAgentCutsToOrderDetail'

const PAGE_SIZE = 25
/** Actualiza cortes del agente mientras el detalle de orden está abierto. */
const ORDER_DETAIL_POLL_MS = 5000

function formatOrderEstado(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'LISTO_PARA_ENTREGAR' || e === 'COMPLETADA' || e === 'COMPLETADO') return 'Listo para entregar'
  if (e === 'ENTREGADO') return 'Entregado'
  if (e === 'DESPACHO' || e === 'EN_PROCESO') return 'Despacho'
  if (e === 'PRODUCCION') return 'Producción'
  if (e === 'OPTIMIZADO') return 'Optimizado'
  if (e === 'PENDIENTE') return 'Pendiente'
  return estado ?? '—'
}

function orderEstadoTagClass(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'ENTREGADO') return 'tag tag--estado-entregado'
  if (e === 'LISTO_PARA_ENTREGAR' || e === 'COMPLETADA' || e === 'COMPLETADO') return 'tag tag--estado-listo'
  if (e === 'DESPACHO' || e === 'EN_PROCESO') return 'tag tag--estado-despacho'
  if (e === 'PRODUCCION') return 'tag tag--estado-produccion'
  if (e === 'OPTIMIZADO') return 'tag tag--estado-optimizado'
  return 'tag'
}

/**
 * @param {{ embedded?: boolean }} props — dentro de Inventario (sin cabecera duplicada)
 */
export function OrdersPage({ embedded = false }) {
  const { allowedDashboard } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const inventarioBase = useMemo(
    () => (allowedDashboard ? `/dashboard/${allowedDashboard}/inventario` : '/inventario'),
    [allowedDashboard],
  )
  const gestionAuditoriaHref = useMemo(
    () =>
      allowedDashboard
        ? `/dashboard/${allowedDashboard}/gestion?tab=auditoria&audit=ordenes`
        : '/gestion?tab=auditoria&audit=ordenes',
    [allowedDashboard],
  )

  useEffect(() => {
    if (searchParams.get('tab') === 'auditoria') {
      navigate(gestionAuditoriaHref, { replace: true })
    }
  }, [searchParams, navigate, gestionAuditoriaHref])

  const [list, setList] = useState([])
  const [ops, setOps] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [orderIdFilter, setOrderIdFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [fromDateFilter, setFromDateFilter] = useState('')
  const [toDateFilter, setToDateFilter] = useState('')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [orderPallets, setOrderPallets] = useState([])
  const [palletsLoading, setPalletsLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [expandedOps, setExpandedOps] = useState(() => new Set())
  const [viewMode, setViewMode] = useState('ops') // 'ops' | 'flat'

  const [toolErr, setToolErr] = useState(null)
  const [toolMsg, setToolMsg] = useState(null)
  const [orderEditNotes, setOrderEditNotes] = useState('')
  const [orderEditBusy, setOrderEditBusy] = useState(false)
  const [orderDeleteBusy, setOrderDeleteBusy] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setQ(searchInput), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(0)
  }, [q, orderIdFilter, stateFilter, fromDateFilter, toDateFilter, viewMode])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        if (viewMode === 'ops' && !orderIdFilter.trim() && !stateFilter && !fromDateFilter && !toDateFilter) {
          const res = await biesseApi.listOpsPage({
            q: q.trim() || undefined,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          })
          if (!cancelled) {
            const items = Array.isArray(res.items) ? res.items : []
            setOps(items)
            setList([])
            setTotal(typeof res.totalCount === 'number' ? res.totalCount : 0)
            setExpandedOps((prev) => {
              const next = new Set(prev)
              for (const op of items) {
                const code = op.op_codigo ?? op.opCodigo
                if (code) next.add(String(code))
              }
              return next
            })
          }
        } else {
          const res = await biesseApi.listOrdersPage({
            orderId: orderIdFilter.trim() || undefined,
            estado: stateFilter || undefined,
            q: q.trim() || undefined,
            fromDate: fromDateFilter || undefined,
            toDate: toDateFilter || undefined,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          })
          if (!cancelled) {
            setList(Array.isArray(res.items) ? res.items : [])
            setOps([])
            setTotal(typeof res.totalCount === 'number' ? res.totalCount : 0)
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error al cargar órdenes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [q, orderIdFilter, stateFilter, fromDateFilter, toDateFilter, page, viewMode])

  function toggleOp(code) {
    setExpandedOps((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const refreshOrderDetail = useCallback(async (orderId, { silent = false, isCancelled = () => false } = {}) => {
    if (!silent) {
      setDetailLoading(true)
      setToolErr(null)
    }
    try {
      const [d, cutsByOrder] = await Promise.all([
        biesseApi.orderDetail(orderId),
        systemApi.listAgentCutPieces({ orderId, limit: 500 }).catch(() => []),
      ])
      let cuts = Array.isArray(cutsByOrder) ? cutsByOrder : []
      // Siempre enriquecer con cortes recientes por nombre (order_id a veces null/desfasado).
      if (d?.orderName) {
        const recent = await systemApi.listAgentCutPieces({ limit: 200 }).catch(() => [])
        const name = String(d.orderName).trim().toUpperCase()
        const byName = (Array.isArray(recent) ? recent : []).filter((c) => {
          const oid = Number(c.order_id ?? c.orderId)
          if (Number.isFinite(oid) && oid === Number(orderId)) return true
          const on = String(c.order_name ?? c.orderName ?? '').trim().toUpperCase()
          return on && (on === name || on.startsWith(name) || name.startsWith(on))
        })
        if (byName.length) {
          const seen = new Set(
            cuts.map((c) => String(c.cut_piece_id ?? c.cutPieceId ?? c.event_uid ?? c.eventUid ?? '')),
          )
          for (const c of byName) {
            const key = String(c.cut_piece_id ?? c.cutPieceId ?? c.event_uid ?? c.eventUid ?? '')
            if (key && seen.has(key)) continue
            if (key) seen.add(key)
            cuts.push(c)
          }
        }
      }
      if (!isCancelled() && d) {
        const merged = applyAgentCutsToOrderDetail(d, cuts)
        setDetail(merged)
        setOrderEditNotes(merged?.observaciones ?? '')
        setList((prev) =>
          prev.map((row) =>
            row.orderId === orderId
              ? {
                  ...row,
                  estadoEscaneo: merged.estadoEscaneo ?? row.estadoEscaneo,
                  partesEscaneadas: merged.partesEscaneadas ?? row.partesEscaneadas,
                  totalPartes: merged.totalPartes ?? row.totalPartes,
                }
              : row,
          ),
        )
      }
    } catch {
      if (!isCancelled() && !silent) setDetail(null)
    } finally {
      if (!isCancelled() && !silent) setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null)
      setOrderPallets([])
      return
    }
    let cancelled = false
    refreshOrderDetail(selectedId, { silent: false, isCancelled: () => cancelled })
    const timer = setInterval(() => {
      refreshOrderDetail(selectedId, { silent: true, isCancelled: () => cancelled })
    }, ORDER_DETAIL_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [selectedId, refreshOrderDetail])

  useEffect(() => {
    if (selectedId == null) {
      setOrderPallets([])
      return
    }
    let cancelled = false
    ;(async () => {
      setPalletsLoading(true)
      try {
        const pales = await systemApi.listPalletsByOrder(selectedId)
        if (!cancelled) setOrderPallets(Array.isArray(pales) ? pales : [])
      } catch {
        if (!cancelled) setOrderPallets([])
      } finally {
        if (!cancelled) setPalletsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setOrderPallets([])
    setToolErr(null)
  }

  async function handleSaveOrder(e) {
    e.preventDefault()
    if (selectedId == null) return
    setOrderEditBusy(true)
    setToolErr(null)
    try {
      await biesseApi.updateOrder(selectedId, { observaciones: orderEditNotes })
      const [fresh, cutsByOrder] = await Promise.all([
        biesseApi.orderDetail(selectedId),
        systemApi.listAgentCutPieces({ orderId: selectedId, limit: 500 }).catch(() => []),
      ])
      let cuts = Array.isArray(cutsByOrder) ? cutsByOrder : []
      if (!cuts.length && fresh?.orderName) {
        const recent = await systemApi.listAgentCutPieces({ limit: 200 }).catch(() => [])
        const name = String(fresh.orderName).trim().toUpperCase()
        cuts = (Array.isArray(recent) ? recent : []).filter((c) => {
          const oid = Number(c.order_id ?? c.orderId)
          if (Number.isFinite(oid) && oid === Number(selectedId)) return true
          const on = String(c.order_name ?? c.orderName ?? '').trim().toUpperCase()
          return on && (on === name || on.startsWith(name) || name.startsWith(on))
        })
      }
      setDetail(applyAgentCutsToOrderDetail(fresh, cuts))
      setOrderEditNotes(fresh?.observaciones ?? '')
      setToolMsg('Orden actualizada.')
    } catch (ex) {
      setToolErr(ex instanceof Error ? ex.message : 'No se pudo editar la orden')
    } finally {
      setOrderEditBusy(false)
    }
  }

  async function handleDeleteOrder() {
    if (selectedId == null || !detail) return
    const label = detail.orderName || `#${selectedId}`
    let confirmMsg = `¿Eliminar la orden «${label}» y todas sus partes y piezas? Esta acción no se puede deshacer.`
    if (orderPallets.length > 0) {
      confirmMsg = `Esta orden figura en ${orderPallets.length} palé(s). Debes quitarla de los palés antes de eliminarla.`
      window.alert(confirmMsg)
      return
    }
    if (!window.confirm(confirmMsg)) return
    setOrderDeleteBusy(true)
    setToolErr(null)
    setToolMsg(null)
    try {
      await biesseApi.deleteOrder(selectedId)
      setList((prev) => prev.filter((row) => row.orderId !== selectedId))
      setTotal((prev) => Math.max(0, prev - 1))
      closeDetail()
      setToolMsg('Orden eliminada.')
    } catch (ex) {
      setToolErr(ex instanceof Error ? ex.message : 'No se pudo eliminar la orden')
    } finally {
      setOrderDeleteBusy(false)
    }
  }

  function clearFilters() {
    setSearchInput('')
    setOrderIdFilter('')
    setStateFilter('')
    setFromDateFilter('')
    setToDateFilter('')
    setPage(0)
  }

  const filterToolbar = (
    <ModuleFilterGrid>
      <label className="field">
        <span className="small">Vista</span>
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <option value="ops">Por OP (agrupado)</option>
          <option value="flat">Lista plana</option>
        </select>
      </label>
      <label className="field">
        <span className="small">Buscar general</span>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="OP, orden, booking…"
        />
      </label>
      <label className="field">
        <span className="small">ID exacto</span>
        <input
          inputMode="numeric"
          value={orderIdFilter}
          onChange={(e) => setOrderIdFilter(e.target.value)}
          placeholder="orderId"
        />
      </label>
      <label className="field">
        <span className="small">Estado</span>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">Todos</option>
          <option value="OPTIMIZADO">Optimizado</option>
          <option value="PRODUCCION">Producción</option>
          <option value="DESPACHO">Despacho</option>
          <option value="LISTO_PARA_ENTREGAR">Listo para entregar</option>
          <option value="ENTREGADO">Entregado</option>
          <option value="PENDIENTE">Pendiente</option>
        </select>
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
        <button type="button" className="btn btn--ghost" onClick={clearFilters}>
          Limpiar filtros
        </button>
      </div>
    </ModuleFilterGrid>
  )

  const body = (
    <>
      {!embedded ? (
        <div className="card pad" style={{ marginBottom: '1rem' }}>
          <h1 className="card__title">Órdenes Biesse</h1>
          <p className="muted small" style={{ marginTop: '0.35rem' }}>
            Consulta órdenes de producción y avance de escaneo. La{' '}
            <Link to={gestionAuditoriaHref} className="linkish">
              auditoría
            </Link>{' '}
            está en Gestión.
          </p>
        </div>
      ) : (
        <p className="muted small" style={{ marginBottom: '1rem' }}>
          Órdenes de producción Biesse.{' '}
          <Link to={gestionAuditoriaHref} className="linkish">
            Ver auditoría
          </Link>
          .
        </p>
      )}

      <ModuleListCard
            title={viewMode === 'ops' ? 'Órdenes por OP' : 'Órdenes'}
            error={err}
            loading={loading}
            toolbar={filterToolbar}
            footer={
              !loading && total > 0 ? (
                <ModulePagination
                  page={page}
                  totalPages={totalPages}
                  disabled={loading}
                  info={`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} de ${total} ${viewMode === 'ops' ? 'OPs' : ''}`}
                  onPrev={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => p + 1)}
                />
              ) : null
            }
          >
            {!loading ? (
              <>
                <p className="pad small muted" style={{ paddingTop: 0, margin: 0 }}>
                  {total} {viewMode === 'ops' ? 'OP' : 'registro'}
                  {total !== 1 ? 's' : ''}
                  {viewMode === 'ops' ? ' · XMLs agrupados por número de OP' : ''}
                </p>
                {viewMode === 'ops' ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }} />
                          <th>OP / Obra</th>
                          <th>Avance</th>
                          <th>Estado</th>
                          <th>Obras</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ops.map((op) => {
                          const code = String(op.op_codigo ?? op.opCodigo ?? '—')
                          const open = expandedOps.has(code)
                          const obras = Array.isArray(op.obras) ? op.obras : []
                          return (
                            <Fragment key={code}>
                              <tr className="table__row--group">
                                <td>
                                  <button
                                    type="button"
                                    className="linkish"
                                    aria-label={open ? 'Colapsar' : 'Expandir'}
                                    onClick={() => toggleOp(code)}
                                  >
                                    {open ? '▾' : '▸'}
                                  </button>
                                </td>
                                <td>
                                  <strong>OP {code}</strong>
                                </td>
                                <td>
                                  {op.porcentaje ?? 0}% ({op.avance_label ?? op.avanceLabel ?? '0/0'})
                                </td>
                                <td>—</td>
                                <td>{op.total_obras ?? op.totalObras ?? obras.length}</td>
                              </tr>
                              {open
                                ? obras.map((obra) => {
                                    const oid = Number(obra.orderid ?? obra.orderId)
                                    return (
                                      <tr
                                        key={oid}
                                        className={selectedId === oid ? 'inv-row-selected' : undefined}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedId(oid)}
                                      >
                                        <td />
                                        <td style={{ paddingLeft: '1.5rem' }}>
                                          <button
                                            type="button"
                                            className="linkish"
                                            onClick={() => setSelectedId(oid)}
                                          >
                                            #{oid}
                                          </button>{' '}
                                          {obra.ordername ?? obra.orderName}
                                        </td>
                                        <td>
                                          {obra.porcentaje ?? 0}% (
                                          {obra.avance_label ?? obra.avanceLabel ?? '0/0'})
                                        </td>
                                        <td>
                                          <span className={orderEstadoTagClass(obra.estado_escaneo ?? obra.estadoEscaneo)}>
                                            {formatOrderEstado(obra.estado_escaneo ?? obra.estadoEscaneo)}
                                          </span>
                                        </td>
                                        <td />
                                      </tr>
                                    )
                                  })
                                : null}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                    {!ops.length ? (
                      <p className="muted pad">Sin OPs. Prueba otra búsqueda o la vista plana.</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Orden</th>
                          <th>Nombre</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((row) => (
                          <tr
                            key={row.orderId}
                            className={selectedId === row.orderId ? 'inv-row-selected' : undefined}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedId(row.orderId)}
                          >
                            <td>
                              <button type="button" className="linkish" onClick={() => setSelectedId(row.orderId)}>
                                {row.orderId}
                              </button>
                            </td>
                            <td>{row.orderName}</td>
                            <td>
                              <span className={orderEstadoTagClass(row.estadoEscaneo)}>
                                {formatOrderEstado(row.estadoEscaneo)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!list.length ? (
                      <p className="muted pad">Sin resultados. Prueba otros filtros o amplía el rango de fechas.</p>
                    ) : null}
                  </div>
                )}
              </>
            ) : null}
          </ModuleListCard>

          <DetailModal
            open={selectedId != null}
            title={detail?.orderName ? `Orden ${detail.orderName}` : `Orden #${selectedId ?? ''}`}
            subtitle="Producción Biesse"
            onClose={closeDetail}
          >
            {detailLoading ? <p className="muted pad">Cargando detalle…</p> : null}
            {!detailLoading && !detail ? <p className="pad form-error">No se pudo cargar el detalle.</p> : null}
            {detail ? (
              <div className="pad">
                <dl className="inv-dl">
                  {[
                    ['ID', detail.orderId],
                    [
                      'Partes',
                      `${detail.partesEscaneadas} / ${detail.totalPartes} (pend. ${detail.partesPendientes})`,
                    ],
                    ['Piezas', `${detail.piezasEscaneadas} / ${detail.totalPiezas}`],
                    ['Avance', `${Number(detail.porcentajeCompletado ?? 0).toFixed(1)}%`],
                    ['Estado', formatOrderEstado(detail.estadoEscaneo)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>
                        {k === 'Estado' ? (
                          <span className={orderEstadoTagClass(detail.estadoEscaneo)}>{v}</span>
                        ) : (
                          v
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                <section className="order-detail-block" aria-labelledby="order-pallets-heading">
                  <h3
                    id="order-pallets-heading"
                    className="card__title"
                    style={{ marginTop: '1.25rem', marginBottom: '0.5rem', fontSize: '1rem' }}
                  >
                    Palés con esta orden
                  </h3>
                  {palletsLoading ? <p className="muted small">Cargando palés…</p> : null}
                  {!palletsLoading && !orderPallets.length ? (
                    <p className="muted small">Esta orden no figura en ningún palé.</p>
                  ) : null}
                  {!palletsLoading && orderPallets.length > 0 ? (
                    <ul className="detail-list">
                      {orderPallets.map((p) => (
                        <li key={p.paleId ?? p.id}>
                          <Link
                            to={`${inventarioBase}?area=pales&id=${p.paleId ?? p.id}`}
                            className="detail-list__code linkish"
                            onClick={closeDetail}
                          >
                            {p.codigo ?? `#${p.paleId}`}
                          </Link>
                          <span className="tag">{p.estado}</span>
                          <span className="small muted">
                            {p.enGuia ? `En guía ${p.guiaNumero ?? ''}`.trim() : 'Sin guía'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                <section className="order-detail-block" aria-labelledby="order-parts-heading">
                  <div
                    className="detail__h"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginTop: '1.25rem',
                    }}
                  >
                    <h3 id="order-parts-heading" className="card__title" style={{ margin: 0, fontSize: '1rem' }}>
                      Partes y piezas
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => printBiesseOrderDetail(detail)}
                      >
                        Imprimir detalle
                      </button>
                      <Can I={ACTION.PRINT} a={FEATURE.BIESSE_STICKERS}>
                        <BiesseStickerPrintButton detail={detail} />
                      </Can>
                    </div>
                  </div>
                  <OrderPartsDetail partes={detail.partes ?? []} />
                </section>

                <form className="form-section" style={{ marginTop: '1.25rem' }} onSubmit={(e) => void handleSaveOrder(e)}>
                  <h3 className="card__title" style={{ fontSize: '1rem' }}>
                    Editar orden
                  </h3>
                  <label className="field">
                    <span>Observaciones</span>
                    <textarea rows={3} value={orderEditNotes} onChange={(e) => setOrderEditNotes(e.target.value)} />
                  </label>
                  <div className="form-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <CanButton
                      I={ACTION.UPDATE}
                      a={FEATURE.BIESSE_ORDERS}
                      type="submit"
                      className="btn btn--primary"
                      disabled={orderEditBusy || orderDeleteBusy}
                    >
                      {orderEditBusy ? 'Guardando…' : 'Guardar cambios'}
                    </CanButton>
                    <CanButton
                      I={ACTION.UPDATE}
                      a={FEATURE.BIESSE_ORDERS}
                      type="button"
                      className="btn btn--ghost"
                      style={{ color: 'var(--danger, #b00020)' }}
                      disabled={orderEditBusy || orderDeleteBusy}
                      onClick={() => void handleDeleteOrder()}
                    >
                      {orderDeleteBusy ? 'Eliminando…' : 'Eliminar orden'}
                    </CanButton>
                  </div>
                </form>

                <Can I="view" a={FEATURE.BIESSE_TOOLS}>
                  {toolErr ? <p className="form-error">{toolErr}</p> : null}
                  {toolMsg ? (
                    <p className="muted small" role="status">
                      {toolMsg}
                    </p>
                  ) : null}
                </Can>
              </div>
            ) : null}
          </DetailModal>
    </>
  )

  return embedded ? body : <ModulePage>{body}</ModulePage>
}
