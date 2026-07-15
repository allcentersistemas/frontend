import { useCallback, useMemo, useRef, useState } from 'react'
import { DetailModal } from './DetailModal.jsx'
import { Button } from '../ui/Button.jsx'
import { inputClass, labelClass } from '../ui/fields.js'
import {
  STICKER_PRINT_ORIENTATIONS,
  orientationOptionLabel,
  setStickerPrintOrientation,
} from '../utils/stickerPrintOrientation.js'
import {
  STICKER_PRINT_SIZES,
  isZebraZplSize,
  clampLabelMm,
  resolveLabelDimensionsMm,
  setStickerPrintSize,
  setStickerPrintCustomSize,
} from '../utils/stickerPrintSize.js'
import {
  clampStickerPrintDpi,
  STICKER_PRINT_DPI_PRESETS,
  setStickerPrintDpi,
} from '../utils/stickerPrintDpi.js'
import {
  resetStickerDesignSettings,
  setStickerDesignSettings,
} from '../utils/stickerDesignSettings.js'
import {
  STICKER_LAYOUT_PREVIEW_SAMPLE,
  clampLayoutElement,
  createLayoutElementForField,
  getActiveLayoutElements,
  getElementMeta,
  getVisualLayoutForLabel,
  listAddableFields,
  normalizeLayoutElement,
  PIECE_EDGE_FIELD_KEYS,
  resetVisualLayoutForLabel,
  scaleVisualLayoutToSize,
  setUseVisualLayout,
  setVisualLayoutForLabel,
} from '../utils/stickerVisualLayout.js'

const ZEBRA_SIZE_OPTIONS = STICKER_PRINT_SIZES.filter((s) => isZebraZplSize(s.id))

const ELEMENT_COLORS = {
  headerTitle: 'rgba(251, 191, 36, 0.35)',
  booking: 'rgba(147, 197, 253, 0.3)',
  material: 'rgba(134, 239, 172, 0.3)',
  subdesc: 'rgba(196, 181, 253, 0.3)',
  refLine: 'rgba(253, 186, 116, 0.35)',
  pieceFrame: 'rgba(148, 163, 184, 0.12)',
  pieceCenter: 'rgba(148, 163, 184, 0.28)',
  edgeUp: 'rgba(96, 165, 250, 0.28)',
  edgeLo: 'rgba(96, 165, 250, 0.28)',
  edgeLeft: 'rgba(96, 165, 250, 0.28)',
  edgeRight: 'rgba(96, 165, 250, 0.28)',
  dimLongitud: 'rgba(244, 114, 182, 0.28)',
  dimAncho: 'rgba(244, 114, 182, 0.28)',
  diagram: 'rgba(148, 163, 184, 0.25)',
  qr: 'rgba(56, 189, 248, 0.35)',
  dimsL: 'rgba(244, 114, 182, 0.28)',
  dimsA: 'rgba(244, 114, 182, 0.28)',
  fraction: 'rgba(244, 114, 182, 0.28)',
  footerLeft: 'rgba(203, 213, 225, 0.25)',
  footerRight: 'rgba(203, 213, 225, 0.25)',
  customText: 'rgba(167, 139, 250, 0.3)',
}

const ELEMENT_BORDER = {
  headerTitle: '#fbbf24',
  booking: '#93c5fd',
  material: '#86efac',
  subdesc: '#c4b5fd',
  refLine: '#fdba74',
  pieceFrame: '#64748b',
  pieceCenter: '#94a3b8',
  edgeUp: '#60a5fa',
  edgeLo: '#60a5fa',
  edgeLeft: '#60a5fa',
  edgeRight: '#60a5fa',
  dimLongitud: '#f472b6',
  dimAncho: '#f472b6',
  diagram: '#94a3b8',
  qr: '#38bdf8',
  dimsL: '#f472b6',
  dimsA: '#f472b6',
  fraction: '#f472b6',
  footerLeft: '#cbd5e1',
  footerRight: '#cbd5e1',
  customText: '#a78bfa',
}

function colorForElement(id, el) {
  const key = el.fieldKey ?? id
  return ELEMENT_COLORS[key] ?? 'rgba(255,255,255,0.2)'
}

function borderForElement(id, el) {
  const key = el.fieldKey ?? id
  return ELEMENT_BORDER[key] ?? '#94a3b8'
}

/** @param {number} value @param {number} [step=0.5] */
function snapMm(value, step = 0.5) {
  return Math.round(value / step) * step
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object} props.initialSettings
 * @param {object} [props.previewData]
 * @param {(settings: object) => void} [props.onSaved]
 * @param {boolean} [props.embedded] Si true, se muestra inline (p. ej. Gestión → Configuración).
 */
export function StickerLayoutEditor({ open, onClose, initialSettings, previewData, onSaved, embedded = false }) {
  const [printSize, setPrintSize] = useState(initialSettings.printSize)
  const [printOrientation, setPrintOrientation] = useState(initialSettings.printOrientation)
  const [customWidthMm, setCustomWidthMm] = useState(initialSettings.customWidthMm)
  const [customHeightMm, setCustomHeightMm] = useState(initialSettings.customHeightMm)
  const [printDpi, setPrintDpi] = useState(initialSettings.printDpi)
  const [stickerDesign, setStickerDesign] = useState(initialSettings.stickerDesign)
  const [layout, setLayout] = useState(initialSettings.visualLayout)
  const [selectedId, setSelectedId] = useState(() => {
    const first = getActiveLayoutElements(initialSettings.visualLayout.elements)[0]
    return first?.[0] ?? 'headerTitle'
  })
  const [snapGrid, setSnapGrid] = useState(true)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  const sample = previewData ?? STICKER_LAYOUT_PREVIEW_SAMPLE

  const customLabelMm = useMemo(() => {
    if (printSize !== 'label_custom') return null
    return {
      widthMm: clampLabelMm(customWidthMm),
      heightMm: clampLabelMm(customHeightMm),
    }
  }, [printSize, customWidthMm, customHeightMm])

  const effectiveLabelMm = useMemo(
    () => resolveLabelDimensionsMm(printSize, printOrientation, customLabelMm),
    [printSize, printOrientation, customLabelMm],
  )

  const scale = useMemo(() => {
    const maxW = 560
    const maxH = 320
    return Math.min(maxW / effectiveLabelMm.widthMm, maxH / effectiveLabelMm.heightMm, 10)
  }, [effectiveLabelMm.widthMm, effectiveLabelMm.heightMm])

  const activeElements = useMemo(() => getActiveLayoutElements(layout.elements), [layout.elements])
  const addableFields = useMemo(() => listAddableFields(layout), [layout])

  const applyDimsToLayout = useCallback((dims, orientation) => {
    setLayout((prev) =>
      scaleVisualLayoutToSize(prev, dims.widthMm, dims.heightMm, orientation),
    )
  }, [])

  function patchDesign(patch) {
    setStickerDesign((prev) => ({ ...prev, ...patch }))
  }

  function handleOrientationChange(next) {
    const dims = resolveLabelDimensionsMm(printSize, next, customLabelMm)
    applyDimsToLayout(dims, next)
    setPrintOrientation(next)
  }

  function handlePrintSizeChange(next) {
    const custom =
      next === 'label_custom'
        ? { widthMm: clampLabelMm(customWidthMm), heightMm: clampLabelMm(customHeightMm) }
        : null
    const dims = resolveLabelDimensionsMm(next, printOrientation, custom)
    applyDimsToLayout(dims, printOrientation)
    setPrintSize(next)
  }

  function handleCustomMmChange(width, height) {
    const w = clampLabelMm(width)
    const h = clampLabelMm(height)
    setCustomWidthMm(w)
    setCustomHeightMm(h)
    const dims = resolveLabelDimensionsMm('label_custom', printOrientation, { widthMm: w, heightMm: h })
    applyDimsToLayout(dims, printOrientation)
  }

  function loadLayoutForCurrentSize() {
    const loaded = getVisualLayoutForLabel(
      effectiveLabelMm.widthMm,
      effectiveLabelMm.heightMm,
      printOrientation,
    )
    setLayout(loaded)
  }

  const patchElement = useCallback(
    (id, patch) => {
      setLayout((prev) => {
        const current = prev.elements[id]
        if (!current) return prev
        const fieldKey = current.fieldKey ?? id
        const merged = clampLayoutElement(
          { ...current, ...patch },
          effectiveLabelMm.widthMm,
          effectiveLabelMm.heightMm,
          id,
          fieldKey,
        )
        return {
          ...prev,
          labelWidthMm: effectiveLabelMm.widthMm,
          labelHeightMm: effectiveLabelMm.heightMm,
          orientation: printOrientation,
          elements: { ...prev.elements, [id]: merged },
        }
      })
    },
    [effectiveLabelMm.widthMm, effectiveLabelMm.heightMm, printOrientation],
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
      const dxMm = (e.clientX - drag.startX) / scale
      const dyMm = (e.clientY - drag.startY) / scale
      const grid = snapGrid ? 0.5 : 0.1

      if (drag.mode === 'move') {
        patchElement(drag.id, {
          xMm: snapMm(drag.startEl.xMm + dxMm, grid),
          yMm: snapMm(drag.startEl.yMm + dyMm, grid),
        })
      } else if (drag.mode === 'resize') {
        const fieldKey = drag.startEl.fieldKey ?? drag.id
        const isQr = fieldKey === 'qr'
        const nextW = snapMm(drag.startEl.wMm + dxMm, grid)
        const nextH = snapMm(drag.startEl.hMm + dyMm, grid)
        if (isQr) {
          const size = Math.max(nextW, nextH)
          patchElement(drag.id, { wMm: size, hMm: size })
        } else {
          patchElement(drag.id, { wMm: nextW, hMm: nextH })
        }
      }
    },
    [patchElement, scale, snapGrid],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  function handleSave() {
    const normalizedElements = Object.fromEntries(
      Object.entries(layout.elements).map(([id, el]) => [
        id,
        normalizeLayoutElement(id, el, effectiveLabelMm.widthMm, effectiveLabelMm.heightMm),
      ]),
    )
    const visualLayout = {
      labelWidthMm: effectiveLabelMm.widthMm,
      labelHeightMm: effectiveLabelMm.heightMm,
      orientation: printOrientation,
      elements: normalizedElements,
    }
    const design = setStickerDesignSettings(stickerDesign)

    setStickerPrintSize(printSize)
    setStickerPrintOrientation(printOrientation)
    if (printSize === 'label_custom') {
      setStickerPrintCustomSize(customWidthMm, customHeightMm)
    }
    setStickerPrintDpi(printDpi)
    setVisualLayoutForLabel(visualLayout, true)
    setUseVisualLayout(true)
    setLayout(visualLayout)

    onSaved?.({
      printSize,
      printOrientation,
      customWidthMm,
      customHeightMm,
      printDpi,
      stickerDesign: design,
      visualLayout,
      useVisualLayout: true,
    })
    onClose()
  }

  function handleReset() {
    const fresh = resetVisualLayoutForLabel(
      effectiveLabelMm.widthMm,
      effectiveLabelMm.heightMm,
      printOrientation,
    )
    setLayout(fresh)
    setSelectedId('headerTitle')
  }

  function handleAddField(fieldKey) {
    const id = fieldKey === 'customText' ? `custom_${Date.now()}` : fieldKey
    const el = createLayoutElementForField(
      fieldKey,
      effectiveLabelMm.widthMm,
      effectiveLabelMm.heightMm,
      id,
    )
    if (!el) return
    setLayout((prev) => ({
      ...prev,
      elements: { ...prev.elements, [id]: el },
    }))
    setSelectedId(id)
  }

  function handleRemoveElement(id) {
    setLayout((prev) => {
      const next = { ...prev.elements }
      if (id.startsWith('custom_')) {
        delete next[id]
      } else {
        next[id] = { ...next[id], enabled: false }
      }
      return { ...prev, elements: next }
    })
    setSelectedId((cur) => (cur === id ? null : cur))
  }

  function previewTextForElement(id, el) {
    const fieldKey = el.fieldKey ?? id
    if (fieldKey === 'customText') return el.customText || 'Texto libre'
    const prefix = el.prefix ?? ''
    const source = el.contentSource ?? 'auto'
    if (source === 'dimensionL') return `${prefix}${sample.L ?? '—'}`
    if (source === 'dimensionA') return `${prefix}${sample.A ?? '—'}`
    if (source === 'custom') return el.customText || '(texto fijo)'
    if (el.customText?.trim()) return el.customText
    switch (fieldKey) {
      case 'headerTitle':
        return sample.headerTitle
      case 'booking':
        return sample.booking || '(vacío)'
      case 'material':
        return sample.material
      case 'subdesc':
        return sample.subdesc || '(vacío)'
      case 'refLine':
        return sample.fractionText ?? sample.refLine
      case 'pieceCenter':
        return sample.centerLabel
      case 'edgeUp':
        return sample.upLabel || '(vacío)'
      case 'edgeLo':
        return sample.loLabel || '(vacío)'
      case 'edgeLeft':
        return sample.leftLabel || '(vacío)'
      case 'edgeRight':
        return sample.rightLabel || '(vacío)'
      case 'dimLongitud':
      case 'dimsL':
        return `${prefix}${sample.L ?? '—'}`
      case 'dimAncho':
      case 'dimsA':
        return `${prefix}${sample.A ?? '—'}`
      case 'diagram':
        return sample.centerLabel
      case 'qr':
        return 'QR'
      case 'fraction':
        return sample.fractionText ?? `${sample.numeroPieza} / ${sample.cantidad}`
      case 'footerLeft':
        return sample.pCode
      case 'footerRight':
        return sample.dateStr
      default:
        return ''
    }
  }

  const selected = selectedId ? layout.elements[selectedId] : null
  const selectedMeta = selected ? getElementMeta(selectedId, selected) : null
  const isTextField = selectedMeta?.type === 'text'
  const isCustomText = (selected?.fieldKey ?? selectedId) === 'customText'
  const isPieceEdgeField = PIECE_EDGE_FIELD_KEYS.has(selected?.fieldKey ?? selectedId ?? '')
  const showContentSource =
    isPieceEdgeField || selected?.fieldKey === 'pieceCenter'

  if (!embedded && !open) return null

  const editorBody = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch">
        <div className="min-h-0 min-w-0 flex-1 xl:overflow-y-auto">
          <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-sm text-amber-100">
            Etiqueta real:{' '}
            <strong>
              {effectiveLabelMm.widthMm} × {effectiveLabelMm.heightMm} mm
            </strong>
            {' · '}
            {printOrientation === 'landscape' ? 'horizontal' : 'vertical'}
            {' · '}
            {printDpi} dpi
            {' · '}
            ZPL ^PW/^LL según estas medidas
          </div>

          <div
            ref={canvasRef}
            className="relative mx-auto overflow-hidden rounded-xl border border-white/15 bg-slate-800/50 p-4"
            style={{ maxWidth: effectiveLabelMm.widthMm * scale + 32 }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={() => setSelectedId(null)}
          >
            <div
              className="relative mx-auto border-2 border-amber-400/50 bg-white shadow-inner"
              style={{
                width: effectiveLabelMm.widthMm * scale,
                height: effectiveLabelMm.heightMm * scale,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {activeElements.map(([id, el]) => {
                const meta = getElementMeta(id, el)
                const isSelected = selectedId === id
                const preview = previewTextForElement(id, el)
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
                      background: colorForElement(id, el),
                      border: `2px solid ${isSelected ? '#f59e0b' : borderForElement(id, el)}`,
                      borderRadius: 2,
                      cursor: 'move',
                      zIndex: meta.type === 'frame' ? 5 : isSelected ? 20 : 10,
                      transform: el.rotationDeg ? `rotate(${el.rotationDeg}deg)` : undefined,
                      transformOrigin: '0 0',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, id, 'move')}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(id)
                    }}
                  >
                    <div
                      className="pointer-events-none absolute left-0 top-0 max-w-full truncate px-0.5 font-semibold leading-tight text-slate-700"
                      style={{ fontSize: Math.max(8, Math.min(11, scale * 1.1)) }}
                    >
                      {meta.label}
                    </div>
                    {meta.type === 'frame' ? (
                      <div className="pointer-events-none h-full w-full border-2 border-slate-600 bg-transparent" />
                    ) : meta.type === 'diagram' ? (
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
                            width: Math.min(el.wMm, el.hMm) * scale * 0.9,
                            height: Math.min(el.wMm, el.hMm) * scale * 0.9,
                          }}
                        />
                        <span className="absolute bottom-0.5 right-0.5 text-[7px] text-slate-500">
                          {Math.min(el.wMm, el.hMm).toFixed(1)} mm
                        </span>
                      </div>
                    ) : (
                      <div
                        className="pointer-events-none flex h-full items-start whitespace-pre-wrap p-1 text-slate-800"
                        style={{
                          fontSize: Math.max(
                            7,
                            Math.min(13, (el.fontHm ?? meta.defaultFontHm ?? 4) * scale * 0.55),
                          ),
                          lineHeight: 1.15,
                          textAlign:
                            el.justify === 'C' ? 'center' : el.justify === 'R' ? 'right' : 'left',
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
              Lienzo a escala real · {scale.toFixed(1)} px/mm · al cambiar tamaño los campos se reescalan
            </p>
          </div>
        </div>

        <aside className="flex w-full min-h-0 shrink-0 flex-col xl:w-[20rem] 2xl:w-[22rem]">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
          <details className="rounded-xl border border-white/10 bg-black/25" open>
            <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-slate-200">
              Tamaño de etiqueta (rollo real)
            </summary>
            <div className="space-y-3 border-t border-white/10 px-3 py-3">
              <div>
                <label className={labelClass}>Orientación</label>
                <select
                  className={`${inputClass} mt-1.5 cursor-pointer`}
                  value={printOrientation}
                  onChange={(e) => handleOrientationChange(e.target.value)}
                >
                  {STICKER_PRINT_ORIENTATIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {orientationOptionLabel(o.id, printSize, customLabelMm)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tamaño Zebra</label>
                <select
                  className={`${inputClass} mt-1.5 cursor-pointer`}
                  value={printSize}
                  onChange={(e) => handlePrintSizeChange(e.target.value)}
                >
                  {ZEBRA_SIZE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {printSize === 'label_custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-slate-400">
                    Ancho (mm)
                    <input
                      type="number"
                      min={25}
                      max={220}
                      step={0.5}
                      className={`${inputClass} mt-1`}
                      value={customWidthMm}
                      onChange={(e) => handleCustomMmChange(Number(e.target.value), customHeightMm)}
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Alto (mm)
                    <input
                      type="number"
                      min={25}
                      max={220}
                      step={0.5}
                      className={`${inputClass} mt-1`}
                      value={customHeightMm}
                      onChange={(e) => handleCustomMmChange(customWidthMm, Number(e.target.value))}
                    />
                  </label>
                </div>
              ) : null}
              <button
                type="button"
                className="btn btn--sm btn--ghost w-full"
                onClick={loadLayoutForCurrentSize}
              >
                Cargar diseño guardado para este tamaño
              </button>
            </div>
          </details>

          <details className="rounded-xl border border-white/10 bg-black/25" open>
            <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-slate-200">
              Impresora y tipografía ZPL
            </summary>
            <div className="space-y-3 border-t border-white/10 px-3 py-3">
              <div>
                <label className={labelClass}>Resolución (dpi)</label>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <input
                    type="number"
                    min={100}
                    max={600}
                    className={`${inputClass} w-24`}
                    value={printDpi}
                    onChange={(e) => setPrintDpi(clampStickerPrintDpi(e.target.value))}
                  />
                  {STICKER_PRINT_DPI_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`btn btn--sm ${printDpi === preset.id ? 'btn--primary' : 'btn--ghost'}`}
                      onClick={() => setPrintDpi(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-xs text-slate-400">
                Tamaño texto global ({Math.round(stickerDesign.fontScale * 100)}%)
                <input
                  type="range"
                  min={85}
                  max={120}
                  className="mt-1 w-full accent-amber-500"
                  value={Math.round(stickerDesign.fontScale * 100)}
                  onChange={(e) => patchDesign({ fontScale: Number(e.target.value) / 100 })}
                />
              </label>
              <label className="block text-xs text-slate-400">
                Grosor global de letra ({stickerDesign.charWidthRatio.toFixed(2)} — mayor = más gruesa)
                <input
                  type="range"
                  min={35}
                  max={60}
                  className="mt-1 w-full accent-amber-500"
                  value={Math.round(stickerDesign.charWidthRatio * 100)}
                  onChange={(e) => patchDesign({ charWidthRatio: Number(e.target.value) / 100 })}
                />
              </label>
              <label className="block text-xs text-slate-400">
                Banda cantos diagrama ({stickerDesign.edgeBandMm} mm)
                <input
                  type="range"
                  min={25}
                  max={60}
                  className="mt-1 w-full accent-amber-500"
                  value={Math.round(stickerDesign.edgeBandMm * 10)}
                  onChange={(e) => patchDesign({ edgeBandMm: Number(e.target.value) / 10 })}
                />
              </label>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setStickerDesign(resetStickerDesignSettings())}
              >
                Restaurar tipografía global
              </button>
            </div>
          </details>

          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-200">Campos en la etiqueta</h3>
              <span className="text-xs text-slate-500">{activeElements.length}</span>
            </div>
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
              {activeElements.map(([id, el]) => {
                const meta = getElementMeta(id, el)
                return (
                  <li key={id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className={`min-w-0 flex-1 rounded-lg px-2 py-1 text-left text-xs transition ${
                        selectedId === id
                          ? 'bg-amber-500/20 text-amber-200'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                      onClick={() => setSelectedId(id)}
                    >
                      {meta.label}
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1.5 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      title="Quitar"
                      onClick={() => handleRemoveElement(id)}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1">
              {addableFields.slice(0, 6).map((field) => (
                <button
                  key={field.key}
                  type="button"
                  className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-amber-400/30"
                  onClick={() => handleAddField(field.key)}
                >
                  + {field.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded border border-violet-400/30 px-1.5 py-0.5 text-[10px] text-violet-200"
                onClick={() => handleAddField('customText')}
              >
                + Texto libre
              </button>
            </div>
          </div>

          {selected && selectedMeta ? (
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <h3 className="text-sm font-medium text-slate-200">Campo: {selectedMeta.label}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {['xMm', 'yMm', 'wMm', 'hMm'].map((field) => (
                  <label key={field} className="block text-xs text-slate-400">
                    {field === 'xMm' ? 'X' : field === 'yMm' ? 'Y' : field === 'wMm' ? 'Ancho' : 'Alto'} (mm)
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
              {showContentSource ? (
                <>
                  <label className="mt-2 block text-xs text-slate-400">
                    Contenido
                    <select
                      className={`${inputClass} mt-1`}
                      value={selected.contentSource ?? 'auto'}
                      onChange={(e) =>
                        patchElement(selectedId, { contentSource: e.target.value })
                      }
                    >
                      <option value="auto">Dato Biesse (canto / descripción)</option>
                      <option value="dimensionL">Medida L (longitud)</option>
                      <option value="dimensionA">Medida A (ancho)</option>
                      <option value="custom">Texto fijo</option>
                    </select>
                  </label>
                  {(selected.contentSource === 'custom' || selected.customText) ? (
                    <label className="mt-2 block text-xs text-slate-400">
                      Texto fijo
                      <input
                        type="text"
                        className={`${inputClass} mt-1`}
                        value={selected.customText ?? ''}
                        onChange={(e) => patchElement(selectedId, { customText: e.target.value })}
                      />
                    </label>
                  ) : null}
                  <p className="mt-1 text-[10px] text-slate-500">
                    Puedes mover cada canto por separado y poner L o A dentro del recuadro. También agrega
                    «Medida L» / «Medida A» desde la lista de campos.
                  </p>
                </>
              ) : null}

              {isCustomText ? (
                <label className="mt-2 block text-xs text-slate-400">
                  Texto fijo
                  <input
                    type="text"
                    className={`${inputClass} mt-1`}
                    value={selected.customText ?? ''}
                    onChange={(e) => patchElement(selectedId, { customText: e.target.value })}
                  />
                </label>
              ) : null}
              {isTextField ? (
                <>
                  <label className="mt-2 block text-xs text-slate-400">
                    Rotación
                    <select
                      className={`${inputClass} mt-1`}
                      value={selected.rotationDeg ?? 0}
                      onChange={(e) =>
                        patchElement(selectedId, { rotationDeg: Number(e.target.value) })
                      }
                    >
                      <option value={0}>0° (horizontal)</option>
                      <option value={90}>90°</option>
                      <option value={180}>180°</option>
                      <option value={270}>270°</option>
                    </select>
                  </label>
                  <label className="mt-2 block text-xs text-slate-400">
                    Alto texto (mm)
                    <input
                      type="number"
                      min={2}
                      max={14}
                      step={0.1}
                      className={`${inputClass} mt-1`}
                      value={selected.fontHm ?? selectedMeta.defaultFontHm ?? 4}
                      onChange={(e) => patchElement(selectedId, { fontHm: Number(e.target.value) })}
                    />
                  </label>
                  <label className="mt-2 block text-xs text-slate-400">
                    Grosor de letra (
                    {(selected.charWidthRatio ?? stickerDesign.charWidthRatio).toFixed(2)} — sube para trazo más grueso)
                    <input
                      type="range"
                      min={35}
                      max={65}
                      className="mt-1 w-full accent-amber-500"
                      value={Math.round((selected.charWidthRatio ?? stickerDesign.charWidthRatio) * 100)}
                      onChange={(e) =>
                        patchElement(selectedId, { charWidthRatio: Number(e.target.value) / 100 })
                      }
                    />
                  </label>
                  <label className="mt-2 block text-xs text-slate-400">
                    Separación entre líneas (mm)
                    <input
                      type="number"
                      min={0.1}
                      max={4}
                      step={0.1}
                      className={`${inputClass} mt-1`}
                      placeholder="Auto"
                      value={selected.lineGapMm ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        patchElement(selectedId, { lineGapMm: v === '' ? undefined : Number(v) })
                      }}
                    />
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block text-xs text-slate-400">
                      Líneas máx. (0 = auto)
                      <input
                        type="number"
                        min={0}
                        max={6}
                        className={`${inputClass} mt-1`}
                        value={selected.maxLines ?? 0}
                        onChange={(e) => patchElement(selectedId, { maxLines: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block text-xs text-slate-400">
                      Alineación
                      <select
                        className={`${inputClass} mt-1`}
                        value={selected.justify ?? 'L'}
                        onChange={(e) => patchElement(selectedId, { justify: e.target.value })}
                      >
                        <option value="L">Izq.</option>
                        <option value="C">Centro</option>
                        <option value="R">Der.</option>
                      </select>
                    </label>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                    Si el texto se corta: agranda el cuadro (ancho y alto), sube Líneas máx. o reduce Grosor de letra.
                    Con 0 líneas el alto del cuadro define cuántas caben.
                  </p>
                </>
              ) : null}
              {(selected.fieldKey ?? selectedId) === 'qr' ? (
                <p className="mt-2 text-xs text-slate-500">
                  QR impreso: <strong>{Math.min(selected.wMm, selected.hMm).toFixed(1)} mm</strong>
                </p>
              ) : null}
            </div>
          ) : null}
          </div>

          <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-white/10 pt-3">
            <Button type="button" onClick={handleSave}>
              Guardar diseño y tamaño
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              Restaurar plantilla
            </Button>
            <Button type="button" variant="neutral" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </aside>
      </div>
  )

  if (embedded) {
    return editorBody
  }

  return (
    <DetailModal
      open={open}
      wide
      tall
      title="Diseño y tamaño de etiqueta"
      subtitle="Todo lo que afecta al sticker ZPL: tamaño real del rollo, dpi, tipografía y posición de campos"
      onClose={onClose}
    >
      {editorBody}
    </DetailModal>
  )
}
