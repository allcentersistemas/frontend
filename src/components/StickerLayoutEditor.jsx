import { useCallback, useMemo, useRef, useState } from 'react'
import { DetailModal } from './DetailModal.jsx'
import { Button } from '../ui/Button.jsx'
import { inputClass } from '../ui/fields.js'
import {
  STICKER_LAYOUT_PREVIEW_SAMPLE,
  clampLayoutElement,
  createLayoutElementForField,
  getActiveLayoutElements,
  getElementMeta,
  listAddableFields,
  normalizeLayoutElement,
  resetVisualLayoutForLabel,
  getUseVisualLayout,
  setUseVisualLayout,
  setVisualLayoutForLabel,
} from '../utils/stickerVisualLayout.js'

const ELEMENT_COLORS = {
  headerTitle: 'rgba(251, 191, 36, 0.35)',
  booking: 'rgba(147, 197, 253, 0.3)',
  material: 'rgba(134, 239, 172, 0.3)',
  subdesc: 'rgba(196, 181, 253, 0.3)',
  refLine: 'rgba(253, 186, 116, 0.35)',
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
  const [selectedId, setSelectedId] = useState(() => {
    const first = getActiveLayoutElements(initialLayout.elements)[0]
    return first?.[0] ?? 'headerTitle'
  })
  const [useVisual, setUseVisual] = useState(() => getUseVisualLayout() || true)
  const [snapGrid, setSnapGrid] = useState(true)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  const sample = previewData ?? STICKER_LAYOUT_PREVIEW_SAMPLE

  const scale = useMemo(() => {
    const maxW = 720
    const maxH = 420
    return Math.min(maxW / labelWidthMm, maxH / labelHeightMm, 12)
  }, [labelWidthMm, labelHeightMm])

  const activeElements = useMemo(() => getActiveLayoutElements(layout.elements), [layout.elements])
  const addableFields = useMemo(() => listAddableFields(layout), [layout])

  const patchElement = useCallback(
    (id, patch) => {
      setLayout((prev) => {
        const current = prev.elements[id]
        if (!current) return prev
        const fieldKey = current.fieldKey ?? id
        const merged = clampLayoutElement(
          { ...current, ...patch },
          labelWidthMm,
          labelHeightMm,
          id,
          fieldKey,
        )
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
        normalizeLayoutElement(id, el, labelWidthMm, labelHeightMm),
      ]),
    )
    const normalized = {
      labelWidthMm,
      labelHeightMm,
      orientation,
      elements: normalizedElements,
    }
    setVisualLayoutForLabel(normalized, true)
    setUseVisualLayout(true)
    onSaved?.(normalized, true)
    onClose()
  }

  function handleReset() {
    const fresh = resetVisualLayoutForLabel(labelWidthMm, labelHeightMm, orientation)
    setLayout(fresh)
    setSelectedId('headerTitle')
  }

  function handleAddField(fieldKey) {
    const id = fieldKey === 'customText' ? `custom_${Date.now()}` : fieldKey
    const el = createLayoutElementForField(fieldKey, labelWidthMm, labelHeightMm, id)
    if (!el) return
    setLayout((prev) => ({
      ...prev,
      elements: {
        ...prev.elements,
        [id]: el,
      },
    }))
    setSelectedId(id)
  }

  function handleAddCustomText() {
    handleAddField('customText')
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
    if (fieldKey === 'customText') {
      return el.customText || 'Texto libre'
    }
    const prefix = el.prefix ?? ''
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
        return sample.refLine
      case 'diagram':
        return sample.centerLabel
      case 'qr':
        return 'QR'
      case 'dimsL':
        return `${prefix}${sample.L ?? '—'}`
      case 'dimsA':
        return `${prefix}${sample.A ?? '—'}`
      case 'fraction':
        return `${sample.numeroPieza} / ${sample.cantidad}`
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

  return (
    <DetailModal
      open={open}
      wide
      title="Editor visual de etiqueta"
      subtitle={`Etiqueta ${labelWidthMm} × ${labelHeightMm} mm · ${orientation === 'landscape' ? 'horizontal' : 'vertical'} — ZPL usará exactamente este tamaño (^PW/^LL)`}
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
              Usar diseño visual al imprimir (activo al guardar)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={snapGrid}
                onChange={(e) => setSnapGrid(e.target.checked)}
              />
              Cuadrícula 0,5 mm
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
              className="relative mx-auto border border-dashed border-slate-400/40 bg-white shadow-inner"
              style={{
                width: labelWidthMm * scale,
                height: labelHeightMm * scale,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {activeElements.map(([id, el]) => {
                const meta = getElementMeta(id, el)
                const isSelected = selectedId === id
                const preview = previewTextForElement(id, el)
                const fieldKey = el.fieldKey ?? id
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
                      zIndex: isSelected ? 20 : 10,
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
              Lienzo {labelWidthMm}×{labelHeightMm} mm · escala {scale.toFixed(1)} px/mm
            </p>
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-200">Campos activos</h3>
              <span className="text-xs text-slate-500">{activeElements.length}</span>
            </div>
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {activeElements.map(([id, el]) => {
                const meta = getElementMeta(id, el)
                return (
                  <li key={id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-xs transition ${
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
                      title="Quitar campo"
                      onClick={() => handleRemoveElement(id)}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <h3 className="text-sm font-medium text-slate-200">Agregar campo</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {addableFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:border-amber-400/30 hover:bg-amber-400/5"
                  onClick={() => handleAddField(field.key)}
                >
                  + {field.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-lg border border-violet-400/30 px-2 py-1 text-xs text-violet-200 hover:bg-violet-400/10"
                onClick={handleAddCustomText}
              >
                + Texto libre
              </button>
              {!addableFields.length ? (
                <p className="text-xs text-slate-500">Todos los campos predefinidos están en la etiqueta.</p>
              ) : null}
            </div>
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
                    Escala extra ({Math.round((selected.fontScale ?? 1) * 100)}%)
                    <input
                      type="range"
                      min={75}
                      max={140}
                      step={5}
                      className="mt-1 w-full accent-amber-500"
                      value={Math.round((selected.fontScale ?? 1) * 100)}
                      onChange={(e) => patchElement(selectedId, { fontScale: Number(e.target.value) / 100 })}
                    />
                  </label>
                  <label className="mt-2 block text-xs text-slate-400">
                    Finura letra ({(selected.charWidthRatio ?? 0.44).toFixed(2)} — menor = más fina)
                    <input
                      type="range"
                      min={36}
                      max={55}
                      step={1}
                      className="mt-1 w-full accent-amber-500"
                      value={Math.round((selected.charWidthRatio ?? 0.44) * 100)}
                      onChange={(e) =>
                        patchElement(selectedId, { charWidthRatio: Number(e.target.value) / 100 })
                      }
                    />
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block text-xs text-slate-400">
                      Líneas máx.
                      <input
                        type="number"
                        min={1}
                        max={4}
                        className={`${inputClass} mt-1`}
                        value={selected.maxLines ?? 1}
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
                        <option value="L">Izquierda</option>
                        <option value="C">Centro</option>
                        <option value="R">Derecha</option>
                      </select>
                    </label>
                  </div>
                  {!isCustomText ? (
                    <label className="mt-2 block text-xs text-slate-400">
                      Prefijo (opcional)
                      <input
                        type="text"
                        className={`${inputClass} mt-1`}
                        value={selected.prefix ?? ''}
                        placeholder="Ej. L: "
                        onChange={(e) => patchElement(selectedId, { prefix: e.target.value })}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}

              {(selected.fieldKey ?? selectedId) === 'qr' ? (
                <p className="mt-2 text-xs text-slate-500">
                  Tamaño QR en impresión: <strong>{Math.min(selected.wMm, selected.hMm).toFixed(1)} mm</strong>
                  {' '}(usa el menor entre ancho y alto; redimensionar mantiene proporción cuadrada).
                </p>
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
              Restaurar plantilla por defecto
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
