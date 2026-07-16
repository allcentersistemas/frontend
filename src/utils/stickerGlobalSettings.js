import { getStickerPrintDpi } from './stickerPrintDpi.js'
import { getStickerPrintOrientation } from './stickerPrintOrientation.js'
import {
  getStickerPrintCustomSize,
  getStickerPrintSize,
  resolveLabelDimensionsMm,
} from './stickerPrintSize.js'
import { getStickerDesignSettings } from './stickerDesignSettings.js'
import { getLayoutForPrint } from './stickerVisualLayout.js'

/** Claves localStorage que definen la configuración global de stickers. */
export const STICKER_SETTINGS_STORAGE_KEYS = [
  'biesse-sticker-print-size',
  'biesse-sticker-print-orientation',
  'biesse-sticker-print-dpi',
  'biesse-sticker-print-custom-width-mm',
  'biesse-sticker-print-custom-height-mm',
  'biesse-sticker-design-settings',
  'biesse-sticker-visual-layout',
]

/** Ajustes globales de impresión de stickers (localStorage, compartidos por todas las impresiones). */
export function loadGlobalStickerSettings() {
  const printSize = getStickerPrintSize()
  const printOrientation = getStickerPrintOrientation()
  const custom = getStickerPrintCustomSize()
  const customLabelMm = printSize === 'label_custom' ? custom : null
  const { widthMm, heightMm } = resolveLabelDimensionsMm(printSize, printOrientation, customLabelMm)
  const { useVisualLayout, visualLayout } = getLayoutForPrint(printSize, printOrientation, customLabelMm)

  return {
    printSize,
    printOrientation,
    customWidthMm: custom.widthMm,
    customHeightMm: custom.heightMm,
    printDpi: getStickerPrintDpi(),
    stickerDesign: getStickerDesignSettings(),
    visualLayout,
    useVisualLayout,
    effectiveLabelMm: { widthMm, heightMm },
  }
}

/**
 * Opciones listas para imprimir: siempre lee la configuración guardada en Gestión → Configuración.
 * Llamar en cada impresión para no usar valores obsoletos del diálogo.
 */
export function getGlobalStickerPrintOptions() {
  const settings = loadGlobalStickerSettings()
  const customLabelMm =
    settings.printSize === 'label_custom'
      ? { widthMm: settings.customWidthMm, heightMm: settings.customHeightMm }
      : null

  return {
    printSize: settings.printSize,
    printOrientation: settings.printOrientation,
    printDpi: settings.printDpi,
    stickerDesign: settings.stickerDesign,
    customLabelMm,
    effectiveLabelMm: settings.effectiveLabelMm,
    useVisualLayout: settings.useVisualLayout,
    visualLayout: settings.visualLayout,
  }
}
