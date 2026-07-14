/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 / ZD420 y compatibles, 203 dpi).
 * Columnas fijas para evitar solapes (p. ej. línea del encabezado sobre el QR).
 * Marco de pieza siempre del mismo tamaño.
 */

const DPI = 203

/** @typedef {'label_80x50' | 'label_100x50' | 'label_60x40'} ZebraLabelSizeId */

/** @type {Record<ZebraLabelSizeId, { wMm: number, hMm: number }>} */
export const ZEBRA_LABEL_SIZES = {
  label_80x50: { wMm: 80, hMm: 50 },
  label_100x50: { wMm: 100, hMm: 50 },
  label_60x40: { wMm: 60, hMm: 40 },
}

/** Marco de pieza fijo (mm) — no varía con L/A. */
const PIECE_FRAME_W_MM = 22
const PIECE_FRAME_H_MM = 12

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

function drawFixedPieceBox(lines, shapeX, shapeY, centerLabel, fontH = 16, fontW = 14) {
  lines.push(`^FO${shapeX},${shapeY}^GB${PIECE_BOX_W},${PIECE_BOX_H},3,B^FS`)
  const textY = shapeY + Math.max(6, Math.round(PIECE_BOX_H / 2) - Math.round(fontH / 2))
  lines.push(
    `^FO${shapeX + 3},${textY}^FB${PIECE_BOX_W - 6},2,0,C,0^A0N,${fontH},${fontW}^FD${zplEscape(centerLabel)}^FS`,
  )
}

/**
 * Layout horizontal: columna izquierda (texto + diagrama) | columna derecha (QR + dims).
 * La línea del encabezado solo recorre la columna izquierda → no se superpone al QR.
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

  const pad = 10
  const rightColW = mmToDots(26)
  const gap = 8
  const leftColW = PW - rightColW - gap - pad * 2
  const leftX = pad
  const rightX = PW - pad - rightColW

  let y = 10
  const lines = [
    '^XA',
    '^MMT',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    `^FO${leftX},${y}^A0N,28,26^FD${zplEscape(headerTitle)}^FS`,
  ]

  if (booking) {
    y += 28
    lines.push(`^FO${leftX},${y}^A0N,18,16^FD${zplEscape(booking)}^FS`)
  }

  y += booking ? 22 : 30
  // Línea solo en columna izquierda (evita cruzar el QR).
  lines.push(`^FO${leftX},${y}^GB${leftColW},2,2^FS`)

  y += 10
  lines.push(`^FO${leftX},${y}^A0N,22,20^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 24
    lines.push(`^FO${leftX},${y}^A0N,18,16^FD${zplEscape(subDesc)}^FS`)
  }

  y += 24
  lines.push(`^FO${leftX},${y}^A0N,24,22^FD${zplEscape(refLine)}^FS`)

  const diagramTop = y + 26
  if (upLabel) {
    lines.push(`^FO${leftX + 48},${diagramTop}^A0N,16,14^FD${zplEscape(upLabel)}^FS`)
  }

  const shapeX = leftX + 52
  const shapeY = diagramTop + (upLabel ? 18 : 4)
  drawFixedPieceBox(lines, shapeX, shapeY, centerLabel, 16, 14)

  if (leftLabel) {
    lines.push(
      `^FO${leftX},${shapeY + Math.round(PIECE_BOX_H / 2) - 8}^A0N,16,14^FD${zplEscape(leftLabel)}^FS`,
    )
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + PIECE_BOX_W + 6},${shapeY + Math.round(PIECE_BOX_H / 2) - 8}^A0N,16,14^FD${zplEscape(rightLabel)}^FS`,
    )
  }
  if (loLabel) {
    lines.push(`^FO${leftX + 48},${shapeY + PIECE_BOX_H + 6}^A0N,16,14^FD${zplEscape(loLabel)}^FS`)
  }

  // QR anclado arriba a la derecha, sin solaparse con la línea del encabezado.
  const qrY = 8
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${rightX},${qrY}^BQN,2,5^FDQA,${qrPayload}^FS`)

  let infoY = qrY + mmToDots(22)
  lines.push(`^FO${rightX},${infoY}^A0N,24,22^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 26
  lines.push(`^FO${rightX},${infoY}^A0N,24,22^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 28
  lines.push(`^FO${rightX},${infoY}^A0N,22,20^FD${numeroPieza} / ${cantidad}^FS`)

  const footY = LL - 30
  lines.push(`^FO${leftX},${footY}^A0N,18,16^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${rightX},${footY}^A0N,18,16^FD${zplEscape(dateStr)}^FS`)

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
  let y = 10
  const lines = [
    '^XA',
    '^MMT',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    `^FO${pad},${y}^A0N,24,22^FD${zplEscape(headerTitle)}^FS`,
  ]

  if (booking) {
    y += 26
    lines.push(`^FO${pad},${y}^A0N,16,14^FD${zplEscape(booking)}^FS`)
  }

  y += booking ? 22 : 28
  lines.push(`^FO${pad},${y}^GB${PW - pad * 2},2,2^FS`)

  y += 10
  lines.push(`^FO${pad},${y}^A0N,18,16^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 22
    lines.push(`^FO${pad},${y}^A0N,16,14^FD${zplEscape(subDesc)}^FS`)
  }

  y += 22
  lines.push(`^FO${pad},${y}^A0N,20,18^FD${zplEscape(refLine)}^FS`)

  const diagramTop = y + 22
  if (upLabel) {
    lines.push(`^FO${Math.round(PW / 2) - 24},${diagramTop}^A0N,14,12^FD${zplEscape(upLabel)}^FS`)
  }

  const shapeX = Math.round((PW - PIECE_BOX_W) / 2)
  const shapeY = diagramTop + (upLabel ? 16 : 6)
  drawFixedPieceBox(lines, shapeX, shapeY, centerLabel, 15, 13)

  if (leftLabel) {
    lines.push(
      `^FO${pad},${shapeY + Math.round(PIECE_BOX_H / 2) - 7}^A0N,14,12^FD${zplEscape(leftLabel)}^FS`,
    )
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + PIECE_BOX_W + 4},${shapeY + Math.round(PIECE_BOX_H / 2) - 7}^A0N,14,12^FD${zplEscape(rightLabel)}^FS`,
    )
  }
  if (loLabel) {
    lines.push(
      `^FO${Math.round(PW / 2) - 24},${shapeY + PIECE_BOX_H + 6}^A0N,14,12^FD${zplEscape(loLabel)}^FS`,
    )
  }

  // QR debajo del diagrama (sin solape con la línea superior).
  const qrY = shapeY + PIECE_BOX_H + (loLabel ? 22 : 14)
  const qrX = Math.round((PW - mmToDots(20)) / 2)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,5^FDQA,${qrPayload}^FS`)

  let infoY = qrY + mmToDots(22)
  lines.push(`^FO${pad},${infoY}^A0N,20,18^FDL: ${L != null ? L : '—'}  A: ${A != null ? A : '—'}^FS`)
  infoY += 24
  lines.push(`^FO${pad},${infoY}^A0N,18,16^FD${numeroPieza} / ${cantidad}^FS`)

  const footY = LL - 28
  lines.push(`^FO${pad},${footY}^A0N,16,14^FD${zplEscape(pCode)}^FS`)
  lines.push(`^FO${PW - mmToDots(22)},${footY}^A0N,16,14^FD${zplEscape(dateStr)}^FS`)

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
  const headerTitle = zplTrunc(String(orderName ?? '').toUpperCase(), isPortrait ? 20 : 32)
  const booking = bookingCode ? zplTrunc(String(bookingCode).trim(), isPortrait ? 22 : 34) : ''
  const matLine = zplTrunc(
    joinNonEmpty([part?.material, part?.descripcion]).toUpperCase() || '—',
    isPortrait ? 26 : 36,
  )
  const subDesc = zplTrunc(part?.descripcion1 ?? '', isPortrait ? 26 : 36)
  const refLine = partNumber != null && partNumber !== '' ? String(partNumber) : '0'
  const centerLabel = zplTrunc(String(part?.descripcion ?? '—').trim(), 22)
  const upLabel = zplTrunc(part?.matedgeup ?? '', 14)
  const loLabel = zplTrunc(part?.matedgelo ?? '', 14)
  const leftLabel = zplTrunc(part?.matedgel ?? '', 8)
  const rightLabel = zplTrunc(part?.matedger ?? '', 8)
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
