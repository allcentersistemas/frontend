/** Orientación de la etiqueta al imprimir. */

import { resolveLabelDimensionsMm } from './stickerPrintSize.js'

export const STICKER_PRINT_ORIENTATION_KEY = 'biesse-sticker-print-orientation'

/** @typedef {'landscape' | 'portrait'} StickerPrintOrientationId */

export const STICKER_PRINT_ORIENTATIONS = [
  {
    id: 'landscape',
    label: 'Horizontal',
    hint: 'Etiqueta ancha: diagrama a la izquierda y QR a la derecha.',
  },
  {
    id: 'portrait',
    label: 'Vertical',
    hint: 'Etiqueta alta: contenido apilado en vertical.',
  },
]

/**
 * @param {'landscape'|'portrait'} orientation
 * @param {string} [printSize]
 * @param {{ widthMm?: number, heightMm?: number }|null} [customMm]
 */
export function orientationOptionLabel(orientation, printSize = 'label_80x50', customMm = null) {
  const { widthMm, heightMm } = resolveLabelDimensionsMm(printSize, orientation, customMm)
  if (orientation === 'portrait') {
    return `Vertical (${widthMm} × ${heightMm} mm)`
  }
  return `Horizontal (${widthMm} × ${heightMm} mm)`
}

/** @returns {StickerPrintOrientationId} */
export function getStickerPrintOrientation() {
  try {
    const v = localStorage.getItem(STICKER_PRINT_ORIENTATION_KEY)
    if (STICKER_PRINT_ORIENTATIONS.some((o) => o.id === v)) {
      return /** @type {StickerPrintOrientationId} */ (v)
    }
  } catch {
    /* ignore */
  }
  return 'landscape'
}

/** @param {StickerPrintOrientationId} id */
export function setStickerPrintOrientation(id) {
  try {
    localStorage.setItem(STICKER_PRINT_ORIENTATION_KEY, id)
  } catch {
    /* ignore */
  }
}

/** @param {StickerPrintOrientationId} orientation */
export function labelDimensionsMm(orientation) {
  if (orientation === 'portrait') {
    return { widthMm: 50, heightMm: 80 }
  }
  return { widthMm: 80, heightMm: 50 }
}
