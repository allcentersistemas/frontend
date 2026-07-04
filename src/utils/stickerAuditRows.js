import { normalizeStickerPrintRow } from './stickerAudit.js'

function pick(row, ...keys) {
  if (!row || typeof row !== 'object') return null
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key]
  }
  return null
}

/** Expande impresiones a una fila por pieza (parte + pieza), ordenadas. */
export function flattenStickerAuditRows(list) {
  const expanded = []
  for (const raw of Array.isArray(list) ? list : []) {
    const base = normalizeStickerPrintRow(raw)
    if (!base) continue
    const detalles = Array.isArray(raw.detalles) ? raw.detalles : []
    if (!detalles.length) {
      expanded.push({
        ...base,
        partId: pick(raw, 'partId', 'partid'),
        piezaId: null,
        numeroPieza: null,
        rowKey: `${base.id}-0`,
      })
      continue
    }
    detalles.forEach((d, index) => {
      const partId = pick(d, 'partId', 'partid')
      const piezaId = pick(d, 'piezaId', 'piezaid')
      const numeroPieza = pick(d, 'numeroPieza', 'numero_pieza', 'numeroPieza')
      expanded.push({
        ...base,
        partId,
        piezaId,
        numeroPieza,
        partLabel: partId != null ? String(partId) : base.partLabel,
        rowKey: `${base.id}-${piezaId ?? index}`,
      })
    })
  }
  return expanded.sort((a, b) => {
    const oa = Number(a.orderId) || 0
    const ob = Number(b.orderId) || 0
    if (oa !== ob) return oa - ob
    const pa = Number(a.partId) || 0
    const pb = Number(b.partId) || 0
    if (pa !== pb) return pa - pb
    const pza = Number(a.piezaId) || Number(a.numeroPieza) || 0
    const pzb = Number(b.piezaId) || Number(b.numeroPieza) || 0
    return pza - pzb
  })
}
