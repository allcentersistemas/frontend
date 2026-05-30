/** Normaliza fila GET /api/impresion/sticker para la UI de auditoría. */
export function normalizeStickerPrintRow(row) {
  if (!row || typeof row !== 'object') return null
  const detalles = Array.isArray(row.detalles) ? row.detalles : []
  const partIds = [...new Set(detalles.map((d) => d.partId).filter((id) => id != null))]
  let partLabel = '—'
  if (partIds.length === 1) {
    partLabel = String(partIds[0])
  } else if (partIds.length > 1) {
    partLabel = `${partIds.length} partes`
  } else if (row.partId != null) {
    partLabel = String(row.partId)
  }

  const detailBits = []
  if (row.metodo) detailBits.push(row.metodo)
  if (row.equipo) detailBits.push(row.equipo)
  if (row.ubicacion) detailBits.push(row.ubicacion)
  if (row.observaciones) detailBits.push(row.observaciones)

  return {
    id: row.impresionId ?? row.id,
    fecha: row.fecha ?? row.printedAt ?? row.fechaImpresion ?? row.createdAt,
    orderId: row.orderId ?? row.orderid,
    partLabel,
    cantidadEtiquetas: row.cantidadEtiquetas ?? row.pieceCount ?? row.cantidadPiezas ?? row.quantity,
    usuarioEmail:
      row.usuarioEmail ??
      row.printedByEmail ??
      row.actorEmail ??
      (row.usuarioId != null ? `#${row.usuarioId}` : null),
    detalle: detailBits.length ? detailBits.join(' · ') : '—',
    raw: row,
  }
}
