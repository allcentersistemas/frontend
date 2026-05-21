import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import * as systemApi from '../api/systemApi'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { CanButton } from '../components/CanButton'
import { PaleAuditPanel } from '../components/PaleAuditPanel.jsx'
import { AlertBanner } from '../ui/AlertBanner.jsx'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { FormField } from '../ui/FormField.jsx'
import { GlassCard, GlassCardTitle } from '../ui/GlassCard.jsx'
import { InlineCode } from '../ui/InlineCode.jsx'
import { inputClass, linkButtonClass } from '../ui/fields.js'
import { PageHeader } from '../ui/PageHeader.jsx'
import { PageShell } from '../ui/PageShell.jsx'
import { SplitGrid } from '../ui/SplitGrid.jsx'
import { TabBar, TabButton } from '../ui/TabBar.jsx'
import { Table, TableScroll, Td, Th, Thead, Tr } from '../ui/Table.jsx'
import { Toolbar } from '../ui/Toolbar.jsx'

function palletId(row) {
  return row?.paleenvioid ?? row?.id
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Fecha/hora corta para impresión compacta. */
function formatPrintShort(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function isPalletClosed(estado) {
  return String(estado ?? '').trim().toUpperCase() === 'CERRADO'
}

function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Descripciones de la tabla {@code partes} (database_schema.py). Compat. API antigua: orderDescripcion. */
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
  return line.medida ?? null
}

/** Solo orderName + descripciones de parte + medida (L×A desde partes). Sin booking. */
function orderCellHtml(line) {
  const name = line.orderName ?? line.orderId
  const d0 = partDescripcion0(line)
  const d1 = partDescripcion1(line)
  const m = partMedida(line)
  const bits = []
  if (name != null && String(name).trim() !== '') {
    bits.push(`<div><strong>${esc(String(name))}</strong></div>`)
  }
  if (d0 != null && String(d0).trim() !== '') bits.push(`<div class="ord-desc">${esc(String(d0))}</div>`)
  if (d1 != null && String(d1).trim() !== '') bits.push(`<div class="ord-desc">${esc(String(d1))}</div>`)
  if (m != null && String(m).trim() !== '') {
    bits.push(`<div class="ord-med"><span class="ord-med__lbl">Med.</span> ${esc(String(m))}</div>`)
  }
  return bits.length ? bits.join('') : '—'
}

/** p.ej. 2/7 = pieza 2 de total programado en partes.cantidad */
function pieceFractionText(line) {
  const n = line.numeroPieza
  const total = piezasPlanParte(line)
  if (n != null && total != null && Number(total) > 0) {
    return `${n}/${total}`
  }
  if (n != null) return String(n)
  return '—'
}

/**
 * Ventana de impresión: resumen del pale cerrado (cabecera + líneas + QR del código de pale).
 */
async function printPalletOrderSummary(header, details) {
  const codigoPale = String(header.codigo ?? header.paleenvioid ?? '').trim()
  let qrBlock = ''
  if (codigoPale) {
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(codigoPale, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 128,
      })
      qrBlock = `<div class="qr-wrap"><img src="${dataUrl}" width="128" height="128" alt="QR código pale" /><div class="qr-cap">${esc(codigoPale)}</div></div>`
    } catch {
      qrBlock = ''
    }
  }

  const rows = (Array.isArray(details) ? details : [])
    .map(
      (line) => `
    <tr>
      <td>${esc(line.partCode ?? line.partId)}</td>
      <td class="ord-cell">${orderCellHtml(line)}</td>
      <td class="num">${esc(pieceFractionText(line))}</td>
      <td class="dt">${esc(formatPrintShort(line.fechaAgregado))}</td>
    </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(header.codigo)} — Resumen pale</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: system-ui, Segoe UI, sans-serif; margin: 0; padding: 0; color: #111; font-size: 9pt; line-height: 1.25; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
    .top-text { flex: 1; min-width: 0; }
    h1 { font-size: 11pt; margin: 0 0 4px; font-weight: 700; }
    .qr-wrap { text-align: center; flex-shrink: 0; }
    .qr-wrap img { display: block; margin: 0 auto; }
    .qr-cap { font-size: 7pt; margin-top: 2px; color: #333; max-width: 130px; word-break: break-all; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 12px;
      font-size: 8pt;
      margin-bottom: 8px;
      line-height: 1.35;
    }
    .meta strong { display: inline-block; min-width: 6.5rem; font-weight: 600; color: #222; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; table-layout: fixed; }
    th, td { border: 1px solid #bbb; padding: 3px 4px; text-align: left; vertical-align: top; word-wrap: break-word; }
    th { background: #eee; font-weight: 600; }
    td.num, td.dt { white-space: nowrap; width: 1%; }
    td.dt { font-variant-numeric: tabular-nums; }
    .ord-cell .ord-desc { font-size: 7.5pt; color: #333; margin-top: 1px; }
    .ord-cell .ord-med { font-size: 7.5pt; color: #222; margin-top: 2px; }
    .ord-cell .ord-med__lbl { font-weight: 600; color: #444; margin-right: 4px; }
    caption { text-align: left; font-weight: 600; margin-bottom: 4px; font-size: 8pt; }
    tr { break-inside: avoid; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="top">
    <div class="top-text">
      <h1>Resumen pale / orden de envío</h1>
    </div>
    ${qrBlock}
  </div>
  <div class="meta">
    <div><strong>Código</strong> ${esc(header.codigo)}</div>
    <div><strong>Estado</strong> ${esc(header.estado)}</div>
    <div><strong>Origen</strong> ${esc(header.sucursalOrigenNombre)}</div>
    <div><strong>Destino</strong> ${esc(header.sucursalDestinoNombre ?? header.ubicacionDestinoNombre)}</div>
    <div><strong>Piezas / órdenes</strong> ${esc(header.cantidadPiezas)} / ${esc(header.cantidadOrdenes)}</div>
    <div><strong>Creación</strong> ${esc(formatPrintShort(header.fechaCreacion))}</div>
    <div><strong>Resumen</strong> ${esc(header.ordenesResumen)}</div>
    <div><strong>Cierre</strong> ${esc(formatPrintShort(header.fechaCierre))}</div>
    <div style="grid-column: 1 / -1"><strong>Notas</strong> ${esc(header.notas)}</div>
  </div>
  <table>
    <caption>Detalle de piezas</caption>
    <thead>
      <tr>
        <th style="width:12%">Parte</th>
        <th>Orden · Desc. · Med. (L×A)</th>
        <th style="width:8%">Pza</th>
        <th style="width:14%">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">Sin líneas</td></tr>'}
    </tbody>
  </table>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) {
    window.alert('Permite ventanas emergentes para imprimir el resumen.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

export function PalesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pageTab = searchParams.get('tab') === 'auditoria' ? 'auditoria' : 'listado'

  function selectTab(tab) {
    if (tab === 'auditoria') setSearchParams({ tab: 'auditoria' })
    else setSearchParams({})
  }

  const guiasHref = useMemo(
    () => `${location.pathname.replace(/\/pales\/?$/, '/inventario')}`,
    [location.pathname],
  )

  const [pallets, setPallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [fromDateFilter, setFromDateFilter] = useState('')
  const [toDateFilter, setToDateFilter] = useState('')

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [opMsg, setOpMsg] = useState(null)
  const [opErr, setOpErr] = useState(null)









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
      try {
        const d = await systemApi.getPalletById(selectedId)
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
    ;(async () => {

    })()
    return () => {
    }
  }, [selectedId, detail])


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
        row.sucursalOrigenNombre,
        row.sucursalDestinoNombre,
        row.ubicacionDestinoNombre,
        row.ordenesResumen,
        row.notas,
        String(palletId(row) ?? ''),
      ].some((value) => String(value ?? '').toLowerCase().includes(needle))
    })
  }, [pallets, searchInput, fromDateFilter, toDateFilter])


  async function handleSavePale(e) {
    e.preventDefault()
    if (selectedId == null) return
    setEditBusy(true)
    setOpErr(null)
    try {
      const updated = await systemApi.updatePallet(selectedId, { notes: editNotes })
      setDetail(updated)
      const list = await systemApi.listPallets()
      setPallets(Array.isArray(list) ? list : [])
      setEditOpen(false)
      setOpMsg('Pale actualizado.')
    } catch (ex) {
      setOpErr(ex instanceof Error ? ex.message : 'No se pudo editar el pale')
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <PageShell>


      <TabBar aria-label="Vista pales">
        <TabButton selected={pageTab === 'listado'} onClick={() => selectTab('listado')}>
          Listado
        </TabButton>
        <TabButton selected={pageTab === 'auditoria'} onClick={() => selectTab('auditoria')}>
          Auditoría
        </TabButton>
      </TabBar>

      {pageTab === 'auditoria' ? (
        <PaleAuditPanel />
      ) : (
        <>
      <GlassCard className="mb-4">
        <p className="text-sm text-slate-600">
          Para despachar palés <strong>escaneados</strong>, créalos en una <strong>guía</strong> en Inventario (número
          automático, sin vehículo ni chofer). También puedes agregar líneas manuales a la guía.
        </p>
        <p className="mt-2">
          <Link to={guiasHref} className={linkButtonClass}>
            Ir a crear / gestionar guías
          </Link>
        </p>
      </GlassCard>
      {err ? <AlertBanner>{err}</AlertBanner> : null}
      {opErr ? <AlertBanner>{opErr}</AlertBanner> : null}
      {opMsg ? (
        <p className="mb-4 text-sm text-slate-500" role="status">
          {opMsg}
        </p>
      ) : null}

      <Toolbar>
        <FormField label="Buscar pale">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Código, estado, destino, orden…"
            className={inputClass}
          />
        </FormField>
        <FormField label="Desde">
          <input type="date" value={fromDateFilter} onChange={(e) => setFromDateFilter(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Hasta">
          <input type="date" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} className={inputClass} />
        </FormField>
        <div className="flex flex-1 flex-col justify-end sm:min-w-[100px]">
          <span className="invisible mb-2 text-xs sm:hidden">—</span>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setSearchInput('')
              setFromDateFilter('')
              setToDateFilter('')
            }}
          >
            Limpiar
          </Button>
        </div>
      </Toolbar>

      <SplitGrid>
        <GlassCard padding={false} className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <GlassCardTitle>Listado de pales</GlassCardTitle>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Cargando…</p>
          ) : (
            <>
              <TableScroll>
                <Table>
                  <Thead>
                    <tr>
                      <Th>Código</Th>
                      <Th>Estado</Th>
                      <Th>Piezas</Th>
                      <Th>Origen</Th>
                      <Th>Destino</Th>
                      <Th>Creación</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {filteredPallets.map((row) => {
                      const id = palletId(row)
                      return (
                        <Tr key={id} selected={selectedId === id}>
                          <Td>
                            <button type="button" className={linkButtonClass} onClick={() => setSelectedId(id)}>
                              {row.codigo}
                            </button>
                          </Td>
                          <Td>
                            <Badge tone="default">{row.estado}</Badge>
                          </Td>
                          <Td className="tabular-nums">{row.cantidadPiezas ?? 0}</Td>
                          <Td className="text-xs text-slate-400">{row.sucursalOrigenNombre ?? '—'}</Td>
                          <Td className="text-xs text-slate-400">En guía</Td>
                          <Td className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(row.fechaCreacion)}</Td>
                        </Tr>
                      )
                    })}
                  </tbody>
                </Table>
              </TableScroll>
              {!filteredPallets.length ? (
                <p className="p-6 text-center text-sm text-slate-500">No hay pales para la búsqueda actual.</p>
              ) : null}
            </>
          )}
        </GlassCard>

        <GlassCard className="lg:sticky lg:top-8">
          <GlassCardTitle>Detalle del pale</GlassCardTitle>
          {selectedId == null ? (
            <p className="mt-4 text-sm text-slate-500">Selecciona un pale en la tabla.</p>
          ) : detailLoading ? (
            <p className="mt-4 text-sm text-slate-500">Cargando…</p>
          ) : header ? (
            <div className="mt-5 space-y-5">
              <dl className="grid gap-4">
                {[
                  ['Código', header.codigo],
                  ['Estado', header.estado],
                  ['Piezas / órdenes', `${header.cantidadPiezas ?? 0} piezas · ${header.cantidadOrdenes ?? 0} órdenes`],
                  ['Resumen órdenes', header.ordenesResumen || '—'],
                  ['Notas', header.notas || '—'],
                  [
                    'Origen → destino',
                    `${header.sucursalOrigenNombre ?? '—'} → ${header.ubicacionDestinoNombre ?? header.sucursalDestinoNombre ?? '-'}`,
                  ],
                  ['Creación', formatDateTime(header.fechaCreacion)],
                  ['Cierre', formatDateTime(header.fechaCierre)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
                    <dd className="mt-1 text-sm text-slate-200">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                <CanButton
                  I={ACTION.UPDATE}
                  a={FEATURE.PALES_OPERACIONES}
                  className="rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-400/35"
                  onClick={() => navigate(`${selectedId}/editar`)}
                >
                  Abrir página de edición
                </CanButton>
              </div>
              {editOpen ? (
                <form className="space-y-4 border-t border-white/[0.06] pt-4" onSubmit={(e) => void handleSavePale(e)}>
                  <FormField label="Notas del pale">
                    <textarea
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className={inputClass + ' min-h-[5rem] resize-y'}
                    />
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    <CanButton
                      I={ACTION.UPDATE}
                      a={FEATURE.PALES_OPERACIONES}
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-400/35 disabled:opacity-50"
                      disabled={editBusy}
                    >
                      {editBusy ? 'Guardando…' : 'Guardar pale'}
                    </CanButton>
                    <Button variant="ghost" type="button" onClick={() => setEditOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : null}

              {closed ? (
                <div className="border-t border-white/[0.06] pt-4">
                  <CanButton
                    I={ACTION.PRINT}
                    a={FEATURE.PALES_PRINT}
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-400/35"
                    onClick={() => void printPalletOrderSummary(header, details)}
                  >
                    Imprimir resumen (orden de envío)
                  </CanButton>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  El resumen imprimible solo está disponible cuando el pale está <strong className="text-slate-300">cerrado</strong>.
                </p>
              )}

              <h3 className="text-sm font-semibold text-white">Líneas ({details.length})</h3>
              <ul className="space-y-2">
                {details.map((line) => (
                  <li
                    key={line.paleenviodetalleid ?? `${line.piezaId}-${line.partId}`}
                    className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm"
                  >
                    <span className="font-mono text-xs text-amber-200/90">
                      {line.partCode ?? line.partId} · pieza {pieceFractionText(line)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {line.orderName ?? line.orderId}
                      {partDescripcion0(line) ? ` · ${partDescripcion0(line)}` : ''}
                      {partDescripcion1(line) ? ` · ${partDescripcion1(line)}` : ''}
                      {partMedida(line) ? ` · ${partMedida(line)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {!details.length ? <p className="text-xs text-slate-500">Sin líneas en este pale.</p> : null}
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
