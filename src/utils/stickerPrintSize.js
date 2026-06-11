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
    label: 'Etiqueta 80 × 50 mm (Zebra ZD230)',
    hint:
      'Zebra ZD230: papel 80×50 mm, escala 100%, sin márgenes. Si sale tenue, sube Oscuridad (Darkness) en el driver y calibra el rollo.',
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
