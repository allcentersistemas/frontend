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

function pieceFractionText(line) {
  const n = line.numeroPieza
  const total = piezasPlanParte(line)
  if (n != null && total != null && Number(total) > 0) {
    return `${n}/${total}`
  }
  if (n != null) return String(n)
  return '—'
}

function orderCellHtml(line) {
  const name = line.orderName ?? line.orderId
  const d0 = partDescripcion0(line)
  const d1 = partDescripcion1(line)
  const m = partMedida(line)
  const bits = []
  if (name != null && String(name).trim() !== '') {
    bits.push(`<div><strong>${esc(String(name))}</strong></div>`)
  }
  if (d0 != null && String(d0).trim() !== '') bits.push(`<div class="ord-desc">${esc(String(d0))}</div>`)
  if (d1 != null && String(d1).trim() !== '') bits.push(`<div class="ord-desc">${esc(String(d1))}</div>`)
  if (m != null && String(m).trim() !== '') {
    bits.push(`<div class="ord-med"><span class="ord-med__lbl">Med.</span> ${esc(String(m))}</div>`)
  }
  return bits.length ? bits.join('') : '—'
}

const PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 10mm 12mm;
  }
  body {
    font-family: system-ui, Segoe UI, sans-serif;
    margin: 0;
    padding: 0;
    color: #111;
    font-size: 11pt;
    line-height: 1.35;
    background: #fff;
  }
  .wrap { width: 100%; max-width: 186mm; margin: 0; }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 8px;
  }
  .top-text { flex: 1; min-width: 0; }
  h1 { font-size: 14pt; margin: 0 0 4px; font-weight: 700; }
  .qr-wrap { text-align: center; flex-shrink: 0; }
  .qr-wrap img { display: block; margin: 0 auto; }
  .qr-cap {
    font-size: 8pt;
    margin-top: 2px;
    color: #333;
    max-width: 130px;
    word-break: break-all;
  }
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 12px;
    font-size: 10pt;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .meta strong {
    display: inline-block;
    min-width: 7.5rem;
    font-weight: 600;
    color: #222;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    table-layout: fixed;
    margin-top: 8px;
  }
  th, td {
    border: 1px solid #bbb;
    padding: 4px 5px;
    text-align: left;
    vertical-align: top;
    word-wrap: break-word;
  }
  th { background: #eee; font-weight: 600; }
  td.num, td.dt { white-space: nowrap; width: 1%; }
  td.dt { font-variant-numeric: tabular-nums; }
  .ord-cell .ord-desc { font-size: 9.5pt; color: #333; margin-top: 1px; }
  .ord-cell .ord-med { font-size: 9.5pt; color: #222; margin-top: 2px; }
  .ord-cell .ord-med__lbl { font-weight: 600; color: #444; margin-right: 4px; }
  caption {
    text-align: left;
    font-weight: 600;
    margin-bottom: 4px;
    font-size: 10pt;
  }
  tr { break-inside: avoid; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

async function buildQrBlock(codigoPale) {
  if (!codigoPale) return ''
  try {
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(codigoPale, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 128,
    })
    return `<div class="qr-wrap"><img src="${dataUrl}" width="128" height="128" alt="QR código pale" /><div class="qr-cap">${esc(codigoPale)}</div></div>`
  } catch {
    return ''
  }
}

function buildBodyHtml(header, details, { includePiezas = false, qrBlock = '' } = {}) {
  const lines = Array.isArray(details) ? details : []
  const rows = lines
    .map(
      (line) => `
    <tr>
      <td>${esc(line.partCode ?? line.partId)}</td>
      <td class="ord-cell">${orderCellHtml(line)}</td>
      <td class="num">${esc(pieceFractionText(line))}</td>
      <td class="dt">${esc(formatPrintShort(line.fechaAgregado))}</td>
    </tr>`,
    )
    .join('')

  const piezasTable = includePiezas
    ? `
  <table>
    <caption>Detalle de piezas (${lines.length})</caption>
    <thead>
      <tr>
        <th style="width:12%">Parte</th>
        <th>Orden · Desc. · Med. (L×A)</th>
        <th style="width:8%">Pza</th>
        <th style="width:14%">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">Sin líneas</td></tr>'}
    </tbody>
  </table>`
    : ''

  return `
  <div class="wrap">
    <div class="top">
      <div class="top-text">
        <h1>Resumen pale / orden de envío</h1>
      </div>
      ${qrBlock}
    </div>
    <div class="meta">
      <div><strong>Código</strong> ${esc(header.codigo)}</div>
      <div><strong>Estado</strong> ${esc(header.estado)}</div>
      <div><strong>Estado envío</strong> ${esc(header.estadoEnvio)}</div>
      <div><strong>Piezas / órdenes</strong> ${esc(header.cantidadPiezas)} / ${esc(header.cantidadOrdenes)}</div>
      <div><strong>Creación</strong> ${esc(formatPrintShort(header.fechaCreacion))}</div>
      <div><strong>Resumen</strong> ${esc(header.ordenesResumen)}</div>
      <div><strong>Cierre</strong> ${esc(formatPrintShort(header.fechaCierre))}</div>
      <div style="grid-column: 1 / -1"><strong>Notas</strong> ${esc(header.notas)}</div>
    </div>
    ${piezasTable}
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
