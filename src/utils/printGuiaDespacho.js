function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPrintDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('es-PE')
}

function formatDestino(guia) {
  if (!guia) return '—'
  if (guia.ubicacionDestinoNombre) return `Obra: ${guia.ubicacionDestinoNombre}`
  if (guia.sucursalDestinoNombre) return `Sucursal: ${guia.sucursalDestinoNombre}`
  return '—'
}

/**
 * Abre ventana de impresión con cabecera de guía y detalle (guiadetalle).
 */
export async function printGuiaDespacho(guia, detalles) {
  const lines = Array.isArray(detalles) ? detalles : []
  const rows = lines
    .map(
      (line, idx) => `
    <tr>
      <td class="num">${idx + 1}</td>
      <td>${esc(line.paleCodigo ?? (line.paleId != null ? `#${line.paleId}` : '—'))}</td>
      <td>${esc(line.descripcion)}</td>
      <td>${esc(line.unidadMedida)}</td>
      <td class="num">${esc(line.cantidad)}</td>
    </tr>`,
    )
    .join('')

  const numero = guia?.numeroGuia ?? '—'
  let qrBlock = ''
  if (numero && numero !== '—') {
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(numero, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 120,
      })
      qrBlock = `<div class="qr-wrap"><img src="${dataUrl}" width="120" height="120" alt="QR guía" /><div class="qr-cap">${esc(numero)}</div></div>`
    } catch {
      qrBlock = ''
    }
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(numero)} — Guía de despacho</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: system-ui, Segoe UI, sans-serif; margin: 0; padding: 0; color: #111; font-size: 10pt; line-height: 1.3; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
    h1 { font-size: 14pt; margin: 0 0 4px; font-weight: 700; }
    .sub { font-size: 9pt; color: #444; margin: 0; }
    .qr-wrap { text-align: center; flex-shrink: 0; }
    .qr-wrap img { display: block; margin: 0 auto; }
    .qr-cap { font-size: 8pt; margin-top: 4px; word-break: break-all; max-width: 130px; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
      font-size: 9pt;
      margin-bottom: 12px;
      padding: 8px;
      background: #f5f5f5;
      border: 1px solid #ccc;
    }
    .meta strong { display: inline-block; min-width: 5.5rem; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #e8e8e8; font-weight: 600; }
    td.num { text-align: center; white-space: nowrap; width: 1%; }
    caption { text-align: left; font-weight: 600; margin-bottom: 6px; font-size: 10pt; }
    tr { break-inside: avoid; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .meta { background: #f0f0f0; }
    }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <h1>Guía de despacho</h1>
      <p class="sub">N° ${esc(numero)} · ${formatPrintDate(guia?.fechaCreacion)}</p>
    </div>
    ${qrBlock}
  </div>
  <div class="meta">
    <div><strong>Estado</strong> ${esc(guia?.estado)}</div>
    <div><strong>Destino</strong> ${esc(formatDestino(guia))}</div>
    <div><strong>Líneas</strong> ${lines.length}</div>
    <div><strong>ID guía</strong> ${esc(guia?.guiaId)}</div>
    <div style="grid-column: 1 / -1"><strong>Notas</strong> ${esc(guia?.notas)}</div>
  </div>
  <table>
    <caption>Detalle de la guía</caption>
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th style="width:18%">N° palé</th>
        <th>Descripción (órdenes)</th>
        <th style="width:14%">Unidad</th>
        <th style="width:10%">Cantidad</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5">Sin líneas en la guía</td></tr>'}
    </tbody>
  </table>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) {
    window.alert('Permite ventanas emergentes para imprimir la guía.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
