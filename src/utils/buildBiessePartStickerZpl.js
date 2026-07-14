/**
 * Etiqueta Biesse en ZPL (Zebra ZD230 / ZD420, 203 dpi).
 * Layout estilo taller (imagen 2): título → material → diagrama fijo → QR abajo a la derecha.
 */

const DPI = 203

/** @typedef {'label_80x50' | 'label_100x50' | 'label_60x40'} ZebraLabelSizeId */

/** @type {Record<ZebraLabelSizeId, { wMm: number, hMm: number }>} */
export const ZEBRA_LABEL_SIZES = {
  label_80x50: { wMm: 80, hMm: 50 },
  label_100x50: { wMm: 100, hMm: 50 },
  label_60x40: { wMm: 60, hMm: 40 },
}

/** Marco de pieza siempre igual (mm). */
const PIECE_FRAME_W_MM = 28
const PIECE_FRAME_H_MM = 14

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

/**
 * Layout imagen 2 (horizontal 80×50):
 *
 *  TÍTULO ORDEN
 *  material
 *  -------------   (solo bajo el bloque de texto; no cruza el QR)
 *  [up]
 *  left  [ BOX fixed ]  right
 *  [lo]
 *                           QR
 *  L: A: n/n  Pcode        date
 */
function buildLandscapeZpl(ctx) {
  const {
    PW,
    LL,
    scanCode,
    headerTitle,
    matLine,
    subDesc,
    centerLine1,
    centerLine2,
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

  const pad = 12
  const qrSizeMm = 18
  const qrColW = mmToDots(22)
  const leftMaxX = PW - qrColW - pad - 6

  let y = 10
  const lines = [
    '^XA',
    '^MMT',
    '^PW' + PW,
    '^LL' + LL,
    '^LH0,0',
    '^CI28',
    '^PR2,2',
    // Título (como imagen 2)
    `^FO${pad},${y}^A0N,30,28^FD${zplEscape(headerTitle)}^FS`,
  ]

  y += 32
  lines.push(`^FO${pad},${y}^A0N,24,22^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 26
    lines.push(`^FO${pad},${y}^A0N,20,18^FD${zplEscape(subDesc)}^FS`)
  }

  y += 24
  // Separador: solo columna izquierda (no invade zona QR)
  lines.push(`^FO${pad},${y}^GB${Math.max(80, leftMaxX - pad)},2,2^FS`)

  // --- Diagrama fijo ---
  const diagramTop = y + 10
  const boxX = pad + mmToDots(10)
  const boxY = diagramTop + (upLabel ? 18 : 4)

  if (upLabel) {
    lines.push(`^FO${boxX},${diagramTop}^A0N,18,16^FD${zplEscape(upLabel)}^FS`)
  }

  // Rectángulo estándar (borde grueso)
  lines.push(`^FO${boxX},${boxY}^GB${PIECE_BOX_W},${PIECE_BOX_H},4,B^FS`)

  // Texto interior (horizontal, 1–2 líneas) — sin solapar bordes
  const innerX = boxX + 6
  const innerY = boxY + 8
  lines.push(
    `^FO${innerX},${innerY}^FB${PIECE_BOX_W - 12},2,2,C,0^A0N,16,14^FD${zplEscape(centerLine1)}^FS`,
  )
  if (centerLine2) {
    lines.push(
      `^FO${innerX},${innerY + 20}^FB${PIECE_BOX_W - 12},1,0,C,0^A0N,14,12^FD${zplEscape(centerLine2)}^FS`,
    )
  }

  if (leftLabel) {
    lines.push(
      `^FO${pad},${boxY + Math.round(PIECE_BOX_H / 2) - 8}^A0N,16,14^FD${zplEscape(leftLabel)}^FS`,
    )
  }
  if (rightLabel) {
    lines.push(
      `^FO${boxX + PIECE_BOX_W + 6},${boxY + Math.round(PIECE_BOX_H / 2) - 8}^A0N,16,14^FD${zplEscape(rightLabel)}^FS`,
    )
  }
  if (loLabel) {
    lines.push(`^FO${boxX},${boxY + PIECE_BOX_H + 6}^A0N,16,14^FD${zplEscape(loLabel)}^FS`)
  }

  // QR abajo-derecha (como imagen 2), con hueco respecto al diagrama
  const qrX = PW - pad - mmToDots(qrSizeMm)
  const qrY = LL - mmToDots(qrSizeMm) - 36
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,4^FDQA,${qrPayload}^FS`)

  // Dims a la izquierda del QR
  const infoX = pad
  let infoY = qrY + 4
  lines.push(`^FO${infoX},${infoY}^A0N,26,24^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 28
  lines.push(`^FO${infoX},${infoY}^A0N,26,24^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 28
  lines.push(`^FO${infoX},${infoY}^A0N,22,20^FD${numeroPieza} / ${cantidad}^FS`)
  infoY += 24
  lines.push(`^FO${infoX},${infoY}^A0N,20,18^FD${zplEscape(pCode)}^FS`)

  const footY = LL - 22
  lines.push(`^FO${qrX},${footY}^A0N,16,14^FD${zplEscape(dateStr)}^FS`)

  lines.push('^XZ')
  return lines.join('\n')
}

/**
 * Vertical: mismo contenido, apilado; texto siempre horizontal (^A0N), nunca rotado.
 */
function buildPortraitZpl(ctx) {
  const {
    PW,
    LL,
    scanCode,
    headerTitle,
    matLine,
    subDesc,
    centerLine1,
    centerLine2,
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

  y += 26
  lines.push(`^FO${pad},${y}^A0N,18,16^FD${zplEscape(matLine)}^FS`)

  if (subDesc) {
    y += 20
    lines.push(`^FO${pad},${y}^A0N,16,14^FD${zplEscape(subDesc)}^FS`)
  }

  y += 20
  lines.push(`^FO${pad},${y}^GB${PW - pad * 2},2,2^FS`)

  const diagramTop = y + 8
  const boxW = Math.min(PIECE_BOX_W, PW - pad * 2 - mmToDots(16))
  const boxH = Math.min(PIECE_BOX_H, mmToDots(16))
  const boxX = Math.round((PW - boxW) / 2)
  const boxY = diagramTop + (upLabel ? 16 : 4)

  if (upLabel) {
    lines.push(
      `^FO${Math.round((PW - mmToDots(20)) / 2)},${diagramTop}^A0N,14,12^FD${zplEscape(upLabel)}^FS`,
    )
  }

  lines.push(`^FO${boxX},${boxY}^GB${boxW},${boxH},3,B^FS`)
  lines.push(
    `^FO${boxX + 4},${boxY + 6}^FB${boxW - 8},2,2,C,0^A0N,14,12^FD${zplEscape(centerLine1)}^FS`,
  )
  if (centerLine2) {
    lines.push(
      `^FO${boxX + 4},${boxY + 22}^FB${boxW - 8},1,0,C,0^A0N,12,10^FD${zplEscape(centerLine2)}^FS`,
    )
  }

  if (leftLabel) {
    lines.push(`^FO${pad},${boxY + Math.round(boxH / 2) - 6}^A0N,12,10^FD${zplEscape(leftLabel)}^FS`)
  }
  if (rightLabel) {
    lines.push(
      `^FO${boxX + boxW + 4},${boxY + Math.round(boxH / 2) - 6}^A0N,12,10^FD${zplEscape(rightLabel)}^FS`,
    )
  }
  if (loLabel) {
    lines.push(
      `^FO${Math.round((PW - mmToDots(20)) / 2)},${boxY + boxH + 4}^A0N,12,10^FD${zplEscape(loLabel)}^FS`,
    )
  }

  const qrY = Math.min(boxY + boxH + 24, LL - mmToDots(28))
  const qrX = PW - pad - mmToDots(18)
  const qrPayload = String(scanCode).replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
  lines.push(`^FO${qrX},${qrY}^BQN,2,4^FDQA,${qrPayload}^FS`)

  let infoY = qrY + 2
  lines.push(`^FO${pad},${infoY}^A0N,20,18^FDL: ${L != null ? L : '—'}^FS`)
  infoY += 22
  lines.push(`^FO${pad},${infoY}^A0N,20,18^FDA: ${A != null ? A : '—'}^FS`)
  infoY += 22
  lines.push(`^FO${pad},${infoY}^A0N,16,14^FD${numeroPieza} / ${cantidad}^FS`)
  infoY += 20
  lines.push(`^FO${pad},${infoY}^A0N,16,14^FD${zplEscape(pCode)}^FS`)

  lines.push(`^FO${qrX},${LL - 20}^A0N,14,12^FD${zplEscape(dateStr)}^FS`)

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

  // Imagen 2: título = orden; material solo (sin pegar descripción); caja = descripción
  const headerTitle = zplTrunc(String(orderName ?? '').toUpperCase(), isPortrait ? 22 : 36)
  const matOnly = zplTrunc(
    String(part?.material ?? '').trim().toUpperCase() || '—',
    isPortrait ? 28 : 40,
  )
  const bookingOrSub = bookingCode
    ? zplTrunc(String(bookingCode).trim(), isPortrait ? 24 : 36)
    : zplTrunc(part?.descripcion1 ?? '', isPortrait ? 24 : 36)

  const desc = String(part?.descripcion ?? '').trim()
  const desc1 = String(part?.descripcion1 ?? '').trim()
  // Dos líneas dentro del rectángulo (como imagen 2)
  const centerLine1 = zplTrunc(desc || '—', isPortrait ? 22 : 28)
  const centerLine2 =
    desc1 && desc1.toUpperCase() !== matOnly && desc1 !== desc
      ? zplTrunc(desc1, isPortrait ? 22 : 28)
      : ''

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
    matLine: matOnly,
    // Si hay booking se muestra como sublínea; si no, descripcion1 (si distinta del material)
    subDesc: bookingOrSub && bookingOrSub !== matOnly ? bookingOrSub : '',
    centerLine1,
    centerLine2,
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

export { PIECE_FRAME_W_MM, PIECE_FRAME_H_MM, DPI as ZPL_DPI, joinNonEmpty }
