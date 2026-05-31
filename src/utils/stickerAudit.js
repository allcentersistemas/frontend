function pick(row, ...keys) {
  if (!row || typeof row !== 'object') return null
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key]
  }
  const byLower = Object.create(null)
  for (const [k, v] of Object.entries(row)) {
    byLower[k.toLowerCase()] = v
  }
  for (const key of keys) {
    const v = byLower[key.toLowerCase()]
    if (v != null && v !== '') return v
  }
  return null
}

function parseApiDate(value) {
  if (value == null || value === '') return null
  if (typeof value === 'string' || typeof value === 'number') return value
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d, h = 0, min = 0, s = 0, ms = 0] = value
    return new Date(y, m - 1, d, h, min, s, ms).toISOString()
  }
  if (typeof value === 'object') {
    if (value.epochSecond != null) {
      return new Date(Number(value.epochSecond) * 1000 + Math.floor(Number(value.nano ?? 0) / 1e6)).toISOString()
    }
    if (value.year != null && value.monthValue != null && value.dayOfMonth != null) {
      return new Date(
        value.year,
        value.monthValue - 1,
        value.dayOfMonth,
        value.hour ?? 0,
        value.minute ?? 0,
        value.second ?? 0,
      ).toISOString()
    }
  }
  return null
}

function stickerPartLabel(row, detalles) {
  const topLevel = pick(row, 'partId', 'partid', 'partCode')
  const partIds = [
    ...new Set(
      detalles
        .map((d) => pick(d, 'partId', 'partid', 'partCode'))
        .filter((id) => id != null),
    ),
  ]
  if (partIds.length === 1) return String(partIds[0])
  if (partIds.length > 1) return `${partIds.length} partes`
  if (topLevel != null) return String(topLevel)
  return '—'
}

/** Normaliza fila GET /api/impresion/sticker para la UI de auditoría. */
export function normalizeStickerPrintRow(row) {
  if (!row || typeof row !== 'object') return null
  const detalles = Array.isArray(row.detalles) ? row.detalles : []

  const detailBits = []
  const metodo = pick(row, 'metodo')
  const equipo = pick(row, 'equipo')
  const ubicacion = pick(row, 'ubicacion')
  const observaciones = pick(row, 'observaciones', 'notes', 'details')
  if (metodo) detailBits.push(metodo)
  if (equipo) detailBits.push(equipo)
  if (ubicacion) detailBits.push(ubicacion)
  if (observaciones) detailBits.push(observaciones)

  const usuarioId = pick(row, 'usuarioId', 'usuarioid')
  const usuarioEmail =
    pick(row, 'printedByEmail', 'usuarioEmail', 'usuarioemail', 'actorEmail') ??
    (usuarioId != null ? `#${usuarioId}` : null)

  return {
    id: pick(row, 'id', 'impresionId', 'impresionid'),
    fecha: parseApiDate(
      pick(row, 'printedAt', 'fecha', 'fechaImpresion', 'createdAt', 'created_at'),
    ),
    orderId: pick(row, 'orderId', 'orderid'),
    partLabel: stickerPartLabel(row, detalles),
    cantidadEtiquetas: pick(row, 'pieceCount', 'cantidadEtiquetas', 'cantidadetiquetas', 'quantity'),
    usuarioEmail,
    detalle: detailBits.length ? detailBits.join(' · ') : '—',
    raw: row,
  }
}
