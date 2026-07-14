/** Resolución de la impresora Zebra al generar ZPL (^PW, ^LL y posiciones en dots). */

export const STICKER_PRINT_DPI_KEY = 'biesse-sticker-print-dpi'

const MIN_DPI = 100
const MAX_DPI = 600

/** @typedef {number} StickerPrintDpi */

export const STICKER_PRINT_DPI_PRESETS = [
  { id: 203, label: '203', hint: 'ZD230 y ZD420 estándar.' },
  { id: 300, label: '300', hint: 'ZD420 alta resolución.' },
  { id: 600, label: '600', hint: 'Algunas Zebra industriales.' },
]

/** @param {number|string|null|undefined} value */
export function clampStickerPrintDpi(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 203
  return Math.min(MAX_DPI, Math.max(MIN_DPI, Math.round(n)))
}

/** @returns {StickerPrintDpi} */
export function getStickerPrintDpi() {
  try {
    return clampStickerPrintDpi(localStorage.getItem(STICKER_PRINT_DPI_KEY))
  } catch {
    return 203
  }
}

/** @param {number|string} dpi */
export function setStickerPrintDpi(dpi) {
  try {
    localStorage.setItem(STICKER_PRINT_DPI_KEY, String(clampStickerPrintDpi(dpi)))
  } catch {
    /* ignore */
  }
}

/** @deprecated Use STICKER_PRINT_DPI_PRESETS */
export const STICKER_PRINT_DPIS = STICKER_PRINT_DPI_PRESETS.map((p) => ({
  id: p.id,
  label: `${p.label} dpi`,
  hint: p.hint,
}))
