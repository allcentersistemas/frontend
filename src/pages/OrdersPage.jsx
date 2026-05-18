import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as biesseApi from '../api/biesseApi'
import { OrderAuditPanel } from '../components/OrderAuditPanel.jsx'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { BiesseStickerPrintButton } from '../components/BiesseStickerPrintButton'
import { CanButton } from '../components/CanButton'
import { AlertBanner } from '../ui/AlertBanner.jsx'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { FormField } from '../ui/FormField.jsx'
import { GlassCard, GlassCardTitle } from '../ui/GlassCard.jsx'
import { InlineCode } from '../ui/InlineCode.jsx'
import { inputClass, linkButtonClass, selectClass } from '../ui/fields.js'
import { PageHeader } from '../ui/PageHeader.jsx'
import { PageShell } from '../ui/PageShell.jsx'
import { PagerBar } from '../ui/PagerBar.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { SplitGrid } from '../ui/SplitGrid.jsx'
import { TabBar, TabButton } from '../ui/TabBar.jsx'
import { Table, TableScroll, Td, Th, Thead, Tr } from '../ui/Table.jsx'
import { Toolbar } from '../ui/Toolbar.jsx'

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

  useEffect(() => {
    if (selectedId == null) return
    ;(async () => {})()
    return () => {}
  }, [selectedId, detail])

  const totalPages = Math.max(0, Math.ceil(total / PAGE_SIZE))

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

  return (
    <PageShell>
      <PageHeader title="Órdenes">
        <p>
          Listado desde <InlineCode>GET /api/biesse/scan/orders</InlineCode>
        </p>
      </PageHeader>

      <TabBar aria-label="Vista órdenes">
        <TabButton selected={pageTab === 'listado'} onClick={() => selectTab('listado')}>
          Listado
        </TabButton>
        <TabButton selected={pageTab === 'auditoria'} onClick={() => selectTab('auditoria')}>
          Auditoría
        </TabButton>
      </TabBar>

      {pageTab === 'auditoria' ? (
        <OrderAuditPanel />
      ) : (
        <>
      <Toolbar>
        <FormField label="Buscar general">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Orden, booking, ID…"
            className={inputClass}
          />
        </FormField>
        <FormField label="ID exacto">
          <input
            inputMode="numeric"
            value={orderIdFilter}
            onChange={(e) => setOrderIdFilter(e.target.value)}
            placeholder="orderId"
            className={inputClass}
          />
        </FormField>
        <FormField label="Estado">
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="EN_PROCESO">EN_PROCESO</option>
            <option value="COMPLETADO">COMPLETADO</option>
          </select>
        </FormField>
        <FormField label="Desde">
          <input type="date" value={fromDateFilter} onChange={(e) => setFromDateFilter(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Hasta">
          <input type="date" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} className={inputClass} />
        </FormField>
        <div className="flex flex-1 flex-col justify-end sm:min-w-[120px]">
          <span className="invisible mb-2 text-xs sm:hidden">—</span>
          <Button
            variant="ghost"
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              setSearchInput('')
              setOrderIdFilter('')
              setStateFilter('')
              setFromDateFilter('')
              setToDateFilter('')
              setPage(0)
            }}
          >
            Limpiar
          </Button>
        </div>
      </Toolbar>

      {err ? <AlertBanner>{err}</AlertBanner> : null}

      <SplitGrid>
        <GlassCard padding={false} className="overflow-hidden">
          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <GlassCardTitle>Órdenes</GlassCardTitle>
                <p className="mt-1 text-xs text-slate-500">{total} registro{total !== 1 ? 's' : ''}</p>
              </div>
              <TableScroll>
                <Table>
                  <Thead>
                    <tr>
                      <Th>ID</Th>
                      <Th>Orden</Th>
                      <Th>Estado</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {list.map((row) => (
                      <Tr key={row.orderId} selected={selectedId === row.orderId}>
                        <Td>
                          <button type="button" className={linkButtonClass} onClick={() => setSelectedId(row.orderId)}>
                            {row.orderId}
                          </button>
                        </Td>
                        <Td className="font-medium text-slate-100">{row.orderName}</Td>
                        <Td>
                          <Badge tone="default">{row.estadoEscaneo ?? '—'}</Badge>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableScroll>
              {!list.length ? (
                <div className="p-6">
                  <EmptyState title="Sin resultados" hint="Prueba otros filtros o amplía el rango de fechas." />
                </div>
              ) : null}
              {!loading && total > 0 ? (
                <PagerBar
                  info={`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} de ${total}`}
                  page={page}
                  totalPages={totalPages}
                  onPrev={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => p + 1)}
                />
              ) : null}
            </>
          )}
        </GlassCard>

        <GlassCard className="lg:sticky lg:top-8">
          <GlassCardTitle>Detalle</GlassCardTitle>
          {selectedId == null ? (
            <p className="mt-4 text-sm text-slate-500">Selecciona una orden en la tabla.</p>
          ) : detailLoading ? (
            <Spinner className="h-6 w-6" />
          ) : detail ? (
            <div className="mt-5 space-y-5">
              <dl className="grid gap-4">
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
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
                    <dd className="mt-1 text-sm text-slate-200">{v}</dd>
                  </div>
                ))}
              </dl>

              {orderEditOpen ? (
                <form className="space-y-4 border-t border-white/[0.06] pt-5" onSubmit={(e) => void handleSaveOrder(e)}>
                  <FormField label="Observaciones de la orden">
                    <textarea
                      rows={3}
                      value={orderEditNotes}
                      onChange={(e) => setOrderEditNotes(e.target.value)}
                      className={inputClass + ' min-h-[5rem] resize-y'}
                    />
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    <CanButton
                      I={ACTION.UPDATE}
                      a={FEATURE.BIESSE_ORDERS}
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-400/35 disabled:opacity-50"
                      disabled={orderEditBusy}
                    >
                      {orderEditBusy ? 'Guardando…' : 'Guardar orden'}
                    </CanButton>
                    <Button variant="ghost" type="button" onClick={() => setOrderEditOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                <h3 className="text-sm font-semibold text-white">Partes</h3>
                <Can I={ACTION.PRINT} a={FEATURE.BIESSE_STICKERS}>
                  <BiesseStickerPrintButton detail={detail} />
                </Can>
              </div>
              <ul className="space-y-2">
                {(detail.partes ?? []).map((p) => (
                  <li
                    key={p.partId}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm"
                  >
                    <span className="font-mono text-xs text-amber-200/90">{p.partCode ?? p.partId}</span>
                    <Badge tone={p.escaneado ? 'success' : 'warn'}>{p.escaneado ? 'Escaneado' : 'Pendiente'}</Badge>
                    <span className="text-xs text-slate-500">{p.piezas?.length ?? 0} piezas</span>
                  </li>
                ))}
              </ul>

              <Can I="view" a={FEATURE.BIESSE_TOOLS}>
                {toolErr ? <AlertBanner>{toolErr}</AlertBanner> : null}
                {toolMsg ? (
                  <p className="text-xs text-slate-500" role="status">
                    {toolMsg}
                  </p>
                ) : null}
              </Can>
            </div>
          ) : (
            <AlertBanner>No se pudo cargar el detalle.</AlertBanner>
          )}
        </GlassCard>
      </SplitGrid>
        </>
      )}
    </PageShell>
  )
}
