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
}) {
  const booking = bookingCode ? String(bookingCode).trim() : ''
  return `<!DOCTYPE html>
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
      ${booking ? `<div class="head__sub">${esc(booking)}</div>` : ''}
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
    qrBlock = `<div class="qr"><img src="${dataUrl}" width="140" height="140" alt="" /></div>`
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
