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
import { LAYOUT_ELEMENT_META } from './stickerVisualLayout.js'

const DEFAULT_ZPL_DPI = 203

export const STICKER_ZPL_LAYOUT_VERSION = 9
export const STICKER_ZPL_VISUAL_LAYOUT_VERSION = 10

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
      const mag = Math.round((sizeMm / 25.4) * resolvedDpi / modules)
      return Math.max(3, Math.min(8, mag))
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

function textBlock(lines, u, x, y, width, maxLines, heightMm, text, justify = 'L') {
  const gap = u.fbLineGap(heightMm)
  lines.push(
    `^FO${x},${y}^FB${width},${maxLines},${gap},${justify},0${u.text(heightMm)}^FD${zplEscape(text)}^FS`,
  )
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
    cantidad,
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
  lines.push(`^FO${rightX},${infoY}${u.text(4)}^FD${numeroPieza} / ${cantidad}^FS`)

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
    cantidad,
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
  lines.push(`^FO${pad},${infoY}${u.text(3.8)}^FD${numeroPieza} / ${cantidad}^FS`)
  infoY = reserveRow(u, infoY, 3.8, 0.45)
  lines.push(`^FO${pad},${infoY}${u.text(3)}^FD${zplEscape(pCode)}^FS`)

  const footY = LL - u.mmToDots(3)
  lines.push(`^FO${pad},${footY}${u.text(3)}^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

/**
 * @param {import('./stickerVisualLayout.js').StickerVisualLayout} visualLayout
 */
function buildVisualLayoutZpl(ctx, visualLayout) {
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
    cantidad,
    pCode,
    dateStr,
  } = ctx

  const elements = visualLayout?.elements ?? {}
  const pad = u.mmToDots(0.5)

  const lines = [
    '^XA',
    `^FX Biesse layout visual v${STICKER_ZPL_VISUAL_LAYOUT_VERSION} ${u.dpi}dpi`,
    '^MMT',
    '^PON',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
  ]

  function el(id) {
    return elements[id]
  }

  function fontHm(id) {
    const meta = LAYOUT_ELEMENT_META[id]
    return el(id)?.fontHm ?? meta?.defaultFontHm ?? 4
  }

  const headerEl = el('header')
  if (headerEl) {
    textBlock(
      lines,
      u,
      u.mmToDots(headerEl.xMm),
      u.mmToDots(headerEl.yMm),
      u.mmToDots(headerEl.wMm),
      2,
      fontHm('header'),
      headerTitle,
    )
  }

  const bookingEl = el('booking')
  if (bookingEl && booking) {
    textBlock(
      lines,
      u,
      u.mmToDots(bookingEl.xMm),
      u.mmToDots(bookingEl.yMm),
      u.mmToDots(bookingEl.wMm),
      1,
      fontHm('booking'),
      booking,
    )
  }

  const materialEl = el('material')
  if (materialEl) {
    textBlock(
      lines,
      u,
      u.mmToDots(materialEl.xMm),
      u.mmToDots(materialEl.yMm),
      u.mmToDots(materialEl.wMm),
      1,
      fontHm('material'),
      matLine,
    )
  }

  const subdescEl = el('subdesc')
  if (subdescEl && subDesc) {
    textBlock(
      lines,
      u,
      u.mmToDots(subdescEl.xMm),
      u.mmToDots(subdescEl.yMm),
      u.mmToDots(subdescEl.wMm),
      1,
      fontHm('subdesc'),
      subDesc,
    )
  }

  const refEl = el('ref')
  if (refEl) {
    lines.push(
      `^FO${u.mmToDots(refEl.xMm)},${u.mmToDots(refEl.yMm)}${u.text(fontHm('ref'))}^FD${zplEscape(refLine)}^FS`,
    )
  }

  const diagramEl = el('diagram')
  if (diagramEl) {
    const pieceBoxW = u.mmToDots(Math.max(12, diagramEl.wMm))
    const pieceBoxH = u.mmToDots(Math.max(10, diagramEl.hMm))
    const shapeX = u.mmToDots(diagramEl.xMm)
    const shapeY = u.mmToDots(diagramEl.yMm)
    const leftX = Math.max(pad, shapeX - u.mmToDots(7))
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
  }

  const qrEl = el('qr')
  if (qrEl) {
    const qrSize = Math.min(qrEl.wMm, qrEl.hMm)
    const qrMag = u.qrMag(qrSize)
    const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
    lines.push(
      `^FO${u.mmToDots(qrEl.xMm)},${u.mmToDots(qrEl.yMm)}^BQN,2,${qrMag}^FDQA,${qrPayload}^FS`,
    )
  }

  const dimsEl = el('dims')
  if (dimsEl) {
    const lineHm = fontHm('dims')
    let infoY = u.mmToDots(dimsEl.yMm)
    const infoX = u.mmToDots(dimsEl.xMm)
    lines.push(`^FO${infoX},${infoY}${u.text(lineHm)}^FDL: ${L != null ? L : '—'}^FS`)
    infoY = reserveRow(u, infoY, lineHm, 0.55)
    lines.push(`^FO${infoX},${infoY}${u.text(lineHm)}^FDA: ${A != null ? A : '—'}^FS`)
    infoY = reserveRow(u, infoY, lineHm, 0.55)
    lines.push(`^FO${infoX},${infoY}${u.text(lineHm * 0.95)}^FD${numeroPieza} / ${cantidad}^FS`)
  }

  const footLeftEl = el('footerLeft')
  if (footLeftEl) {
    lines.push(
      `^FO${u.mmToDots(footLeftEl.xMm)},${u.mmToDots(footLeftEl.yMm)}${u.text(fontHm('footerLeft'))}^FD${zplEscape(pCode)}^FS`,
    )
  }

  const footRightEl = el('footerRight')
  if (footRightEl) {
    lines.push(
      `^FO${u.mmToDots(footRightEl.xMm)},${u.mmToDots(footRightEl.yMm)}${u.text(fontHm('footerRight'))}^FD${zplEscape(dateStr)}^FS`,
    )
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
  const { pw: PW, ll: LL } = labelDotsForSize(labelSize, orientation, resolvedDpi, customLabelMm)
  const pieceBoxW = u.mmToDots(PIECE_FRAME_W_MM)
  const pieceBoxH = u.mmToDots(PIECE_FRAME_H_MM)
  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const isPortrait = orientation === 'portrait'
  const headerTitle = zplTrunc(String(orderName ?? '').toUpperCase(), isPortrait ? 28 : 48)
  const booking = bookingCode ? zplTrunc(String(bookingCode).trim(), isPortrait ? 24 : 36) : ''
  const matLine = zplTrunc(
    String(part?.material ?? '').trim().toUpperCase() || '—',
    isPortrait ? 28 : 40,
  )
  const subDesc = zplTrunc(part?.descripcion1 ?? '', isPortrait ? 28 : 40)
  const refLine = partNumber != null && partNumber !== '' ? String(partNumber) : '0'
  const centerLabel = zplTrunc(String(part?.descripcion ?? '—').trim(), 28)
  const upLabel = zplTrunc(part?.matedgeup ?? '', 18)
  const loLabel = zplTrunc(part?.matedgelo ?? '', 18)
  const leftLabel = zplTrunc(part?.matedgel ?? '', 12)
  const rightLabel = zplTrunc(part?.matedger ?? '', 12)
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
    cantidad,
    pCode,
    dateStr,
  }

  if (useVisualLayout && visualLayout?.elements) {
    return buildVisualLayoutZpl(ctx, visualLayout)
  }

  return isPortrait ? buildPortraitZpl(ctx) : buildLandscapeZpl(ctx)
}

export {
  PIECE_FRAME_W_MM,
  PIECE_FRAME_H_MM,
  DEFAULT_ZPL_DPI as ZPL_DPI,
  DEFAULT_STICKER_DESIGN,
}
