export const STOCK_CATEGORIES = [
  { codigo: 'DISPONIBLE', etiqueta: 'Disponible' },
  { codigo: 'MERCA', etiqueta: 'Merma / merca' },
  { codigo: 'REUTILIZABLE', etiqueta: 'Reutilizable' },
]

export function categoriaLabel(codigo) {
  if (!codigo) return 'Disponible'
  return STOCK_CATEGORIES.find((c) => c.codigo === codigo)?.etiqueta ?? codigo
}
