/**
 * Ventana de impresión: etiqueta de pieza (estilo taller / Biesse scan).
 * Formato físico: 80 mm × 50 mm (Zebra ZD230 y similares).
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

/** Etiqueta física: 8 cm × 5 cm (ancho × alto). */
const LABEL_W_MM = 80
const LABEL_H_MM = 50
const QR_MM = 17

function pieceShapeMm(longitud, ancho) {
  const L = roundDim(longitud)
  const A = roundDim(ancho)
  const maxW = 22
  const maxH = 11
  if (L == null || A == null || L <= 0 || A <= 0) {
    return { width: 18, height: 9 }
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
    }, 300)
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

const PRINT_LOADING_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta</title>
<style>body{font-family:system-ui,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#333}</style>
</head><body><p>Generando etiqueta…</p></body></html>`

/** Abrir en el mismo tick del clic (antes de cualquier await). */
export function openStickerPrintWindow() {
  const w = window.open('about:blank', '_blank')
  if (!w) return null
  try {
    w.document.open()
    w.document.write(PRINT_LOADING_HTML)
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

function writeLabelHtml(win, html) {
  win.document.open()
  win.document.write(html)
  win.document.close()
  triggerPrint(win)
}

function printLabelViaIframe(html) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Impresión etiqueta Biesse')
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(iframe)
  const win = iframe.contentWindow
  if (!win) {
    iframe.remove()
    throw new Error('No se pudo preparar la impresión.')
  }
  writeLabelHtml(win, html)
  setTimeout(() => {
    try {
      iframe.remove()
    } catch {
      /* ignore */
    }
  }, 60_000)
}

/**
 * @param {object} opts
 * @param {{ orderName?: string, bookingCode?: string|null }} opts.order
 * @param {object} opts.part
 * @param {{ numeroPieza?: number, piezaId?: number|null }} opts.piece
 * @param {Window|null} [opts.printWindow]
 * @returns {Promise<{ qrCode: string, printedAt: string }>}
 */
export async function printBiessePartSticker({ order, part, piece, printWindow = null }) {
  const orderName = order?.orderName ?? ''
  const partNumber = part?.partNumber ?? part?.partId ?? 0
  const partCode = String(part?.partCode ?? partNumber ?? '').trim()
  const numeroPieza = piece?.numeroPieza ?? 1
  const cantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const scanCode = buildScanCode(orderName, partNumber, numeroPieza)
  const printedAt = new Date()

  let qrBlock = ''
  try {
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(scanCode, {
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 120,
    })
    qrBlock = `<div class="qr"><img src="${dataUrl}" alt="" /></div>`
  } catch {
    qrBlock = `<div class="qr qr--empty">${esc(scanCode)}</div>`
  }

  const L = roundDim(part?.longitud)
  const A = roundDim(part?.ancho)
  const refLine = partNumber != null && partNumber !== '' ? String(partNumber) : '0'
  const centerLabel = String(part?.descripcion ?? '—').trim()
  const headerTitle = String(orderName).toUpperCase()
  const booking = order?.bookingCode ? String(order.bookingCode).trim() : ''
  const subDesc = joinNonEmpty([part?.descripcion1])
  const matLine = materialLine(part?.material, part?.descripcion)
  const pCode = `P${refLine}`
  const shape = pieceShapeMm(part?.longitud, part?.ancho)
  const upLabel = String(part?.matedgeup ?? '').trim()
  const loLabel = String(part?.matedgelo ?? '').trim()
  const leftLabel = String(part?.matedgel ?? '').trim()
  const rightLabel = String(part?.matedger ?? '').trim()

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta ${esc(scanCode)}</title>
  <style>
    @page {
      size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm;
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
    .label {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      padding: 1.2mm 1.5mm;
      display: flex;
      flex-direction: column;
    }
    .head {
      flex-shrink: 0;
      border-bottom: 0.4pt solid #000;
      padding-bottom: 0.6mm;
      margin-bottom: 0.8mm;
    }
    .head__title {
      font-size: 6.5pt;
      font-weight: 700;
      line-height: 1.05;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .head__sub {
      font-size: 5.5pt;
      font-weight: 600;
      margin-top: 0.3mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .main {
      flex: 1;
      display: table;
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .main__left, .main__right {
      display: table-cell;
      vertical-align: top;
    }
    .main__left { width: 58%; padding-right: 1mm; }
    .main__right { width: 42%; text-align: center; }
    .mat {
      font-size: 6pt;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 0.4mm;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .desc1 {
      font-size: 5.5pt;
      margin-bottom: 0.4mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ref {
      font-size: 6.5pt;
      font-weight: 700;
      margin-bottom: 0.8mm;
    }
    .diagram-grid {
      display: grid;
      grid-template-columns: minmax(0, 7mm) 1fr minmax(0, 7mm);
      grid-template-rows: auto auto auto;
      gap: 0.3mm 0.4mm;
      align-items: center;
      max-width: 100%;
    }
    .edge {
      font-size: 4.5pt;
      font-weight: 700;
      line-height: 1.05;
      overflow: hidden;
      word-break: break-word;
    }
    .edge--empty { visibility: hidden; }
    .edge--up { grid-column: 1 / -1; text-align: center; max-height: 3.5mm; }
    .edge--lo { grid-column: 1 / -1; text-align: center; max-height: 3.5mm; }
    .edge--left { text-align: right; max-width: 7mm; }
    .edge--right { text-align: left; max-width: 7mm; }
    .piece-wrap {
      grid-column: 2;
      grid-row: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 12mm;
    }
    .piece-shape {
      border: 1.2pt solid #000;
      width: ${shape.width}mm;
      height: ${shape.height}mm;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.4mm;
    }
    .piece-shape__txt {
      font-size: 4.5pt;
      font-weight: 700;
      text-align: center;
      line-height: 1.05;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .qr { margin: 0 auto 0.8mm; line-height: 0; }
    .qr img {
      width: ${QR_MM}mm;
      height: ${QR_MM}mm;
      display: block;
      margin: 0 auto;
    }
    .qr--empty {
      font-size: 5pt;
      word-break: break-all;
      border: 0.4pt dashed #999;
      padding: 0.5mm;
    }
    .dims {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 7pt;
      font-weight: 700;
      line-height: 1.15;
      text-align: left;
      display: inline-block;
    }
    .frac {
      margin-top: 0.5mm;
      font-size: 6.5pt;
      font-weight: 700;
    }
    .foot {
      margin-top: 0.6mm;
      display: flex;
      justify-content: space-between;
      gap: 1mm;
      font-size: 5.5pt;
      font-weight: 700;
      width: 100%;
    }
    @media print {
      html, body {
        width: ${LABEL_W_MM}mm;
        height: ${LABEL_H_MM}mm;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <header class="head">
      <h1 class="head__title">${esc(headerTitle)}</h1>
      ${booking ? `<p class="head__sub">${esc(booking)}</p>` : ''}
    </header>
    <div class="main">
      <div class="main__left">
        <div class="mat">${esc(matLine)}</div>
        ${subDesc ? `<div class="desc1">${esc(subDesc)}</div>` : ''}
        <div class="ref">${esc(refLine)}</div>
        <div class="diagram-grid">
          ${upLabel ? `<div class="edge edge--up">${esc(upLabel)}</div>` : '<div class="edge edge--up edge--empty"></div>'}
          <div class="edge edge--left">${leftLabel ? esc(leftLabel) : ''}</div>
          <div class="piece-wrap">
            <div class="piece-shape">
              <div class="piece-shape__txt">${esc(centerLabel)}</div>
            </div>
          </div>
          <div class="edge edge--right">${rightLabel ? esc(rightLabel) : ''}</div>
          ${loLabel ? `<div class="edge edge--lo">${esc(loLabel)}</div>` : '<div class="edge edge--lo edge--empty"></div>'}
        </div>
      </div>
      <div class="main__right">
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

  let w = printWindow && !printWindow.closed ? printWindow : null
  if (!w) {
    w = window.open('about:blank', '_blank')
  }
  if (w) {
    writeLabelHtml(w, html)
  } else {
    try {
      printLabelViaIframe(html)
    } catch {
      window.alert(
        'No se pudo abrir la impresión.\n\n' +
          '• Pulsa Imprimir de nuevo (solo funciona en el instante del clic).\n' +
          '• Zebra ZD230: papel 80×50 mm, escala 100 %, márgenes ninguno.'
      )
      throw new Error('impresión no disponible')
    }
  }

  return { qrCode: scanCode, printedAt: printedAt.toISOString() }
}
