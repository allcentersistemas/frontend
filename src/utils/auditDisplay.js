/** Lectura tolerante de filas de auditoría (API JDBC suele devolver claves en minúsculas). */
export function auditPick(row, ...keys) {
  if (row == null) return null
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k) && row[k] != null && row[k] !== '') {
      return row[k]
    }
  }
  const lowerMap = Object.fromEntries(
    Object.entries(row).map(([key, v]) => [key.toLowerCase(), v]),
  )
  for (const k of keys) {
    const v = lowerMap[k.toLowerCase()]
    if (v != null && v !== '') return v
  }
  return null
}

/** Texto corto para UA en tablas. */
export function shortUa(ua, max = 48) {
  if (ua == null || ua === '') return '—'
  const s = String(ua)
  return s.length <= max ? s : `${s.slice(0, max)}…`
}
