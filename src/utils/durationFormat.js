/**
 * Formatea milisegundos en la unidad más legible: segundos, horas o días.
 */
export function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  const sec = ms / 1000
  if (sec < 60) return `${Math.round(sec)} s`
  if (sec < 3600) {
    const min = sec / 60
    const t = min >= 10 ? Math.round(min) : Math.round(min * 10) / 10
    return `${t} min`
  }
  if (sec < 86400) {
    const h = sec / 3600
    const t = h >= 10 ? Math.round(h) : Math.round(h * 10) / 10
    return `${t} h`
  }
  const d = sec / 86400
  const t = d >= 10 ? Math.round(d) : Math.round(d * 10) / 10
  return `${t} días`
}

/** Promedio de duraciones omitiendo nulos. */
export function averageDurationMs(values) {
  const valid = values.filter((v) => v != null && Number.isFinite(v) && v >= 0)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
