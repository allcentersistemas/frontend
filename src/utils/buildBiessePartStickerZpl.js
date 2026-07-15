/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 / ZD420).
 * Tipografía en mm, diseño configurable, zonas fijas para cantos.
 */

import { resolveLabelDimensionsMm } from './stickerPrintSize.js'
import { clampStickerPrintDpi } from './stickerPrintDpi.js'
import {
  DEFAULT_STICKER_DESIGN,
  getStickerDesignSettings,
  normalizeStickerDesignSettings,
} from './stickerDesignSettings.js'
import { LAYOUT_FIELD_CATALOG, normalizeVisualLayoutForPrint } from './stickerVisualLayout.js'
import { resolveStickerPieceCounts } from './stickerPieceInfo.js'

const DEFAULT_ZPL_DPI = 203

export const STICKER_ZPL_LAYOUT_VERSION = 9
export const STICKER_ZPL_VISUAL_LAYOUT_VERSION = 13

/** @typedef {'label_80x50' | 'label_100x50' | 'label_60x40' | 'label_custom'} ZebraLabelSizeId */

export { ZEBRA_LABEL_SIZES } from './stickerPrintSize.js'

const PIECE_FRAME_W_MM = 40
const PIECE_FRAME_H_MM = 22

/** @param {number} dpi */
function createMmToDots(dpi) {
  return (mm) => Math.round((mm / 25.4) * dpi)
}

/**
 * @param {number} dpi
 * @param {import('./stickerDesignSettings.js').StickerDesignSettings} design
 */
function createZplUnits(dpi, design) {
  const resolvedDpi = clampStickerPrintDpi(dpi)
  const mmToDots = createMmToDots(resolvedDpi)
  const widthRatio = design.charWidthRatio

  return {
    dpi: resolvedDpi,
    design,
    mmToDots,
    scaleHm(heightMm) {
      return heightMm * design.fontScale
    },
    text(heightMm) {
      const h = heightMm * design.fontScale
      const w = Math.max(1, h * widthRatio)
      return `^A0N,${mmToDots(h)},${mmToDots(w)}`
    },
    fbLineGap(heightMm) {
      const h = heightMm * design.fontScale
      return mmToDots(Math.max(0.45, h * 0.2))
    },
    rowAdvance(heightMm, gapMm = 0.65) {
      return mmToDots(heightMm * design.fontScale + gapMm)
    },
    qrMag(sizeMm = design.qrSizeMm) {
      const modules = 33
      const targetDots = mmToDots(sizeMm)
      const mag = Math.round(targetDots / modules)
      return Math.max(1, Math.min(15, mag))
    },
  }
}

/** @param {string|null|undefined} text */
export function zplEscape(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\^/g, '\\^')
    .replace(/~/g, '\\~')
    .replace(/_/g, '\\_')
}

/** @param {string|null|undefined} text @param {number} maxLen */
export function zplTrunc(text, maxLen) {
  const s = String(text ?? '').trim()
  if (s.length <= maxLen) return s
  return `${s.slice(0, Math.max(0, maxLen - 1))}.`
}

function roundDim(v) {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  if (Number.isNaN(n)) return null
  return Math.round(n)
}

function formatStickerDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const safe = Number.isNaN(d.getTime()) ? new Date() : d
  const mm = String(safe.getMonth() + 1).padStart(2, '0')
  const dd = String(safe.getDate()).padStart(2, '0')
  const yy = String(safe.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

/** Textos de etiqueta; en diseño visual no recorta agresivamente (el cuadro ^FB hace el ajuste). */
function buildStickerTextFields({
  orderName,
  bookingCode,
  part,
  piece,
  orientation,
  useVisualLayout,
}) {
  const isPortrait = orientation === 'portrait'
  const visualCap = 200
  const cap = (text, autoMax, visualMax = visualCap) =>
    zplTrunc(text, useVisualLayout ? visualMax : autoMax)

  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const { numeroPieza, totalPiezas, fractionText } = resolveStickerPieceCounts(part, piece)

  return {
    headerTitle: cap(String(orderName ?? '').toUpperCase(), isPortrait ? 28 : 48),
    booking: bookingCode ? cap(String(bookingCode).trim(), isPortrait ? 24 : 36) : '',
    matLine: cap(String(part?.material ?? '').trim().toUpperCase() || '—', isPortrait ? 28 : 40),
    subDesc: cap(part?.descripcion1 ?? '', isPortrait ? 28 : 40),
    refLine: fractionText,
    centerLabel: cap(String(part?.descripcion ?? '—').trim(), 28, 80),
    upLabel: cap(part?.matedgeup ?? '', 18, 40),
    loLabel: cap(part?.matedgelo ?? '', 18, 40),
    leftLabel: cap(part?.matedgel ?? '', 12, 24),
    rightLabel: cap(part?.matedger ?? '', 12, 24),
    numeroPieza,
    totalPiezas,
    fractionText,
    partNumber,
  }
}

/**
 * @param {ZebraLabelSizeId | string} [labelSize]
 * @param {'landscape'|'portrait'} [orientation]
 * @param {number} [dpi]
 * @param {{ widthMm?: number, heightMm?: number }|null} [customMm]
 */
export function labelDotsForSize(
  labelSize = 'label_80x50',
  orientation = 'landscape',
  dpi = DEFAULT_ZPL_DPI,
  customMm = null,
) {
  const resolvedDpi = clampStickerPrintDpi(dpi)
  const mmToDots = createMmToDots(resolvedDpi)
  const { widthMm, heightMm } = resolveLabelDimensionsMm(labelSize, orientation, customMm)
  return {
    pw: mmToDots(widthMm),
    ll: mmToDots(heightMm),
    wMm: widthMm,
    hMm: heightMm,
    dpi: resolvedDpi,
  }
}

function textBlock(lines, u, x, y, width, maxLines, heightMm, text, justify = 'L', charWidthRatio) {
  const gap = u.fbLineGap(heightMm)
  const h = heightMm * u.design.fontScale
  const ratio = charWidthRatio ?? u.design.charWidthRatio
  const w = Math.max(1, h * ratio)
  const fontCmd = `^A0N,${u.mmToDots(h)},${u.mmToDots(w)}`
  lines.push(
    `^FO${x},${y}^FB${width},${maxLines},${gap},${justify},0${fontCmd}^FD${zplEscape(text)}^FS`,
  )
}

/** @param {import('./stickerVisualLayout.js').LayoutElement} el */
function effectiveLineGapMm(u, el) {
  const heightMm = (el.fontHm ?? 4) * (el.fontScale ?? 1) * u.design.fontScale
  if (el.lineGapMm != null && Number.isFinite(el.lineGapMm)) {
    return Math.max(0.1, el.lineGapMm)
  }
  return Math.max(0.35, heightMm * 0.2)
}

/** @param {import('./stickerVisualLayout.js').LayoutElement} el */
function effectiveMaxLines(u, el) {
  const heightMm = (el.fontHm ?? 4) * (el.fontScale ?? 1) * u.design.fontScale
  const gapMm = effectiveLineGapMm(u, el)
  const fromBox = Math.max(1, Math.floor(el.hMm / Math.max(0.5, heightMm + gapMm * 0.85)))
  const configured = el.maxLines ?? 0
  if (configured <= 0) return fromBox
  return Math.max(configured, fromBox)
}

/** @param {import('./stickerVisualLayout.js').LayoutElement} el */
function zplRotationLetter(el) {
  const deg = el.rotationDeg ?? 0
  if (deg === 90) return 'R'
  if (deg === 180) return 'I'
  if (deg === 270) return 'B'
  return 'N'
}

/** @param {import('./stickerVisualLayout.js').LayoutElement} el */
function elementFontCmd(u, el) {
  const globalScale = u.design.fontScale
  const elScale = el.fontScale ?? 1
  const h = (el.fontHm ?? 4) * globalScale * elScale
  const ratio = Math.min(0.7, Math.max(0.3, el.charWidthRatio ?? u.design.charWidthRatio))
  const w = Math.max(1, h * ratio)
  const rot = zplRotationLetter(el)
  return `^A0${rot},${u.mmToDots(h)},${u.mmToDots(w)}`
}

/** @param {import('./stickerVisualLayout.js').LayoutElement} el */
function visualTextBlock(lines, u, el, text) {
  const content = String(text ?? '')
  if (!content.trim()) return
  const justify = el.justify ?? 'L'
  const maxLines = effectiveMaxLines(u, el)
  const gapMm = effectiveLineGapMm(u, el)
  const x = u.mmToDots(el.xMm)
  const y = u.mmToDots(el.yMm)
  const w = u.mmToDots(el.wMm)
  const gap = u.mmToDots(gapMm)
  const fontCmd = elementFontCmd(u, el)
  lines.push(`^FO${x},${y}^FB${w},${maxLines},${gap},${justify},0${fontCmd}^FD${zplEscape(content)}^FS`)
}

/** Tamaño QR en puntos según mm del elemento (sin límite bajo de mag 3). */
function qrMagForElementMm(u, sizeMm) {
  const modules = 33
  const targetDots = u.mmToDots(sizeMm)
  return Math.max(1, Math.min(15, Math.round(targetDots / modules)))
}

/** Reserva hueco vertical aunque el texto esté vacío (layout estable). */
function reserveRow(u, y, slotHm, gapMm = 0.65) {
  return y + u.rowAdvance(slotHm, gapMm)
}

function drawPieceDiagram(lines, u, {
  pieceBoxW,
  pieceBoxH,
  leftX,
  shapeX,
  shapeY,
  centerLabel,
  upLabel,
  loLabel,
  leftLabel,
  rightLabel,
  edgeHm = 3.4,
  centerHm = 3.6,
}) {
  const edgeBand = u.mmToDots(u.design.edgeBandMm)
  const edgeH = u.mmToDots(u.scaleHm(edgeHm))
  const edgeW = u.mmToDots(Math.max(1, u.scaleHm(edgeHm) * u.design.charWidthRatio))
  const centerH = u.mmToDots(u.scaleHm(centerHm))

  if (upLabel) {
    const upX = shapeX + Math.max(0, Math.round((pieceBoxW - upLabel.length * edgeW * 0.62) / 2))
    const upY = shapeY - edgeH - u.mmToDots(0.4)
    lines.push(`^FO${upX},${upY}${u.text(edgeHm)}^FD${zplEscape(upLabel)}^FS`)
  }

  lines.push(`^FO${shapeX},${shapeY}^GB${pieceBoxW},${pieceBoxH},2,B^FS`)
  const textY = shapeY + Math.max(u.mmToDots(0.4), Math.round((pieceBoxH - centerH) / 2))
  const gap = u.fbLineGap(centerHm)
  lines.push(
    `^FO${shapeX + u.mmToDots(0.5)},${textY}^FB${pieceBoxW - u.mmToDots(1)},2,${gap},C,0${u.text(centerHm)}^FD${zplEscape(centerLabel)}^FS`,
  )

  const midY = shapeY + Math.round(pieceBoxH / 2) - Math.round(edgeH / 2)
  if (leftLabel) {
    lines.push(`^FO${leftX},${midY}${u.text(edgeHm)}^FD${zplEscape(leftLabel)}^FS`)
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + pieceBoxW + u.mmToDots(0.8)},${midY}${u.text(edgeHm)}^FD${zplEscape(rightLabel)}^FS`,
    )
  }

  if (loLabel) {
    const loX = shapeX + Math.max(0, Math.round((pieceBoxW - loLabel.length * edgeW * 0.62) / 2))
    const loY = shapeY + pieceBoxH + Math.max(u.mmToDots(0.4), Math.round((edgeBand - edgeH) / 2))
    lines.push(`^FO${loX},${loY}${u.text(edgeHm)}^FD${zplEscape(loLabel)}^FS`)
  }
}

/** Bloque de texto izquierdo con filas de altura fija (con o sin booking / descripción). */
function layoutLandscapeTextColumn(lines, u, leftX, textColW, pad, data) {
  let y = pad
  const { headerTitle, booking, matLine, subDesc, refLine } = data

  textBlock(lines, u, leftX, y, textColW, 2, 5.4, headerTitle)
  y = reserveRow(u, y, 5.4, 0.75)
  y = reserveRow(u, y, 5.4, 0.75)

  if (booking) {
    textBlock(lines, u, leftX, y, textColW, 1, 3.6, booking)
  }
  y = reserveRow(u, y, 3.6, 0.65)

  textBlock(lines, u, leftX, y, textColW, 1, 4.2, matLine)
  y = reserveRow(u, y, 4.2, 0.65)

  if (subDesc) {
    textBlock(lines, u, leftX, y, textColW, 1, 3.2, subDesc)
  }
  y = reserveRow(u, y, 3.2, 0.65)

  lines.push(`^FO${leftX},${y}${u.text(4.2)}^FD${zplEscape(refLine)}^FS`)
  y = reserveRow(u, y, 4.2, 0.45)

  return y + u.mmToDots(u.design.edgeBandMm)
}

function buildLandscapeZpl(ctx) {
  const {
    u,
    pieceBoxW,
    pieceBoxH,
    PW,
    LL,
    scanCode,
    headerTitle,
    booking,
    matLine,
    subDesc,
    refLine,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    L,
    A,
    numeroPieza,
    totalPiezas,
    fractionText,
    pCode,
    dateStr,
  } = ctx

  const pad = u.mmToDots(1)
  const qrSize = u.design.qrSizeMm
  const rightColW = u.mmToDots(qrSize + 5)
  const leftX = pad
  const rightX = PW - pad - rightColW
  const textColW = Math.max(u.mmToDots(28), rightX - leftX - u.mmToDots(1))
  const shapeX = leftX + u.mmToDots(14)

  const lines = [
    '^XA',
    `^FX Biesse layout v${STICKER_ZPL_LAYOUT_VERSION} ${u.dpi}dpi`,
    '^MMT',
    '^PON',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
  ]

  const shapeY = layoutLandscapeTextColumn(lines, u, leftX, textColW, pad, {
    headerTitle,
    booking,
    matLine,
    subDesc,
    refLine,
  })

  drawPieceDiagram(lines, u, {
    pieceBoxW,
    pieceBoxH,
    leftX,
    shapeX,
    shapeY,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
  })

  const qrY = pad
  const qrMag = u.qrMag(qrSize)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${rightX},${qrY}^BQN,2,${qrMag}^FDQA,${qrPayload}^FS`)

  let infoY = qrY + u.mmToDots(qrSize + u.design.qrTextGapMm)
  lines.push(`^FO${rightX},${infoY}${u.text(4.2)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY = reserveRow(u, infoY, 4.2, 0.55)
  lines.push(`^FO${rightX},${infoY}${u.text(4.2)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY = reserveRow(u, infoY, 4.2, 0.55)
  lines.push(`^FO${rightX},${infoY}${u.text(4)}^FD${fractionText}^FS`)

  const footY = LL - u.mmToDots(3.4)
  lines.push(`^FO${leftX},${footY}${u.text(3.2)}^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${rightX},${footY}${u.text(3.2)}^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

function layoutPortraitTextColumn(lines, u, pad, textColW, data) {
  let y = pad
  const { headerTitle, booking, matLine, subDesc, refLine } = data

  textBlock(lines, u, pad, y, textColW, 2, 4.4, headerTitle)
  y = reserveRow(u, y, 4.4, 0.65)
  y = reserveRow(u, y, 4.4, 0.65)

  if (booking) {
    textBlock(lines, u, pad, y, textColW, 1, 3.2, booking)
  }
  y = reserveRow(u, y, 3.2, 0.55)

  textBlock(lines, u, pad, y, textColW, 1, 3.8, matLine)
  y = reserveRow(u, y, 3.8, 0.55)

  if (subDesc) {
    textBlock(lines, u, pad, y, textColW, 1, 3, subDesc)
  }
  y = reserveRow(u, y, 3, 0.55)

  lines.push(`^FO${pad},${y}${u.text(3.8)}^FD${zplEscape(refLine)}^FS`)
  y = reserveRow(u, y, 3.8, 0.45)

  return y + u.mmToDots(u.design.edgeBandMm)
}

function buildPortraitZpl(ctx) {
  const {
    u,
    pieceBoxW,
    pieceBoxH,
    PW,
    LL,
    scanCode,
    headerTitle,
    booking,
    matLine,
    subDesc,
    refLine,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    L,
    A,
    numeroPieza,
    totalPiezas,
    fractionText,
    pCode,
    dateStr,
  } = ctx

  const pad = u.mmToDots(1)
  const qrSize = u.design.qrSizeMm
  const textColW = Math.max(u.mmToDots(22), PW - pad * 2)

  const lines = [
    '^XA',
    `^FX Biesse layout v${STICKER_ZPL_LAYOUT_VERSION} ${u.dpi}dpi`,
    '^MMT',
    '^PON',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
  ]

  const shapeY = layoutPortraitTextColumn(lines, u, pad, textColW, {
    headerTitle,
    booking,
    matLine,
    subDesc,
    refLine,
  })

  const shapeX = Math.max(pad + u.mmToDots(11), Math.round((PW - pieceBoxW) / 2))
  drawPieceDiagram(lines, u, {
    pieceBoxW,
    pieceBoxH,
    leftX: pad,
    shapeX,
    shapeY,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    edgeHm: 3.2,
    centerHm: 3.4,
  })

  const diagramEndY = shapeY + pieceBoxH + u.mmToDots(u.design.edgeBandMm)
  const qrY = diagramEndY + u.mmToDots(0.8)
  const qrX = PW - pad - u.mmToDots(qrSize)
  const qrMag = u.qrMag(qrSize)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,${qrMag}^FDQA,${qrPayload}^FS`)

  let infoY = qrY
  lines.push(`^FO${pad},${infoY}${u.text(4)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY = reserveRow(u, infoY, 4, 0.55)
  lines.push(`^FO${pad},${infoY}${u.text(4)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY = reserveRow(u, infoY, 4, 0.55)
  lines.push(`^FO${pad},${infoY}${u.text(3.8)}^FD${fractionText}^FS`)
  infoY = reserveRow(u, infoY, 3.8, 0.45)
  lines.push(`^FO${pad},${infoY}${u.text(3)}^FD${zplEscape(pCode)}^FS`)

  const footY = LL - u.mmToDots(3)
  lines.push(`^FO${pad},${footY}${u.text(3)}^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

/**
 * @param {import('./stickerVisualLayout.js').StickerVisualLayout} visualLayout
 * @param {{ widthMm: number, heightMm: number }} labelMm
 */
function buildVisualLayoutZpl(ctx, visualLayout, labelMm) {
  const {
    u,
    PW,
    LL,
    scanCode,
    headerTitle,
    booking,
    matLine,
    subDesc,
    refLine,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    L,
    A,
    numeroPieza,
    totalPiezas,
    fractionText,
    pCode,
    dateStr,
  } = ctx

  const layout = normalizeVisualLayoutForPrint(
    visualLayout,
    labelMm.widthMm,
    labelMm.heightMm,
    visualLayout.orientation ?? 'landscape',
  )
  const elements = layout?.elements ?? {}
  const pad = u.mmToDots(0.5)

  const lines = [
    '^XA',
    `^FX Biesse layout visual v${STICKER_ZPL_VISUAL_LAYOUT_VERSION} ${u.dpi}dpi ${labelMm.widthMm}x${labelMm.heightMm}mm`,
    '^MMT',
    '^PON',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
  ]

  /** @param {import('./stickerVisualLayout.js').LayoutElement} el @param {string} partValue */
  function resolveFieldContent(el, partValue) {
    const prefix = el.prefix ?? ''
    const source = el.contentSource ?? 'auto'
    if (source === 'dimensionL') {
      return `${prefix}${L != null ? L : '—'}`
    }
    if (source === 'dimensionA') {
      return `${prefix}${A != null ? A : '—'}`
    }
    if (source === 'custom') {
      return String(el.customText ?? '').trim()
    }
    const custom = String(el.customText ?? '').trim()
    if (custom) return custom
    return partValue ?? ''
  }

  /** @param {string} id @param {import('./stickerVisualLayout.js').LayoutElement} el */
  function resolveElementText(id, el) {
    const fieldKey = el.fieldKey ?? id
    if (fieldKey === 'customText') {
      return el.customText ?? ''
    }
    const prefix = el.prefix ?? ''
    switch (fieldKey) {
      case 'headerTitle':
        return headerTitle
      case 'booking':
        return booking
      case 'material':
        return matLine
      case 'subdesc':
        return subDesc
      case 'refLine':
        return refLine
      case 'pieceCenter':
        return resolveFieldContent(el, centerLabel)
      case 'edgeUp':
        return resolveFieldContent(el, upLabel)
      case 'edgeLo':
        return resolveFieldContent(el, loLabel)
      case 'edgeLeft':
        return resolveFieldContent(el, leftLabel)
      case 'edgeRight':
        return resolveFieldContent(el, rightLabel)
      case 'dimLongitud':
      case 'dimsL':
        return `${prefix}${L != null ? L : '—'}`
      case 'dimAncho':
      case 'dimsA':
        return `${prefix}${A != null ? A : '—'}`
      case 'fraction':
        return fractionText
      case 'footerLeft':
        return pCode
      case 'footerRight':
        return dateStr
      default:
        return ''
    }
  }

  for (const [id, el] of Object.entries(elements)) {
    if (el.enabled === false) continue
    const fieldKey = el.fieldKey ?? id
    const meta = LAYOUT_FIELD_CATALOG[fieldKey]

    if (meta?.type === 'qr' || fieldKey === 'qr') {
      const qrSizeMm = Math.min(el.wMm, el.hMm)
      const qrMag = qrMagForElementMm(u, qrSizeMm)
      const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
      lines.push(
        `^FO${u.mmToDots(el.xMm)},${u.mmToDots(el.yMm)}^BQN,2,${qrMag}^FDQA,${qrPayload}^FS`,
      )
      continue
    }

    if (meta?.type === 'frame' || fieldKey === 'pieceFrame') {
      const frameW = u.mmToDots(Math.max(8, el.wMm))
      const frameH = u.mmToDots(Math.max(8, el.hMm))
      lines.push(
        `^FO${u.mmToDots(el.xMm)},${u.mmToDots(el.yMm)}^GB${frameW},${frameH},2,B^FS`,
      )
      continue
    }

    if (meta?.type === 'diagram' || fieldKey === 'diagram') {
      const pieceBoxW = u.mmToDots(Math.max(12, el.wMm))
      const pieceBoxH = u.mmToDots(Math.max(10, el.hMm))
      const shapeX = u.mmToDots(el.xMm)
      const shapeY = u.mmToDots(el.yMm)
      const leftX = Math.max(pad, shapeX - u.mmToDots(7))
      const edgeHm = el.fontHm ? Math.min(el.fontHm, 4) : 3.4
      const centerHm = el.fontHm ?? 3.6
      drawPieceDiagram(lines, u, {
        pieceBoxW,
        pieceBoxH,
        leftX,
        shapeX,
        shapeY,
        centerLabel,
        upLabel,
        loLabel,
        leftLabel,
        rightLabel,
        edgeHm,
        centerHm,
      })
      continue
    }

    if (meta?.type === 'text' || !meta) {
      const text = resolveElementText(id, el)
      if (!text && meta?.optional) continue
      visualTextBlock(lines, u, el, text)
    }
  }

  lines.push('^XZ')
  return lines.join('\n')
}

/**
 * @param {object} opts
 * @param {import('./stickerDesignSettings.js').StickerDesignSettings} [opts.design]
 * @param {import('./stickerVisualLayout.js').StickerVisualLayout|null} [opts.visualLayout]
 * @param {boolean} [opts.useVisualLayout]
 */
export function buildBiessePartStickerZpl({
  scanCode,
  orderName,
  bookingCode,
  part,
  piece,
  printedAt = new Date(),
  orientation = 'landscape',
  labelSize = 'label_80x50',
  dpi = DEFAULT_ZPL_DPI,
  customLabelMm = null,
  design = getStickerDesignSettings(),
  visualLayout = null,
  useVisualLayout = false,
}) {
  const resolvedDesign = normalizeStickerDesignSettings(design)
  const resolvedDpi = clampStickerPrintDpi(dpi)
  const u = createZplUnits(resolvedDpi, resolvedDesign)
  const labelDots = labelDotsForSize(labelSize, orientation, resolvedDpi, customLabelMm)
  const { pw: PW, ll: LL, wMm, hMm } = labelDots
  const pieceBoxW = u.mmToDots(PIECE_FRAME_W_MM)
  const pieceBoxH = u.mmToDots(PIECE_FRAME_H_MM)
  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const {
    headerTitle,
    booking,
    matLine,
    subDesc,
    refLine,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    numeroPieza,
    totalPiezas,
    fractionText,
  } = buildStickerTextFields({
    orderName,
    bookingCode,
    part,
    piece,
    orientation,
    useVisualLayout: Boolean(useVisualLayout && visualLayout?.elements),
  })
  const L = roundDim(part?.longitud)
  const A = roundDim(part?.ancho)
  const pCode = `P${partNumber != null && partNumber !== '' ? String(partNumber) : '0'}`
  const dateStr = formatStickerDate(printedAt)

  const ctx = {
    u,
    pieceBoxW,
    pieceBoxH,
    PW,
    LL,
    scanCode,
    headerTitle,
    booking,
    matLine,
    subDesc,
    refLine,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    L,
    A,
    numeroPieza,
    totalPiezas,
    fractionText,
    pCode,
    dateStr,
  }

  if (useVisualLayout && visualLayout?.elements) {
    const normalizedLayout = normalizeVisualLayoutForPrint(visualLayout, wMm, hMm, orientation)
    return buildVisualLayoutZpl(ctx, normalizedLayout, { widthMm: wMm, heightMm: hMm })
  }

  const isPortrait = orientation === 'portrait'
  return isPortrait ? buildPortraitZpl(ctx) : buildLandscapeZpl(ctx)
}

export {
  PIECE_FRAME_W_MM,
  PIECE_FRAME_H_MM,
  DEFAULT_ZPL_DPI as ZPL_DPI,
  DEFAULT_STICKER_DESIGN,
}
