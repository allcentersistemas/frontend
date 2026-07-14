/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 / ZD420).
 * Tipografía y QR en mm → se escalan al dpi elegido (203, 300, etc.).
 */

import { resolveLabelDimensionsMm } from './stickerPrintSize.js'
import { clampStickerPrintDpi } from './stickerPrintDpi.js'

const DEFAULT_ZPL_DPI = 203

/** Incrementar al cambiar layout; sirve para verificar que el navegador usa código nuevo. */
export const STICKER_ZPL_LAYOUT_VERSION = 7

/** @typedef {'label_80x50' | 'label_100x50' | 'label_60x40' | 'label_custom'} ZebraLabelSizeId */

export { ZEBRA_LABEL_SIZES } from './stickerPrintSize.js'

const PIECE_FRAME_W_MM = 40
const PIECE_FRAME_H_MM = 22
const QR_SIZE_MM = 23

/**
 * Ancho de carácter vs alto. 0.36 quedaba ilegible (letras pegadas).
 * ~0.50 = trazo moderado, legible y sin verse negrita.
 */
const CHAR_WIDTH_RATIO = 0.5

/** @param {number} dpi */
function createMmToDots(dpi) {
  return (mm) => Math.round((mm / 25.4) * dpi)
}

/** @param {number} dpi */
function createZplUnits(dpi) {
  const resolvedDpi = clampStickerPrintDpi(dpi)
  const mmToDots = createMmToDots(resolvedDpi)
  return {
    dpi: resolvedDpi,
    mmToDots,
    /** Tipografía legible: alto en mm, ancho proporcional con separación entre letras. */
    text(heightMm) {
      const widthMm = Math.max(1.1, heightMm * CHAR_WIDTH_RATIO)
      return `^A0N,${mmToDots(heightMm)},${mmToDots(widthMm)}`
    },
    /** Espacio extra entre líneas dentro de un ^FB (mm). */
    fbLineGap(heightMm) {
      return mmToDots(Math.max(0.5, heightMm * 0.22))
    },
    /** Salto vertical tras un renglón (mm de fuente + aire). */
    rowAdvance(heightMm, gapMm = 0.7) {
      return mmToDots(heightMm + gapMm)
    },
    /** Magnificación QR según tamaño físico deseado en mm. */
    qrMag(sizeMm = QR_SIZE_MM) {
      const mag = Math.round((sizeMm / 25.4) * resolvedDpi / 33)
      return Math.max(4, Math.min(10, mag))
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
  edgeHm = 3.6,
  centerHm = 3.8,
}) {
  const edgeH = u.mmToDots(edgeHm)
  const edgeW = u.mmToDots(Math.max(1.1, edgeHm * CHAR_WIDTH_RATIO))
  const centerH = u.mmToDots(centerHm)

  if (upLabel) {
    const upX = shapeX + Math.max(0, Math.round((pieceBoxW - upLabel.length * edgeW * 0.62) / 2))
    lines.push(`^FO${upX},${shapeY - edgeH - u.mmToDots(0.6)}${u.text(edgeHm)}^FD${zplEscape(upLabel)}^FS`)
  }

  lines.push(`^FO${shapeX},${shapeY}^GB${pieceBoxW},${pieceBoxH},2,B^FS`)
  const textY = shapeY + Math.max(u.mmToDots(0.5), Math.round((pieceBoxH - centerH) / 2))
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
    lines.push(
      `^FO${loX},${shapeY + pieceBoxH + u.mmToDots(0.6)}${u.text(edgeHm)}^FD${zplEscape(loLabel)}^FS`,
    )
  }
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
  const rightColW = u.mmToDots(28)
  const leftX = pad
  const rightX = PW - pad - rightColW
  const textColW = Math.max(u.mmToDots(30), rightX - leftX - u.mmToDots(1))
  const shapeX = leftX + u.mmToDots(14)

  let y = pad
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

  textBlock(lines, u, leftX, y, textColW, 2, 5.4, headerTitle)
  y += u.rowAdvance(5.4, 0.8)

  if (booking) {
    textBlock(lines, u, leftX, y, textColW, 1, 3.8, booking)
    y += u.rowAdvance(3.8, 0.7)
  }

  textBlock(lines, u, leftX, y, textColW, 1, 4.4, matLine)
  y += u.rowAdvance(4.4, 0.7)

  if (subDesc) {
    textBlock(lines, u, leftX, y, textColW, 1, 3.4, subDesc)
    y += u.rowAdvance(3.4, 0.7)
  }

  lines.push(`^FO${leftX},${y}${u.text(4.4)}^FD${zplEscape(refLine)}^FS`)
  y += u.rowAdvance(4.4, 0.5)

  const shapeY = y + (upLabel ? u.mmToDots(3.8) : u.mmToDots(1.8))
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
  const qrMag = u.qrMag(QR_SIZE_MM)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${rightX},${qrY}^BQN,2,${qrMag}^FDQA,${qrPayload}^FS`)

  let infoY = qrY + u.mmToDots(QR_SIZE_MM + 0.5)
  lines.push(`^FO${rightX},${infoY}${u.text(4.4)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY += u.rowAdvance(4.4, 0.6)
  lines.push(`^FO${rightX},${infoY}${u.text(4.4)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY += u.rowAdvance(4.4, 0.6)
  lines.push(`^FO${rightX},${infoY}${u.text(4.2)}^FD${numeroPieza} / ${cantidad}^FS`)

  const footY = LL - u.mmToDots(3.6)
  lines.push(`^FO${leftX},${footY}${u.text(3.4)}^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${rightX},${footY}${u.text(3.4)}^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
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
  const textColW = Math.max(u.mmToDots(24), PW - pad * 2)
  let y = pad
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

  textBlock(lines, u, pad, y, textColW, 2, 4.6, headerTitle)
  y += u.rowAdvance(4.6, 0.7)

  if (booking) {
    textBlock(lines, u, pad, y, textColW, 1, 3.4, booking)
    y += u.rowAdvance(3.4, 0.6)
  }

  textBlock(lines, u, pad, y, textColW, 1, 4, matLine)
  y += u.rowAdvance(4, 0.6)

  if (subDesc) {
    textBlock(lines, u, pad, y, textColW, 1, 3.2, subDesc)
    y += u.rowAdvance(3.2, 0.6)
  }

  lines.push(`^FO${pad},${y}${u.text(4)}^FD${zplEscape(refLine)}^FS`)
  y += u.rowAdvance(4, 0.5)

  const shapeX = Math.max(pad + u.mmToDots(12), Math.round((PW - pieceBoxW) / 2))
  const shapeY = y + (upLabel ? u.mmToDots(3.5) : u.mmToDots(1.8))
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
    edgeHm: 3.4,
    centerHm: 3.6,
  })

  const qrY = shapeY + pieceBoxH + (loLabel ? u.mmToDots(3.2) : u.mmToDots(2))
  const qrX = PW - pad - u.mmToDots(QR_SIZE_MM)
  const qrMag = u.qrMag(QR_SIZE_MM)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,${qrMag}^FDQA,${qrPayload}^FS`)

  let infoY = qrY
  lines.push(`^FO${pad},${infoY}${u.text(4.2)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY += u.rowAdvance(4.2, 0.6)
  lines.push(`^FO${pad},${infoY}${u.text(4.2)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY += u.rowAdvance(4.2, 0.6)
  lines.push(`^FO${pad},${infoY}${u.text(4)}^FD${numeroPieza} / ${cantidad}^FS`)
  infoY += u.rowAdvance(4, 0.5)
  lines.push(`^FO${pad},${infoY}${u.text(3.2)}^FD${zplEscape(pCode)}^FS`)

  const footY = LL - u.mmToDots(3.2)
  lines.push(`^FO${pad},${footY}${u.text(3.2)}^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

/**
 * @param {object} opts
 * @param {string} opts.scanCode
 * @param {string} opts.orderName
 * @param {string|null|undefined} [opts.bookingCode]
 * @param {object} opts.part
 * @param {{ numeroPieza?: number }} opts.piece
 * @param {Date} [opts.printedAt]
 * @param {'landscape'|'portrait'} [opts.orientation]
 * @param {ZebraLabelSizeId | string} [opts.labelSize]
 * @param {number} [opts.dpi]
 * @param {{ widthMm?: number, heightMm?: number }|null} [opts.customLabelMm]
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
}) {
  const resolvedDpi = clampStickerPrintDpi(dpi)
  const u = createZplUnits(resolvedDpi)
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

  return isPortrait ? buildPortraitZpl(ctx) : buildLandscapeZpl(ctx)
}

export { PIECE_FRAME_W_MM, PIECE_FRAME_H_MM, DEFAULT_ZPL_DPI as ZPL_DPI, QR_SIZE_MM }
