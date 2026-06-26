/**
 * Ventana de impresión: etiqueta de pieza (estilo taller / Biesse scan).
 * El QR usa el mismo formato que {@code GET /api/biesse/scan/pieces/resolve?code=}.
 */

import { buildBiessePartStickerZpl } from './buildBiessePartStickerZpl.js'
import { getStickerPrintSize } from './stickerPrintSize.js'
import { sendZplToZebra } from './zebraBrowserPrint.js'

function esc(s) {
  if (s == null || s === '') return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

function buildScanCode(orderName, partNumber, numeroPieza) {
  const name = String(orderName ?? '').trim()
  const pnRaw = partNumber != null && partNumber !== '' ? String(partNumber).trim() : ''
  const pn =
    pnRaw !== '' && Number.parseInt(pnRaw, 10) > 0
      ? String(Number.parseInt(pnRaw, 10))
      : pnRaw !== ''
        ? pnRaw
        : '0'
  const nz = numeroPieza != null ? String(numeroPieza).trim() : '1'
  if (!name || pn === '0') return `${name || 'orden'}-P0-${nz}`
  return `${name}-P${pn}-${nz}`
}

function joinNonEmpty(parts, sep = ' ') {
  return parts.map((p) => (p == null ? '' : String(p).trim())).filter((p) => p !== '').join(sep)
}

function materialLine(material, descripcion) {
  return joinNonEmpty([material, descripcion]).toUpperCase() || '—'
}

const LABEL_LANDSCAPE_W_MM = 80
const LABEL_LANDSCAPE_H_MM = 50

/** Marco del diagrama de pieza: tamaño fijo en todas las etiquetas. */
const PIECE_FRAME_W_MM = 18
const PIECE_FRAME_H_MM = 10
const PIECE_INNER_MAX_W_MM = 16
const PIECE_INNER_MAX_H_MM = 8
const DIAGRAM_COL_SIDE_MM = 6
const DIAGRAM_COL_CENTER_MM = 20
const DIAGRAM_ROW_EDGE_MM = 4
const DIAGRAM_ROW_CENTER_MM = 12

function labelSizeMm(orientation) {
  if (orientation === 'portrait') {
    return { w: LABEL_LANDSCAPE_H_MM, h: LABEL_LANDSCAPE_W_MM }
  }
  return { w: LABEL_LANDSCAPE_W_MM, h: LABEL_LANDSCAPE_H_MM }
}

/** Proporción L/A dentro del marco fijo (solo relleno visual, no cambia el borde). */
function pieceShapeInnerStyle(longitud, ancho) {
  const L = roundDim(longitud)
  const A = roundDim(ancho)
  if (L == null || A == null || L <= 0 || A <= 0) {
    return `width:${PIECE_INNER_MAX_W_MM * 0.85}mm;height:${PIECE_INNER_MAX_H_MM * 0.85}mm;`
  }
  const ratio = L / A
  let w
  let h
  if (ratio >= 1) {
    w = PIECE_INNER_MAX_W_MM
    h = PIECE_INNER_MAX_W_MM / ratio
    if (h > PIECE_INNER_MAX_H_MM) {
      h = PIECE_INNER_MAX_H_MM
      w = PIECE_INNER_MAX_H_MM * ratio
    }
  } else {
    h = PIECE_INNER_MAX_H_MM
    w = PIECE_INNER_MAX_H_MM * ratio
    if (w > PIECE_INNER_MAX_W_MM) {
      w = PIECE_INNER_MAX_W_MM
      h = PIECE_INNER_MAX_W_MM / ratio
    }
  }
  return `width:${Math.round(w * 10) / 10}mm;height:${Math.round(h * 10) / 10}mm;`
}

function buildStyles(orientation = 'landscape') {
  const { w: LABEL_W_MM, h: LABEL_H_MM } = labelSizeMm(orientation)
  const pageOrient = orientation === 'portrait' ? 'portrait' : 'landscape'

  return `
    @page { size: ${pageOrient}; margin: 0; }
    @page fixed-label {
      size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm ${pageOrient};
      margin: 0;
    }
    @page fill-sheet { size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm ${pageOrient}; margin: 0; }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    html.print-size--label_80x50,
    body.print-size--label_80x50 {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      max-width: ${LABEL_W_MM}mm;
      max-height: ${LABEL_H_MM}mm;
      overflow: hidden;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-size--label_80x50 body,
    .print-size--label_80x50 .sticker {
      font-family: Arial Black, Arial, Helvetica, sans-serif;
      font-weight: 700;
    }

    .sticker {
      display: flex;
      flex-direction: column;
    }

    .print-size--auto .sticker {
      page: fixed-label;
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      max-width: ${LABEL_W_MM}mm;
      max-height: ${LABEL_H_MM}mm;
      min-height: 0;
      padding: 1.5mm 1.5mm 1mm;
      overflow: hidden;
      display: block;
    }
    .print-size--fill .sticker {
      page: fill-sheet;
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      max-width: ${LABEL_W_MM}mm;
      max-height: ${LABEL_H_MM}mm;
      min-height: 0;
      padding: 1.5mm 1.5mm 1mm;
      overflow: hidden;
      display: block;
    }
    .print-size--label_80x50 .sticker {
      page: fixed-label;
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      max-width: ${LABEL_W_MM}mm;
      max-height: ${LABEL_H_MM}mm;
      min-height: 0;
      padding: 1.5mm 1.5mm 1mm;
      overflow: hidden;
      display: block;
    }

    .head {
      flex-shrink: 0;
      border-bottom: 0.4pt solid #000;
      padding-bottom: 0.4em;
      margin-bottom: 0.5em;
    }
    .print-size--label_80x50 .head {
      border-bottom-width: 0.35mm;
      padding-bottom: 0.15em;
      margin-bottom: 0.25em;
    }
    .head__title {
      font-weight: 700;
      line-height: 1.05;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .print-size--label_80x50 .head__title {
      font-size: 7pt;
      font-weight: 900;
      -webkit-line-clamp: 1;
    }
    .print-size--auto .head__title,
    .print-size--fill .head__title { font-size: clamp(6pt, 2.4vmin, 12pt); }

    .head__sub {
      font-weight: 600;
      margin-top: 0.15em;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .print-size--label_80x50 .head__sub { font-size: 5.5pt; font-weight: 800; }
    .print-size--auto .head__sub,
    .print-size--fill .head__sub { font-size: clamp(5pt, 1.8vmin, 9pt); }

    .body {
      flex: 1;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: stretch;
      gap: 0.8em;
      min-height: 0;
    }
    .print-size--label_80x50 .body,
    .print-size--auto .body,
    .print-size--fill .body {
      display: table;
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      flex: none;
      min-height: 0;
    }
    .col-left {
      flex: 1 1 auto;
      min-width: 0;
    }
    .mat {
      font-weight: 700;
      line-height: 1.05;
      margin-bottom: 0.25em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .print-size--label_80x50 .mat { font-size: 6pt; font-weight: 900; }
    .print-size--auto .mat,
    .print-size--fill .mat { font-size: clamp(5.5pt, 2vmin, 10pt); }

    .desc1 {
      margin-bottom: 0.25em;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .print-size--label_80x50 .desc1 { font-size: 5.5pt; font-weight: 800; }
    .print-size--auto .desc1,
    .print-size--fill .desc1 { font-size: clamp(5pt, 1.7vmin, 9pt); }

    .ref {
      font-weight: 700;
      margin-bottom: 0.4em;
    }
    .print-size--label_80x50 .ref { font-size: 7pt; font-weight: 900; }
    .print-size--auto .ref,
    .print-size--fill .ref { font-size: clamp(6pt, 2.2vmin, 11pt); }

    .diagram-grid {
      display: grid;
      grid-template-rows: ${DIAGRAM_ROW_EDGE_MM}mm ${DIAGRAM_ROW_CENTER_MM}mm ${DIAGRAM_ROW_EDGE_MM}mm;
      grid-template-columns: ${DIAGRAM_COL_SIDE_MM}mm ${DIAGRAM_COL_CENTER_MM}mm ${DIAGRAM_COL_SIDE_MM}mm;
      gap: 0;
      align-items: center;
      justify-items: center;
      width: ${DIAGRAM_COL_SIDE_MM * 2 + DIAGRAM_COL_CENTER_MM}mm;
      flex-shrink: 0;
    }

    .edge {
      font-weight: 700;
      line-height: 1;
      overflow: hidden;
      word-break: break-word;
      text-align: center;
    }
    .print-size--label_80x50 .edge { font-size: 5pt; font-weight: 900; }
    .print-size--auto .edge,
    .print-size--fill .edge { font-size: clamp(4pt, 1.5vmin, 8pt); }

    .edge--up { grid-column: 1 / -1; }
    .edge--lo { grid-column: 1 / -1; }
    .edge--left { text-align: right; }
    .edge--right { text-align: left; }

    .piece-wrap {
      grid-column: 2;
      grid-row: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${DIAGRAM_COL_CENTER_MM}mm;
      height: ${DIAGRAM_ROW_CENTER_MM}mm;
      min-width: ${DIAGRAM_COL_CENTER_MM}mm;
      min-height: ${DIAGRAM_ROW_CENTER_MM}mm;
      max-width: ${DIAGRAM_COL_CENTER_MM}mm;
      max-height: ${DIAGRAM_ROW_CENTER_MM}mm;
      overflow: hidden;
    }

    .piece-shape {
      width: ${PIECE_FRAME_W_MM}mm;
      height: ${PIECE_FRAME_H_MM}mm;
      min-width: ${PIECE_FRAME_W_MM}mm;
      min-height: ${PIECE_FRAME_H_MM}mm;
      max-width: ${PIECE_FRAME_W_MM}mm;
      max-height: ${PIECE_FRAME_H_MM}mm;
      border: 0.4mm solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.4mm;
      overflow: hidden;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .piece-shape__inner {
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: ${PIECE_INNER_MAX_W_MM}mm;
      max-height: ${PIECE_INNER_MAX_H_MM}mm;
      overflow: hidden;
      flex-shrink: 0;
    }

    .piece-shape__txt {
      font-weight: 700;
      text-align: center;
      line-height: 1.05;
      font-size: 5pt;
      max-width: ${PIECE_INNER_MAX_W_MM}mm;
      max-height: ${PIECE_INNER_MAX_H_MM}mm;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .print-size--label_80x50 .piece-shape__txt { font-size: 5pt; font-weight: 900; }

    .col-right {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .print-size--label_80x50 .col-left,
    .print-size--label_80x50 .col-right,
    .print-size--auto .col-left,
    .print-size--auto .col-right,
    .print-size--fill .col-left,
    .print-size--fill .col-right {
      display: table-cell;
      vertical-align: top;
    }
    .print-size--label_80x50 .col-right,
    .print-size--auto .col-right,
    .print-size--fill .col-right {
      width: 24mm;
      font-size: 6pt;
      font-weight: 900;
    }

    .qr { line-height: 0; margin-bottom: 0.4em; width: 100%; text-align: center; }
    .print-size--label_80x50 .qr img {
      width: 18mm;
      height: 18mm;
      display: inline-block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .print-size--auto .qr img,
    .print-size--fill .qr img {
      width: 88%;
      max-width: 100%;
      height: auto;
      aspect-ratio: 1;
      object-fit: contain;
      display: inline-block;
    }
    .qr--empty {
      word-break: break-all;
      border: 0.4pt dashed #999;
      padding: 0.5mm;
      font-size: 4pt;
    }

    .dims {
      font-family: ui-monospace, Consolas, monospace;
      font-weight: 700;
      line-height: 1.1;
      align-self: stretch;
      padding-left: 0.3em;
    }
    .print-size--label_80x50 .dims { font-size: 7pt; font-weight: 900; }
    .print-size--auto .dims,
    .print-size--fill .dims { font-size: clamp(6.5pt, 2.4vmin, 12pt); }

    .frac { margin-top: 0.25em; font-weight: 700; }
    .print-size--label_80x50 .frac { font-size: 7pt; font-weight: 900; }
    .print-size--auto .frac,
    .print-size--fill .frac { font-size: clamp(6pt, 2.2vmin, 11pt); }

    .foot {
      margin-top: auto;
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 0.5em;
      font-weight: 700;
      padding-top: 0.25em;
    }
    .print-size--label_80x50 .foot { font-size: 5.5pt; font-weight: 900; }
    .print-size--auto .foot,
    .print-size--fill .foot { font-size: clamp(5pt, 1.8vmin, 9pt); }

    .print-orient--portrait .body {
      display: block !important;
    }
    .print-orient--portrait .col-left,
    .print-orient--portrait .col-right {
      display: block !important;
      width: 100% !important;
    }
    .print-orient--portrait .col-right {
      margin-top: 1.5mm;
      display: flex !important;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1mm;
    }
    .print-orient--portrait .col-right .qr {
      flex: 0 0 auto;
      margin-bottom: 0;
    }
    .print-orient--portrait .col-right .dims,
    .print-orient--portrait .col-right .frac {
      flex: 1 1 auto;
    }
    .print-orient--portrait .col-right .foot {
      flex: 1 1 100%;
      margin-top: 0.5mm;
    }
    .print-orient--portrait .col-right .qr img {
      width: 16mm;
      height: 16mm;
    }

    @media print {
      html, body { width: 100%; height: 100%; }
      html.print-size--label_80x50,
      body.print-size--label_80x50 {
        width: ${LABEL_W_MM}mm !important;
        height: ${LABEL_H_MM}mm !important;
        min-height: 0 !important;
        max-width: ${LABEL_W_MM}mm !important;
        max-height: ${LABEL_H_MM}mm !important;
        overflow: hidden !important;
      }
      .print-size--auto .sticker,
      .print-size--fill .sticker {
        width: ${LABEL_W_MM}mm !important;
        height: ${LABEL_H_MM}mm !important;
        min-height: 0 !important;
        max-height: ${LABEL_H_MM}mm !important;
        page-break-after: always;
        page-break-inside: avoid;
      }
      .print-size--auto .sticker:last-child,
      .print-size--fill .sticker:last-child,
      .print-size--label_80x50 .sticker:last-child {
        page-break-after: avoid;
      }
      .print-size--label_80x50 .sticker {
        width: ${LABEL_W_MM}mm !important;
        height: ${LABEL_H_MM}mm !important;
        min-height: 0 !important;
        max-height: ${LABEL_H_MM}mm !important;
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      .print-size--label_80x50 .body,
      .print-size--auto .body,
      .print-size--fill .body {
        display: table !important;
      }
      .print-size--label_80x50 .col-left,
      .print-size--label_80x50 .col-right,
      .print-size--auto .col-left,
      .print-size--auto .col-right,
      .print-size--fill .col-left,
      .print-size--fill .col-right {
        display: table-cell !important;
        vertical-align: top !important;
      }
      .print-orient--portrait .body {
        display: block !important;
      }
      .print-orient--portrait .col-left,
      .print-orient--portrait .col-right {
        display: block !important;
        width: 100% !important;
      }
      .print-size--label_80x50 .qr img {
        filter: contrast(1.35);
      }
    }
  `
}

const LOADING_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta</title>
<style>body{font-family:system-ui,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head><body><p>Generando etiqueta…</p></body></html>`

export function openStickerPrintWindow() {
  const w = window.open('about:blank', '_blank')
  if (!w) return null
  try {
    w.document.open()
    w.document.write(LOADING_HTML)
    w.document.close()
  } catch {
    try {
      w.close()
    } catch {
      /* ignore */
    }
    return null
  }
  return w
}

function triggerPrint(win) {
  let started = false
  const run = () => {
    if (started) return
    started = true

    const printJob = () => {
      try {
        win.focus()
      } catch {
        /* ignore */
      }
      try {
        win.print()
      } catch {
        /* ignore */
      }
    }
    const doc = win.document
    const fontsReady =
      doc.fonts && typeof doc.fonts.ready?.then === 'function'
        ? doc.fonts.ready
        : Promise.resolve()
    fontsReady
      .catch(() => undefined)
      .finally(() => {
        requestAnimationFrame(() => {
          setTimeout(printJob, 800)
        })
      })
  }
  const img = win.document.querySelector('.qr img')
  if (img && !img.complete) {
    img.addEventListener('load', run, { once: true })
    img.addEventListener('error', run, { once: true })
    setTimeout(run, 3000)
  } else {
    run()
  }
}

function writeAndPrint(win, html) {
  win.document.open()
  win.document.write(html)
  win.document.close()
  triggerPrint(win)
}

function printViaIframe(html) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Impresión etiqueta')
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(iframe)
  const win = iframe.contentWindow
  if (!win) {
    iframe.remove()
    throw new Error('No se pudo preparar la impresión.')
  }
  writeAndPrint(win, html)
  setTimeout(() => {
    try {
      iframe.remove()
    } catch {
      /* ignore */
    }
  }, 120_000)
}

function buildStickerInnerHtml(data) {
  const {
    scanCode,
    headerTitle,
    bookingCode,
    matLine,
    subDesc,
    refLine,
    centerLabel,
    upLabel,
    loLabel,
    leftLabel,
    rightLabel,
    qrBlock,
    L,
    A,
    numeroPieza,
    cantidad,
    pCode,
    printedAt,
    longitud,
    ancho,
  } = data
  const booking = bookingCode ? String(bookingCode).trim() : ''
  const innerStyle = pieceShapeInnerStyle(longitud, ancho)

  return `
  <div class="sticker">
    <header class="head">
      <h1 class="head__title">${esc(headerTitle)}</h1>
      ${booking ? `<p class="head__sub">${esc(booking)}</p>` : ''}
    </header>
    <div class="body">
      <div class="col-left">
        <div class="mat">${esc(matLine)}</div>
        ${subDesc ? `<div class="desc1">${esc(subDesc)}</div>` : ''}
        <div class="ref">${esc(refLine)}</div>
        <div class="diagram-grid">
          ${upLabel ? `<div class="edge edge--up">${esc(upLabel)}</div>` : '<div class="edge edge--up"></div>'}
          <div class="edge edge--left">${leftLabel ? esc(leftLabel) : ''}</div>
          <div class="piece-wrap">
            <div class="piece-shape">
              <div class="piece-shape__inner" style="${innerStyle}">
                <div class="piece-shape__txt">${esc(centerLabel)}</div>
              </div>
            </div>
          </div>
          <div class="edge edge--right">${rightLabel ? esc(rightLabel) : ''}</div>
          ${loLabel ? `<div class="edge edge--lo">${esc(loLabel)}</div>` : '<div class="edge edge--lo"></div>'}
        </div>
      </div>
      <div class="col-right">
        ${qrBlock}
        <div class="dims">
          <div>L: ${L != null ? esc(String(L)) : '—'}</div>
          <div>A: ${A != null ? esc(String(A)) : '—'}</div>
        </div>
        <div class="frac">${esc(String(numeroPieza))} / ${esc(String(cantidad))}</div>
        <div class="foot">
          <span>${esc(pCode)}</span>
          <span>${esc(formatStickerDate(printedAt))}</span>
        </div>
      </div>
    </div>
  </div>`
}

function buildStickerHtml(data) {
  const { scanCode, printSize, printOrientation = 'landscape' } = data
  const sizeClass = `print-size--${printSize}`
  const orientClass = `print-orient--${printOrientation}`

  return `<!DOCTYPE html>
<html lang="es" class="print-size ${sizeClass} ${orientClass}">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta ${esc(scanCode)}</title>
  <style>${buildStyles(printOrientation)}</style>
</head>
<body class="print-size ${sizeClass} ${orientClass}">
  ${buildStickerInnerHtml(data)}
</body>
</html>`
}

function buildBulkStickerHtml(items, printSize, printOrientation = 'landscape') {
  const sizeClass = `print-size--${printSize}`
  const orientClass = `print-orient--${printOrientation}`
  const bodies = items.map((item) => buildStickerInnerHtml(item)).join('\n')
  return `<!DOCTYPE html>
<html lang="es" class="print-size ${sizeClass} ${orientClass}">
<head>
  <meta charset="utf-8" />
  <title>Etiquetas (${items.length})</title>
  <style>${buildStyles(printOrientation)}</style>
</head>
<body class="print-size ${sizeClass} ${orientClass}">
  ${bodies}
</body>
</html>`
}

export async function resolveStickerItemData({ order, part, piece, printSize, printOrientation = 'landscape' }) {
  const orderName = order?.orderName ?? ''
  const partNumberRaw = part?.partNumber ?? part?.partnumber
  const partNumber =
    partNumberRaw != null && Number(partNumberRaw) > 0 ? Number(partNumberRaw) : null
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const scanCode = buildScanCode(
    orderName,
    partNumber ?? part?.partCode?.replace(/^P/i, '') ?? null,
    numeroPieza,
  )
  const printedAt = new Date()
  const qrPixels = printSize === 'label_80x50' ? 512 : 180
  let qrBlock = ''
  try {
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(scanCode, {
      errorCorrectionLevel: 'M',
      margin: 0,
      width: qrPixels,
      color: { dark: '#000000', light: '#ffffff' },
    })
    qrBlock = `<div class="qr"><img src="${dataUrl}" alt="" width="${qrPixels}" height="${qrPixels}" /></div>`
  } catch {
    qrBlock = `<div class="qr qr--empty">${esc(scanCode)}</div>`
  }

  return {
    scanCode,
    headerTitle: String(orderName).toUpperCase(),
    bookingCode: order?.bookingCode,
    matLine: materialLine(part?.material, part?.descripcion),
    subDesc: joinNonEmpty([part?.descripcion1]),
    refLine: partNumber != null && partNumber !== '' ? String(partNumber) : '0',
    centerLabel: String(part?.descripcion ?? '—').trim(),
    upLabel: String(part?.matedgeup ?? '').trim(),
    loLabel: String(part?.matedgelo ?? '').trim(),
    leftLabel: String(part?.matedgel ?? '').trim(),
    rightLabel: String(part?.matedger ?? '').trim(),
    qrBlock,
    L: roundDim(part?.longitud),
    A: roundDim(part?.ancho),
    longitud: part?.longitud,
    ancho: part?.ancho,
    numeroPieza,
    cantidad,
    pCode: `P${partNumber != null && partNumber !== '' ? String(partNumber) : '0'}`,
    printedAt,
    printSize,
    printOrientation,
    partId: part?.partId ?? null,
    piezaId: piece?.piezaId ?? null,
  }
}

/**
 * @param {object} opts
 * @param {Array<{ order: object, part: object, piece: object }>} opts.items
 * @param {'auto'|'fill'|'label_80x50'} [opts.printSize]
 * @param {Window|null} [opts.printWindow]
 */
export async function printBiessePartStickersBulk({
  items,
  printSize = getStickerPrintSize(),
  printOrientation = 'landscape',
  printWindow = null,
}) {
  if (!items?.length) {
    throw new Error('No hay etiquetas para imprimir.')
  }
  if (items.length > 10) {
    throw new Error('Máximo 10 etiquetas por impresión masiva.')
  }

  const resolved = await Promise.all(
    items.map(({ order, part, piece }) =>
      resolveStickerItemData({ order, part, piece, printSize, printOrientation }),
    ),
  )

  if (printSize === 'label_80x50') {
    try {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]
        const zpl = buildBiessePartStickerZpl({
          scanCode: resolved[i].scanCode,
          orderName: item.order?.orderName,
          bookingCode: item.order?.bookingCode,
          part: item.part,
          piece: item.piece,
          printedAt: resolved[i].printedAt,
          orientation: printOrientation,
        })
        await sendZplToZebra(zpl)
      }
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.close()
        } catch {
          /* ignore */
        }
      }
      return resolved.map((r) => ({
        qrCode: r.scanCode,
        printedAt: r.printedAt.toISOString(),
        printMethod: 'zpl',
      }))
    } catch {
      /* continuar con HTML */
    }
  }

  const html = buildBulkStickerHtml(resolved, printSize, printOrientation)
  let w = printWindow && !printWindow.closed ? printWindow : null
  if (!w) {
    w = window.open('about:blank', '_blank')
  }
  if (w) {
    writeAndPrint(w, html)
  } else {
    printViaIframe(html)
  }

  return resolved.map((r) => ({
    qrCode: r.scanCode,
    printedAt: r.printedAt.toISOString(),
    printMethod: 'html',
  }))
}

/**
 * @param {object} opts
 * @param {{ orderName?: string, bookingCode?: string|null }} opts.order
 * @param {object} opts.part
 * @param {{ numeroPieza?: number, piezaId?: number|null }} opts.piece
 * @param {Window|null} [opts.printWindow]
 * @param {'auto'|'fill'|'label_80x50'} [opts.printSize]
 * @returns {Promise<{ qrCode: string, printedAt: string, printMethod?: 'zpl' | 'html' }>}
 */
export async function printBiessePartSticker({
  order,
  part,
  piece,
  printWindow = null,
  printSize = getStickerPrintSize(),
  printOrientation = 'landscape',
}) {
  const orderName = order?.orderName ?? ''
  const partNumberRaw = part?.partNumber ?? part?.partnumber
  const partNumber =
    partNumberRaw != null && Number(partNumberRaw) > 0
      ? Number(partNumberRaw)
      : null
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const scanCode = buildScanCode(
    orderName,
    partNumber ?? part?.partCode?.replace(/^P/i, '') ?? null,
    numeroPieza,
  )
  const printedAt = new Date()

  if (printSize === 'label_80x50') {
    const zpl = buildBiessePartStickerZpl({
      scanCode,
      orderName,
      bookingCode: order?.bookingCode,
      part,
      piece,
      printedAt,
      orientation: printOrientation,
    })
    try {
      await sendZplToZebra(zpl)
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.close()
        } catch {
          /* ignore */
        }
      }
      return { qrCode: scanCode, printedAt: printedAt.toISOString(), printMethod: 'zpl' }
    } catch {
      /* Browser Print no disponible: continuar con HTML */
    }
  }

  const stickerData = await resolveStickerItemData({ order, part, piece, printSize, printOrientation })
  const html = buildStickerHtml(stickerData)

  let w = printWindow && !printWindow.closed ? printWindow : null
  if (!w) {
    w = window.open('about:blank', '_blank')
  }

  if (w) {
    writeAndPrint(w, html)
  } else {
    try {
      printViaIframe(html)
    } catch {
      window.alert(
        'No se pudo abrir la impresión.\n\n' +
          'Permite ventanas emergentes para este sitio o pulsa Imprimir de nuevo.'
      )
      throw new Error('impresión no disponible')
    }
  }

  return { qrCode: scanCode, printedAt: printedAt.toISOString(), printMethod: 'html' }
}
