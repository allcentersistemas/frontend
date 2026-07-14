/** Diseño visual de etiqueta (posiciones en mm, persistido en localStorage). */

import { resolveLabelDimensionsMm } from './stickerPrintSize.js'

export const STICKER_VISUAL_LAYOUT_KEY = 'biesse-sticker-visual-layout'

/** @typedef {'text' | 'diagram' | 'qr' | 'dims'} LayoutElementType */
/** @typedef {'L' | 'C' | 'R'} LayoutTextJustify */

/**
 * @typedef {object} LayoutElement
 * @property {number} xMm
 * @property {number} yMm
 * @property {number} wMm
 * @property {number} hMm
 * @property {boolean} [enabled]
 * @property {string} [fieldKey] Clave de dato (headerTitle, qr, customText…).
 * @property {number} [fontHm] Alto de fuente en mm.
 * @property {number} [charWidthRatio] Ancho/carácter vs alto (finura).
 * @property {number} [fontScale] Multiplicador adicional de tamaño (1 = estándar).
 * @property {number} [maxLines] Líneas máximas en ^FB.
 * @property {LayoutTextJustify} [justify] Alineación L/C/R.
 * @property {string} [customText] Texto fijo (fieldKey customText).
 * @property {string} [prefix] Prefijo opcional antes del valor.
 */

/**
 * @typedef {object} StickerVisualLayout
 * @property {number} labelWidthMm
 * @property {number} labelHeightMm
 * @property {'landscape' | 'portrait'} orientation
 * @property {Record<string, LayoutElement>} elements
 */

/** Catálogo de campos que se pueden colocar en la etiqueta. */
export const LAYOUT_FIELD_CATALOG = {
  headerTitle: { label: 'Título pedido', type: 'text', minW: 18, minH: 4, defaultFontHm: 5.4, maxLines: 2 },
  booking: { label: 'Booking', type: 'text', minW: 14, minH: 3, defaultFontHm: 3.6, optional: true },
  material: { label: 'Material', type: 'text', minW: 14, minH: 3.5, defaultFontHm: 4.2 },
  subdesc: { label: 'Descripción 2', type: 'text', minW: 14, minH: 3, defaultFontHm: 3.2, optional: true },
  refLine: { label: 'Referencia', type: 'text', minW: 8, minH: 3, defaultFontHm: 4.2 },
  diagram: { label: 'Pieza / cantos', type: 'diagram', minW: 24, minH: 14 },
  qr: { label: 'Código QR', type: 'qr', minW: 12, minH: 12 },
  dimsL: { label: 'Longitud (L)', type: 'text', minW: 10, minH: 3, defaultFontHm: 4.2, prefix: 'L: ' },
  dimsA: { label: 'Ancho (A)', type: 'text', minW: 10, minH: 3, defaultFontHm: 4.2, prefix: 'A: ' },
  fraction: { label: 'Fracción pieza', type: 'text', minW: 10, minH: 3, defaultFontHm: 4 },
  footerLeft: { label: 'Código pieza', type: 'text', minW: 10, minH: 2.5, defaultFontHm: 3.2 },
  footerRight: { label: 'Fecha', type: 'text', minW: 10, minH: 2.5, defaultFontHm: 3.2 },
  customText: { label: 'Texto libre', type: 'text', minW: 12, minH: 3, defaultFontHm: 4 },
}

/** Compatibilidad con código que usaba LAYOUT_ELEMENT_META. */
export const LAYOUT_ELEMENT_META = LAYOUT_FIELD_CATALOG

export const LAYOUT_ELEMENT_IDS = Object.keys(LAYOUT_FIELD_CATALOG).filter((k) => k !== 'customText')

const BASE_LANDSCAPE_W = 100
const BASE_LANDSCAPE_H = 50

/** Plantilla landscape 100×50 mm. */
const TEMPLATE_LANDSCAPE_100x50 = {
  headerTitle: { xMm: 1, yMm: 1, wMm: 58, hMm: 12, fontHm: 5.4, maxLines: 2, enabled: true, fieldKey: 'headerTitle' },
  booking: { xMm: 1, yMm: 13, wMm: 58, hMm: 4, fontHm: 3.6, enabled: true, fieldKey: 'booking' },
  material: { xMm: 1, yMm: 17.5, wMm: 58, hMm: 5, fontHm: 4.2, enabled: true, fieldKey: 'material' },
  subdesc: { xMm: 1, yMm: 22.5, wMm: 58, hMm: 4, fontHm: 3.2, enabled: true, fieldKey: 'subdesc' },
  refLine: { xMm: 1, yMm: 27, wMm: 20, hMm: 5, fontHm: 4.2, enabled: true, fieldKey: 'refLine' },
  diagram: { xMm: 15, yMm: 32, wMm: 40, hMm: 22, enabled: true, fieldKey: 'diagram' },
  qr: { xMm: 76, yMm: 1, wMm: 19, hMm: 19, enabled: true, fieldKey: 'qr' },
  dimsL: { xMm: 76, yMm: 21.5, wMm: 23, hMm: 4.5, fontHm: 4.2, enabled: true, fieldKey: 'dimsL', prefix: 'L: ' },
  dimsA: { xMm: 76, yMm: 26, wMm: 23, hMm: 4.5, fontHm: 4.2, enabled: true, fieldKey: 'dimsA', prefix: 'A: ' },
  fraction: { xMm: 76, yMm: 30.5, wMm: 23, hMm: 4, fontHm: 4, enabled: true, fieldKey: 'fraction' },
  footerLeft: { xMm: 1, yMm: 46, wMm: 40, hMm: 3.5, fontHm: 3.2, enabled: true, fieldKey: 'footerLeft' },
  footerRight: { xMm: 76, yMm: 46, wMm: 23, hMm: 3.5, fontHm: 3.2, enabled: true, fieldKey: 'footerRight' },
}

/** @param {number} value */
function roundMm(value) {
  return Math.round(value * 10) / 10
}

/** @param {string} id @param {LayoutElement} el */
export function getElementMeta(id, el) {
  const fieldKey = el?.fieldKey ?? id
  return LAYOUT_FIELD_CATALOG[fieldKey] ?? {
    label: el?.customText?.slice(0, 24) || 'Campo',
    type: 'text',
    minW: 8,
    minH: 3,
    defaultFontHm: 4,
  }
}

/** @param {string} id @param {LayoutElement} el @param {number} labelW @param {number} labelH */
export function normalizeLayoutElement(id, el, labelW, labelH) {
  const meta = getElementMeta(id, el)
  const fieldKey = el.fieldKey ?? (id.startsWith('custom_') ? 'customText' : id)
  const normalized = {
    xMm: roundMm(el.xMm ?? 1),
    yMm: roundMm(el.yMm ?? 1),
    wMm: roundMm(el.wMm ?? meta.minW ?? 12),
    hMm: roundMm(el.hMm ?? meta.minH ?? 4),
    enabled: el.enabled !== false,
    fieldKey,
    fontHm: el.fontHm ?? meta.defaultFontHm ?? 4,
    charWidthRatio: el.charWidthRatio,
    fontScale: el.fontScale ?? 1,
    maxLines: el.maxLines ?? meta.maxLines ?? 1,
    justify: el.justify ?? 'L',
    customText: el.customText,
    prefix: el.prefix ?? meta.prefix,
  }
  return clampLayoutElement(normalized, labelW, labelH, id, fieldKey)
}

/** Migra layouts antiguos (ids legacy + bloque dims). */
function migrateLegacyElements(elements, labelW, labelH) {
  /** @type {Record<string, LayoutElement>} */
  const next = { ...elements }

  const legacyMap = {
    header: 'headerTitle',
    ref: 'refLine',
  }
  for (const [oldId, newId] of Object.entries(legacyMap)) {
    if (next[oldId] && !next[newId]) {
      next[newId] = { ...next[oldId], fieldKey: newId }
      delete next[oldId]
    }
  }

  if (next.dims && !next.dimsL) {
    const d = next.dims
    const rowH = roundMm(d.hMm / 3)
    next.dimsL = { ...d, yMm: d.yMm, hMm: rowH, fieldKey: 'dimsL', prefix: 'L: ' }
    next.dimsA = { ...d, yMm: roundMm(d.yMm + rowH), hMm: rowH, fieldKey: 'dimsA', prefix: 'A: ' }
    next.fraction = { ...d, yMm: roundMm(d.yMm + rowH * 2), hMm: rowH, fieldKey: 'fraction' }
    delete next.dims
  }

  /** @type {Record<string, LayoutElement>} */
  const normalized = {}
  for (const [id, el] of Object.entries(next)) {
    normalized[id] = normalizeLayoutElement(id, el, labelW, labelH)
  }
  return normalized
}

/** @param {Record<string, LayoutElement>} elements */
export function getActiveLayoutElements(elements) {
  return Object.entries(elements).filter(([, el]) => el?.enabled !== false)
}

/** @param {StickerVisualLayout} layout */
export function listAddableFields(layout) {
  const activeKeys = new Set(
    getActiveLayoutElements(layout.elements).map(([id, el]) => el.fieldKey ?? id),
  )
  return Object.entries(LAYOUT_FIELD_CATALOG)
    .filter(([key]) => key !== 'customText' && !activeKeys.has(key))
    .map(([key, meta]) => ({ key, ...meta }))
}

/**
 * @param {string} fieldKey
 * @param {number} labelW
 * @param {number} labelH
 * @param {string} [elementId]
 */
export function createLayoutElementForField(fieldKey, labelW, labelH, elementId) {
  const meta = LAYOUT_FIELD_CATALOG[fieldKey]
  if (!meta) return null
  const id = elementId ?? (fieldKey === 'customText' ? `custom_${Date.now()}` : fieldKey)
  const w = Math.min(meta.minW + 8, labelW - 2)
  const h = meta.minH + 1
  return normalizeLayoutElement(
    id,
    {
      xMm: 2,
      yMm: 2,
      wMm: w,
      hMm: h,
      enabled: true,
      fieldKey,
      fontHm: meta.defaultFontHm,
      maxLines: meta.maxLines ?? 1,
      prefix: meta.prefix,
      customText: fieldKey === 'customText' ? 'Texto' : undefined,
    },
    labelW,
    labelH,
  )
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
  const scaled = scaleLayoutElements(
    TEMPLATE_LANDSCAPE_100x50,
    BASE_LANDSCAPE_W,
    BASE_LANDSCAPE_H,
    labelWidthMm,
    labelHeightMm,
  )
  const elements = migrateLegacyElements(scaled, labelWidthMm, labelHeightMm)
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
 * Ajusta el layout guardado al tamaño de etiqueta actual (escala posiciones si cambió el rollo).
 * @param {StickerVisualLayout|null|undefined} layout
 * @param {number} labelWidthMm
 * @param {number} labelHeightMm
 * @param {'landscape'|'portrait'} orientation
 */
export function normalizeVisualLayoutForPrint(layout, labelWidthMm, labelHeightMm, orientation) {
  if (!layout?.elements) return null
  let elements = layout.elements
  const srcW = layout.labelWidthMm || labelWidthMm
  const srcH = layout.labelHeightMm || labelHeightMm
  if (srcW !== labelWidthMm || srcH !== labelHeightMm) {
    elements = scaleLayoutElements(elements, srcW, srcH, labelWidthMm, labelHeightMm)
  }
  return {
    labelWidthMm,
    labelHeightMm,
    orientation,
    elements: migrateLegacyElements(elements, labelWidthMm, labelHeightMm),
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
    return normalizeVisualLayoutForPrint(
      {
        labelWidthMm: saved.labelWidthMm ?? labelWidthMm,
        labelHeightMm: saved.labelHeightMm ?? labelHeightMm,
        orientation,
        elements: saved.elements,
      },
      labelWidthMm,
      labelHeightMm,
      orientation,
    )
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
  const elements = migrateLegacyElements(layout.elements, layout.labelWidthMm, layout.labelHeightMm)
  store.layouts[key] = {
    labelWidthMm: layout.labelWidthMm,
    labelHeightMm: layout.labelHeightMm,
    orientation,
    elements: JSON.parse(JSON.stringify(elements)),
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
 * @param {string} [fieldKey]
 */
export function clampLayoutElement(el, labelW, labelH, id, fieldKey) {
  const meta = getElementMeta(id, { ...el, fieldKey })
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
  const raw = getVisualLayoutForLabel(widthMm, heightMm, orientation)
  return {
    useVisualLayout: getUseVisualLayout(),
    visualLayout: normalizeVisualLayoutForPrint(raw, widthMm, heightMm, orientation),
  }
}
