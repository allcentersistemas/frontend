import { useEffect, useMemo, useState } from 'react'
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

const PAGE_SIZE = 25

function orderEstadoTagClass(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'COMPLETADA' || e === 'COMPLETADO') return 'tag tag--ok'
  if (e === 'EN_PROCESO') return 'tag'
  return 'tag'
}

function formatOrderEstado(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'COMPLETADA' || e === 'COMPLETADO') return 'Completada'
  if (e === 'EN_PROCESO') return 'En proceso'
  if (e === 'PENDIENTE') return 'Pendiente'
  return estado ?? '—'
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
  }, [q, orderIdFilter, stateFilter, fromDateFilter, toDateFilter])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
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
          setTotal(typeof res.totalCount === 'number' ? res.totalCount : 0)
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
  }, [q, orderIdFilter, stateFilter, fromDateFilter, toDateFilter, page])

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null)
      setOrderPallets([])
      return
    }
    let cancelled = false
    ;(async () => {
      setDetailLoading(true)
      setToolErr(null)
      try {
        const d = await biesseApi.orderDetail(selectedId)
        if (!cancelled && d) {
          setDetail(d)
          setOrderEditNotes(d?.observaciones ?? '')
          setList((prev) =>
            prev.map((row) =>
              row.orderId === selectedId
                ? {
                    ...row,
                    estadoEscaneo: d.estadoEscaneo ?? row.estadoEscaneo,
                    partesEscaneadas: d.partesEscaneadas ?? row.partesEscaneadas,
                    totalPartes: d.totalPartes ?? row.totalPartes,
                  }
                : row,
            ),
          )
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
      const fresh = await biesseApi.orderDetail(selectedId)
      setDetail(fresh)
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
        <span className="small">Buscar general</span>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Orden, booking…"
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
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="COMPLETADA">Completada</option>
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
            title="Órdenes"
            error={err}
            loading={loading}
            toolbar={filterToolbar}
            footer={
              !loading && total > 0 ? (
                <ModulePagination
                  page={page}
                  totalPages={totalPages}
                  disabled={loading}
                  info={`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} de ${total}`}
                  onPrev={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => p + 1)}
                />
              ) : null
            }
          >
            {!loading ? (
              <>
                <p className="pad small muted" style={{ paddingTop: 0, margin: 0 }}>
                  {total} registro{total !== 1 ? 's' : ''}
                </p>
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
                </div>
                {!list.length ? (
                  <p className="muted pad">Sin resultados. Prueba otros filtros o amplía el rango de fechas.</p>
                ) : null}
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
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>

                <form className="form-section" style={{ marginTop: '1rem' }} onSubmit={(e) => void handleSaveOrder(e)}>
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

                <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
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

                <div
                  className="detail__h"
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: '1rem' }}
                >
                  <span>Partes</span>
                  <Can I={ACTION.PRINT} a={FEATURE.BIESSE_STICKERS}>
                    <BiesseStickerPrintButton detail={detail} />
                  </Can>
                </div>
                <OrderPartsDetail partes={detail.partes ?? []} />

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
