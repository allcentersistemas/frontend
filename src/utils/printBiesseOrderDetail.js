/**
 * Impresión del detalle de orden Biesse (partes/piezas).
 * Ventana propia: A4 vertical por defecto; el usuario puede cambiar orientación en el diálogo del navegador.
 */

function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatEstado(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'LISTO_PARA_ENTREGAR' || e === 'COMPLETADA' || e === 'COMPLETADO') return 'Listo para entregar'
  if (e === 'ENTREGADO') return 'Entregado'
  if (e === 'DESPACHO' || e === 'EN_PROCESO') return 'Despacho'
  if (e === 'PRODUCCION') return 'Producción'
  if (e === 'OPTIMIZADO') return 'Optimizado'
  if (e === 'PENDIENTE') return 'Pendiente'
  return estado ?? '—'
}

function pieceStatus({ cortada, escaneado }) {
  if (Boolean(escaneado)) return { key: 'ok', label: 'Escaneada' }
  if (Boolean(cortada)) return { key: 'cut', label: 'Cortada' }
  return { key: 'pending', label: 'Pendiente' }
}

/**
 * @param {object} detail — respuesta de orderDetail
 */
export function printBiesseOrderDetail(detail) {
  if (!detail) return

  const partes = Array.isArray(detail.partes) ? detail.partes : []
  const title = detail.orderName ? `Orden ${detail.orderName}` : `Orden #${detail.orderId ?? ''}`

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isChrome = /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua)

  const orientHelp = isChrome
    ? `<strong>Chrome:</strong> no muestra la pestaña «Diseño» como Safari. Abra
      <strong>Más opciones</strong> (abajo) y elija <strong>Orientación → Vertical</strong>.
      En Mac también puede usar <strong>Imprimir con el diálogo del sistema</strong>
      (menú desplegable junto a «Cancelar») o <kbd>⌘⌥P</kbd> para ver Diseño / vertical.`
    : isSafari
      ? `<strong>Safari:</strong> en la ventana de impresión use la pestaña
        <strong>Diseño</strong> → <strong>Orientación → Vertical</strong> (hoja parada).`
      : `<strong>Importante:</strong> elija <strong>Orientación → Vertical</strong>
        (Portrait / hoja parada), no Horizontal.`

  const partBlocks = partes
    .map((part) => {
      const code = part.partCode ?? part.partcode ?? `P${part.partNumber ?? part.partnumber ?? ''}`
      const piezas = Array.isArray(part.piezas) ? part.piezas : []
      const scanned = Number(part.cantidadEscaneada ?? 0)
      const qty = Number(part.cantidad ?? 0)
      const pieceChips = piezas.length
        ? piezas
            .map((z) => {
              const st = pieceStatus(z)
              const n = z.numeroPieza ?? z.numero_pieza ?? z.numero ?? '?'
              return `<span class="chip chip--${st.key}" title="${esc(st.label)}">${esc(n)}</span>`
            })
            .join('')
        : '<span class="muted">Sin piezas</span>'

      const measures =
        part.largo != null || part.ancho != null
          ? `${part.largo ?? '—'} × ${part.ancho ?? '—'}`
          : part.medidas ?? '—'

      return `
      <section class="part">
        <header class="part__head">
          <strong>${esc(code)}</strong>
          <span class="muted">Avance: ${esc(scanned)} / ${esc(qty)}</span>
        </header>
        <div class="part__meta">
          <div><span class="lbl">Descripción</span> ${esc(part.descripcion ?? part.descripcion1)}</div>
          <div><span class="lbl">Material</span> ${esc(part.material)}</div>
          <div><span class="lbl">Medidas</span> ${esc(measures)}</div>
        </div>
        <div class="chips">${pieceChips}</div>
      </section>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    /* Hoja PARADA (vertical). Medidas explícitas 210×297 mm = A4 portrait.
       En el diálogo del navegador confirme Orientación = Vertical / Portrait. */
    @page {
      size: portrait;
      margin: 12mm;
    }
    @page {
      size: 210mm 297mm;
      margin: 12mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      max-width: 210mm;
      color: #111;
      font: 10pt/1.35 system-ui, "Segoe UI", sans-serif;
      text-align: left;
      background: #fff;
    }
    .wrap {
      width: 100%;
      max-width: 186mm;
      margin: 0;
      padding: 0;
      text-align: left;
    }
    h1 { font-size: 14pt; margin: 0 0 4px; font-weight: 700; text-align: left; }
    .sub { margin: 0 0 12px; color: #444; font-size: 9pt; }
    .orient-banner {
      margin: 0 0 12px;
      padding: 8px 10px;
      border: 1px solid #f59e0b;
      background: #fffbeb;
      color: #92400e;
      font-size: 9pt;
      text-align: left;
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 20px;
      margin: 0 0 14px;
      padding: 8px 10px;
      border: 1px solid #ccc;
      background: #f7f7f7;
      text-align: left;
    }
    .meta div { margin: 0; }
    .meta .lbl { display: inline-block; min-width: 4.5rem; color: #555; font-size: 8pt; text-transform: uppercase; }
    h2 { font-size: 11pt; margin: 16px 0 8px; border-bottom: 1px solid #bbb; padding-bottom: 4px; text-align: left; }
    .part {
      break-inside: avoid;
      page-break-inside: avoid;
      margin: 0 0 10px;
      padding: 8px 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .part__head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      text-align: left;
    }
    .part__meta { font-size: 9pt; color: #333; margin-bottom: 6px; text-align: left; }
    .part__meta .lbl { color: #666; font-size: 8pt; text-transform: uppercase; margin-right: 4px; }
    .chips { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-start; }
    .chip {
      display: inline-flex;
      min-width: 1.6rem;
      align-items: center;
      justify-content: center;
      padding: 2px 6px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 9pt;
      font-variant-numeric: tabular-nums;
    }
    .chip--pending { background: #f1f5f9; color: #64748b; }
    .chip--cut { background: #fef3c7; color: #92400e; border-color: #f59e0b; font-weight: 600; }
    .chip--ok { background: #d1fae5; color: #065f46; border-color: #10b981; font-weight: 600; }
    .muted { color: #666; }
    .orient-banner kbd {
      padding: 1px 4px;
      border: 1px solid #d97706;
      border-radius: 3px;
      font-size: 8pt;
      background: #fff;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .orient-banner { display: none !important; }
      @page { size: portrait; margin: 12mm; }
      @page { size: 210mm 297mm; margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <p class="orient-banner">${orientHelp}</p>
    <h1>${esc(title)}</h1>
    <p class="sub">Producción Biesse · detalle de partes y piezas · A4 vertical</p>
    <div class="meta">
      <div><span class="lbl">ID</span> ${esc(detail.orderId)}</div>
      <div><span class="lbl">Estado</span> ${esc(formatEstado(detail.estadoEscaneo))}</div>
      <div><span class="lbl">Partes</span> ${esc(detail.partesEscaneadas)} / ${esc(detail.totalPartes)}</div>
      <div><span class="lbl">Piezas</span> ${esc(detail.piezasEscaneadas)} / ${esc(detail.totalPiezas)}</div>
      <div><span class="lbl">Avance</span> ${esc(Number(detail.porcentajeCompletado ?? 0).toFixed(1))}%</div>
      <div><span class="lbl">Booking</span> ${esc(detail.bookingCode)}</div>
    </div>
    <h2>Partes y piezas</h2>
    ${partBlocks || '<p class="muted">Sin partes.</p>'}
  </div>
  <script>
    window.onload = function () {
      window.focus();
      setTimeout(function () { window.print(); }, 200);
    };
  </script>
</body>
</html>`

  const w = window.open('', '_blank', 'noopener,noreferrer,width=794,height=1123')
  if (!w) {
    window.alert('Permita ventanas emergentes para imprimir el detalle.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
