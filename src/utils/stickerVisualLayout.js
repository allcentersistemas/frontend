/** Diseño visual de etiqueta (posiciones en mm, persistido en localStorage). */

import { resolveLabelDimensionsMm } from './stickerPrintSize.js'

export const STICKER_VISUAL_LAYOUT_KEY = 'biesse-sticker-visual-layout'

/** @typedef {'text' | 'diagram' | 'qr' | 'dims'} LayoutElementType */

/**
 * @typedef {object} LayoutElement
 * @property {number} xMm
 * @property {number} yMm
 * @property {number} wMm
 * @property {number} hMm
 * @property {number} [fontHm] Alto de fuente en mm (texto / dims).
 */

/**
 * @typedef {object} StickerVisualLayout
 * @property {number} labelWidthMm
 * @property {number} labelHeightMm
 * @property {'landscape' | 'portrait'} orientation
 * @property {Record<string, LayoutElement>} elements
 */

/** @typedef {Record<string, { label: string, type: LayoutElementType, minW: number, minH: number, defaultFontHm?: number, optional?: boolean }>} */

export const LAYOUT_ELEMENT_META = {
  header: { label: 'Título pedido', type: 'text', minW: 18, minH: 4, defaultFontHm: 5.4 },
  booking: { label: 'Booking', type: 'text', minW: 14, minH: 3, defaultFontHm: 3.6, optional: true },
  material: { label: 'Material', type: 'text', minW: 14, minH: 3.5, defaultFontHm: 4.2 },
  subdesc: { label: 'Descripción 2', type: 'text', minW: 14, minH: 3, defaultFontHm: 3.2, optional: true },
  ref: { label: 'Referencia', type: 'text', minW: 8, minH: 3, defaultFontHm: 4.2 },
  diagram: { label: 'Pieza / cantos', type: 'diagram', minW: 24, minH: 14 },
  qr: { label: 'Código QR', type: 'qr', minW: 12, minH: 12 },
  dims: { label: 'L / A / fracción', type: 'dims', minW: 12, minH: 8, defaultFontHm: 4.2 },
  footerLeft: { label: 'Código pieza', type: 'text', minW: 10, minH: 2.5, defaultFontHm: 3.2 },
  footerRight: { label: 'Fecha', type: 'text', minW: 10, minH: 2.5, defaultFontHm: 3.2 },
}

export const LAYOUT_ELEMENT_IDS = Object.keys(LAYOUT_ELEMENT_META)

const BASE_LANDSCAPE_W = 100
const BASE_LANDSCAPE_H = 50

/** Plantilla landscape 100×50 mm (equivalente al layout ZPL v9). */
const TEMPLATE_LANDSCAPE_100x50 = {
  header: { xMm: 1, yMm: 1, wMm: 58, hMm: 12, fontHm: 5.4 },
  booking: { xMm: 1, yMm: 13, wMm: 58, hMm: 4, fontHm: 3.6 },
  material: { xMm: 1, yMm: 17.5, wMm: 58, hMm: 5, fontHm: 4.2 },
  subdesc: { xMm: 1, yMm: 22.5, wMm: 58, hMm: 4, fontHm: 3.2 },
  ref: { xMm: 1, yMm: 27, wMm: 20, hMm: 5, fontHm: 4.2 },
  diagram: { xMm: 15, yMm: 32, wMm: 40, hMm: 22 },
  qr: { xMm: 76, yMm: 1, wMm: 19, hMm: 19 },
  dims: { xMm: 76, yMm: 21.5, wMm: 23, hMm: 14, fontHm: 4.2 },
  footerLeft: { xMm: 1, yMm: 46, wMm: 40, hMm: 3.5, fontHm: 3.2 },
  footerRight: { xMm: 76, yMm: 46, wMm: 23, hMm: 3.5, fontHm: 3.2 },
}

/** @param {number} value */
function roundMm(value) {
  return Math.round(value * 10) / 10
}

/** @param {Record<string, LayoutElement>} elements @param {number} fromW @param {number} fromH @param {number} toW @param {number} toH */
export function scaleLayoutElements(elements, fromW, fromH, toW, toH) {
  const sx = toW / fromW
  const sy = toH / fromH
  /** @type {Record<string, LayoutElement>} */
  const next = {}
  for (const [id, el] of Object.entries(elements)) {
    next[id] = {
      ...el,
      xMm: roundMm(el.xMm * sx),
      yMm: roundMm(el.yMm * sy),
      wMm: roundMm(el.wMm * sx),
      hMm: roundMm(el.hMm * sy),
    }
  }
  return next
}

/**
 * @param {number} labelWidthMm
 * @param {number} labelHeightMm
 * @param {'landscape' | 'portrait'} orientation
 * @returns {StickerVisualLayout}
 */
export function createDefaultVisualLayout(labelWidthMm, labelHeightMm, orientation) {
  const elements = scaleLayoutElements(
    TEMPLATE_LANDSCAPE_100x50,
    BASE_LANDSCAPE_W,
    BASE_LANDSCAPE_H,
    labelWidthMm,
    labelHeightMm,
  )
  return {
    labelWidthMm,
    labelHeightMm,
    orientation,
    elements,
  }
}

/** @param {number} w @param {number} h @param {'landscape'|'portrait'} orientation */
export function visualLayoutKey(w, h, orientation) {
  return `${roundMm(w)}x${roundMm(h)}_${orientation}`
}

/** @typedef {{ useVisualLayout: boolean, layouts: Record<string, StickerVisualLayout> }} VisualLayoutStore */

/** @returns {VisualLayoutStore} */
export function getVisualLayoutStore() {
  try {
    const raw = localStorage.getItem(STICKER_VISUAL_LAYOUT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return {
          useVisualLayout: Boolean(parsed.useVisualLayout),
          layouts: parsed.layouts && typeof parsed.layouts === 'object' ? parsed.layouts : {},
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { useVisualLayout: false, layouts: {} }
}

/** @param {VisualLayoutStore} store */
function saveVisualLayoutStore(store) {
  try {
    localStorage.setItem(STICKER_VISUAL_LAYOUT_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

/**
 * @param {number} labelWidthMm
 * @param {number} labelHeightMm
 * @param {'landscape'|'portrait'} orientation
 * @returns {StickerVisualLayout}
 */
export function getVisualLayoutForLabel(labelWidthMm, labelHeightMm, orientation) {
  const store = getVisualLayoutStore()
  const key = visualLayoutKey(labelWidthMm, labelHeightMm, orientation)
  const saved = store.layouts[key]
  if (saved?.elements) {
    return {
      labelWidthMm,
      labelHeightMm,
      orientation,
      elements: { ...saved.elements },
    }
  }
  return createDefaultVisualLayout(labelWidthMm, labelHeightMm, orientation)
}

/**
 * @param {StickerVisualLayout} layout
 * @param {boolean} [useVisualLayout]
 */
export function setVisualLayoutForLabel(layout, useVisualLayout) {
  const store = getVisualLayoutStore()
  const orientation = layout.orientation ?? 'landscape'
  const key = visualLayoutKey(layout.labelWidthMm, layout.labelHeightMm, orientation)
  store.layouts[key] = {
    labelWidthMm: layout.labelWidthMm,
    labelHeightMm: layout.labelHeightMm,
    orientation,
    elements: JSON.parse(JSON.stringify(layout.elements)),
  }
  if (useVisualLayout !== undefined) {
    store.useVisualLayout = useVisualLayout
  }
  saveVisualLayoutStore(store)
  return store
}

/** @param {boolean} enabled */
export function setUseVisualLayout(enabled) {
  const store = getVisualLayoutStore()
  store.useVisualLayout = enabled
  saveVisualLayoutStore(store)
  return store.useVisualLayout
}

export function getUseVisualLayout() {
  return getVisualLayoutStore().useVisualLayout
}

/**
 * @param {number} labelWidthMm
 * @param {number} labelHeightMm
 * @param {'landscape'|'portrait'} orientation
 */
export function resetVisualLayoutForLabel(labelWidthMm, labelHeightMm, orientation) {
  const store = getVisualLayoutStore()
  const key = visualLayoutKey(labelWidthMm, labelHeightMm, orientation)
  delete store.layouts[key]
  saveVisualLayoutStore(store)
  return createDefaultVisualLayout(labelWidthMm, labelHeightMm, orientation)
}

/**
 * @param {LayoutElement} el
 * @param {number} labelW
 * @param {number} labelH
 * @param {string} id
 */
export function clampLayoutElement(el, labelW, labelH, id) {
  const meta = LAYOUT_ELEMENT_META[id]
  const minW = meta?.minW ?? 6
  const minH = meta?.minH ?? 3
  const wMm = Math.max(minW, Math.min(el.wMm, labelW))
  const hMm = Math.max(minH, Math.min(el.hMm, labelH))
  const xMm = Math.max(0, Math.min(el.xMm, labelW - wMm))
  const yMm = Math.max(0, Math.min(el.yMm, labelH - hMm))
  return { ...el, xMm: roundMm(xMm), yMm: roundMm(yMm), wMm: roundMm(wMm), hMm: roundMm(hMm) }
}

/** Datos de ejemplo para la vista previa del editor. */
export const STICKER_LAYOUT_PREVIEW_SAMPLE = {
  headerTitle: 'PROYECTO EJEMPLO',
  booking: 'BK-12345',
  material: 'MELAMINA BLANCA',
  subdesc: 'Cajón superior',
  refLine: '42',
  centerLabel: 'Frente cajón',
  upLabel: '2+0',
  loLabel: '',
  leftLabel: '1',
  rightLabel: '1',
  L: 600,
  A: 400,
  numeroPieza: 1,
  cantidad: 3,
  pCode: 'P42',
  dateStr: '07/14/26',
}

/**
 * @param {import('./stickerPrintSize.js').StickerPrintSizeId | string} printSize
 * @param {'landscape'|'portrait'} orientation
 * @param {{ widthMm?: number, heightMm?: number }|null} customLabelMm
 */
export function resolveVisualLayoutForPrint(printSize, orientation, customLabelMm = null) {
  const { widthMm, heightMm } = resolveLabelDimensionsMm(printSize, orientation, customLabelMm)
  return {
    useVisualLayout: getUseVisualLayout(),
    visualLayout: getVisualLayoutForLabel(widthMm, heightMm, orientation),
  }
}
