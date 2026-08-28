/** Utilidades compartidas monitor/config seccionadoras. */

export function fmtTs(value) {
  if (!value) return '—'
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
  } catch {
    return String(value)
  }
}

export function heartbeatAgo(value, { coarse = false } = {}) {
  if (!value) return null
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return null
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (coarse) {
    if (sec < 60) return 'hace <1 min'
    const m = Math.floor(sec / 60)
    if (m < 60) return `hace ${m} min`
    return `hace ${Math.floor(m / 60)} h`
  }
  if (sec < 3) return 'ahora'
  if (sec < 60) return `hace ${sec}s`
  const m = Math.floor(sec / 60)
  if (m < 60) return `hace ${m}m`
  return `hace ${Math.floor(m / 60)}h`
}

export function lastSeenAt(machine) {
  const hb = machine?.last_heartbeat_at ?? machine?.lastHeartbeatAt
  const st = machine?.last_status_at ?? machine?.lastStatusAt
  const hbT = hb ? new Date(hb).getTime() : NaN
  const stT = st ? new Date(st).getTime() : NaN
  if (!Number.isNaN(hbT) && !Number.isNaN(stT)) return hbT >= stT ? hb : st
  if (!Number.isNaN(hbT)) return hb
  if (!Number.isNaN(stT)) return st
  return null
}

export function isEffectivelyOnline(machine, staleMs = 90_000) {
  const seen = lastSeenAt(machine)
  if (!seen) return false
  const t = new Date(seen).getTime()
  if (Number.isNaN(t)) return Boolean(machine?.online)
  return Date.now() - t <= staleMs
}

export function healthTag(health) {
  const h = String(health ?? 'OK').toUpperCase()
  if (h === 'OK') return 'tag tag--ok'
  if (h === 'DEGRADED') return 'tag tag--warn'
  if (h === 'OFFLINE_QUEUE') return 'tag tag--danger'
  return 'tag'
}

export function healthLabel(health) {
  const h = String(health ?? 'OK').toUpperCase()
  if (h === 'OK') return 'Saludable'
  if (h === 'DEGRADED') return 'Degradado'
  if (h === 'OFFLINE_QUEUE') return 'Offline + cola'
  return h
}

export function compareAgentVersion(current, minimum) {
  if (!current || !minimum) return 0
  const parse = (v) =>
    String(v)
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
  const a = parse(current)
  const b = parse(minimum)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function buildMonitorAlerts(machines, { staleMs = 90_000, minAgentVersion = '1.7.0' } = {}) {
  const alerts = []
  const offlineLong = []
  let maxQueue = 0
  let degraded = 0
  let outdated = 0

  for (const m of machines) {
    const name = m.machine_name ?? m.machineName ?? `#${m.machine_id ?? m.machineId}`
    const online = isEffectivelyOnline(m, staleMs)
    const hb = m.last_heartbeat_at ?? m.lastHeartbeatAt
    const queue = Number(m.pending_queue_size ?? m.pendingQueueSize ?? 0)
    const health = String(m.health_status ?? m.healthStatus ?? 'OK').toUpperCase()
    const version = m.agent_version ?? m.agentVersion

    if (!online && hb) {
      const t = new Date(hb).getTime()
      if (!Number.isNaN(t) && Date.now() - t > 180_000) offlineLong.push(name)
    }
    if (queue > maxQueue) maxQueue = queue
    if (queue >= 50) {
      alerts.push({ level: 'warn', text: `${name}: cola pendiente ${queue} eventos` })
    }
    if (health === 'DEGRADED' || health === 'OFFLINE_QUEUE') degraded++
    if (version && compareAgentVersion(version, minAgentVersion) < 0) outdated++
    const err = m.last_error ?? m.lastError
    if (err && online) {
      alerts.push({ level: 'warn', text: `${name}: ${String(err).slice(0, 120)}` })
    }
  }

  if (offlineLong.length) {
    alerts.unshift({
      level: 'danger',
      text: `Offline >3 min: ${offlineLong.join(', ')}`,
    })
  }
  if (degraded > 0) {
    alerts.push({ level: 'warn', text: `${degraded} seccionador(es) en estado degradado/offline+cola` })
  }
  if (outdated > 0) {
    alerts.push({
      level: 'warn',
      text: `${outdated} agente(s) con versión < ${minAgentVersion} — actualice en planta`,
    })
  }

  return { alerts, maxQueue, degraded, outdated }
}
