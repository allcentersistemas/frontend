/** Resolución de la impresora Zebra al generar ZPL (^PW, ^LL y posiciones en dots). */

export const STICKER_PRINT_DPI_KEY = 'biesse-sticker-print-dpi'

/** @typedef {203 | 300} StickerPrintDpi */

export const STICKER_PRINT_DPIS = [
  {
    id: 203,
    label: '203 dpi',
    hint: 'ZD230 y la mayoría de ZD420. Si la etiqueta sale pequeña en una esquina, prueba 300 dpi.',
  },
  {
    id: 300,
    label: '300 dpi',
    hint: 'ZD420 de alta resolución. Usa esto si con 203 dpi el contenido queda encogido arriba a la izquierda.',
  },
]

/** @returns {StickerPrintDpi} */
export function getStickerPrintDpi() {
  try {
    const v = Number(localStorage.getItem(STICKER_PRINT_DPI_KEY))
    if (v === 203 || v === 300) return /** @type {StickerPrintDpi} */ (v)
  } catch {
    /* ignore */
  }
  return 203
}

/** @param {StickerPrintDpi} dpi */
export function setStickerPrintDpi(dpi) {
  try {
    localStorage.setItem(STICKER_PRINT_DPI_KEY, String(dpi))
  } catch {
    /* ignore */
  }
}
