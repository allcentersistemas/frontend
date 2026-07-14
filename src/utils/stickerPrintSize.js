/** Preferencia de tamaño al imprimir etiquetas Biesse. */

export const STICKER_PRINT_SIZE_KEY = 'biesse-sticker-print-size'
export const STICKER_PRINT_CUSTOM_WIDTH_KEY = 'biesse-sticker-print-custom-width-mm'
export const STICKER_PRINT_CUSTOM_HEIGHT_KEY = 'biesse-sticker-print-custom-height-mm'

/** @typedef {'auto' | 'fill' | 'label_80x50' | 'label_100x50' | 'label_60x40' | 'label_custom'} StickerPrintSizeId */

/** @type {Record<'label_80x50' | 'label_100x50' | 'label_60x40', { wMm: number, hMm: number }>} */
export const ZEBRA_LABEL_SIZES = {
  label_80x50: { wMm: 80, hMm: 50 },
  label_100x50: { wMm: 100, hMm: 50 },
  label_60x40: { wMm: 60, hMm: 40 },
}

const MIN_LABEL_MM = 25
const MAX_LABEL_MM = 220

export const STICKER_PRINT_SIZES = [
  {
    id: 'label_80x50',
    label: '80 × 50 mm · Zebra (ZD230 / ZD420)',
    hint: 'Tamaño estándar. Con Zebra Browser Print envía ZPL nativo (nitidez alta).',
  },
  {
    id: 'label_100x50',
    label: '100 × 50 mm · Zebra',
    hint: 'Etiqueta ancha. Ideal para ZD420 u otras Zebra con rollo 100×50.',
  },
  {
    id: 'label_60x40',
    label: '60 × 40 mm · Zebra',
    hint: 'Etiqueta compacta. Texto más condensado; preferible ZPL con Browser Print.',
  },
  {
    id: 'label_custom',
    label: 'Personalizado (mm) · Zebra',
    hint: 'Indica ancho y alto del rollo para probar distintas impresoras o medidas.',
  },
  {
    id: 'auto',
    label: 'Automático (diálogo de impresión)',
    hint: 'Usa el tamaño de papel del driver. Mejor para impresoras no Zebra.',
  },
  {
    id: 'fill',
    label: 'Toda la hoja',
    hint: 'Ocupa todo el papel configurado en la impresora (HTML / driver).',
  },
]

/** Tamaños que imprimen por ZPL vía Browser Print. */
export const ZEBRA_ZPL_SIZES = new Set([
  'label_80x50',
  'label_100x50',
  'label_60x40',
  'label_custom',
])

/** @param {number} value */
export function clampLabelMm(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return MIN_LABEL_MM
  return Math.min(MAX_LABEL_MM, Math.max(MIN_LABEL_MM, Math.round(n * 10) / 10))
}

/** @returns {{ widthMm: number, heightMm: number }} */
export function getStickerPrintCustomSize() {
  try {
    const widthMm = clampLabelMm(localStorage.getItem(STICKER_PRINT_CUSTOM_WIDTH_KEY) ?? 100)
    const heightMm = clampLabelMm(localStorage.getItem(STICKER_PRINT_CUSTOM_HEIGHT_KEY) ?? 50)
    return { widthMm, heightMm }
  } catch {
    return { widthMm: 100, heightMm: 50 }
  }
}

/** @param {number} widthMm @param {number} heightMm */
export function setStickerPrintCustomSize(widthMm, heightMm) {
  try {
    localStorage.setItem(STICKER_PRINT_CUSTOM_WIDTH_KEY, String(clampLabelMm(widthMm)))
    localStorage.setItem(STICKER_PRINT_CUSTOM_HEIGHT_KEY, String(clampLabelMm(heightMm)))
  } catch {
    /* ignore */
  }
}

/**
 * Dimensiones físicas de la etiqueta según preset, personalizado y orientación.
 * @param {string} printSize
 * @param {'landscape'|'portrait'} [orientation]
 * @param {{ widthMm?: number, heightMm?: number }|null} [customMm]
 */
export function resolveLabelDimensionsMm(printSize, orientation = 'landscape', customMm = null) {
  let wMm
  let hMm
  if (printSize === 'label_custom') {
    const c = customMm ?? getStickerPrintCustomSize()
    wMm = clampLabelMm(c.widthMm)
    hMm = clampLabelMm(c.heightMm)
  } else {
    const preset = ZEBRA_LABEL_SIZES[printSize]
    wMm = preset?.wMm ?? 80
    hMm = preset?.hMm ?? 50
  }
  if (orientation === 'portrait') {
    return { widthMm: hMm, heightMm: wMm, w: hMm, h: wMm }
  }
  return { widthMm: wMm, heightMm: hMm, w: wMm, h: hMm }
}

/** @param {string} id */
export function isZebraZplSize(id) {
  return ZEBRA_ZPL_SIZES.has(id)
}

/** @returns {StickerPrintSizeId} */
export function getStickerPrintSize() {
  try {
    const v = localStorage.getItem(STICKER_PRINT_SIZE_KEY)
    if (STICKER_PRINT_SIZES.some((s) => s.id === v)) {
      return /** @type {StickerPrintSizeId} */ (v)
    }
  } catch {
    /* ignore */
  }
  return 'label_80x50'
}

/** @param {StickerPrintSizeId} id */
export function setStickerPrintSize(id) {
  try {
    localStorage.setItem(STICKER_PRINT_SIZE_KEY, id)
  } catch {
    /* ignore */
  }
}
