/**
 * Número de pieza y total para etiquetas Biesse (1/2, 2/2…).
 * @param {object|null|undefined} part
 * @param {{ numeroPieza?: number }|null|undefined} piece
 */
export function resolveStickerPieceCounts(part, piece) {
  const piezas = Array.isArray(part?.piezas) ? part.piezas : []
  const nums = piezas
    .map((z) => Number(z?.numeroPieza))
    .filter((n) => Number.isFinite(n) && n >= 1)

  const totalFromPiezas = nums.length > 0 ? Math.max(...nums, nums.length) : 0
  const totalFromCantidad = Math.max(1, Number(part?.cantidad ?? 1))
  const totalPiezas = Math.max(totalFromPiezas, totalFromCantidad, 1)

  let numeroPieza = Math.max(1, Number(piece?.numeroPieza ?? 1))
  if (nums.length > 0) {
    if (!nums.includes(numeroPieza)) {
      numeroPieza = Math.min(...nums)
    }
    numeroPieza = Math.min(numeroPieza, totalPiezas)
  } else {
    numeroPieza = Math.min(numeroPieza, totalPiezas)
  }

  return {
    numeroPieza,
    totalPiezas,
    fractionText: `${numeroPieza}/${totalPiezas}`,
  }
}
