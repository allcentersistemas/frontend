export const STOCK_ITEM_TYPES = [
  { id: '', label: 'Todos' },
  { id: 'PALET', label: 'Palés' },
  { id: 'PIEZA', label: 'Piezas' },
  { id: 'OTROS', label: 'Otros' },
]

export function inferStockItemType(row) {
  if (!row || typeof row !== 'object') return 'OTROS'
  const explicit = row.tipoInventario ?? row.tipo_inventario
  if (explicit) return String(explicit).toUpperCase()
  const sku = String(row.sku ?? '').toUpperCase()
  if (sku.startsWith('PALET-')) return 'PALET'
  if (sku.startsWith('RM-')) return 'PIEZA'
  const familia = String(row.familiaCodigo ?? row.familia_codigo ?? '').toUpperCase()
  if (familia === 'TABLERO' || familia === 'CANTO') return familia
  return 'OTROS'
}

export function stockItemTypeLabel(tipo) {
  switch (String(tipo ?? '').toUpperCase()) {
    case 'PALET':
      return 'Palé'
    case 'PIEZA':
      return 'Pieza'
    case 'TABLERO':
      return 'Tablero'
    case 'CANTO':
      return 'Canto'
    default:
      return 'Otro'
  }
}
