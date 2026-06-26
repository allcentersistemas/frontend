/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 y compatibles, 203 dpi).
 * Soporta horizontal (80×50 mm) y vertical (50×80 mm).
 */

const DPI = 203
const LANDSCAPE_W_MM = 80
const LANDSCAPE_H_MM = 50

/** Marco de pieza fijo (mm). */
const PIECE_FRAME_W_MM = 18
const PIECE_FRAME_H_MM = 10

export const LABEL_W_DOTS = Math.round((LANDSCAPE_W_MM / 25.4) * DPI)
export const LABEL_H_DOTS = Math.round((LANDSCAPE_H_MM / 25.4) * DPI)

function mmToDots(mm) {
  return Math.round((mm / 25.4) * DPI)
}

const PIECE_BOX_W = mmToDots(PIECE_FRAME_W_MM)
const PIECE_BOX_H = mmToDots(PIECE_FRAME_H_MM)

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

function joinNonEmpty(parts, sep = ' ') {
  return parts.map((p) => (p == null ? '' : String(p).trim())).filter((p) => p !== '').join(sep)
}

function formatStickerDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const safe = Number.isNaN(d.getTime()) ? new Date() : d
  const mm = String(safe.getMonth() + 1).padStart(2, '0')
  const dd = String(safe.getDate()).padStart(2, '0')
  const yy = String(safe.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

function labelDots(orientation) {
  if (orientation === 'portrait') {
    return { pw: mmToDots(LANDSCAPE_H_MM), ll: mmToDots(LANDSCAPE_W_MM) }
  }
  return { pw: mmToDots(LANDSCAPE_W_MM), ll: mmToDots(LANDSCAPE_H_MM) }
}

function drawFixedPieceBox(lines, shapeX, shapeY, centerLabel) {
  lines.push(`^FO${shapeX},${shapeY}^GB${PIECE_BOX_W},${PIECE_BOX_H},2,B^FS`)
  const textY = shapeY + Math.max(4, Math.round(PIECE_BOX_H / 2) - 10)
  lines.push(
    `^FO${shapeX + 2},${textY}^FB${PIECE_BOX_W - 4},3,0,C,0^A0N,14,12^FD${zplEscape(centerLabel)}^FS`,
  )
}

function buildLandscapeZpl(ctx) {
  const { PW, LL, scanCode, headerTitle, booking, matLine, subDesc, refLine, centerLabel, upLabel, loLabel, leftLabel, rightLabel, L, A, numeroPieza, cantidad, pCode, dateStr } = ctx

  let y = 8
  const lines = [
    '^XA',
    '^MMT',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    `^FO8,${y}^A0N,22,20^FD${zplEscape(headerTitle)}^FS`,
  ]

  if (booking) {
    y += 22
    lines.push(`^FO8,${y}^A0N,16,14^FD${zplEscape(booking)}^FS`)
  }

  y += booking ? 20 : 24
  lines.push(`^FO8,${y}^GB${PW - 16},2,2^FS`)

  y += 8
  lines.push(`^FO8,${y}^A0N,18,16^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 20
    lines.push(`^FO8,${y}^A0N,15,13^FD${zplEscape(subDesc)}^FS`)
  }

  y += 20
  lines.push(`^FO8,${y}^A0N,20,18^FD${zplEscape(refLine)}^FS`)

  const diagramTop = y + 22
  if (upLabel) {
    lines.push(`^FO60,${diagramTop}^A0N,14,12^FD${zplEscape(upLabel)}^FS`)
  }

  const shapeX = 70
  const shapeY = diagramTop + (upLabel ? 18 : 6)
  drawFixedPieceBox(lines, shapeX, shapeY, centerLabel)

  if (leftLabel) {
    lines.push(`^FO8,${shapeY + Math.round(PIECE_BOX_H / 2) - 6}^A0N,14,12^FD${zplEscape(leftLabel)}^FS`)
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + PIECE_BOX_W + 6},${shapeY + Math.round(PIECE_BOX_H / 2) - 6}^A0N,14,12^FD${zplEscape(rightLabel)}^FS`,
    )
  }
  if (loLabel) {
    lines.push(`^FO60,${shapeY + PIECE_BOX_H + 4}^A0N,14,12^FD${zplEscape(loLabel)}^FS`)
  }

  const qrX = PW - mmToDots(24)
  const qrY = 42
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,5^FDQA,${qrPayload}^FS`)

  const infoX = PW - mmToDots(24)
  let infoY = qrY + mmToDots(21)
  lines.push(`^FO${infoX},${infoY}^A0N,22,20^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 24
  lines.push(`^FO${infoX},${infoY}^A0N,22,20^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 26
  lines.push(`^FO${infoX},${infoY}^A0N,20,18^FD${numeroPieza} / ${cantidad}^FS`)

  const footY = LL - 28
  lines.push(`^FO8,${footY}^A0N,16,14^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${PW - mmToDots(22)},${footY}^A0N,16,14^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

function buildPortraitZpl(ctx) {
  const { PW, LL, scanCode, headerTitle, booking, matLine, subDesc, refLine, centerLabel, upLabel, loLabel, leftLabel, rightLabel, L, A, numeroPieza, cantidad, pCode, dateStr } = ctx

  let y = 8
  const lines = [
    '^XA',
    '^MMT',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    `^FO4,${y}^A0N,18,16^FD${zplEscape(headerTitle)}^FS`,
  ]

  if (booking) {
    y += 20
    lines.push(`^FO4,${y}^A0N,14,12^FD${zplEscape(booking)}^FS`)
  }

  y += booking ? 18 : 22
  lines.push(`^FO4,${y}^GB${PW - 8},2,2^FS`)

  y += 6
  lines.push(`^FO4,${y}^A0N,15,13^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 18
    lines.push(`^FO4,${y}^A0N,13,11^FD${zplEscape(subDesc)}^FS`)
  }

  y += 18
  lines.push(`^FO4,${y}^A0N,16,14^FD${zplEscape(refLine)}^FS`)

  const diagramTop = y + 18
  if (upLabel) {
    lines.push(`^FO${Math.round(PW / 2) - 20},${diagramTop}^A0N,12,10^FD${zplEscape(upLabel)}^FS`)
  }

  const shapeX = Math.round((PW - PIECE_BOX_W) / 2)
  const shapeY = diagramTop + (upLabel ? 14 : 4)
  drawFixedPieceBox(lines, shapeX, shapeY, centerLabel)

  if (leftLabel) {
    lines.push(`^FO4,${shapeY + Math.round(PIECE_BOX_H / 2) - 6}^A0N,12,10^FD${zplEscape(leftLabel)}^FS`)
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + PIECE_BOX_W + 4},${shapeY + Math.round(PIECE_BOX_H / 2) - 6}^A0N,12,10^FD${zplEscape(rightLabel)}^FS`,
    )
  }
  if (loLabel) {
    lines.push(`^FO${Math.round(PW / 2) - 20},${shapeY + PIECE_BOX_H + 4}^A0N,12,10^FD${zplEscape(loLabel)}^FS`)
  }

  const qrY = shapeY + PIECE_BOX_H + (loLabel ? 18 : 10)
  const qrX = Math.round((PW - mmToDots(18)) / 2)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,4^FDQA,${qrPayload}^FS`)

  let infoY = qrY + mmToDots(19)
  lines.push(`^FO4,${infoY}^A0N,18,16^FDL: ${L != null ? L : '—'}  A: ${A != null ? A : '—'}^FS`)
  infoY += 22
  lines.push(`^FO4,${infoY}^A0N,16,14^FD${numeroPieza} / ${cantidad}^FS`)

  const footY = LL - 24
  lines.push(`^FO4,${footY}^A0N,14,12^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${PW - mmToDots(20)},${footY}^A0N,14,12^FD${zplEscape(dateStr)}^FS`)

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
 */
export function buildBiessePartStickerZpl({
  scanCode,
  orderName,
  bookingCode,
  part,
  piece,
  printedAt = new Date(),
  orientation = 'landscape',
}) {
  const { pw: PW, ll: LL } = labelDots(orientation)
  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const headerTitle = zplTrunc(String(orderName ?? '').toUpperCase(), orientation === 'portrait' ? 22 : 34)
  const booking = bookingCode ? zplTrunc(String(bookingCode).trim(), orientation === 'portrait' ? 24 : 36) : ''
  const matLine = zplTrunc(
    joinNonEmpty([part?.material, part?.descripcion]).toUpperCase() || '—',
    orientation === 'portrait' ? 28 : 40,
  )
  const subDesc = zplTrunc(part?.descripcion1 ?? '', orientation === 'portrait' ? 28 : 40)
  const refLine = partNumber != null && partNumber !== '' ? String(partNumber) : '0'
  const centerLabel = zplTrunc(String(part?.descripcion ?? '—').trim(), 28)
  const upLabel = zplTrunc(part?.matedgeup ?? '', 16)
  const loLabel = zplTrunc(part?.matedgelo ?? '', 16)
  const leftLabel = zplTrunc(part?.matedgel ?? '', 10)
  const rightLabel = zplTrunc(part?.matedger ?? '', 10)
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

  return orientation === 'portrait' ? buildPortraitZpl(ctx) : buildLandscapeZpl(ctx)
}
