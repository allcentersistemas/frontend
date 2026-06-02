/**
 * Ventana de impresión: etiqueta de pieza (estilo taller / Biesse scan).
 * El QR usa el mismo formato que {@code GET /api/biesse/scan/pieces/resolve?code=}.
 */

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
  const pn = partNumber != null && partNumber !== '' ? String(partNumber).trim() : ''
  const nz = numeroPieza != null ? String(numeroPieza).trim() : '1'
  if (!name || !pn) return `${name || 'orden'}-P0-${nz}`
  return `${name}-P${pn}-${nz}`
}

function joinNonEmpty(parts, sep = ' ') {
  return parts.map((p) => (p == null ? '' : String(p).trim())).filter((p) => p !== '').join(sep)
}

function materialLine(material, descripcion) {
  return joinNonEmpty([material, descripcion]).toUpperCase() || '—'
}

/** Etiqueta Zebra ZD230: 80 mm ancho × 50 mm alto (horizontal). */
const LABEL_W_MM = 80
const LABEL_H_MM = 50
const QR_MM = 16

function pieceShapeMm(longitud, ancho) {
  const L = roundDim(longitud)
  const A = roundDim(ancho)
  const maxW = 20
  const maxH = 10
  if (L == null || A == null || L <= 0 || A <= 0) {
    return { width: 16, height: 8 }
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

const LOADING_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta</title>
<style>body{font-family:system-ui,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head><body><p>Generando etiqueta…</p></body></html>`

/** Abrir ventana en el mismo instante del clic (antes de cualquier await). */
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
  const run = () => {
    try {
      win.focus()
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      try {
        win.print()
      } catch {
        /* ignore */
      }
    }, 400)
  }
  const img = win.document.querySelector('.qr img')
  if (img && !img.complete) {
    img.addEventListener('load', run, { once: true })
    img.addEventListener('error', run, { once: true })
  } else if (win.document.readyState === 'complete') {
    run()
  } else {
    win.addEventListener('load', run, { once: true })
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

function buildStickerHtml({
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
  shape,
}) {
  const booking = bookingCode ? String(bookingCode).trim() : ''
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta ${esc(scanCode)}</title>
  <style>
    @page {
      size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm landscape;
      size: 3.15in 1.97in landscape;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      overflow: hidden;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sticker {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      padding: 1mm 1.5mm;
      display: flex;
      flex-direction: column;
    }
    .head {
      flex-shrink: 0;
      border-bottom: 0.4pt solid #000;
      padding-bottom: 0.5mm;
      margin-bottom: 0.6mm;
    }
    .head__title {
      font-size: 6pt;
      font-weight: 700;
      line-height: 1.05;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .head__sub {
      font-size: 5pt;
      font-weight: 600;
      margin-top: 0.2mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .body {
      flex: 1;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: stretch;
      gap: 1mm;
      min-height: 0;
    }
    .col-left {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 5.5pt;
    }
    .mat {
      font-weight: 700;
      font-size: 5.5pt;
      line-height: 1.05;
      margin-bottom: 0.3mm;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .desc1 {
      font-size: 5pt;
      margin-bottom: 0.3mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ref {
      font-size: 6pt;
      font-weight: 700;
      margin-bottom: 0.5mm;
    }
    .diagram-grid {
      display: grid;
      grid-template-columns: 6mm 1fr 6mm;
      grid-template-rows: auto 1fr auto;
      gap: 0.2mm 0.3mm;
      align-items: center;
    }
    .edge {
      font-size: 4pt;
      font-weight: 700;
      line-height: 1;
      overflow: hidden;
      word-break: break-word;
      text-align: center;
    }
    .edge--up { grid-column: 1 / -1; max-height: 3mm; }
    .edge--lo { grid-column: 1 / -1; max-height: 3mm; }
    .edge--left { text-align: right; }
    .edge--right { text-align: left; }
    .piece-wrap {
      grid-column: 2;
      grid-row: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 10mm;
    }
    .piece-shape {
      border: 1pt solid #000;
      width: ${shape.width}mm;
      height: ${shape.height}mm;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.3mm;
    }
    .piece-shape__txt {
      font-size: 4pt;
      font-weight: 700;
      text-align: center;
      line-height: 1.05;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .col-right {
      flex: 0 0 22mm;
      width: 22mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 5.5pt;
    }
    .qr { line-height: 0; margin-bottom: 0.5mm; }
    .qr img {
      width: ${QR_MM}mm;
      height: ${QR_MM}mm;
      display: block;
    }
    .qr--empty {
      font-size: 4pt;
      word-break: break-all;
      border: 0.4pt dashed #999;
      padding: 0.5mm;
    }
    .dims {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 6.5pt;
      font-weight: 700;
      line-height: 1.1;
      align-self: stretch;
      padding-left: 1mm;
    }
    .frac { margin-top: 0.3mm; font-size: 6pt; font-weight: 700; }
    .foot {
      margin-top: auto;
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 1mm;
      font-size: 5pt;
      font-weight: 700;
      padding-top: 0.3mm;
    }
    @media print {
      @page {
        size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm landscape;
        size: 3.15in 1.97in landscape;
        margin: 0;
      }
      html, body, .sticker {
        width: ${LABEL_W_MM}mm !important;
        height: ${LABEL_H_MM}mm !important;
      }
      .body {
        display: flex !important;
        flex-direction: row !important;
      }
    }
  </style>
</head>
<body>
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
              <div class="piece-shape__txt">${esc(centerLabel)}</div>
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
  </div>
</body>
</html>`
}

/**
 * @param {object} opts
 * @param {{ orderName?: string, bookingCode?: string|null }} opts.order
 * @param {object} opts.part
 * @param {{ numeroPieza?: number, piezaId?: number|null }} opts.piece
 * @param {Window|null} [opts.printWindow] ventana abierta al hacer clic
 * @returns {Promise<{ qrCode: string, printedAt: string }>}
 */
export async function printBiessePartSticker({ order, part, piece, printWindow = null }) {
  const orderName = order?.orderName ?? ''
  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const scanCode = buildScanCode(orderName, partNumber, numeroPieza)
  const printedAt = new Date()

  let qrBlock = ''
  try {
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(scanCode, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
    })
    qrBlock = `<div class="qr"><img src="${dataUrl}" alt="" /></div>`
  } catch {
    qrBlock = `<div class="qr qr--empty">${esc(scanCode)}</div>`
  }

  const html = buildStickerHtml({
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
    numeroPieza,
    cantidad,
    pCode: `P${partNumber != null && partNumber !== '' ? String(partNumber) : '0'}`,
    printedAt,
    shape: pieceShapeMm(part?.longitud, part?.ancho),
  })

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

  return { qrCode: scanCode, printedAt: printedAt.toISOString() }
}
