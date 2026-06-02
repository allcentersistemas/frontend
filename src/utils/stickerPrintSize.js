/** Preferencia de tamaño al imprimir etiquetas Biesse. */

export const STICKER_PRINT_SIZE_KEY = 'biesse-sticker-print-size'

/** @typedef {'auto' | 'fill' | 'label_80x50'} StickerPrintSizeId */

export const STICKER_PRINT_SIZES = [
  {
    id: 'auto',
    label: 'Automático',
    hint: 'Se adapta al tamaño que elijas en el diálogo de impresión (recomendado).',
  },
  {
    id: 'fill',
    label: 'Toda la hoja',
    hint: 'Ocupa todo el ancho y alto del papel configurado en la impresora.',
  },
  {
    id: 'label_80x50',
    label: 'Etiqueta 80 × 50 mm',
    hint: 'Tamaño fijo para Zebra ZD230 u otras etiquetas 8 × 5 cm.',
  },
]

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
  return 'auto'
}

/** @param {StickerPrintSizeId} id */
export function setStickerPrintSize(id) {
  try {
    localStorage.setItem(STICKER_PRINT_SIZE_KEY, id)
  } catch {
    /* ignore */
  }
}
