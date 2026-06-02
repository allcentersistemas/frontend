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

/** MM/DD/YY — fecha de impresión. */
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

/** Material + descripción (línea 1, en negrita). */
function materialLine(material, descripcion) {
  return joinNonEmpty([material, descripcion]).toUpperCase() || '—'
}

/** Etiqueta física: 8 cm × 5 cm */
const LABEL_W_MM = 80
const LABEL_H_MM = 50

/** Tamaño del rectángulo interior según L×A (mm), dentro del área de diagrama 80×50. */
function pieceShapeMm(longitud, ancho) {
  const L = roundDim(longitud)
  const A = roundDim(ancho)
  const maxW = 26
  const maxH = 14
  if (L == null || A == null || L <= 0 || A <= 0) {
    return { width: 22, height: 12 }
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

/**
 * @param {object} opts
 * @param {{ orderName?: string, bookingCode?: string|null }} opts.order
 * @param {object} opts.part
 * @param {{ numeroPieza?: number, piezaId?: number|null }} opts.piece
 * @returns {Promise<{ qrCode: string, printedAt: string }>}
 */
export async function printBiessePartSticker({ order, part, piece }) {
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
      margin: 1,
      width: 96,
    })
    qrBlock = `<div class="qr"><img src="${dataUrl}" alt="" /></div>`
  } catch {
    qrBlock = `<div class="qr qr--empty">${esc(scanCode)}</div>`
  }

  const L = roundDim(part?.longitud)
  const A = roundDim(part?.ancho)
  const shape = pieceShapeMm(L, A)
  const refLine = partNumber != null && partNumber !== '' ? String(partNumber) : '0'
  const centerLabel = partCode || refLine || '—'
  const headerTitle = String(orderName).toUpperCase()
  const booking = String(order?.bookingCode ?? '').trim()
  const subDesc = joinNonEmpty([part?.descripcion1])
  const matLine = materialLine(part?.material, part?.descripcion)
  const pCode = `P${refLine}`
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
    @page { size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      background: #fff;
      color: #000;
      overflow: hidden;
    }
    body {
      padding: 1.5mm 2mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 6pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-sheet {
      width: ${LABEL_W_MM - 4}mm;
      height: ${LABEL_H_MM - 3}mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .head {
      padding-bottom: 0.8mm;
      border-bottom: 1px solid #000;
      margin-bottom: 1mm;
      flex-shrink: 0;
    }
    .head__title {
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.01em;
      line-height: 1.1;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .head__sub {
      font-size: 5.5pt;
      margin: 0.3mm 0 0;
      font-weight: 600;
      color: #222;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .body {
      display: flex;
      flex: 1;
      gap: 1.5mm;
      align-items: stretch;
      min-height: 0;
    }
    .col-left {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .mat {
      font-weight: 700;
      margin-bottom: 0.3mm;
      font-size: 6.5pt;
      line-height: 1.1;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .desc1 {
      font-weight: 500;
      margin-bottom: 0.5mm;
      font-size: 5.5pt;
      color: #222;
      line-height: 1.1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ref {
      font-size: 6pt;
      font-weight: 700;
      margin-bottom: 0.5mm;
      flex-shrink: 0;
    }
    .diagram-wrap {
      position: relative;
      flex: 1;
      margin: 2.5mm 9mm 2mm 9mm;
      overflow: visible;
      min-height: 16mm;
    }
    .edge {
      position: absolute;
      font-size: 5pt;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
      color: #000;
      line-height: 1;
    }
    .edge--top {
      font-size: 5.5pt;
      top: -3.5mm;
      left: 0;
      right: 0;
    }
    .edge--bottom {
      font-size: 5.5pt;
      bottom: -3.5mm;
      left: 0;
      right: 0;
    }
    .edge--right {
      font-size: 5.5pt;
      right: -11mm;
      top: 50%;
      transform: translateY(-50%) rotate(90deg);
      transform-origin: center center;
      width: 22mm;
    }
    .edge--left {
      font-size: 5.5pt;
      left: -11mm;
      top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: center center;
      width: 22mm;
    }
    .diagram {
      border: 2px solid #000;
      height: 100%;
      min-height: 14mm;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5mm;
      background: #fff;
    }
    .piece-shape {
      border: 1.5px solid #000;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${shape.width}mm;
      height: ${shape.height}mm;
      min-width: 14mm;
      min-height: 8mm;
      max-width: 100%;
      max-height: 100%;
    }
    .diagram__txt {
      font-size: 6.5pt;
      font-weight: 700;
      text-align: center;
      word-break: break-word;
      padding: 0.5mm;
      line-height: 1.05;
    }
    .col-right {
      width: 20mm;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 6pt;
    }
    .qr {
      text-align: center;
      margin-bottom: 0.5mm;
      line-height: 0;
    }
    .qr img {
      display: block;
      width: 18mm;
      height: 18mm;
      margin: 0 auto;
    }
    .qr--empty {
      font-size: 4.5pt;
      word-break: break-all;
      border: 1px dashed #999;
      padding: 1mm;
      width: 18mm;
    }
    .dims {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 6.5pt;
      font-weight: 700;
      line-height: 1.2;
      width: 100%;
    }
    .frac {
      margin-top: 0.5mm;
      font-size: 6pt;
      font-weight: 700;
      width: 100%;
      text-align: center;
    }
    .foot {
      margin-top: auto;
      padding-top: 0.5mm;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.2mm;
      font-size: 5.5pt;
      font-weight: 700;
      width: 100%;
    }
    @media print {
      html, body {
        width: ${LABEL_W_MM}mm;
        height: ${LABEL_H_MM}mm;
      }
      body { padding: 1.2mm 1.5mm; }
    }
  </style>
</head>
<body>
  <div class="label-sheet">
    <header class="head">
      <h1 class="head__title">${esc(headerTitle)}</h1>
      ${booking ? `<p class="head__sub">${esc(booking)}</p>` : ''}
    </header>
    <div class="body">
      <div class="col-left">
        <div class="mat">${esc(matLine)}</div>
        ${subDesc ? `<div class="desc1">${esc(subDesc)}</div>` : ''}
        <div class="ref">${esc(refLine)}</div>
        <div class="diagram-wrap">
          ${upLabel ? `<div class="edge edge--top">${esc(upLabel)}</div>` : ''}
          ${loLabel ? `<div class="edge edge--bottom">${esc(loLabel)}</div>` : ''}
          ${rightLabel ? `<div class="edge edge--right">${esc(rightLabel)}</div>` : ''}
          ${leftLabel ? `<div class="edge edge--left">${esc(leftLabel)}</div>` : ''}
          <div class="diagram">
            <div class="piece-shape">
              <div class="diagram__txt">${esc(centerLabel)}</div>
            </div>
          </div>
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

  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) {
    window.alert('Permite ventanas emergentes para imprimir la etiqueta.')
    throw new Error('popups bloqueados')
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  triggerPrint(w)

  return { qrCode: scanCode, printedAt: printedAt.toISOString() }
}
