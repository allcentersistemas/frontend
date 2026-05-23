import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as biesseApi from '../api/biesseApi'
import { OrderAuditPanel } from '../components/OrderAuditPanel.jsx'
import {
  ModuleDetailCard,
  ModuleFilterGrid,
  ModuleListCard,
  ModulePage,
  ModulePagination,
  ModuleSplit,
  ModuleTabs,
} from '../components/module/ModuleChrome.jsx'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { BiesseStickerPrintButton } from '../components/BiesseStickerPrintButton'
import { CanButton } from '../components/CanButton'

const PAGE_SIZE = 25

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const pageTab = searchParams.get('tab') === 'auditoria' ? 'auditoria' : 'listado'

  function selectTab(tab) {
    if (tab === 'auditoria') setSearchParams({ tab: 'auditoria' })
    else setSearchParams({})
  }

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
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const [toolErr, setToolErr] = useState(null)
  const [toolMsg, setToolMsg] = useState(null)
  const [orderEditOpen, setOrderEditOpen] = useState(false)
  const [orderEditNotes, setOrderEditNotes] = useState('')
  const [orderEditBusy, setOrderEditBusy] = useState(false)

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
      return
    }
    let cancelled = false
    ;(async () => {
      setDetailLoading(true)
      try {
        const d = await biesseApi.orderDetail(selectedId)
        if (!cancelled) setDetail(d)
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handleSaveOrder(e) {
    e.preventDefault()
    if (selectedId == null) return
    setOrderEditBusy(true)
    setToolErr(null)
    try {
      await biesseApi.updateOrder(selectedId, { observaciones: orderEditNotes })
      const fresh = await biesseApi.orderDetail(selectedId)
      setDetail(fresh)
      setOrderEditOpen(false)
      setToolMsg('Orden actualizada.')
    } catch (ex) {
      setToolErr(ex instanceof Error ? ex.message : 'No se pudo editar la orden')
    } finally {
      setOrderEditBusy(false)
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
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="EN_PROCESO">EN_PROCESO</option>
          <option value="COMPLETADO">COMPLETADO</option>
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

  return (
    <ModulePage>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h1 className="card__title">Órdenes Biesse</h1>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Consulta órdenes de producción, avance de escaneo y auditoría de eventos.
        </p>
      </div>

      <ModuleTabs
        ariaLabel="Vista órdenes"
        activeId={pageTab}
        onChange={selectTab}
        tabs={[
          { id: 'listado', label: 'Listado' },
          { id: 'auditoria', label: 'Auditoría' },
        ]}
      />

      {pageTab === 'auditoria' ? (
        <OrderAuditPanel />
      ) : (
        <ModuleSplit>
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
                            <span className="tag">{row.estadoEscaneo ?? '—'}</span>
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

          <ModuleDetailCard title="Detalle">
            {selectedId == null ? (
              <p className="muted pad">Selecciona una orden en la tabla.</p>
            ) : detailLoading ? (
              <p className="muted pad">Cargando detalle…</p>
            ) : detail ? (
              <div className="pad">
                <dl className="inv-dl">
                  {[
                    ['Nombre', detail.orderName],
                    [
                      'Partes',
                      `${detail.partesEscaneadas} / ${detail.totalPartes} (pend. ${detail.partesPendientes})`,
                    ],
                    ['Piezas', `${detail.piezasEscaneadas} / ${detail.totalPiezas}`],
                    ['Avance', `${Number(detail.porcentajeCompletado ?? 0).toFixed(1)}%`],
                    ['Observaciones', detail.observaciones || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>

                {orderEditOpen ? (
                  <form className="form-section" style={{ marginTop: '1rem' }} onSubmit={(e) => void handleSaveOrder(e)}>
                    <label className="field">
                      <span>Observaciones de la orden</span>
                      <textarea
                        rows={3}
                        value={orderEditNotes}
                        onChange={(e) => setOrderEditNotes(e.target.value)}
                      />
                    </label>
                    <div className="form-actions">
                      <CanButton I={ACTION.UPDATE} a={FEATURE.BIESSE_ORDERS} type="submit" className="btn btn--primary" disabled={orderEditBusy}>
                        {orderEditBusy ? 'Guardando…' : 'Guardar orden'}
                      </CanButton>
                      <button type="button" className="btn btn--ghost" onClick={() => setOrderEditOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="detail__h" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>Partes</span>
                  <Can I={ACTION.PRINT} a={FEATURE.BIESSE_STICKERS}>
                    <BiesseStickerPrintButton detail={detail} />
                  </Can>
                </div>
                <ul className="detail-list">
                  {(detail.partes ?? []).map((p) => (
                    <li key={p.partId}>
                      <span className="detail-list__code">{p.partCode ?? p.partId}</span>
                      <span className={p.escaneado ? 'tag tag--ok' : 'tag'}>{p.escaneado ? 'Escaneado' : 'Pendiente'}</span>
                      <span className="small muted">{p.piezas?.length ?? 0} piezas</span>
                    </li>
                  ))}
                </ul>

                <Can I="view" a={FEATURE.BIESSE_TOOLS}>
                  {toolErr ? <p className="form-error">{toolErr}</p> : null}
                  {toolMsg ? (
                    <p className="muted small" role="status">
                      {toolMsg}
                    </p>
                  ) : null}
                </Can>
              </div>
            ) : (
              <p className="pad form-error">No se pudo cargar el detalle.</p>
            )}
          </ModuleDetailCard>
        </ModuleSplit>
      )}
    </ModulePage>
  )
}
