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
      margin: 1,
      width: 180,
    })
    qrBlock = `<div class="qr"><img src="${dataUrl}" width="140" height="140" alt="" /></div>`
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
    @page { size: 200mm 74mm; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 3mm 4mm;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sticker { padding-left: 5mm; width: 150mm; min-height: 68mm; display: flex; flex-direction: column; }
    .head { position: relative; padding-bottom: 2mm; border-bottom: 1px solid #000; margin-bottom: 2mm; }
    .head__title { font-size: 10pt; font-weight: 700; letter-spacing: 0.02em; line-height: 1.15; margin: 0; padding: 0; max-width: 110mm; }
    .head__sub { font-size: 8pt; margin-top: 1mm; color: #222; font-weight: 600; }
    .body { display: flex; flex: 1; gap: 3mm; align-items: flex-start; }
    .col-left { flex: 1; min-width: 0; font-size: 8pt; }
    .mat { font-weight: 700; margin-bottom: 1mm; font-size: 9pt; }
    .desc1 { font-weight: 500; margin-bottom: 1mm; font-size: 8.5pt; color: #222; }
    .ref { font-size: 9pt; margin-bottom: 5mm; }
    .diagram-wrap { position: relative; margin: 5mm 16mm 6mm 16mm; }
    .edge { position: absolute; font-size: 7pt; font-weight: 700; text-align: center; }
    .edge--top { font-size: 9pt; top: -5mm; left: 0; right: 0; }
    .edge--bottom { font-size: 9pt; bottom: -5mm; left: 0; right: 0; }
    .edge--right {
      font-size: 9pt;
      right: -22mm; top: 50%;
      transform: translateY(-50%) rotate(90deg);
      transform-origin: center center;
      width: 40mm;
    }
    .edge--left {
      font-size: 9pt;
      left: -22mm; top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: center center;
      width: 40mm;
    }
    .diagram {
      border: 3px solid #000;
      min-height: 26mm;
      display: flex; align-items: center; justify-content: center;
      padding: 3mm 2mm;
    }
    .diagram__txt { font-size: 8pt; font-weight: 700; text-align: center; word-break: break-word; }
    .col-right { width: 40mm; flex-shrink: 0; font-size: 8pt; }
    .qr { text-align: center; margin-bottom: 2mm; }
    .qr img { display: inline-block; }
    .qr--empty { font-size: 6pt; word-break: break-all; border: 1px dashed #999; padding: 2mm; }
    .dims { font-family: ui-monospace, Consolas, monospace; font-size: 10pt; font-weight: 700; line-height: 1.35; }
    .frac { margin-top: 1.5mm; font-size: 9pt; font-weight: 700; }
    .foot { margin-top: auto; padding-top: 2mm; display: flex; justify-content: flex-end; gap: 4mm; font-size: 8pt; font-weight: 700; }
    @media print { body { padding: 2mm 3mm; } }
  </style>
</head>
<body>
  <div class="sticker">
    <header class="head">
      <h1 class="head__title">${esc(headerTitle)}</h1>
      ${order?.bookingCode ? `<div class="head__sub">${esc(String())}</div>` : ''}
    </header>
    <div class="body">
      <div class="col-left">
        <div class="mat">${esc(materialLine(part?.material))}</div>
        ${subDesc ? `<div class="desc1">${esc(subDesc)}</div>` : ''}
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
  <script>window.onload = function () { window.print(); };</script>
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