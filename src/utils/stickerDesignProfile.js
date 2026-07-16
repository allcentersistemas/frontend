/**
 * Perfil exportable del diseño de etiquetas Biesse (tamaño, dpi, tipografía y layout visual).
 * Permite copiar la configuración entre equipos vía archivo JSON.
 */

import {
  getStickerDesignSettings,
  normalizeStickerDesignSettings,
  setStickerDesignSettings,
} from './stickerDesignSettings.js'
import {
  STICKER_PRINT_ORIENTATIONS,
  getStickerPrintOrientation,
  setStickerPrintOrientation,
} from './stickerPrintOrientation.js'
import {
  STICKER_PRINT_SIZES,
  clampLabelMm,
  getStickerPrintCustomSize,
  getStickerPrintSize,
  resolveLabelDimensionsMm,
  setStickerPrintCustomSize,
  setStickerPrintSize,
} from './stickerPrintSize.js'
import { clampStickerPrintDpi, getStickerPrintDpi, setStickerPrintDpi } from './stickerPrintDpi.js'
import {
  applyVisualLayoutStore,
  getUseVisualLayout,
  getVisualLayoutForLabel,
  getVisualLayoutStore,
  setUseVisualLayout,
} from './stickerVisualLayout.js'

export const STICKER_DESIGN_PROFILE_VERSION = 1
export const STICKER_DESIGN_PROFILE_EXTENSION = '.json'

/** @typedef {import('./stickerDesignSettings.js').StickerDesignSettings} StickerDesignSettings */
/** @typedef {import('./stickerVisualLayout.js').StickerVisualLayout} StickerVisualLayout */
/** @typedef {import('./stickerVisualLayout.js').VisualLayoutStore} VisualLayoutStore */

/**
 * @typedef {object} StickerDesignProfile
 * @property {number} version
 * @property {string} exportedAt
 * @property {string} [name]
 * @property {string} printSize
 * @property {'landscape'|'portrait'} printOrientation
 * @property {number} customWidthMm
 * @property {number} customHeightMm
 * @property {number} printDpi
 * @property {StickerDesignSettings} stickerDesign
 * @property {VisualLayoutStore} visualLayout
 */

/** Lee el perfil actual desde localStorage. */
export function collectStickerDesignProfile(name) {
  const printSize = getStickerPrintSize()
  const printOrientation = getStickerPrintOrientation()
  const custom = getStickerPrintCustomSize()
  return normalizeStickerDesignProfile({
    version: STICKER_DESIGN_PROFILE_VERSION,
    exportedAt: new Date().toISOString(),
    name: name?.trim() || undefined,
    printSize,
    printOrientation,
    customWidthMm: custom.widthMm,
    customHeightMm: custom.heightMm,
    printDpi: getStickerPrintDpi(),
    stickerDesign: getStickerDesignSettings(),
    visualLayout: getVisualLayoutStore(),
  })
}

/**
 * Incluye el estado actual del editor (aunque aún no se haya pulsado Guardar).
 * @param {object} state
 */
export function collectStickerDesignProfileFromEditor(state, name) {
  const profile = collectStickerDesignProfile(name)
  const printSize = state.printSize ?? profile.printSize
  const printOrientation = state.printOrientation ?? profile.printOrientation
  const customWidthMm = clampLabelMm(state.customWidthMm ?? profile.customWidthMm)
  const customHeightMm = clampLabelMm(state.customHeightMm ?? profile.customHeightMm)
  const dims = resolveLabelDimensionsMm(printSize, printOrientation, {
    widthMm: customWidthMm,
    heightMm: customHeightMm,
  })
  const layouts = { ...profile.visualLayout.layouts }
  if (state.visualLayout?.elements) {
    const key = `${Math.round(dims.widthMm * 10) / 10}x${Math.round(dims.heightMm * 10) / 10}_${printOrientation}`
    layouts[key] = {
      labelWidthMm: dims.widthMm,
      labelHeightMm: dims.heightMm,
      orientation: printOrientation,
      elements: state.visualLayout.elements,
    }
  }
  return normalizeStickerDesignProfile({
    ...profile,
    name: name?.trim() || profile.name,
    printSize,
    printOrientation,
    customWidthMm,
    customHeightMm,
    printDpi: clampStickerPrintDpi(state.printDpi ?? profile.printDpi),
    stickerDesign: normalizeStickerDesignSettings({
      ...profile.stickerDesign,
      ...(state.stickerDesign ?? {}),
    }),
    visualLayout: {
      useVisualLayout: state.useVisualLayout ?? profile.visualLayout.useVisualLayout,
      layouts,
    },
  })
}

/** @param {unknown} raw */
export function normalizeStickerDesignProfile(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const printSize = STICKER_PRINT_SIZES.some((s) => s.id === data.printSize)
    ? data.printSize
    : getStickerPrintSize()
  const printOrientation = STICKER_PRINT_ORIENTATIONS.some((o) => o.id === data.printOrientation)
    ? data.printOrientation
    : 'landscape'
  const customWidthMm = clampLabelMm(data.customWidthMm)
  const customHeightMm = clampLabelMm(data.customHeightMm)
  const visualRaw = data.visualLayout && typeof data.visualLayout === 'object' ? data.visualLayout : {}
  return {
    version: Number(data.version) || STICKER_DESIGN_PROFILE_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : undefined,
    printSize,
    printOrientation,
    customWidthMm,
    customHeightMm,
    printDpi: clampStickerPrintDpi(data.printDpi),
    stickerDesign: normalizeStickerDesignSettings(data.stickerDesign),
    visualLayout: {
      useVisualLayout: Boolean(visualRaw.useVisualLayout),
      layouts:
        visualRaw.layouts && typeof visualRaw.layouts === 'object' ? visualRaw.layouts : {},
    },
  }
}

/** @param {string} text */
export function parseStickerDesignProfileJson(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Formato de diseño no reconocido.')
  }
  if (parsed.version != null && Number(parsed.version) > STICKER_DESIGN_PROFILE_VERSION) {
    throw new Error('Este archivo fue exportado con una versión más nueva del portal.')
  }
  return normalizeStickerDesignProfile(parsed)
}

/** Persiste el perfil en localStorage y devuelve el estado aplicado para la UI. */
export function applyStickerDesignProfile(profile) {
  const normalized = normalizeStickerDesignProfile(profile)
  setStickerPrintSize(normalized.printSize)
  setStickerPrintOrientation(normalized.printOrientation)
  setStickerPrintCustomSize(normalized.customWidthMm, normalized.customHeightMm)
  setStickerPrintDpi(normalized.printDpi)
  const stickerDesign = setStickerDesignSettings(normalized.stickerDesign)
  applyVisualLayoutStore(normalized.visualLayout)
  setUseVisualLayout(normalized.visualLayout.useVisualLayout)
  const dims = resolveLabelDimensionsMm(normalized.printSize, normalized.printOrientation, {
    widthMm: normalized.customWidthMm,
    heightMm: normalized.customHeightMm,
  })
  const visualLayout = getVisualLayoutForLabel(
    dims.widthMm,
    dims.heightMm,
    normalized.printOrientation,
  )
  return {
    printSize: normalized.printSize,
    printOrientation: normalized.printOrientation,
    customWidthMm: normalized.customWidthMm,
    customHeightMm: normalized.customHeightMm,
    printDpi: normalized.printDpi,
    stickerDesign,
    visualLayout,
    useVisualLayout: getUseVisualLayout(),
    profileName: normalized.name,
  }
}

/** @param {StickerDesignProfile} profile @param {string} [filename] */
export function downloadStickerDesignProfile(profile, filename) {
  const normalized = normalizeStickerDesignProfile(profile)
  const safeName = (normalized.name || 'diseno-etiqueta-biesse')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 48)
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(normalized, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename || `${safeName}_${date}${STICKER_DESIGN_PROFILE_EXTENSION}`
  anchor.click()
  URL.revokeObjectURL(url)
}

/** @param {File} file */
export async function readStickerDesignProfileFile(file) {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo.')
  }
  const text = await file.text()
  return parseStickerDesignProfileJson(text)
}
