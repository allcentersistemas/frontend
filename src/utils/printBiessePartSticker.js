/**
 * Ventana de impresión: etiqueta de pieza (estilo taller / Biesse scan).
 * El QR usa el mismo formato que {@code GET /api/biesse/scan/pieces/resolve?code=}.
 */

import { buildBiessePartStickerZpl, ZEBRA_LABEL_SIZES } from './buildBiessePartStickerZpl.js'
import { getStickerPrintSize, isZebraZplSize } from './stickerPrintSize.js'
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

function materialLine(material) {
  return String(material ?? '').trim().toUpperCase() || '—'
}

/** Marco del diagrama de pieza: tamaño fijo grande (estilo imagen 2 / taller). */
const PIECE_FRAME_W_MM = 40
const PIECE_FRAME_H_MM = 22
const DIAGRAM_COL_SIDE_MM = 10
const DIAGRAM_COL_CENTER_MM = 42
const DIAGRAM_ROW_EDGE_MM = 5
const DIAGRAM_ROW_CENTER_MM = 24

function labelSizeMm(printSize, orientation) {
  const zebra = ZEBRA_LABEL_SIZES[printSize]
  const w = zebra?.wMm ?? 80
  const h = zebra?.hMm ?? 50
  if (orientation === 'portrait') {
    return { w: h, h: w }
  }
  return { w, h }
}

function buildStyles(orientation = 'landscape', printSize = 'label_80x50') {
  const { w: LABEL_W_MM, h: LABEL_H_MM } = labelSizeMm(printSize, orientation)
  const pageOrient = orientation === 'portrait' ? 'portrait' : 'landscape'
  const zebraClass = isZebraZplSize(printSize)
      ? `
    html.print-size--${printSize},
    body.print-size--${printSize} {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      max-width: ${LABEL_W_MM}mm;
      max-height: ${LABEL_H_MM}mm;
      overflow: hidden;
    }`
      : ''

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
    ${zebraClass}
    html.print-bulk,
    body.print-bulk {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
      max-height: none !important;
      overflow: visible !important;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    .sticker {
      display: flex;
      flex-direction: column;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 400;
    }

    .print-size--auto .sticker,
    .print-size--fill .sticker,
    .print-size--label_80x50 .sticker,
    .print-size--label_100x50 .sticker,
    .print-size--label_60x40 .sticker {
      page: fixed-label;
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      max-width: ${LABEL_W_MM}mm;
      max-height: ${LABEL_H_MM}mm;
      min-height: 0;
      padding: 1.5mm;
      overflow: hidden;
      display: block;
    }
    .print-size--fill .sticker { page: fill-sheet; }

    /* Encabezado solo en columna izquierda — sin línea que toque el QR */
    .head {
      flex-shrink: 0;
      border-bottom: none;
      padding-bottom: 0.4mm;
      margin-bottom: 0.8mm;
    }
    .head__title {
      font-weight: 400;
      line-height: 1.12;
      font-size: 10.5pt;
      letter-spacing: 0.02em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .head__sub {
      font-weight: 400;
      margin-top: 0.15em;
      font-size: 8pt;
      letter-spacing: 0.015em;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .body {
      display: table;
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      min-height: 0;
    }
    .col-left,
    .col-right {
      display: table-cell;
      vertical-align: top;
    }
    .col-left { width: auto; padding-right: 1.5mm; }
    .col-right {
      width: 22mm;
      text-align: center;
      vertical-align: top;
    }

    .mat {
      font-weight: 400;
      font-size: 9.5pt;
      line-height: 1.12;
      letter-spacing: 0.015em;
      margin-bottom: 0.4mm;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .desc1 {
      font-size: 8pt;
      font-weight: 400;
      letter-spacing: 0.015em;
      margin-bottom: 0.4mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ref {
      font-size: 10pt;
      font-weight: 400;
      letter-spacing: 0.02em;
      margin-bottom: 1mm;
    }

    .diagram-grid {
      display: grid;
      grid-template-rows: ${DIAGRAM_ROW_EDGE_MM}mm ${DIAGRAM_ROW_CENTER_MM}mm ${DIAGRAM_ROW_EDGE_MM}mm;
      grid-template-columns: ${DIAGRAM_COL_SIDE_MM}mm ${DIAGRAM_COL_CENTER_MM}mm ${DIAGRAM_COL_SIDE_MM}mm;
      gap: 0.3mm;
      align-items: center;
      justify-items: center;
      width: ${DIAGRAM_COL_SIDE_MM * 2 + DIAGRAM_COL_CENTER_MM}mm;
      max-width: 100%;
      flex-shrink: 0;
    }

    .edge {
      font-weight: 400;
      font-size: 7.5pt;
      letter-spacing: 0.02em;
      line-height: 1.05;
      overflow: hidden;
      word-break: break-word;
      text-align: center;
    }
    .edge--up { grid-column: 1 / -1; }
    .edge--lo { grid-column: 1 / -1; }
    .edge--left { text-align: right; justify-self: end; max-width: ${DIAGRAM_COL_SIDE_MM}mm; }
    .edge--right { text-align: left; justify-self: start; max-width: ${DIAGRAM_COL_SIDE_MM}mm; }

    .piece-wrap {
      grid-column: 2;
      grid-row: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${DIAGRAM_COL_CENTER_MM}mm;
      height: ${DIAGRAM_ROW_CENTER_MM}mm;
      overflow: hidden;
    }

    .piece-shape {
      width: ${PIECE_FRAME_W_MM}mm;
      height: ${PIECE_FRAME_H_MM}mm;
      min-width: ${PIECE_FRAME_W_MM}mm;
      min-height: ${PIECE_FRAME_H_MM}mm;
      max-width: ${PIECE_FRAME_W_MM}mm;
      max-height: ${PIECE_FRAME_H_MM}mm;
      border: 0.45mm solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.6mm;
      overflow: hidden;
      box-sizing: border-box;
    }

    .piece-shape__txt {
      font-weight: 400;
      text-align: center;
      line-height: 1.12;
      font-size: 9pt;
      letter-spacing: 0.02em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }

    .qr { line-height: 0; margin-bottom: 0.8mm; width: 100%; text-align: center; }
    .qr img {
      width: 17mm;
      height: 17mm;
      display: inline-block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .qr--empty {
      word-break: break-all;
      border: 0.4pt dashed #999;
      padding: 0.5mm;
      font-size: 5pt;
    }

    .dims {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 400;
      font-size: 9.5pt;
      letter-spacing: 0.02em;
      line-height: 1.15;
      text-align: left;
      padding-left: 0.5mm;
    }
    .frac {
      margin-top: 0.6mm;
      font-size: 9pt;
      font-weight: 400;
      letter-spacing: 0.02em;
      text-align: left;
      padding-left: 0.5mm;
    }
    .foot {
      margin-top: 1.5mm;
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 0.5em;
      font-weight: 400;
      font-size: 8pt;
      letter-spacing: 0.015em;
    }
    .col-left .foot {
      margin-top: 2mm;
    }

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

    @media print {
      html, body { width: 100%; height: 100%; }
      .print-size--auto .sticker,
      .print-size--fill .sticker,
      .print-size--label_80x50 .sticker,
      .print-size--label_100x50 .sticker,
      .print-size--label_60x40 .sticker {
        width: ${LABEL_W_MM}mm !important;
        height: ${LABEL_H_MM}mm !important;
        min-height: 0 !important;
        max-height: ${LABEL_H_MM}mm !important;
        page-break-inside: avoid;
      }
      body.print-bulk .sticker {
        page-break-after: always !important;
        break-after: page !important;
      }
      body.print-bulk .sticker:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .body { display: table !important; }
      .col-left, .col-right {
        display: table-cell !important;
        vertical-align: top !important;
      }
      .print-orient--portrait .body { display: block !important; }
      .print-orient--portrait .col-left,
      .print-orient--portrait .col-right {
        display: block !important;
        width: 100% !important;
      }
      .qr img { filter: contrast(1.5); }
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

  const imgs = [...win.document.querySelectorAll('.qr img')]
  const pending = imgs.filter((img) => !img.complete)
  if (pending.length > 0) {
    let settled = 0
    const onSettled = () => {
      settled += 1
      if (settled >= pending.length) run()
    }
    for (const img of pending) {
      img.addEventListener('load', onSettled, { once: true })
      img.addEventListener('error', onSettled, { once: true })
    }
    setTimeout(run, 5000)
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
  } = data
  const booking = bookingCode ? String(bookingCode).trim() : ''

  return `
  <div class="sticker">
    <div class="body">
      <div class="col-left">
        <header class="head">
          <h1 class="head__title">${esc(headerTitle)}</h1>
          ${booking ? `<p class="head__sub">${esc(booking)}</p>` : ''}
        </header>
        <div class="mat">${esc(matLine)}</div>
        ${subDesc ? `<div class="desc1">${esc(subDesc)}</div>` : ''}
        <div class="ref">${esc(refLine)}</div>
        <div class="diagram-grid">
          ${upLabel ? `<div class="edge edge--up">${esc(upLabel)}</div>` : '<div class="edge edge--up"></div>'}
          <div class="edge edge--left">${leftLabel ? esc(leftLabel) : ''}</div>
          <div class="piece-wrap">
            <div class="piece-shape">
              <div class="piece-shape__txt">${esc(centerLabel)}</div>
            </div>
          </div>
          <div class="edge edge--right">${rightLabel ? esc(rightLabel) : ''}</div>
          ${loLabel ? `<div class="edge edge--lo">${esc(loLabel)}</div>` : '<div class="edge edge--lo"></div>'}
        </div>
        <div class="foot">
          <span>${esc(pCode)}</span>
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
  <style>${buildStyles(printOrientation, printSize)}</style>
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
<html lang="es" class="print-size ${sizeClass} ${orientClass} print-bulk">
<head>
  <meta charset="utf-8" />
  <title>Etiquetas (${items.length})</title>
  <style>${buildStyles(printOrientation, printSize)}</style>
</head>
<body class="print-size ${sizeClass} ${orientClass} print-bulk">
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
  const qrPixels = isZebraZplSize(printSize) ? 512 : 180
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
    matLine: materialLine(part?.material),
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
 * @param {'auto'|'fill'|'label_80x50'|'label_100x50'|'label_60x40'} [opts.printSize]
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

  if (isZebraZplSize(printSize)) {
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
          labelSize: printSize,
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
 * @param {'auto'|'fill'|'label_80x50'|'label_100x50'|'label_60x40'} [opts.printSize]
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
  const scanCode = buildScanCode(
      orderName,
      partNumber ?? part?.partCode?.replace(/^P/i, '') ?? null,
      numeroPieza,
  )
  const printedAt = new Date()

  if (isZebraZplSize(printSize)) {
    const zpl = buildBiessePartStickerZpl({
      scanCode,
      orderName,
      bookingCode: order?.bookingCode,
      part,
      piece,
      printedAt,
      orientation: printOrientation,
      labelSize: printSize,
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