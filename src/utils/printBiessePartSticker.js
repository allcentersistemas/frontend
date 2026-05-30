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

/** MM/DD/YY (legacy del taller). Por defecto fecha actual de impresión. */
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

/**
 * @param {object} opts
 * @param {{ orderName?: string, bookingCode?: string|null }} opts.order
 * @param {{
 *   partCode?: string|null,
 *   partNumber?: number|string,
 *   descripcion?: string|null,
 *   descripcion1?: string|null,
 *   material?: string|null,
 *   matedgeup?: string|null,
 *   matedgelo?: string|null,
 *   matedgel?: string|null,
 *   matedger?: string|null,
 *   longitud?: number|string,
 *   ancho?: number|string,
 *   cantidad?: number|string,
 * }} opts.part
 * @param {{ numeroPieza?: number, piezaId?: number|null }} opts.piece
 * @returns {Promise<{ qrCode: string, printedAt: string }>}
 */
export async function printBiessePartSticker({ order, part, piece }) {
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
      margin: 0,
      width: 100,  // Reducido para etiqueta 2"x3"
    })
    qrBlock = `<div class="qr"><img src="${dataUrl}" width="90" height="90" alt="" /></div>`
  } catch {
    qrBlock = `<div class="qr qr--empty">${esc(scanCode)}</div>`
  }

  const L = roundDim(part?.longitud)
  const A = roundDim(part?.ancho)
  const refLine = partNumber != null && partNumber !== '' ? String(partNumber) : '0'
  const centerLabel = String(part?.descripcion ?? '—').trim()
  const headerTitle = String(orderName).toUpperCase()
  const subDesc = joinNonEmpty([part?.descripcion1])
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
    @page { 
      size: 2in 3in;
      margin: 0;
    }
    * { 
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      width: 100%;
      height: 100%;
    }
    .sticker { 
      width: 100%;
      height: 100%;
      padding: 1.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .head { 
      padding-bottom: 1mm; 
      border-bottom: 0.5px solid #000; 
      margin-bottom: 1mm; 
    }
    .head__title { 
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1.1;
      margin: 0;
      padding: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .head__sub { 
      font-size: 6pt;
      margin-top: 0.5mm;
      color: #222;
      font-weight: 600;
    }
    .body { 
      display: flex;
      flex: 1;
      gap: 1.5mm;
      align-items: flex-start;
      min-height: 0;
    }
    .col-left { 
      flex: 1;
      min-width: 0;
      font-size: 7pt;
    }
    .mat { 
      font-weight: 700;
      margin-bottom: 0.5mm;
      font-size: 7pt;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .desc1 { 
      font-weight: 500;
      margin-bottom: 0.5mm;
      font-size: 6.5pt;
      color: #222;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ref { 
      font-size: 7pt;
      margin-bottom: 2mm;
    }
    .diagram-wrap { 
      position: relative;
      margin: 2mm 10mm 2mm 10mm;
    }
    .edge { 
      position: absolute;
      font-size: 6pt;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
    }
    .edge--top { 
      font-size: 7pt;
      top: -3.5mm;
      left: 0;
      right: 0;
    }
    .edge--bottom { 
      font-size: 7pt;
      bottom: -3.5mm;
      left: 0;
      right: 0;
    }
    .edge--right {
      font-size: 7pt;
      right: -15mm;
      top: 50%;
      transform: translateY(-50%) rotate(90deg);
      transform-origin: center center;
      width: 25mm;
    }
    .edge--left {
      font-size: 7pt;
      left: -15mm;
      top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: center center;
      width: 25mm;
    }
    .diagram {
      border: 2px solid #000;
      min-height: 18mm;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1mm;
    }
    .diagram__txt { 
      font-size: 6pt;
      font-weight: 700;
      text-align: center;
      word-break: break-word;
    }
    .col-right { 
      width: 28mm;
      flex-shrink: 0;
      font-size: 7pt;
    }
    .qr { 
      text-align: center;
      margin-bottom: 1mm;
    }
    .qr img { 
      display: inline-block;
      width: 90px;
      height: 90px;
    }
    .qr--empty { 
      font-size: 6pt;
      word-break: break-all;
      border: 1px dashed #999;
      padding: 1mm;
    }
    .dims { 
      font-family: ui-monospace, Consolas, monospace;
      font-size: 8pt;
      font-weight: 700;
      line-height: 1.2;
    }
    .frac { 
      margin-top: 1mm;
      font-size: 7pt;
      font-weight: 700;
    }
    .foot { 
      margin-top: auto;
      padding-top: 1mm;
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      font-size: 6pt;
      font-weight: 700;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="sticker">
    <header class="head">
      <h1 class="head__title" title="${esc(headerTitle)}">${esc(headerTitle)}</h1>
      ${order?.bookingCode ? `<div class="head__sub">${esc(String(order.bookingCode))}</div>` : ''}
    </header>
    <div class="body">
      <div class="col-left">
        <div class="mat" title="${esc(materialLine(part?.material, part?.descripcion))}">${esc(materialLine(part?.material, part?.descripcion))}</div>
        ${subDesc ? `<div class="desc1" title="${esc(subDesc)}">${esc(subDesc)}</div>` : ''}
        <div class="ref">${esc(refLine)}</div>
        <div class="diagram-wrap">
          ${upLabel ? `<div class="edge edge--top">${esc(upLabel)}</div>` : ''}
          ${loLabel ? `<div class="edge edge--bottom">${esc(loLabel)}</div>` : ''}
          ${rightLabel ? `<div class="edge edge--right">${esc(rightLabel)}</div>` : ''}
          ${leftLabel ? `<div class="edge edge--left">${esc(leftLabel)}</div>` : ''}
          <div class="diagram">
            <div class="diagram__txt">${esc(centerLabel)}</div>
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
  <script>
    window.onload = function () { 
      window.print(); 
    };
  </script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) {
    window.alert('Permite ventanas emergentes para imprimir la etiqueta.')
    throw new Error('popups bloqueados')
  }
  w.document.open()
  w.document.write(html)
  w.document.close()

  return { qrCode: scanCode, printedAt: printedAt.toISOString() }
}