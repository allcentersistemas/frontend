/** Columnas de lectura del detalle de piezas (alineado con portal cliente). */
export const PIEZA_TABLE_COLUMNS = [
  { key: 'tablero', label: 'Tablero' },
  { key: 'cantidad', label: 'Cant.' },
  { key: 'largoVeta', label: 'Largo' },
  { key: 'ancho', label: 'Ancho' },
  { key: 'veta', label: 'Veta' },
  { key: 'l1', label: 'L1' },
  { key: 'l2', label: 'L2' },
  { key: 'a1', label: 'A1' },
  { key: 'a2', label: 'A2' },
  { key: 'observacion', label: 'Descripción' },
  { key: 'perforacionCantidad', label: 'Perf. cant.' },
  { key: 'perforacionLado1', label: 'Perf. lado' },
  { key: 'ranuraDist', label: 'Ran. dist.' },
  { key: 'ranuraProf', label: 'Ran. prof.' },
  { key: 'ranuraEs', label: 'Ran. esp.' },
  { key: 'ranuraLado', label: 'Ran. lado' },
]

export function formatPiezaCell(key, detalle) {
  const v = detalle?.[key]
  if (v == null || v === '' || String(v).trim().toUpperCase() === 'NA') return '—'
  if (key === 'veta') {
    const s = String(v)
    if (s.startsWith('1-') || s === '1') return '1-Long'
    return '0-No'
  }
  return String(v)
}
