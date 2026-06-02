import { useEffect, useMemo, useState } from 'react'
import { openStickerPrintWindow, printBiessePartSticker } from '../utils/printBiessePartSticker'
import {
  getStickerPrintSize,
  setStickerPrintSize,
  STICKER_PRINT_SIZES,
} from '../utils/stickerPrintSize'
import * as systemApi from '../api/systemApi'
import { Button } from '../ui/Button.jsx'
import { InlineCode } from '../ui/InlineCode.jsx'
import { inputClass, labelClass } from '../ui/fields.js'

/**
 * Botón + diálogo para imprimir etiqueta de pieza (datos del detalle Biesse / OSI).
 * @param {{ detail: object | null }} props
 */
export function BiesseStickerPrintButton({ detail }) {
  const [open, setOpen] = useState(false)
  const [partId, setPartId] = useState(null)
  const [numeroPieza, setNumeroPieza] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [printSize, setPrintSize] = useState(getStickerPrintSize)

  const partes = useMemo(() => (Array.isArray(detail?.partes) ? detail.partes : []), [detail])

  useEffect(() => {
    setPartId(null)
    setNumeroPieza(1)
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
    if (open) setPrintSize(getStickerPrintSize())
  }, [open])

  async function handlePrint() {
    if (!detail || !selectedPart) return
    const printWindow = openStickerPrintWindow()
    setPrinting(true)
    try {
      const piezaSeleccionada = (selectedPart.piezas ?? []).find((z) => z.numeroPieza === numeroPieza)
      const printResult = await printBiessePartSticker({
        printWindow,
        printSize,
        order: {
          orderName: detail.orderName,
          bookingCode: detail.bookingCode,
        },
        part: {
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
        },
        piece: { numeroPieza, piezaId: piezaSeleccionada?.piezaId ?? null },
      })

      try {
        await systemApi.recordStickerPrint({
          orderId: detail.orderId,
          metodo: 'MANUAL',
          equipo:
            typeof navigator !== 'undefined'
              ? `${navigator.platform || 'web'}`.slice(0, 64)
              : 'web',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          ubicacion: typeof window !== 'undefined' ? window.location?.pathname ?? null : null,
          detalles: [
            {
              partId: selectedPart.partId,
              piezaId: piezaSeleccionada?.piezaId ?? null,
              numeroPieza,
              codigoQr: printResult?.qrCode ?? null,
              snapshot: JSON.stringify({
                orderName: detail.orderName,
                partCode: selectedPart.partCode,
                partNumber: selectedPart.partNumber,
                material: selectedPart.material,
                descripcion: selectedPart.descripcion,
                descripcion1: selectedPart.descripcion1,
                longitud: selectedPart.longitud,
                ancho: selectedPart.ancho,
                cantidad: selectedPart.cantidad,
                matedgeup: selectedPart.matedgeup,
                matedgelo: selectedPart.matedgelo,
                matedgel: selectedPart.matedgel,
                matedger: selectedPart.matedger,
                printedAt: printResult?.printedAt ?? null,
              }),
            },
          ],
        })
      } catch (auditErr) {
        console.warn('No se pudo auditar la impresión', auditErr)
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
        /* mensaje ya mostrado en printBiessePartSticker */
      } else {
        window.alert(e instanceof Error ? e.message : 'No se pudo generar la etiqueta.')
      }
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
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-depth backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sticker-dialog-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <h3 id="sticker-dialog-title" className="text-base font-semibold text-white">
                Etiqueta de pieza
              </h3>
              <Button variant="ghost" type="button" className="!px-3 !py-2 text-xs" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm leading-relaxed text-slate-400">
                Elige la parte y el número de pieza. Se abrirá una ventana con la etiqueta lista para imprimir; el
                código QR coincide con el formato de resolución Biesse (<InlineCode>pieces/resolve</InlineCode>).
              </p>
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
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" disabled={printing || !selectedPart} onClick={() => void handlePrint()}>
                  {printing ? 'Generando…' : 'Imprimir'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
