import { parseAppDateTime } from './appDateTime.js'
import { averageDurationMs } from './durationFormat.js'

export const VENTAS_DEFAULT_DAYS = 30

export const VENTAS_PERIOD_PRESETS = [
  { id: '7', label: '7 días', days: 7 },
  { id: '30', label: '30 días', days: 30 },
  { id: '90', label: '90 días', days: 90 },
  { id: '365', label: '1 año', days: 365 },
]

function formatIsoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Rango por defecto: últimos N días inclusive hasta hoy. */
export function ventasDateRangeForDays(days = VENTAS_DEFAULT_DAYS, end = new Date()) {
  const hasta = new Date(end)
  const desde = new Date(end)
  desde.setDate(desde.getDate() - Math.max(1, days) + 1)
  return {
    fechaDesde: formatIsoDate(desde),
    fechaHasta: formatIsoDate(hasta),
  }
}

export function defaultVentasDateRange() {
  return ventasDateRangeForDays(VENTAS_DEFAULT_DAYS)
}

export function formatVentasPeriodLabel(fechaDesde, fechaHasta) {
  if (!fechaDesde && !fechaHasta) return 'Últimos 30 días'
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  const desde = fechaDesde ? parseAppDateTime(`${fechaDesde}T00:00:00`) : null
  const hasta = fechaHasta ? parseAppDateTime(`${fechaHasta}T23:59:59`) : null
  if (desde && hasta && !Number.isNaN(desde.getTime()) && !Number.isNaN(hasta.getTime())) {
    return `${desde.toLocaleDateString('es-CL', opts)} – ${hasta.toLocaleDateString('es-CL', opts)}`
  }
  if (desde && !Number.isNaN(desde.getTime())) return `Desde ${desde.toLocaleDateString('es-CL', opts)}`
  if (hasta && !Number.isNaN(hasta.getTime())) return `Hasta ${hasta.toLocaleDateString('es-CL', opts)}`
  return 'Período seleccionado'
}

/** Tramos por etapa (menor es mejor). Ciclo total es métrica secundaria aparte. */
export const VENTAS_STAGE_TABS = [
  { id: 'atencion', label: 'Envío → atención', from: 'enviado', to: 'enAtencion' },
  { id: 'cotizado', label: 'Atención → cotizado', from: 'enAtencion', to: 'cotizado' },
  { id: 'vendido', label: 'Cotizado → vendido', from: 'cotizado', to: 'vendido' },
]

const ESTADO_KEYS = ['ENVIADO', 'EN_ATENCION', 'COTIZADO', 'VENDIDO']

function proyectoEnviadoAt(p) {
  const t = p?.estadoTiempos?.enviado ?? p?.fechaCreacion
  return parseAppDateTime(t)
}

function stageTimestamp(proyecto, field) {
  if (field === 'enviado') return proyectoEnviadoAt(proyecto)
  return parseAppDateTime(proyecto?.estadoTiempos?.[field])
}

/** Duración de un tramo; null si falta cualquiera de los extremos. */
export function stageGapMs(proyecto, fromField, toField) {
  const from = stageTimestamp(proyecto, fromField)
  const to = stageTimestamp(proyecto, toField)
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  const ms = to.getTime() - from.getTime()
  return ms >= 0 ? ms : null
}

/** Duración del tramo asociado a un stage tab id. */
export function stageDurationMs(proyecto, stageId) {
  const tab = VENTAS_STAGE_TABS.find((t) => t.id === stageId)
  if (!tab) return null
  return stageGapMs(proyecto, tab.from, tab.to)
}

/** Ciclo total: enviado → vendido. */
export function cicloTotalMs(proyecto) {
  return stageGapMs(proyecto, 'enviado', 'vendido')
}

function matchesVendedor(p, vendedorKey) {
  if (!vendedorKey) return true
  const vk = String(vendedorKey)
  const matchId = p.vendedorId != null && String(p.vendedorId) === vk
  const matchName = (p.vendedorNombre ?? '').trim() === vk
  return matchId || matchName
}

export function filterVentasProyectos(proyectos, { fechaDesde, fechaHasta, vendedorKey }) {
  const desde = fechaDesde ? parseAppDateTime(`${fechaDesde}T00:00:00`) : null
  const hasta = fechaHasta ? parseAppDateTime(`${fechaHasta}T23:59:59`) : null
  return (proyectos ?? []).filter((p) => {
    if (p.estado === 'CANCELADO') return false
    if (!matchesVendedor(p, vendedorKey)) return false
    const enviado = proyectoEnviadoAt(p)
    if (!enviado || Number.isNaN(enviado.getTime())) return false
    if (desde && enviado < desde) return false
    if (hasta && enviado > hasta) return false
    return true
  })
}

export function countByEstado(proyectos) {
  const counts = { ENVIADO: 0, EN_ATENCION: 0, COTIZADO: 0, VENDIDO: 0 }
  for (const p of proyectos ?? []) {
    const e = p.estado
    if (e && counts[e] != null) counts[e] += 1
  }
  return counts
}

export function rankProyectosByStage(proyectos, stageId, { fastest = true, limit = 5 }) {
  const ranked = (proyectos ?? [])
    .map((p) => ({
      proyecto: p,
      ms: stageDurationMs(p, stageId),
    }))
    .filter((r) => r.ms != null)
    .sort((a, b) => (fastest ? a.ms - b.ms : b.ms - a.ms))
    .slice(0, limit)
  return ranked
}

function compareMsAscNullsLast(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
}

export function employeePerformanceRows(proyectos) {
  const byKey = new Map()
  for (const p of proyectos ?? []) {
    const key = p.vendedorId != null ? `id:${p.vendedorId}` : `name:${(p.vendedorNombre ?? 'Sin asignar').trim()}`
    const label = (p.vendedorNombre ?? '').trim() || 'Sin asignar'
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        label,
        proyectos: [],
        atencionMs: [],
        cotizadoMs: [],
        vendidoMs: [],
        cicloTotalMs: [],
      })
    }
    const row = byKey.get(key)
    row.proyectos.push(p)
    const a = stageDurationMs(p, 'atencion')
    const c = stageDurationMs(p, 'cotizado')
    const v = stageDurationMs(p, 'vendido')
    const ciclo = cicloTotalMs(p)
    if (a != null) row.atencionMs.push(a)
    if (c != null) row.cotizadoMs.push(c)
    if (v != null) row.vendidoMs.push(v)
    if (ciclo != null) row.cicloTotalMs.push(ciclo)
  }
  return [...byKey.values()]
    .map((r) => ({
      ...r,
      total: r.proyectos.length,
      avgAtencionMs: averageDurationMs(r.atencionMs),
      avgCotizadoMs: averageDurationMs(r.cotizadoMs),
      avgVendidoMs: averageDurationMs(r.vendidoMs),
      avgCicloTotalMs: averageDurationMs(r.cicloTotalMs),
    }))
    .sort((a, b) => {
      const byCiclo = compareMsAscNullsLast(a.avgCicloTotalMs, b.avgCicloTotalMs)
      if (byCiclo !== 0) return byCiclo
      return compareMsAscNullsLast(a.avgAtencionMs, b.avgAtencionMs)
    })
}

export function employeeRowMatchesVendedor(emp, vendedorKey) {
  if (!vendedorKey || !emp) return false
  const vk = String(vendedorKey)
  return emp.key === `id:${vk}` || emp.key === `name:${vk}`
}

export function vendedorOptions(proyectos) {
  const m = new Map()
  for (const p of proyectos ?? []) {
    if (p.vendedorId != null) {
      m.set(String(p.vendedorId), (p.vendedorNombre ?? `Vendedor #${p.vendedorId}`).trim())
    } else if (p.vendedorNombre?.trim()) {
      m.set(p.vendedorNombre.trim(), p.vendedorNombre.trim())
    }
  }
  return [...m.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

/**
 * Divide el rango filtrado en período actual y anterior de igual duración (comparativa).
 * Aplica el mismo universo que filterVentasProyectos: excluye CANCELADO y respeta vendedorKey.
 */
export function splitPeriods(proyectos, { fechaDesde, fechaHasta, vendedorKey }) {
  const now = new Date()
  let end = fechaHasta ? parseAppDateTime(`${fechaHasta}T23:59:59`) : now
  let start = fechaDesde ? parseAppDateTime(`${fechaDesde}T00:00:00`) : new Date(end.getTime() - 30 * 86400000)
  if (!end || Number.isNaN(end.getTime())) end = now
  if (!start || Number.isNaN(start.getTime())) start = new Date(end.getTime() - 30 * 86400000)
  const spanMs = Math.max(end.getTime() - start.getTime(), 86400000)
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - spanMs)

  const base = (proyectos ?? []).filter((p) => {
    if (p.estado === 'CANCELADO') return false
    return matchesVendedor(p, vendedorKey)
  })

  const inRange = (p, from, to) => {
    const d = proyectoEnviadoAt(p)
    if (!d || Number.isNaN(d.getTime())) return false
    return d >= from && d <= to
  }

  return {
    current: base.filter((p) => inRange(p, start, end)),
    previous: base.filter((p) => inRange(p, prevStart, prevEnd)),
    currentLabel: formatRangeLabel(start, end),
    previousLabel: formatRangeLabel(prevStart, prevEnd),
  }
}

function formatRangeLabel(from, to) {
  const opts = { day: 'numeric', month: 'short' }
  return `${from.toLocaleDateString('es-CL', opts)} – ${to.toLocaleDateString('es-CL', opts)}`
}

export function comparativeAverages(proyectos, period) {
  const list = period ?? []
  return {
    atencion: averageDurationMs(list.map((p) => stageDurationMs(p, 'atencion'))),
    cotizado: averageDurationMs(list.map((p) => stageDurationMs(p, 'cotizado'))),
    vendido: averageDurationMs(list.map((p) => stageDurationMs(p, 'vendido'))),
    cicloTotal: averageDurationMs(list.map((p) => cicloTotalMs(p))),
    total: list.length,
    byEstado: countByEstado(list),
  }
}

export function trendCount(current, previous) {
  if (previous === 0) {
    return current > 0 ? { pct: 100, up: true, label: 'vs período anterior' } : { pct: 0, up: true, label: 'sin cambio' }
  }
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(pct), up: pct >= 0, label: 'vs período anterior' }
}

export function trendDuration(currentMs, previousMs) {
  if (currentMs == null || previousMs == null) return null
  if (previousMs === 0) {
    return currentMs > 0 ? { pct: 100, up: false, label: 'vs período anterior' } : null
  }
  const pct = ((currentMs - previousMs) / previousMs) * 100
  const up = pct <= 0
  return { pct: Math.abs(pct), up, label: 'vs período anterior (menor es mejor)' }
}

export { ESTADO_KEYS }
