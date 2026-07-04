import { auditPick } from './auditDisplay.js'

/** Extrae pieza, palé y otros datos del texto libre de auditoriaescaneos. */
export function parseBiesseAuditDetails(row) {
  const detalles = String(auditPick(row, 'detalles', 'details') ?? '')
  const equipo = String(auditPick(row, 'equipo', 'equipment') ?? '')
  const piezaIdRaw = auditPick(row, 'piezaid', 'piezaId')
  const piezaMatch = detalles.match(/piezaid\s*=\s*(\d+)/i)
  const parteMatch = detalles.match(/parte\s*=\s*([^\s|]+)/i)
  const paleMatch =
    detalles.match(/pale\s*[=:]\s*([A-Za-z0-9_-]+)/i) ||
    detalles.match(/palé\s+([A-Za-z0-9_-]+)/i) ||
    detalles.match(/Agregada a pale\s+([A-Za-z0-9_-]+)/i)
  const numeroPiezaRaw = auditPick(row, 'numero_pieza', 'numeroPieza', 'numeropieza')
  return {
    piezaId: piezaIdRaw ?? (piezaMatch ? piezaMatch[1] : null),
    numeroPieza: numeroPiezaRaw != null ? String(numeroPiezaRaw) : null,
    partCode: auditPick(row, 'partcode', 'partCode') ?? (parteMatch ? parteMatch[1] : null),
    orderName: auditPick(row, 'ordername', 'orderName'),
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

/** Etiqueta legible de orden: nombre de orden (con #id secundario). */
export function biesseAuditOrderLabel(row, parsed) {
  const orderId = auditPick(row, 'orderid', 'orderId')
  const name = parsed?.orderName ?? auditPick(row, 'ordername', 'orderName')
  if (name) {
    return orderId != null ? `${name} (#${orderId})` : String(name)
  }
  return orderId != null ? `#${orderId}` : '—'
}

/** Etiqueta legible de parte: P2 (con #id secundario). */
export function biesseAuditPartLabel(row, parsed) {
  const partId = auditPick(row, 'partid', 'partId')
  const code = parsed?.partCode ?? auditPick(row, 'partcode', 'partCode')
  if (code) {
    return partId != null ? `${code} (#${partId})` : String(code)
  }
  return partId != null ? `#${partId}` : '—'
}

/** Etiqueta legible de pieza: Pieza 3 (con piezaid secundario si existe). */
export function biesseAuditPieceLabel(row, parsed) {
  const numero = parsed?.numeroPieza
  const piezaId = parsed?.piezaId ?? auditPick(row, 'piezaid', 'piezaId')
  if (numero != null && String(numero).trim() !== '') {
    return piezaId != null ? `Pieza ${numero} (id ${piezaId})` : `Pieza ${numero}`
  }
  return piezaId != null ? `id ${piezaId}` : '—'
}

/** Resumen corto para tablas unificadas. */
export function biesseAuditSummary(row) {
  const parsed = parseBiesseAuditDetails(row)
  const parts = [
    biesseAuditOrderLabel(row, parsed),
    biesseAuditPartLabel(row, parsed),
    biesseAuditPieceLabel(row, parsed),
  ].filter((p) => p && p !== '—')
  if (parsed.paleCodigo && parsed.paleCodigo !== '—') {
    parts.push(`Palé ${parsed.paleCodigo}`)
  }
  return parts.join(' · ')
}
