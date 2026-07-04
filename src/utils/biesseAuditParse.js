import { auditPick } from './auditDisplay.js'

/** Extrae pieza, palé y otros datos del texto libre de auditoriaescaneos. */
export function parseBiesseAuditDetails(row) {
  const detalles = String(auditPick(row, 'detalles', 'details') ?? '')
  const equipo = String(auditPick(row, 'equipo', 'equipment') ?? '')
  const piezaMatch = detalles.match(/piezaid\s*=\s*(\d+)/i)
  const paleMatch =
    detalles.match(/pale\s*[=:]\s*([A-Za-z0-9_-]+)/i) ||
    detalles.match(/palé\s+([A-Za-z0-9_-]+)/i) ||
    detalles.match(/Agregada a pale\s+([A-Za-z0-9_-]+)/i)
  return {
    piezaId: piezaMatch ? piezaMatch[1] : null,
    paleCodigo: paleMatch ? paleMatch[1] : equipo === 'PALLET' ? '—' : null,
    detalles,
  }
}

export function biesseActorLabel(row, employeeMap = null) {
  const userId = auditPick(row, 'usuarioid', 'usuarioId', 'usuarioid')
  if (employeeMap && userId != null) {
    const hit = employeeMap.get(Number(userId))
    if (hit?.email) return hit.email
    if (hit?.displayName) return hit.displayName
  }
  return userId != null ? `#${userId}` : '—'
}
