const FAMILIA_LABELS = {
  TABLERO: 'Tablero',
  CANTO: 'Canto',
}

export function familiaLabel(codigo) {
  if (codigo == null || String(codigo).trim() === '') return '—'
  const key = String(codigo).trim().toUpperCase()
  return FAMILIA_LABELS[key] ?? key
}
