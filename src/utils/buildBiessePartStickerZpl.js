/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 y compatibles, 203 dpi, 80×50 mm).
 */

const DPI = 203
const LABEL_W_MM = 80
const LABEL_H_MM = 50

export const LABEL_W_DOTS = Math.round((LABEL_W_MM / 25.4) * DPI)
export const LABEL_H_DOTS = Math.round((LABEL_H_MM / 25.4) * DPI)

function mmToDots(mm) {
  return Math.round((mm / 25.4) * DPI)
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

function pieceShapeDots(longitud, ancho) {
  const L = roundDim(longitud)
  const A = roundDim(ancho)
  const maxW = mmToDots(20)
  const maxH = mmToDots(10)
  if (L == null || A == null || L <= 0 || A <= 0) {
    return { width: mmToDots(16), height: mmToDots(8) }
  }
  const ratio = L / A
  let w
  let h
  if (ratio >= 1) {
    w = maxW
    h = maxW / ratio
    if (h > maxH) {
      h = maxH
      w = maxH * ratio
    }
  } else {
    h = maxH
    w = maxH * ratio
    if (w > maxW) {
      w = maxW
      h = maxW / ratio
    }
  }
  return { width: Math.round(w), height: Math.round(h) }
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
 * @param {object} opts
 * @param {string} opts.scanCode
 * @param {string} opts.orderName
 * @param {string|null|undefined} [opts.bookingCode]
 * @param {object} opts.part
 * @param {{ numeroPieza?: number }} opts.piece
 * @param {Date} [opts.printedAt]
 */
export function buildBiessePartStickerZpl({
  scanCode,
  orderName,
  bookingCode,
  part,
  piece,
  printedAt = new Date(),
}) {
  const PW = LABEL_W_DOTS
  const LL = LABEL_H_DOTS
  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const headerTitle = zplTrunc(String(orderName ?? '').toUpperCase(), 34)
  const booking = bookingCode ? zplTrunc(String(bookingCode).trim(), 36) : ''
  const matLine = zplTrunc(
    joinNonEmpty([part?.material, part?.descripcion]).toUpperCase() || '—',
    40,
  )
  const subDesc = zplTrunc(part?.descripcion1 ?? '', 40)
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

  const shape = pieceShapeDots(part?.longitud, part?.ancho)
  const shapeX = 70
  const shapeY = diagramTop + (upLabel ? 18 : 6)
  lines.push(`^FO${shapeX},${shapeY}^GB${shape.width},${shape.height},2,B^FS`)
  const textY = shapeY + Math.max(4, Math.round(shape.height / 2) - 10)
  lines.push(
    `^FO${shapeX + 2},${textY}^FB${shape.width - 4},2,0,C,0^A0N,14,12^FD${zplEscape(centerLabel)}^FS`,
  )

  if (leftLabel) {
    lines.push(`^FO8,${shapeY + Math.round(shape.height / 2) - 6}^A0N,14,12^FD${zplEscape(leftLabel)}^FS`)
  }
  if (rightLabel) {
    lines.push(
      `^FO${shapeX + shape.width + 6},${shapeY + Math.round(shape.height / 2) - 6}^A0N,14,12^FD${zplEscape(rightLabel)}^FS`,
    )
  }
  if (loLabel) {
    lines.push(`^FO60,${shapeY + shape.height + 4}^A0N,14,12^FD${zplEscape(loLabel)}^FS`)
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
