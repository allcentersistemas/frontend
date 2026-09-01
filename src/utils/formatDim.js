/** Formatea una medida numérica (mm) sin ruido de coma flotante. */
export function formatDim(value) {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n))
  return n.toFixed(1)
}

/** Par largo × ancho para UI e impresión. */
export function formatDimPair(longitud, ancho) {
  const l = formatDim(longitud)
  const a = formatDim(ancho)
  if (!l && !a) return null
  return `${l ?? '—'} × ${a ?? '—'}`
}

/** Reformatea un texto "L × A" ya guardado con decimales largos. */
export function formatMedidaText(value) {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  const parts = text.split(/\s*[×x]\s*/)
  if (parts.length !== 2) return text
  const l = formatDim(parts[0].trim())
  const a = formatDim(parts[1].trim())
  if (!l && !a) return null
  return `${l ?? '—'} × ${a ?? '—'}`
}
