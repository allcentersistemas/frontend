import { getStickerPrintDpi } from './stickerPrintDpi.js'
import { getStickerPrintOrientation } from './stickerPrintOrientation.js'
import {
  getStickerPrintCustomSize,
  getStickerPrintSize,
  resolveLabelDimensionsMm,
} from './stickerPrintSize.js'
import { getStickerDesignSettings } from './stickerDesignSettings.js'
import { getUseVisualLayout, getVisualLayoutForLabel } from './stickerVisualLayout.js'

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
