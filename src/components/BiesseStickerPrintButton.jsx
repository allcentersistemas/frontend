import { useEffect, useMemo, useState } from 'react'
import {
  openStickerPrintWindow,
  printBiessePartSticker,
  printBiessePartStickersBulk,
} from '../utils/printBiessePartSticker'
import { ZEBRA_BROWSER_PRINT_URL } from '../utils/zebraBrowserPrint'
import {
  getStickerPrintOrientation,
  setStickerPrintOrientation,
  STICKER_PRINT_ORIENTATIONS,
} from '../utils/stickerPrintOrientation'
import {
  getStickerPrintSize,
  setStickerPrintSize,
  STICKER_PRINT_SIZES,
  isZebraZplSize,
} from '../utils/stickerPrintSize'
import * as systemApi from '../api/systemApi'
import { Button } from '../ui/Button.jsx'
import { InlineCode } from '../ui/InlineCode.jsx'
import { inputClass, labelClass } from '../ui/fields.js'

const MAX_BULK = 10

function partPayload(selectedPart) {
  return {
    partId: selectedPart.partId,
    partCode: selectedPart.partCode,
    partNumber: selectedPart.partNumber || selectedPart.partId,
    descripcion: selectedPart.descripcion,
    descripcion1: selectedPart.descripcion1,
    matedgeup: selectedPart.matedgeup,
    matedgelo: selectedPart.matedgelo,
    matedgel: selectedPart.matedgel,
    matedger: selectedPart.matedger,
    material: selectedPart.material,
    longitud: selectedPart.longitud,
    ancho: selectedPart.ancho,
    cantidad: selectedPart.cantidad,
  }
}

function queueLabel(part, numeroPieza) {
  const code = part?.partCode ?? part?.partId ?? '—'
  const desc = part?.descripcion ? ` — ${String(part.descripcion).slice(0, 32)}` : ''
  return `${code}${desc} · pieza ${numeroPieza}`
}

async function auditStickerPrint(detail, entries) {
  try {
    await systemApi.recordStickerPrint({
      orderId: detail.orderId,
      metodo: entries.length > 1 ? 'MANUAL_MASIVO' : 'MANUAL',
      equipo:
        typeof navigator !== 'undefined' ? `${navigator.platform || 'web'}`.slice(0, 64) : 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      ubicacion: typeof window !== 'undefined' ? window.location?.pathname ?? null : null,
      detalles: entries.map(({ part, piece, printResult }) => ({
        partId: part.partId,
        piezaId: piece?.piezaId ?? null,
        numeroPieza: piece?.numeroPieza ?? 1,
        codigoQr: printResult?.qrCode ?? null,
        snapshot: JSON.stringify({
          orderName: detail.orderName,
          partCode: part.partCode,
          partNumber: part.partNumber,
          material: part.material,
          descripcion: part.descripcion,
          descripcion1: part.descripcion1,
          longitud: part.longitud,
          ancho: part.ancho,
          cantidad: part.cantidad,
          printedAt: printResult?.printedAt ?? null,
        }),
      })),
    })
  } catch (auditErr) {
    console.warn('No se pudo auditar la impresión', auditErr)
  }
}

/**
 * Botón + diálogo para imprimir etiqueta de pieza (datos del detalle Biesse / OSI).
 * @param {{ detail: object | null }} props
 */
export function BiesseStickerPrintButton({ detail }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('single')
  const [partId, setPartId] = useState(null)
  const [numeroPieza, setNumeroPieza] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [printSize, setPrintSize] = useState(getStickerPrintSize)
  const [printOrientation, setPrintOrientation] = useState(getStickerPrintOrientation)
  const [bulkQueue, setBulkQueue] = useState([])

  const partes = useMemo(() => (Array.isArray(detail?.partes) ? detail.partes : []), [detail])

  useEffect(() => {
    setPartId(null)
    setNumeroPieza(1)
    setBulkQueue([])
    setMode('single')
  }, [detail?.orderId])

  const selectedPart = useMemo(
    () => partes.find((p) => p.partId === partId) ?? null,
    [partes, partId],
  )

  useEffect(() => {
    if (!open || !partes.length) return
    if (partId == null || !partes.some((p) => p.partId === partId)) {
      setPartId(partes[0].partId)
    }
  }, [open, partes, partId])

  useEffect(() => {
    if (!selectedPart?.piezas?.length) {
      setNumeroPieza(1)
      return
    }
    const nums = selectedPart.piezas.map((z) => z.numeroPieza).filter((n) => n >= 1)
    const min = Math.min(...nums)
    if (!nums.includes(numeroPieza)) {
      setNumeroPieza(min)
    }
  }, [selectedPart, numeroPieza])

  useEffect(() => {
    if (open) {
      setPrintSize(getStickerPrintSize())
      setPrintOrientation(getStickerPrintOrientation())
    }
  }, [open])

  function buildOrderPayload() {
    return {
      orderName: detail.orderName,
      bookingCode: detail.bookingCode,
    }
  }

  function buildPiecePayload(part, nPieza) {
    const piezaSeleccionada = (part.piezas ?? []).find((z) => z.numeroPieza === nPieza)
    return { numeroPieza: nPieza, piezaId: piezaSeleccionada?.piezaId ?? null }
  }

  function addToBulkQueue() {
    if (!selectedPart || bulkQueue.length >= MAX_BULK) return
    const key = `${selectedPart.partId}-${numeroPieza}`
    if (bulkQueue.some((q) => q.key === key)) {
      window.alert('Esa pieza ya está en la cola.')
      return
    }
    setBulkQueue((prev) => [
      ...prev,
      {
        key,
        partId: selectedPart.partId,
        numeroPieza,
        label: queueLabel(selectedPart, numeroPieza),
      },
    ])
  }

  function addAllPiecesToBulkQueue() {
    if (!selectedPart) return
    const piezas = selectedPart.piezas?.length
      ? selectedPart.piezas
      : Array.from({ length: Math.max(1, Number(selectedPart.cantidad) || 1) }, (_, i) => ({
          numeroPieza: i + 1,
        }))
    const remaining = MAX_BULK - bulkQueue.length
    if (remaining <= 0) {
      window.alert(`La cola ya tiene el máximo de ${MAX_BULK} etiquetas.`)
      return
    }
    const toAdd = []
    for (const pieza of piezas) {
      if (toAdd.length >= remaining) break
      const n = pieza.numeroPieza ?? 1
      const key = `${selectedPart.partId}-${n}`
      if (bulkQueue.some((q) => q.key === key) || toAdd.some((q) => q.key === key)) continue
      toAdd.push({
        key,
        partId: selectedPart.partId,
        numeroPieza: n,
        label: queueLabel(selectedPart, n),
      })
    }
    if (!toAdd.length) {
      window.alert('Todas las piezas de esta parte ya están en la cola.')
      return
    }
    if (piezas.length > toAdd.length) {
      window.alert(
        `Se agregaron ${toAdd.length} pieza(s). El máximo por impresión masiva es ${MAX_BULK}.`,
      )
    }
    setBulkQueue((prev) => [...prev, ...toAdd])
  }

  async function handlePrintSingle() {
    if (!detail || !selectedPart) return
    const useZpl = isZebraZplSize(printSize)
    const printWindow = useZpl ? null : openStickerPrintWindow()
    setPrinting(true)
    try {
      const part = partPayload(selectedPart)
      const piece = buildPiecePayload(selectedPart, numeroPieza)
      const printResult = await printBiessePartSticker({
        printWindow,
        printSize,
        printOrientation,
        order: buildOrderPayload(),
        part,
        piece,
      })

      await auditStickerPrint(detail, [{ part, piece, printResult }])

      if (useZpl && printResult?.printMethod === 'html') {
        window.alert(
          'No se detectó Zebra Browser Print.\n\n' +
            'La vista previa del navegador puede verse bien, pero si la etiqueta sale deformada al imprimir, ' +
            'revisa en el diálogo: papel del mismo tamaño elegido (ej. 80×50 mm), escala 100% y márgenes 0.\n\n' +
            'Para ZD230 / ZD420 instala Browser Print y configura la impresora como predeterminada (evita deformaciones).'
        )
      }

      setOpen(false)
    } catch (e) {
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.close()
        } catch {
          /* ignore */
        }
      }
      if (e instanceof Error && e.message === 'impresión no disponible') {
        /* mensaje ya mostrado */
      } else {
        window.alert(e instanceof Error ? e.message : 'No se pudo generar la etiqueta.')
      }
    } finally {
      setPrinting(false)
    }
  }

  async function handlePrintBulk() {
    if (!detail || !bulkQueue.length) return
    const useZpl = isZebraZplSize(printSize)
    const printWindow = useZpl ? null : openStickerPrintWindow()
    setPrinting(true)
    try {
      const items = bulkQueue.map((q) => {
        const partRow = partes.find((p) => p.partId === q.partId)
        if (!partRow) throw new Error('Parte no encontrada en la cola.')
        return {
          order: buildOrderPayload(),
          part: partPayload(partRow),
          piece: buildPiecePayload(partRow, q.numeroPieza),
        }
      })

      const results = await printBiessePartStickersBulk({
        items,
        printSize,
        printOrientation,
        printWindow,
      })

      await auditStickerPrint(
        detail,
        items.map((item, index) => ({
          part: item.part,
          piece: item.piece,
          printResult: results[index],
        })),
      )

      if (useZpl && results[0]?.printMethod === 'html') {
        window.alert(
          'No se detectó Zebra Browser Print.\n\n' +
            'Si la vista previa se ve bien pero imprime deformado: papel correcto (ej. 80×50 mm), escala 100%, márgenes 0.\n\n' +
            'Se abrió impresión HTML para todas las etiquetas.'
        )
      }

      setBulkQueue([])
      setOpen(false)
    } catch (e) {
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.close()
        } catch {
          /* ignore */
        }
      }
      window.alert(e instanceof Error ? e.message : 'No se pudo imprimir las etiquetas.')
    } finally {
      setPrinting(false)
    }
  }

  if (!detail || !partes.length) {
    return null
  }

  return (
    <>
      <Button variant="ghost" type="button" className="!py-2 text-xs" onClick={() => setOpen(true)}>
        Imprimir sticker
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="flex max-h-[min(92vh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-depth backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sticker-dialog-title"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <h3 id="sticker-dialog-title" className="text-base font-semibold text-white">
                Etiqueta de pieza
              </h3>
              <Button variant="ghost" type="button" className="!px-3 !py-2 text-xs" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn btn--sm ${mode === 'single' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setMode('single')}
                >
                  Una etiqueta
                </button>
                <button
                  type="button"
                  className={`btn btn--sm ${mode === 'bulk' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setMode('bulk')}
                >
                  Masivo (hasta {MAX_BULK})
                </button>
              </div>

              <p className="text-sm leading-relaxed text-slate-400">
                QR Biesse (<InlineCode>pieces/resolve</InlineCode>). Compatible con{' '}
                <strong className="font-medium text-slate-300">ZD230 y ZD420</strong> (y otras
                Zebra) vía{' '}
                <a
                  href={ZEBRA_BROWSER_PRINT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline-offset-2 hover:underline"
                >
                  Zebra Browser Print
                </a>
                . Elija orientación y tamaño de etiqueta. Si la vista previa se ve bien pero
                imprime deformado, use Browser Print o configure papel y escala 100% en el driver.
              </p>

              <div>
                <label className={labelClass}>Orientación</label>
                <select
                  className={`${inputClass} mt-2 cursor-pointer`}
                  value={printOrientation}
                  onChange={(e) => {
                    const next = e.target.value
                    setPrintOrientation(next)
                    setStickerPrintOrientation(next)
                  }}
                >
                  {STICKER_PRINT_ORIENTATIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {STICKER_PRINT_ORIENTATIONS.find((o) => o.id === printOrientation)?.hint}
                </p>
              </div>

              <div>
                <label className={labelClass}>Tamaño de impresión</label>
                <select
                  className={`${inputClass} mt-2 cursor-pointer`}
                  value={printSize}
                  onChange={(e) => {
                    const next = e.target.value
                    setPrintSize(next)
                    setStickerPrintSize(next)
                  }}
                >
                  {STICKER_PRINT_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {STICKER_PRINT_SIZES.find((s) => s.id === printSize)?.hint}
                </p>
              </div>

              <div>
                <label className={labelClass}>Parte</label>
                <select
                  className={`${inputClass} mt-2 cursor-pointer`}
                  value={partId ?? ''}
                  onChange={(e) => setPartId(Number(e.target.value))}
                >
                  {partes.map((p) => (
                    <option key={p.partId} value={p.partId}>
                      {(p.partCode ?? p.partId) +
                        (p.descripcion ? ` — ${String(p.descripcion).slice(0, 48)}` : '')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Pieza (número)</label>
                <select
                  className={`${inputClass} mt-2 cursor-pointer`}
                  value={numeroPieza}
                  onChange={(e) => setNumeroPieza(Number(e.target.value))}
                  disabled={!selectedPart?.piezas?.length}
                >
                  {(selectedPart?.piezas ?? [{ numeroPieza: 1 }]).map((z) => (
                    <option key={z.numeroPieza} value={z.numeroPieza}>
                      Pieza {z.numeroPieza}
                      {z.escaneado ? ' (escaneada)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {mode === 'bulk' ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      Cola ({bulkQueue.length}/{MAX_BULK})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="!py-1.5 text-xs"
                        disabled={!selectedPart || bulkQueue.length >= MAX_BULK}
                        onClick={addAllPiecesToBulkQueue}
                      >
                        Agregar todas las piezas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!py-1.5 text-xs"
                        disabled={!selectedPart || bulkQueue.length >= MAX_BULK}
                        onClick={addToBulkQueue}
                      >
                        Agregar pieza actual
                      </Button>
                    </div>
                  </div>
                  {!bulkQueue.length ? (
                    <p className="text-xs text-slate-500">
                      Use «Agregar todas las piezas» para imprimir cada unidad (1, 2, 3…) o agregue piezas una a una.
                    </p>
                  ) : (
                    <ul className="m-0 flex max-h-40 list-none flex-col gap-1 overflow-y-auto p-0">
                      {bulkQueue.map((q) => (
                        <li
                          key={q.key}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-slate-300"
                        >
                          <span className="min-w-0 truncate">{q.label}</span>
                          <button
                            type="button"
                            className="shrink-0 text-slate-400 hover:text-white"
                            onClick={() => setBulkQueue((prev) => prev.filter((x) => x.key !== q.key))}
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
              {mode === 'bulk' ? (
                <Button
                  type="button"
                  disabled={printing || !bulkQueue.length}
                  onClick={() => void handlePrintBulk()}
                >
                  {printing ? 'Generando…' : `Imprimir ${bulkQueue.length || ''} etiqueta(s)`}
                </Button>
              ) : (
                <Button type="button" disabled={printing || !selectedPart} onClick={() => void handlePrintSingle()}>
                  {printing ? 'Generando…' : 'Imprimir'}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
