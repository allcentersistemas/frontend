/** Preferencia de tamaño al imprimir etiquetas Biesse. */

export const STICKER_PRINT_SIZE_KEY = 'biesse-sticker-print-size'

/** @typedef {'auto' | 'fill' | 'label_80x50' | 'label_100x50' | 'label_60x40'} StickerPrintSizeId */

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
export const ZEBRA_ZPL_SIZES = new Set(['label_80x50', 'label_100x50', 'label_60x40'])

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
