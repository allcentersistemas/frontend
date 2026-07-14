/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 / ZD420, 203 dpi).
 * Estilo taller: diagrama grande con cantos, tipografía más delgada, sin línea sobre el QR.
 */

const DPI = 203

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
const PIECE_FRAME_W_MM = 36
const PIECE_FRAME_H_MM = 18

function mmToDots(mm) {
  return Math.round((mm / 25.4) * DPI)
}

const PIECE_BOX_W = mmToDots(PIECE_FRAME_W_MM)
const PIECE_BOX_H = mmToDots(PIECE_FRAME_H_MM)

/** Tipografía delgada: alto > ancho (p. ej. 22,14). */
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
 */
export function labelDotsForSize(labelSize = 'label_80x50', orientation = 'landscape') {
  const size = ZEBRA_LABEL_SIZES[labelSize] ?? ZEBRA_LABEL_SIZES.label_80x50
  if (orientation === 'portrait') {
    return { pw: mmToDots(size.hMm), ll: mmToDots(size.wMm), wMm: size.hMm, hMm: size.wMm }
  }
  return { pw: mmToDots(size.wMm), ll: mmToDots(size.hMm), wMm: size.wMm, hMm: size.hMm }
}

function drawPieceDiagram(lines, {
  leftX,
  shapeX,
  shapeY,
  centerLabel,
  upLabel,
  loLabel,
  leftLabel,
  rightLabel,
  edgeFontH = 16,
  edgeFontW = 11,
  centerFontH = 18,
  centerFontW = 12,
}) {
  // Canto superior (centrado sobre la caja)
  if (upLabel) {
    const upX = shapeX + Math.max(0, Math.round((PIECE_BOX_W - upLabel.length * edgeFontW * 0.55) / 2))
    lines.push(
      `^FO${upX},${shapeY - edgeFontH - 4}${font(edgeFontH, edgeFontW)}^FD${zplEscape(upLabel)}^FS`,
    )
  }

  // Marco fijo + texto centrado
  lines.push(`^FO${shapeX},${shapeY}^GB${PIECE_BOX_W},${PIECE_BOX_H},2,B^FS`)
  const textY = shapeY + Math.max(4, Math.round((PIECE_BOX_H - centerFontH) / 2))
  lines.push(
    `^FO${shapeX + 4},${textY}^FB${PIECE_BOX_W - 8},2,0,C,0${font(centerFontH, centerFontW)}^FD${zplEscape(centerLabel)}^FS`,
  )

  // Cantos laterales
  const midY = shapeY + Math.round(PIECE_BOX_H / 2) - Math.round(edgeFontH / 2)
  if (leftLabel) {
    lines.push(`^FO${leftX},${midY}${font(edgeFontH, edgeFontW)}^FD${zplEscape(leftLabel)}^FS`)
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + PIECE_BOX_W + 6},${midY}${font(edgeFontH, edgeFontW)}^FD${zplEscape(rightLabel)}^FS`,
    )
  }

  // Canto inferior
  if (loLabel) {
    const loX = shapeX + Math.max(0, Math.round((PIECE_BOX_W - loLabel.length * edgeFontW * 0.55) / 2))
    lines.push(
      `^FO${loX},${shapeY + PIECE_BOX_H + 4}${font(edgeFontH, edgeFontW)}^FD${zplEscape(loLabel)}^FS`,
    )
  }
}

/**
 * Horizontal 80×50 (lectura normal): texto izq. + diagrama grande | QR der.
 * Sin línea separadora (evita solape con el QR).
 */
function buildLandscapeZpl(ctx) {
  const {
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
  // Diagrama anclado a la izquierda con espacio para cantos laterales
  const sideCantoW = mmToDots(14)
  const shapeX = leftX + sideCantoW

  let y = 8
  const lines = [
    '^XA',
    '^MMT',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    // Tipografía delgada (alto > ancho)
    `^FO${leftX},${y}${font(22, 14)}^FD${zplEscape(headerTitle)}^FS`,
  ]

  if (booking) {
    y += 22
    lines.push(`^FO${leftX},${y}${font(16, 11)}^FD${zplEscape(booking)}^FS`)
  }

  y += booking ? 18 : 24
  lines.push(`^FO${leftX},${y}${font(18, 12)}^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 18
    lines.push(`^FO${leftX},${y}${font(15, 10)}^FD${zplEscape(subDesc)}^FS`)
  }

  y += 18
  lines.push(`^FO${leftX},${y}${font(18, 12)}^FD${zplEscape(refLine)}^FS`)

  // Diagrama: reserva espacio para canto superior
  const shapeY = y + (upLabel ? 28 : 14)
  drawPieceDiagram(lines, {
    leftX,
    shapeX,
    shapeY,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
  })

  // QR columna derecha, arriba — sin línea cerca
  const qrY = 6
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${rightX},${qrY}^BQN,2,4^FDQA,${qrPayload}^FS`)

  let infoY = qrY + mmToDots(20)
  lines.push(`^FO${rightX},${infoY}${font(20, 13)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 22
  lines.push(`^FO${rightX},${infoY}${font(20, 13)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 24
  lines.push(`^FO${rightX},${infoY}${font(18, 12)}^FD${numeroPieza} / ${cantidad}^FS`)

  const footY = LL - 26
  lines.push(`^FO${leftX},${footY}${font(15, 10)}^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${rightX},${footY}${font(15, 10)}^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

function buildPortraitZpl(ctx) {
  const {
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
  let y = 8
  const lines = [
    '^XA',
    '^MMT',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    `^FO${pad},${y}${font(20, 13)}^FD${zplEscape(headerTitle)}^FS`,
  ]

  if (booking) {
    y += 20
    lines.push(`^FO${pad},${y}${font(14, 10)}^FD${zplEscape(booking)}^FS`)
  }

  y += booking ? 18 : 22
  lines.push(`^FO${pad},${y}${font(16, 11)}^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 16
    lines.push(`^FO${pad},${y}${font(14, 10)}^FD${zplEscape(subDesc)}^FS`)
  }

  y += 16
  lines.push(`^FO${pad},${y}${font(16, 11)}^FD${zplEscape(refLine)}^FS`)

  const shapeX = Math.max(pad + sideCantoW, Math.round((PW - PIECE_BOX_W) / 2))
  const shapeY = y + (upLabel ? 26 : 12)
  drawPieceDiagram(lines, {
    leftX: pad,
    shapeX,
    shapeY,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    edgeFontH: 14,
    edgeFontW: 10,
    centerFontH: 16,
    centerFontW: 11,
  })

  const qrY = shapeY + PIECE_BOX_H + (loLabel ? 24 : 14)
  const qrX = PW - pad - mmToDots(20)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,4^FDQA,${qrPayload}^FS`)

  let infoY = qrY
  lines.push(`^FO${pad},${infoY}${font(18, 12)}^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 20
  lines.push(`^FO${pad},${infoY}${font(18, 12)}^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 20
  lines.push(`^FO${pad},${infoY}${font(16, 11)}^FD${numeroPieza} / ${cantidad}^FS`)
  infoY += 20
  lines.push(`^FO${pad},${infoY}${font(14, 10)}^FD${zplEscape(pCode)}^FS`)

  const footY = LL - 22
  lines.push(`^FO${pad},${footY}${font(14, 10)}^FD${zplEscape(dateStr)}^FS`)

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
}) {
  const { pw: PW, ll: LL } = labelDotsForSize(labelSize, orientation)
  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const isPortrait = orientation === 'portrait'
  const headerTitle = zplTrunc(String(orderName ?? '').toUpperCase(), isPortrait ? 22 : 34)
  const booking = bookingCode ? zplTrunc(String(bookingCode).trim(), isPortrait ? 24 : 36) : ''
  // Material sin repetir descripcion (la descripción va en el rectángulo)
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

export { PIECE_FRAME_W_MM, PIECE_FRAME_H_MM, DPI as ZPL_DPI }
