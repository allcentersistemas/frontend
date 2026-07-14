/** Ajustes de diseño de etiqueta ZPL (persistidos en localStorage). */

export const STICKER_DESIGN_SETTINGS_KEY = 'biesse-sticker-design-settings'

/** @typedef {object} StickerDesignSettings
 * @property {number} fontScale Multiplicador del alto de fuente (1 = estándar).
 * @property {number} charWidthRatio Ancho/carácter vs alto (0.38–0.55). Más bajo = trazo más fino.
 * @property {number} qrSizeMm Tamaño del QR en mm.
 * @property {number} qrTextGapMm Espacio entre QR y texto L/A.
 * @property {number} edgeBandMm Altura reservada arriba/abajo del rectángulo para cantos (mm).
 */

export const DEFAULT_STICKER_DESIGN = {
  fontScale: 1,
  charWidthRatio: 0.44,
  qrSizeMm: 19,
  qrTextGapMm: 1.2,
  edgeBandMm: 4,
}

/** @param {unknown} value @param {number} min @param {number} max @param {number} fallback */
function clampNum(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100))
}

/** @param {Partial<StickerDesignSettings>|null|undefined} raw */
export function normalizeStickerDesignSettings(raw) {
  const d = raw && typeof raw === 'object' ? raw : {}
  return {
    fontScale: clampNum(d.fontScale, 0.75, 1.35, DEFAULT_STICKER_DESIGN.fontScale),
    charWidthRatio: clampNum(d.charWidthRatio, 0.36, 0.55, DEFAULT_STICKER_DESIGN.charWidthRatio),
    qrSizeMm: clampNum(d.qrSizeMm, 14, 28, DEFAULT_STICKER_DESIGN.qrSizeMm),
    qrTextGapMm: clampNum(d.qrTextGapMm, 0.5, 3, DEFAULT_STICKER_DESIGN.qrTextGapMm),
    edgeBandMm: clampNum(d.edgeBandMm, 2.5, 6, DEFAULT_STICKER_DESIGN.edgeBandMm),
  }
}

/** @returns {StickerDesignSettings} */
export function getStickerDesignSettings() {
  try {
    const raw = localStorage.getItem(STICKER_DESIGN_SETTINGS_KEY)
    if (raw) return normalizeStickerDesignSettings(JSON.parse(raw))
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_STICKER_DESIGN }
}

/** @param {Partial<StickerDesignSettings>} patch */
export function setStickerDesignSettings(patch) {
  const next = normalizeStickerDesignSettings({ ...getStickerDesignSettings(), ...patch })
  try {
    localStorage.setItem(STICKER_DESIGN_SETTINGS_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function resetStickerDesignSettings() {
  try {
    localStorage.removeItem(STICKER_DESIGN_SETTINGS_KEY)
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_STICKER_DESIGN }
}
