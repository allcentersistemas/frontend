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

/** Tamaño del rectángulo interior según L×A (mm en pantalla/impresión). */
function pieceShapeMm(longitud, ancho) {
  const L = roundDim(longitud)
  const A = roundDim(ancho)
  const maxW = 62
  const maxH = 34
  if (L == null || A == null || L <= 0 || A <= 0) {
    return { width: 48, height: 26 }
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
      width: 180,
    })
    qrBlock = `<div class="qr"><img src="${dataUrl}" width="132" height="132" alt="" /></div>`
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
    @page { size: 200mm 74mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 200mm;
      min-height: 74mm;
      background: #fff;
      color: #000;
    }
    body {
      padding: 3mm 5mm 3mm 8mm;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-sheet {
      width: 188mm;
      min-height: 68mm;
      display: flex;
      flex-direction: column;
    }
    .head {
      padding-bottom: 2mm;
      border-bottom: 1.5px solid #000;
      margin-bottom: 2mm;
    }
    .head__title {
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1.15;
      margin: 0;
      max-width: 120mm;
    }
    .head__sub {
      font-size: 8pt;
      margin: 1mm 0 0;
      font-weight: 600;
      color: #222;
    }
    .body {
      display: flex;
      flex: 1;
      gap: 4mm;
      align-items: flex-start;
    }
    .col-left {
      flex: 1;
      min-width: 0;
      padding-right: 2mm;
    }
    .mat {
      font-weight: 700;
      margin-bottom: 1mm;
      font-size: 9.5pt;
      line-height: 1.2;
    }
    .desc1 {
      font-weight: 500;
      margin-bottom: 2mm;
      font-size: 8.5pt;
      color: #222;
    }
    .ref {
      font-size: 9pt;
      font-weight: 700;
      margin-bottom: 4mm;
    }
    .diagram-wrap {
      position: relative;
      margin: 6mm 20mm 8mm 20mm;
      overflow: visible;
      min-height: 40mm;
    }
    .edge {
      position: absolute;
      font-size: 8pt;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
      color: #000;
    }
    .edge--top {
      font-size: 9pt;
      top: -5.5mm;
      left: 0;
      right: 0;
    }
    .edge--bottom {
      font-size: 9pt;
      bottom: -5.5mm;
      left: 0;
      right: 0;
    }
    .edge--right {
      font-size: 9pt;
      right: -24mm;
      top: 50%;
      transform: translateY(-50%) rotate(90deg);
      transform-origin: center center;
      width: 44mm;
    }
    .edge--left {
      font-size: 9pt;
      left: -24mm;
      top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: center center;
      width: 44mm;
    }
    .diagram {
      border: 3px solid #000;
      min-height: 32mm;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4mm;
      background: #fff;
      overflow: visible;
    }
    .piece-shape {
      border: 2px solid #000;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${shape.width}mm;
      height: ${shape.height}mm;
      min-width: 24mm;
      min-height: 14mm;
    }
    .diagram__txt {
      font-size: 9pt;
      font-weight: 700;
      text-align: center;
      word-break: break-word;
      padding: 1mm;
      line-height: 1.1;
    }
    .col-right {
      width: 42mm;
      flex-shrink: 0;
      font-size: 8pt;
    }
    .qr {
      text-align: center;
      margin-bottom: 2mm;
    }
    .qr img {
      display: inline-block;
      width: 132px;
      height: 132px;
    }
    .qr--empty {
      font-size: 6pt;
      word-break: break-all;
      border: 1px dashed #999;
      padding: 2mm;
    }
    .dims {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 10pt;
      font-weight: 700;
      line-height: 1.35;
    }
    .frac {
      margin-top: 1.5mm;
      font-size: 9pt;
      font-weight: 700;
    }
    .foot {
      margin-top: 2mm;
      display: flex;
      justify-content: flex-end;
      gap: 4mm;
      font-size: 8pt;
      font-weight: 700;
    }
    @media print {
      html, body { width: 200mm; min-height: 74mm; }
      body { padding: 2mm 4mm 2mm 7mm; }
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
