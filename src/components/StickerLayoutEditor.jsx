import { useCallback, useMemo, useRef, useState } from 'react'
import { DetailModal } from './DetailModal.jsx'
import { Button } from '../ui/Button.jsx'
import { inputClass } from '../ui/fields.js'
import {
  LAYOUT_ELEMENT_IDS,
  LAYOUT_ELEMENT_META,
  STICKER_LAYOUT_PREVIEW_SAMPLE,
  clampLayoutElement,
  resetVisualLayoutForLabel,
  getUseVisualLayout,
  setUseVisualLayout,
  setVisualLayoutForLabel,
} from '../utils/stickerVisualLayout.js'

const ELEMENT_COLORS = {
  header: 'rgba(251, 191, 36, 0.35)',
  booking: 'rgba(147, 197, 253, 0.3)',
  material: 'rgba(134, 239, 172, 0.3)',
  subdesc: 'rgba(196, 181, 253, 0.3)',
  ref: 'rgba(253, 186, 116, 0.35)',
  diagram: 'rgba(148, 163, 184, 0.25)',
  qr: 'rgba(56, 189, 248, 0.35)',
  dims: 'rgba(244, 114, 182, 0.3)',
  footerLeft: 'rgba(203, 213, 225, 0.25)',
  footerRight: 'rgba(203, 213, 225, 0.25)',
}

const ELEMENT_BORDER = {
  header: '#fbbf24',
  booking: '#93c5fd',
  material: '#86efac',
  subdesc: '#c4b5fd',
  ref: '#fdba74',
  diagram: '#94a3b8',
  qr: '#38bdf8',
  dims: '#f472b6',
  footerLeft: '#cbd5e1',
  footerRight: '#cbd5e1',
}

/** @param {number} value @param {number} [step=0.5] */
function snapMm(value, step = 0.5) {
  return Math.round(value / step) * step
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} props.labelWidthMm
 * @param {number} props.labelHeightMm
 * @param {'landscape'|'portrait'} props.orientation
 * @param {import('../utils/stickerVisualLayout.js').StickerVisualLayout} props.initialLayout
 * @param {object} [props.previewData]
 * @param {(layout: import('../utils/stickerVisualLayout.js').StickerVisualLayout, useVisual: boolean) => void} [props.onSaved]
 */
export function StickerLayoutEditor({
  open,
  onClose,
  labelWidthMm,
  labelHeightMm,
  orientation,
  initialLayout,
  previewData,
  onSaved,
}) {
  const [layout, setLayout] = useState(initialLayout)
  const [selectedId, setSelectedId] = useState('header')
  const [useVisual, setUseVisual] = useState(() => getUseVisualLayout())
  const [snapGrid, setSnapGrid] = useState(true)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  const sample = previewData ?? STICKER_LAYOUT_PREVIEW_SAMPLE

  const scale = useMemo(() => {
    const maxW = 720
    const maxH = 420
    return Math.min(maxW / labelWidthMm, maxH / labelHeightMm, 12)
  }, [labelWidthMm, labelHeightMm])

  const patchElement = useCallback(
    (id, patch) => {
      setLayout((prev) => {
        const current = prev.elements[id]
        if (!current) return prev
        const merged = clampLayoutElement({ ...current, ...patch }, labelWidthMm, labelHeightMm, id)
        return {
          ...prev,
          elements: { ...prev.elements, [id]: merged },
        }
      })
    },
    [labelWidthMm, labelHeightMm],
  )

  const handlePointerDown = useCallback(
    (e, id, mode) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedId(id)
      const el = layout.elements[id]
      if (!el) return
      dragRef.current = {
        id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startEl: { ...el },
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [layout.elements],
  )

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragRef.current
      if (!drag) return
      const dxPx = e.clientX - drag.startX
      const dyPx = e.clientY - drag.startY
      const dxMm = dxPx / scale
      const dyMm = dyPx / scale
      const grid = snapGrid ? 0.5 : 0.1

      if (drag.mode === 'move') {
        patchElement(drag.id, {
          xMm: snapMm(drag.startEl.xMm + dxMm, grid),
          yMm: snapMm(drag.startEl.yMm + dyMm, grid),
        })
      } else if (drag.mode === 'resize') {
        patchElement(drag.id, {
          wMm: snapMm(drag.startEl.wMm + dxMm, grid),
          hMm: snapMm(drag.startEl.hMm + dyMm, grid),
        })
      }
    },
    [patchElement, scale, snapGrid],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  function handleSave() {
    setVisualLayoutForLabel(layout, useVisual)
    setUseVisualLayout(useVisual)
    onSaved?.(layout, useVisual)
    onClose()
  }

  function handleReset() {
    const fresh = resetVisualLayoutForLabel(labelWidthMm, labelHeightMm, orientation)
    setLayout(fresh)
  }

  function previewTextForElement(id) {
    switch (id) {
      case 'header':
        return sample.headerTitle
      case 'booking':
        return sample.booking || '(vacío)'
      case 'material':
        return sample.material
      case 'subdesc':
        return sample.subdesc || '(vacío)'
      case 'ref':
        return sample.refLine
      case 'diagram':
        return sample.centerLabel
      case 'qr':
        return 'QR'
      case 'dims':
        return `L: ${sample.L}\nA: ${sample.A}\n${sample.numeroPieza} / ${sample.cantidad}`
      case 'footerLeft':
        return sample.pCode
      case 'footerRight':
        return sample.dateStr
      default:
        return ''
    }
  }

  const selected = layout.elements[selectedId]
  const selectedMeta = LAYOUT_ELEMENT_META[selectedId]

  return (
    <DetailModal
      open={open}
      wide
      title="Editor visual de etiqueta"
      subtitle={`${labelWidthMm} × ${labelHeightMm} mm · ${orientation === 'landscape' ? 'horizontal' : 'vertical'} — arrastra y redimensiona cada bloque`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={useVisual}
                onChange={(e) => setUseVisual(e.target.checked)}
              />
              Usar este diseño al imprimir ZPL
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={snapGrid}
                onChange={(e) => setSnapGrid(e.target.checked)}
              />
              Ajustar a cuadrícula 0,5 mm
            </label>
          </div>

          <div
            ref={canvasRef}
            className="relative mx-auto overflow-hidden rounded-xl border border-white/15 bg-slate-800/50 p-4"
            style={{ maxWidth: labelWidthMm * scale + 32 }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={() => setSelectedId(null)}
          >
            <div
              className="relative mx-auto bg-white shadow-inner"
              style={{
                width: labelWidthMm * scale,
                height: labelHeightMm * scale,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {LAYOUT_ELEMENT_IDS.map((id) => {
                const el = layout.elements[id]
                const meta = LAYOUT_ELEMENT_META[id]
                if (!el || !meta) return null
                const isSelected = selectedId === id
                const preview = previewTextForElement(id)
                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={0}
                    className="absolute box-border overflow-hidden"
                    style={{
                      left: el.xMm * scale,
                      top: el.yMm * scale,
                      width: el.wMm * scale,
                      height: el.hMm * scale,
                      background: ELEMENT_COLORS[id] ?? 'rgba(255,255,255,0.2)',
                      border: `2px solid ${isSelected ? '#f59e0b' : ELEMENT_BORDER[id] ?? '#94a3b8'}`,
                      borderRadius: 2,
                      cursor: 'move',
                      zIndex: isSelected ? 20 : 10,
                    }}
                    onPointerDown={(e) => handlePointerDown(e, id, 'move')}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(id)
                    }}
                  >
                    <div
                      className="pointer-events-none absolute left-0 top-0 max-w-full truncate px-0.5 text-[9px] font-semibold leading-tight text-slate-700"
                      style={{ fontSize: Math.max(8, Math.min(11, scale * 1.1)) }}
                    >
                      {meta.label}
                    </div>
                    {meta.type === 'diagram' ? (
                      <div className="pointer-events-none flex h-full flex-col items-center justify-center p-1 text-center">
                        <span className="text-[8px] text-slate-500">{sample.upLabel || ' '}</span>
                        <div className="my-0.5 flex w-full flex-1 items-center justify-center border-2 border-slate-600">
                          <span className="px-1 text-[9px] font-medium text-slate-700">{preview}</span>
                        </div>
                        <span className="text-[8px] text-slate-500">{sample.loLabel || ' '}</span>
                      </div>
                    ) : meta.type === 'qr' ? (
                      <div className="pointer-events-none flex h-full items-center justify-center">
                        <div
                          className="border-2 border-slate-700 bg-white"
                          style={{
                            width: Math.min(el.wMm, el.hMm) * scale * 0.85,
                            height: Math.min(el.wMm, el.hMm) * scale * 0.85,
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="pointer-events-none flex h-full items-start whitespace-pre-wrap p-1 text-slate-800"
                        style={{
                          fontSize: Math.max(7, Math.min(13, (el.fontHm ?? meta.defaultFontHm ?? 4) * scale * 0.55)),
                          lineHeight: 1.15,
                        }}
                      >
                        {preview}
                      </div>
                    )}
                    {isSelected ? (
                      <div
                        className="absolute bottom-0 right-0 z-30 h-3 w-3 cursor-se-resize rounded-tl bg-amber-500"
                        onPointerDown={(e) => handlePointerDown(e, id, 'resize')}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              Escala pantalla: {scale.toFixed(1)} px/mm · Los cambios se guardan por tamaño de etiqueta
            </p>
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <h3 className="text-sm font-medium text-slate-200">Elementos</h3>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {LAYOUT_ELEMENT_IDS.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${
                      selectedId === id
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                    onClick={() => setSelectedId(id)}
                  >
                    {LAYOUT_ELEMENT_META[id]?.label ?? id}
                    {LAYOUT_ELEMENT_META[id]?.optional ? (
                      <span className="ml-1 text-slate-600">(opc.)</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selected && selectedMeta ? (
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <h3 className="text-sm font-medium text-slate-200">{selectedMeta.label}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {['xMm', 'yMm', 'wMm', 'hMm'].map((field) => (
                  <label key={field} className="block text-xs text-slate-400">
                    {field === 'xMm' ? 'X (mm)' : field === 'yMm' ? 'Y (mm)' : field === 'wMm' ? 'Ancho' : 'Alto'}
                    <input
                      type="number"
                      step={0.5}
                      className={`${inputClass} mt-1`}
                      value={selected[field]}
                      onChange={(e) => patchElement(selectedId, { [field]: Number(e.target.value) })}
                    />
                  </label>
                ))}
              </div>
              {selectedMeta.type === 'text' || selectedMeta.type === 'dims' ? (
                <label className="mt-2 block text-xs text-slate-400">
                  Tamaño texto (mm)
                  <input
                    type="number"
                    min={2}
                    max={12}
                    step={0.1}
                    className={`${inputClass} mt-1`}
                    value={selected.fontHm ?? selectedMeta.defaultFontHm ?? 4}
                    onChange={(e) => patchElement(selectedId, { fontHm: Number(e.target.value) })}
                  />
                </label>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Selecciona un bloque en la etiqueta o en la lista.</p>
          )}

          <div className="flex flex-col gap-2">
            <Button type="button" onClick={handleSave}>
              Guardar diseño
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              Restaurar posiciones por defecto
            </Button>
            <Button type="button" variant="neutral" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </aside>
      </div>
    </DetailModal>
  )
}
