function blankOrNA(value) {
  const s = String(value ?? '').trim()
  return !s || s === 'NA' ? '' : s
}

/** Perforación y ranura → [P_IDESC] en exportación optimizador. */
export function formatPerforacionRanuraForExport(detalle) {
  const parts = []
  const qty = blankOrNA(detalle.perforacionCantidad)
  const lado1 = blankOrNA(detalle.perforacionLado1)
  const lado2 = blankOrNA(detalle.perforacionLado2)
  if (qty) {
    const lados = [lado1, lado2].filter(Boolean).join(',')
    parts.push(lados ? `Perf ${qty} (${lados})` : `Perf ${qty}`)
  }
  const rd = blankOrNA(detalle.ranuraDist)
  const rp = blankOrNA(detalle.ranuraProf)
  const re = blankOrNA(detalle.ranuraEs)
  const rl = blankOrNA(detalle.ranuraLado)
  if (rd || rp || re || rl) {
    parts.push(`Ran ${[rd, rp, re, rl].filter(Boolean).join('/')}`)
  }
  return parts.join(' | ')
}

export function formatObservacionForExport(detalle) {
  if (detalle.observacion == null) return ''
  return String(detalle.observacion).trim()
}
