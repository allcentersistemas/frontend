/**
 * Resumen pale / orden de envío: imprimir o descargar PDF (A4 vertical).
 */

function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPrintShort(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function formatScanStamp(value) {
  if (!value) return { date: '—', time: '—', compact: '—' }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { date: String(value), time: '', compact: String(value) }
  const date = d.toLocaleDateString(undefined, { dateStyle: 'short' })
  const time = d.toLocaleTimeString(undefined, { timeStyle: 'short' })
  return { date, time, compact: `${date} ${time}` }
}

function partDescripcion0(line) {
  return (
    line.partDescripcion ??
    line.part_descripcion ??
    line.orderDescripcion ??
    line.order_descripcion ??
    null
  )
}

function partDescripcion1(line) {
  return (
    line.partDescripcion1 ??
    line.part_descripcion1 ??
    line.orderDescripcion1 ??
    line.order_descripcion1 ??
    null
  )
}

function piezasPlanParte(line) {
  return line.piezasPlanParte ?? line.piezas_plan_parte ?? line.totalPiezas ?? line.total_piezas ?? null
}

function partMedida(line) {
  return line.medida ?? null
}

function pieceNumber(line) {
  const n = line.numeroPieza ?? line.numero_pieza ?? line.numero
  return n == null ? null : Number(n)
}

/** Agrupa líneas por parte+orden+medida para no repetir la descripción en cada pieza. */
function groupLinesByPart(lines) {
  const map = new Map()
  for (const line of lines) {
    const part = String(line.partCode ?? line.partId ?? '—')
    const order = String(line.orderName ?? line.orderId ?? '')
    const med = String(partMedida(line) ?? '')
    const key = `${part}||${order}||${med}`
    let g = map.get(key)
    if (!g) {
      g = {
        partCode: part,
        orderName: order || null,
        desc0: partDescripcion0(line),
        desc1: partDescripcion1(line),
        medida: partMedida(line),
        planTotal: piezasPlanParte(line),
        pieces: [],
      }
      map.set(key, g)
    }
    g.pieces.push({
      n: pieceNumber(line),
      fecha: line.fechaAgregado,
    })
  }
  for (const g of map.values()) {
    g.pieces.sort((a, b) => {
      if (a.n == null && b.n == null) return 0
      if (a.n == null) return 1
      if (b.n == null) return -1
      return a.n - b.n
    })
  }
  return [...map.values()]
}

const PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 6mm 4mm 8mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    margin: 0;
    padding: 0;
    color: #1a1a1a;
    font-size: 9pt;
    line-height: 1.25;
    background: #fff;
  }
  .wrap { width: 100%; max-width: none; margin: 0; padding: 0; }
  .doc-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    padding-bottom: 6px;
    border-bottom: 1.5px solid #222;
    margin-bottom: 6px;
  }
  .doc-head__text { flex: 1; min-width: 0; }
  .doc-eyebrow {
    margin: 0 0 1px;
    font-size: 7pt;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #666;
    font-weight: 600;
  }
  .doc-code {
    margin: 0 0 2px;
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.05;
  }
  .doc-title {
    margin: 0 0 4px;
    font-size: 9pt;
    font-weight: 600;
    color: #333;
  }
  .badges { display: flex; flex-wrap: wrap; gap: 4px; }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 7pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .badge--ok { background: #ecfdf5; border-color: #6ee7b7; color: #065f46; }
  .badge--neutral { background: #f3f4f6; border-color: #d1d5db; color: #374151; }
  .qr-wrap { text-align: center; flex-shrink: 0; }
  .qr-wrap img { display: block; margin: 0 auto; width: 72px; height: 72px; }
  .qr-cap {
    font-size: 7pt;
    margin-top: 2px;
    color: #444;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 10px;
    padding: 4px 6px;
    margin-bottom: 6px;
    border: 1px solid #ddd;
    background: #fafafa;
    font-size: 8pt;
  }
  .meta__item { display: flex; gap: 5px; align-items: baseline; }
  .meta__lbl {
    flex: 0 0 4.5rem;
    color: #666;
    font-size: 6.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .meta__val { flex: 1; min-width: 0; word-break: break-word; }
  .meta__item--full { grid-column: 1 / -1; }
  .section-title {
    margin: 0 0 5px;
    font-size: 9pt;
    font-weight: 700;
    border-bottom: 1px solid #ccc;
    padding-bottom: 2px;
  }
  .part {
    break-inside: avoid;
    page-break-inside: avoid;
    margin: 0 0 4px;
    border: 1px solid #ccc;
  }
  .part__head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
    padding: 2px 5px;
    background: #f3f4f6;
    border-bottom: 1px solid #ddd;
  }
  .part__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
  }
  .part__code {
    font-size: 9.5pt;
    font-weight: 700;
    margin: 0;
  }
  .part__order { font-size: 8pt; font-weight: 600; color: #222; }
  .part__desc { font-size: 7.5pt; color: #555; }
  .part__med { font-size: 7.5pt; color: #222; white-space: nowrap; }
  .part__med strong { font-weight: 600; color: #555; margin-right: 2px; }
  .part__count {
    flex-shrink: 0;
    text-align: right;
    font-size: 8.5pt;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .part__count span {
    display: inline;
    font-size: 6.5pt;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    margin-right: 3px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 2px 3px;
    width: 100%;
  }
  .chip {
    display: inline-flex;
    flex: 1 1 4.1rem;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: flex-start;
    gap: 2px 4px;
    min-width: 4.1rem;
    max-width: 100%;
    padding: 1px 3px;
    border: 1px solid #ccc;
    border-radius: 2px;
    background: #fff;
    font-size: 7pt;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .chip__n { font-weight: 700; }
  .chip__stamp {
    font-size: 6pt;
    font-weight: 500;
    color: #444;
    white-space: nowrap;
  }
  .empty { color: #666; font-size: 8pt; padding: 4px; }
  .hint {
    margin: 6px 0 0;
    font-size: 7pt;
    color: #888;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hint { display: none !important; }
  }
`

async function buildQrBlock(codigoPale) {
  if (!codigoPale) return ''
  try {
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(codigoPale, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 72,
    })
    return `<div class="qr-wrap"><img src="${dataUrl}" width="72" height="72" alt="QR código pale" /><div class="qr-cap">${esc(codigoPale)}</div></div>`
  } catch {
    return ''
  }
}

function buildPartBlocks(lines) {
  const groups = groupLinesByPart(lines)
  if (!groups.length) return '<p class="empty">Sin piezas.</p>'

  return groups
    .map((g) => {
      const plan = g.planTotal != null && Number(g.planTotal) > 0 ? Number(g.planTotal) : null
      const countLabel = plan != null ? `${g.pieces.length}/${plan}` : String(g.pieces.length)
      const descBits = []
      if (g.desc0) descBits.push(`<span class="part__desc">${esc(g.desc0)}</span>`)
      if (g.desc1) descBits.push(`<span class="part__desc">${esc(g.desc1)}</span>`)
      const med =
        g.medida != null && String(g.medida).trim() !== ''
          ? `<span class="part__med"><strong>Med.</strong>${esc(g.medida)}</span>`
          : ''
      const chips = g.pieces
        .map((p) => {
          const label = p.n != null ? String(p.n) : '?'
          if (!p.fecha) {
            return `<span class="chip"><span class="chip__n">${esc(label)}</span><span class="chip__stamp">—</span></span>`
          }
          const stamp = formatScanStamp(p.fecha)
          return `<span class="chip"><span class="chip__n">${esc(label)}</span><span class="chip__stamp">${esc(stamp.compact)}</span></span>`
        })
        .join('')

      return `
      <section class="part">
        <header class="part__head">
          <div class="part__main">
            <span class="part__code">${esc(g.partCode)}</span>
            ${g.orderName ? `<span class="part__order">${esc(g.orderName)}</span>` : ''}
            ${descBits.join('')}
            ${med}
          </div>
          <div class="part__count"><span>Piezas</span>${esc(countLabel)}</div>
        </header>
        <div class="chips">${chips || '<span class="empty">Sin números de pieza</span>'}</div>
      </section>`
    })
    .join('')
}

function buildBodyHtml(header, details, { includePiezas = false, qrBlock = '' } = {}) {
  const lines = Array.isArray(details) ? details : []
  const groups = groupLinesByPart(lines)
  const estado = String(header.estado ?? '').toUpperCase()
  const envio = String(header.estadoEnvio ?? '').toUpperCase()
  const badgeEstado =
    estado === 'CERRADO' ? 'badge badge--ok' : 'badge badge--neutral'
  const badgeEnvio =
    envio === 'ESCANEADO' || envio === 'ENTREGADO' ? 'badge badge--ok' : 'badge badge--neutral'

  const piezasSection = includePiezas
    ? `
    <h2 class="section-title">Detalle por parte (${groups.length} partes · ${lines.length} piezas)</h2>
    ${buildPartBlocks(lines)}`
    : `
    <h2 class="section-title">Resumen</h2>
    <p class="empty">Sin detalle de piezas (active la opción al imprimir).</p>`

  return `
  <div class="wrap">
    <header class="doc-head">
      <div class="doc-head__text">
        <p class="doc-eyebrow">Orden de envío · pale</p>
        <h1 class="doc-code">${esc(header.codigo)}</h1>
        <p class="doc-title">Resumen pale / orden de envío</p>
        <div class="badges">
          <span class="${badgeEstado}">${esc(header.estado)}</span>
          <span class="${badgeEnvio}">Envío: ${esc(header.estadoEnvio)}</span>
          <span class="badge badge--neutral">${esc(header.cantidadPiezas)} pzas · ${esc(header.cantidadOrdenes)} órd.</span>
        </div>
      </div>
      ${qrBlock}
    </header>
    <div class="meta">
      <div class="meta__item"><span class="meta__lbl">Creación</span><span class="meta__val">${esc(formatPrintShort(header.fechaCreacion))}</span></div>
      <div class="meta__item"><span class="meta__lbl">Cierre</span><span class="meta__val">${esc(formatPrintShort(header.fechaCierre))}</span></div>
      <div class="meta__item meta__item--full"><span class="meta__lbl">Órdenes</span><span class="meta__val">${esc(header.ordenesResumen)}</span></div>
      <div class="meta__item meta__item--full"><span class="meta__lbl">Notas</span><span class="meta__val">${esc(header.notas)}</span></div>
    </div>
    ${piezasSection}
    <p class="hint">Tip: en el diálogo de impresión desmarque «Encabezados y pies de página» para ocultar la fecha y about:blank.</p>
  </div>`
}

function pdfFileName(header) {
  const code = String(header?.codigo ?? header?.paleenvioid ?? 'pale')
    .trim()
    .replace(/[^\w.-]+/g, '_')
  return `${code || 'pale'}-resumen.pdf`
}

/**
 * @param {object} header
 * @param {array} details
 * @param {{ includePiezas?: boolean }} [opts]
 */
export async function printPalletOrderSummary(header, details, { includePiezas = false } = {}) {
  if (!header) return
  const codigoPale = String(header.codigo ?? header.paleenvioid ?? '').trim()
  const qrBlock = await buildQrBlock(codigoPale)
  const body = buildBodyHtml(header, details, { includePiezas, qrBlock })
  const title = `${esc(header.codigo)} — Resumen pale`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${body}
  <script>
    window.onload = function () {
      window.focus();
      setTimeout(function () { window.print(); }, 200);
    };
  </script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) {
    window.alert('Permite ventanas emergentes para imprimir el resumen.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

/**
 * Descarga PDF A4 (mismo contenido que la impresión).
 * @param {object} header
 * @param {array} details
 * @param {{ includePiezas?: boolean }} [opts]
 */
export async function downloadPalletOrderSummaryPdf(header, details, { includePiezas = false } = {}) {
  if (!header) return

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const codigoPale = String(header.codigo ?? header.paleenvioid ?? '').trim()
  const qrBlock = await buildQrBlock(codigoPale)
  const body = buildBodyHtml(header, details, { includePiezas, qrBlock })

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none;'
  host.innerHTML = `<style>${PRINT_CSS}</style>${body}`
  document.body.appendChild(host)

  try {
    const imgs = host.querySelectorAll('img')
    await Promise.all(
      [...imgs].map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              }),
      ),
    )

    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = (canvas.height * pageW) / canvas.width
    const imgData = canvas.toDataURL('image/jpeg', 0.92)

    let heightLeft = imgH
    let position = 0
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
    heightLeft -= pageH

    while (heightLeft > 0.5) {
      position = heightLeft - imgH
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
      heightLeft -= pageH
    }

    pdf.save(pdfFileName(header))
  } finally {
    host.remove()
  }
}
