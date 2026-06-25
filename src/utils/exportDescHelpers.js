function blankOrNA(value) {
  const s = String(value ?? '').trim()
  return !s || s.toUpperCase() === 'NA' ? '' : s
}

/** Cantos y bordes: NA o vacío → celda en blanco en exportación. */
export function exportCantoValue(value) {
  const s = String(value ?? '').trim()
  if (!s || s.toUpperCase() === 'NA') return ''
  return `${s} `
}

/** Perforación y ranura → [P_IDESC] en exportación optimizador. */
export function formatPerforacionRanuraForExport(detalle) {
  const parts = []
  const qty = blankOrNA(detalle.perforacionCantidad)
  const lado1 = blankOrNA(detalle.perforacionLado1)
  const lado2 = blankOrNA(detalle.perforacionLado2)
  const perfParts = [qty, lado1, lado2].filter(Boolean)
  if (perfParts.length) {
    parts.push(`P(${perfParts.join('/')})`)
  }
  const rd = blankOrNA(detalle.ranuraDist)
  const rp = blankOrNA(detalle.ranuraProf)
  const re = blankOrNA(detalle.ranuraEs)
  const rl = blankOrNA(detalle.ranuraLado)
  const ranParts = [rd, rp, re, rl].filter(Boolean)
  if (ranParts.length) {
    parts.push(`R(${ranParts.join('/')})`)
  }
  return parts.join(' | ')
}

export function formatObservacionForExport(detalle) {
  if (detalle.observacion == null) return ''
  return String(detalle.observacion).trim()
}
