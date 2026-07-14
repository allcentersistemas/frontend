/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 / ZD420).
 * Estilo taller: diagrama grande con cantos, tipografía más delgada, sin línea sobre el QR.
 */

const DEFAULT_ZPL_DPI = 203

/** @typedef {'label_80x50' | 'label_100x50' | 'label_60x40'} ZebraLabelSizeId */

/** @type {Record<ZebraLabelSizeId, { wMm: number, hMm: number }>} */
export const ZEBRA_LABEL_SIZES = {
  label_80x50: { wMm: 80, hMm: 50 },
  label_100x50: { wMm: 100, hMm: 50 },
  label_60x40: { wMm: 60, hMm: 40 },
}

/**
 * Marco fijo del diagrama (mm). Mismo tamaño en todas las piezas;
 * lo bastante grande para leer los cantos alrededor.
 */
const PIECE_FRAME_W_MM = 40
const PIECE_FRAME_H_MM = 22

/** @param {number} dpi */
function createMmToDots(dpi) {
  return (mm) => Math.round((mm / 25.4) * dpi)
}

/**
 * Tipografía grande y fina: alto mayor, ancho más estrecho
 * (p. ej. 28,12 → letra alta y delgada en térmica).
 */
function font(h, w) {
  return `^A0N,${h},${w}`
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
 */
export function labelDotsForSize(labelSize = 'label_80x50', orientation = 'landscape', dpi = DEFAULT_ZPL_DPI) {
  const mmToDots = createMmToDots(dpi)
  const size = ZEBRA_LABEL_SIZES[labelSize] ?? ZEBRA_LABEL_SIZES.label_80x50
  if (orientation === 'portrait') {
    return { pw: mmToDots(size.hMm), ll: mmToDots(size.wMm), wMm: size.hMm, hMm: size.wMm, dpi }
  }
  return { pw: mmToDots(size.wMm), ll: mmToDots(size.hMm), wMm: size.wMm, hMm: size.hMm, dpi }
}

function drawPieceDiagram(lines, {
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
  edgeFontH = 20,
  edgeFontW = 10,
  centerFontH = 22,
  centerFontW = 11,
}) {
  if (upLabel) {
    const upX = shapeX + Math.max(0, Math.round((pieceBoxW - upLabel.length * edgeFontW * 0.55) / 2))
    lines.push(
      `^FO${upX},${shapeY - edgeFontH - 4}${font(edgeFontH, edgeFontW)}^FD${zplEscape(upLabel)}^FS`,
    )
  }

  lines.push(`^FO${shapeX},${shapeY}^GB${pieceBoxW},${pieceBoxH},2,B^FS`)
  const textY = shapeY + Math.max(4, Math.round((pieceBoxH - centerFontH) / 2))
  lines.push(
    `^FO${shapeX + 4},${textY}^FB${pieceBoxW - 8},2,0,C,0${font(centerFontH, centerFontW)}^FD${zplEscape(centerLabel)}^FS`,
  )

  const midY = shapeY + Math.round(pieceBoxH / 2) - Math.round(edgeFontH / 2)
  if (leftLabel) {
    lines.push(`^FO${leftX},${midY}${font(edgeFontH, edgeFontW)}^FD${zplEscape(leftLabel)}^FS`)
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + pieceBoxW + 6},${midY}${font(edgeFontH, edgeFontW)}^FD${zplEscape(rightLabel)}^FS`,
    )
  }

  if (loLabel) {
    const loX = shapeX + Math.max(0, Math.round((pieceBoxW - loLabel.length * edgeFontW * 0.55) / 2))
    lines.push(
      `^FO${loX},${shapeY + pieceBoxH + 4}${font(edgeFontH, edgeFontW)}^FD${zplEscape(loLabel)}^FS`,
    )
  }
}

function buildLandscapeZpl(ctx) {
  const {
    mmToDots,
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

  const pad = 8
  const rightColW = mmToDots(24)
  const leftX = pad
  const rightX = PW - pad - rightColW
  const textColW = Math.max(80, rightX - leftX - mmToDots(2))
  const sideCantoW = mmToDots(14)
  const shapeX = leftX + sideCantoW

  let y = 8
  const lines = [
    '^XA',
    '^MMT',
    '^PON',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    `^FO${leftX},${y}^FB${textColW},2,0,L,0${font(28, 12)}^FD${zplEscape(headerTitle)}^FS`,
  ]

  y += 30
  if (booking) {
    lines.push(`^FO${leftX},${y}^FB${textColW},1,0,L,0${font(20, 10)}^FD${zplEscape(booking)}^FS`)
    y += 22
  }

  lines.push(`^FO${leftX},${y}^FB${textColW},1,0,L,0${font(24, 11)}^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 22
    lines.push(`^FO${leftX},${y}^FB${textColW},1,0,L,0${font(18, 9)}^FD${zplEscape(subDesc)}^FS`)
  }

  y += 22
  lines.push(`^FO${leftX},${y}${font(24, 11)}^FD${zplEscape(refLine)}^FS`)

  const shapeY = y + (upLabel ? 32 : 16)
  drawPieceDiagram(lines, {
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

  const qrY = 6
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${rightX},${qrY}^BQN,2,4^FDQA,${qrPayload}^FS`)

  let infoY = qrY + mmToDots(20)
  lines.push(`^FO${rightX},${infoY}${font(24, 11)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 26
  lines.push(`^FO${rightX},${infoY}${font(24, 11)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 28
  lines.push(`^FO${rightX},${infoY}${font(22, 10)}^FD${numeroPieza} / ${cantidad}^FS`)

  const footY = LL - 26
  lines.push(`^FO${leftX},${footY}${font(18, 9)}^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${rightX},${footY}${font(18, 9)}^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

function buildPortraitZpl(ctx) {
  const {
    mmToDots,
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

  const pad = 8
  const sideCantoW = mmToDots(12)
  const textColW = Math.max(60, PW - pad * 2)
  let y = 8
  const lines = [
    '^XA',
    '^MMT',
    '^PON',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    `^FO${pad},${y}^FB${textColW},2,0,L,0${font(24, 11)}^FD${zplEscape(headerTitle)}^FS`,
  ]

  y += 28
  if (booking) {
    lines.push(`^FO${pad},${y}^FB${textColW},1,0,L,0${font(18, 9)}^FD${zplEscape(booking)}^FS`)
    y += 20
  }

  lines.push(`^FO${pad},${y}^FB${textColW},1,0,L,0${font(20, 10)}^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 18
    lines.push(`^FO${pad},${y}^FB${textColW},1,0,L,0${font(16, 8)}^FD${zplEscape(subDesc)}^FS`)
  }

  y += 18
  lines.push(`^FO${pad},${y}${font(20, 10)}^FD${zplEscape(refLine)}^FS`)

  const shapeX = Math.max(pad + sideCantoW, Math.round((PW - pieceBoxW) / 2))
  const shapeY = y + (upLabel ? 28 : 14)
  drawPieceDiagram(lines, {
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
    edgeFontH: 18,
    edgeFontW: 9,
    centerFontH: 20,
    centerFontW: 10,
  })

  const qrY = shapeY + pieceBoxH + (loLabel ? 26 : 16)
  const qrX = PW - pad - mmToDots(20)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,4^FDQA,${qrPayload}^FS`)

  let infoY = qrY
  lines.push(`^FO${pad},${infoY}${font(22, 10)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 24
  lines.push(`^FO${pad},${infoY}${font(22, 10)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 24
  lines.push(`^FO${pad},${infoY}${font(20, 10)}^FD${numeroPieza} / ${cantidad}^FS`)
  infoY += 22
  lines.push(`^FO${pad},${infoY}${font(16, 8)}^FD${zplEscape(pCode)}^FS`)

  const footY = LL - 22
  lines.push(`^FO${pad},${footY}${font(16, 8)}^FD${zplEscape(dateStr)}^FS`)

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
}) {
  const resolvedDpi = dpi === 300 ? 300 : DEFAULT_ZPL_DPI
  const mmToDots = createMmToDots(resolvedDpi)
  const { pw: PW, ll: LL } = labelDotsForSize(labelSize, orientation, resolvedDpi)
  const pieceBoxW = mmToDots(PIECE_FRAME_W_MM)
  const pieceBoxH = mmToDots(PIECE_FRAME_H_MM)
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
    mmToDots,
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

export { PIECE_FRAME_W_MM, PIECE_FRAME_H_MM, DEFAULT_ZPL_DPI as ZPL_DPI }
