import { getStickerPrintDpi } from './stickerPrintDpi.js'
import { getStickerPrintOrientation } from './stickerPrintOrientation.js'
import {
  getStickerPrintCustomSize,
  getStickerPrintSize,
  resolveLabelDimensionsMm,
} from './stickerPrintSize.js'
import { getStickerDesignSettings } from './stickerDesignSettings.js'
import {
  getUseVisualLayout,
  getVisualLayoutForLabel,
  normalizeVisualLayoutForPrint,
} from './stickerVisualLayout.js'

/** Ajustes globales de impresión de stickers (localStorage, compartidos por todas las impresiones). */
export function loadGlobalStickerSettings() {
  const printSize = getStickerPrintSize()
  const printOrientation = getStickerPrintOrientation()
  const custom = getStickerPrintCustomSize()
  const customLabelMm = printSize === 'label_custom' ? custom : null
  const { widthMm, heightMm } = resolveLabelDimensionsMm(printSize, printOrientation, customLabelMm)

  return {
    printSize,
    printOrientation,
    customWidthMm: custom.widthMm,
    customHeightMm: custom.heightMm,
    printDpi: getStickerPrintDpi(),
    stickerDesign: getStickerDesignSettings(),
    visualLayout: getVisualLayoutForLabel(widthMm, heightMm, printOrientation),
    useVisualLayout: getUseVisualLayout(),
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
  const effectiveLabelMm = resolveLabelDimensionsMm(
    settings.printSize,
    settings.printOrientation,
    customLabelMm,
  )
  const useVisualLayout = Boolean(settings.useVisualLayout && settings.visualLayout?.elements)
  const visualLayout = useVisualLayout
    ? normalizeVisualLayoutForPrint(
        settings.visualLayout,
        effectiveLabelMm.widthMm,
        effectiveLabelMm.heightMm,
        settings.printOrientation,
      )
    : null

  return {
    printSize: settings.printSize,
    printOrientation: settings.printOrientation,
    printDpi: settings.printDpi,
    stickerDesign: settings.stickerDesign,
    customLabelMm,
    effectiveLabelMm,
    useVisualLayout,
    visualLayout,
  }
}
