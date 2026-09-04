import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import {
  buildMonitorAlerts,
  fmtTs,
  healthLabel,
  healthTag,
  heartbeatAgo,
  isMachineLive,
  shortAgentError,
} from '../utils/biesseMonitorUtils'

function stateTag(state) {
  const s = String(state ?? '').toUpperCase()
  if (s === 'RUN') return 'tag tag--ok'
  if (s === 'PAUSE') return 'tag tag--warn'
  if (s === 'IDLE') return 'tag'
  if (s === 'EMERGENCY') return 'tag tag--danger'
  return 'tag'
}

function formatMachineState(state, live) {
  const raw = state == null || state === '' ? '' : String(state).trim()
  const upper = raw.toUpperCase()
  if (!live) {
    if (!raw || upper === 'UNKNOWN' || upper === '—') return 'Sin señal'
    return `${upper === 'PAUSE' ? 'PAUSA' : upper} (último)`
  }
  if (!raw || upper === 'UNKNOWN') return 'Sin estado OSI'
  if (upper === 'PAUSE') return 'PAUSA'
  return upper
}

/** Salud efectiva: no se queda pegada en DEGRADED si ya está live y sin cola. */
function effectiveHealth(machine, live) {
  const queue = Number(machine?.pending_queue_size ?? machine?.pendingQueueSize ?? 0)
  const raw = String(machine?.health_status ?? machine?.healthStatus ?? 'OK').toUpperCase()
  if (!live) {
    if (queue > 0 || raw === 'OFFLINE_QUEUE') return 'OFFLINE_QUEUE'
    return 'OFFLINE'
  }
  if (queue > 0) return queue >= 50 ? 'OFFLINE_QUEUE' : 'DEGRADED'
  if (raw === 'DEGRADED' || raw === 'OFFLINE_QUEUE') {
    return 'OK'
  }
  return raw || 'OK'
}

function progressLabel(done, total) {
  const d = Number(done ?? 0) || 0
  const t = Number(total ?? 0) || 0
  if (t > 0) return `${d} / ${t}`
  return String(d)
}

function progressPct(done, total) {
  const d = Number(done ?? 0) || 0
  const t = Number(total ?? 0) || 0
  if (t <= 0) return null
  return Math.min(100, Math.round((d / t) * 100))
}

function durationLive(startedAt) {
  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return null
  const sec = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function isNotFoundError(message) {
  const m = String(message ?? '').toLowerCase()
  return m.includes('not found') || m.includes('404')
}

function toLocalISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MACHINES_POLL_MS = 2000
const EVENTS_POLL_MS = 10000

export function BiesseMonitorPanel() {
  const [machines, setMachines] = useState([])
  const [monitorConfig, setMonitorConfig] = useState(null)
  const [eventSummary, setEventSummary] = useState([])
  const [alarms, setAlarms] = useState([])
  const [boardsLive, setBoardsLive] = useState(null)
  const [boardsHistory, setBoardsHistory] = useState([])
  const [boardsSummary, setBoardsSummary] = useState(null)
  const [boardsFrom, setBoardsFrom] = useState(() => toLocalISODate())
  const [boardsTo, setBoardsTo] = useState(() => toLocalISODate())
  const [boardsMachineId, setBoardsMachineId] = useState('')
  const [boardsHistoryTotal, setBoardsHistoryTotal] = useState(null)
  const [events, setEvents] = useState([])
  const [cuts, setCuts] = useState([])
  const [cutTimes, setCutTimes] = useState([])
  const [cutSummary, setCutSummary] = useState([])
  const [cutOpFilter, setCutOpFilter] = useState('')
  const [cutOpApplied, setCutOpApplied] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0)
  const [liveConnected, setLiveConnected] = useState(false)
  const [liveKey, setLiveKey] = useState(0)

  const staleMs = (monitorConfig?.onlineStaleSeconds ?? 90) * 1000
  const minAgentVersion = monitorConfig?.minAgentVersion ?? '1.7.0'
  const machinesPollMs = monitorConfig?.machinesPollMs ?? MACHINES_POLL_MS
  const eventsPollMs = monitorConfig?.eventsPollMs ?? EVENTS_POLL_MS

  const monitorAlerts = useMemo(
    () => buildMonitorAlerts(machines, { staleMs, minAgentVersion }),
    [machines, staleMs, minAgentVersion],
  )

  const loadMonitorConfig = useCallback(async () => {
    try {
      const cfg = await systemApi.getAgentMonitorConfig()
      setMonitorConfig(cfg && typeof cfg === 'object' ? cfg : null)
    } catch {
      setMonitorConfig(null)
    }
  }, [])

  const loadMachines = useCallback(async () => {
    try {
      const [m, live] = await Promise.all([
        systemApi.listAgentMachines(),
        systemApi.listAgentBoardsLive().catch(() => null),
      ])
      const list = Array.isArray(m) ? [...m] : []
      list.sort((a, b) => {
        const idA = Number(a.machine_id ?? a.machineId ?? 0)
        const idB = Number(b.machine_id ?? b.machineId ?? 0)
        return idA - idB
      })
      setMachines(list)
      setBoardsLive(live && typeof live === 'object' ? live : null)
      setErr(null)
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : 'No se pudo cargar el monitor'
      setErr(msg)
      setMachines([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBoardsHistory = useCallback(async () => {
    try {
      const [hist, sum] = await Promise.all([
        systemApi
          .listAgentBoardsHistory({
            from: boardsFrom || undefined,
            to: boardsTo || undefined,
            machineId: boardsMachineId || undefined,
            limit: 120,
          })
          .catch(() => null),
        systemApi
          .listAgentBoardsSummary({
            from: boardsFrom || undefined,
            to: boardsTo || undefined,
            machineId: boardsMachineId || undefined,
          })
          .catch(() => null),
      ])
      setBoardsHistory(Array.isArray(hist?.items) ? hist.items : [])
      setBoardsHistoryTotal(
        typeof hist?.total_boards === 'number' ? hist.total_boards : null,
      )
      setBoardsSummary(sum && typeof sum === 'object' ? sum : null)
    } catch {
      setBoardsHistory([])
      setBoardsHistoryTotal(null)
      setBoardsSummary(null)
    }
  }, [boardsFrom, boardsTo, boardsMachineId])

  const loadEvents = useCallback(async () => {
    const op = cutOpApplied.trim() || undefined
    try {
      const [e, c, t, s, summary, alarmRows] = await Promise.all([
        systemApi.listAgentEvents(100).catch(() => []),
        systemApi.listAgentCutPieces({ limit: 40 }).catch(() => []),
        systemApi.listAgentCutTimes({ op, limit: 80 }).catch(() => []),
        systemApi.listAgentCutTimesSummary({ op, limit: 50 }).catch(() => []),
        systemApi.listAgentEventsSummary(24).catch(() => []),
        systemApi.listAgentAlarms(30).catch(() => []),
      ])
      setEvents(Array.isArray(e) ? e : [])
      setCuts(Array.isArray(c) ? c : [])
      setCutTimes(Array.isArray(t) ? t : [])
      setCutSummary(Array.isArray(s) ? s : [])
      setEventSummary(Array.isArray(summary) ? summary : [])
      setAlarms(Array.isArray(alarmRows) ? alarmRows : [])
    } catch {
      setEvents([])
      setCuts([])
      setCutTimes([])
      setCutSummary([])
    }
  }, [cutOpApplied])

  const applyLiveSnapshot = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return
    const list = Array.isArray(payload.machines) ? [...payload.machines] : null
    if (list) {
      list.sort((a, b) => {
        const idA = Number(a.machine_id ?? a.machineId ?? 0)
        const idB = Number(b.machine_id ?? b.machineId ?? 0)
        return idA - idB
      })
      setMachines(list)
    }
    const live = payload.boards_live ?? payload.boardsLive
    if (live && typeof live === 'object') {
      setBoardsLive(live)
    }
    setErr(null)
    setLoading(false)
  }, [])

  const load = useCallback(async () => {
    await Promise.all([loadMonitorConfig(), loadMachines(), loadEvents(), loadBoardsHistory()])
  }, [loadMonitorConfig, loadMachines, loadEvents, loadBoardsHistory])

  // Canal en vivo (SSE). Si falla, polling HTTP de respaldo.
  useEffect(() => {
    let cancelled = false
    let reconnectTimer = null
    const abort = new AbortController()

    const connect = async () => {
      if (cancelled) return
      try {
        await systemApi.streamAgentMonitor({
          signal: abort.signal,
          onEvent: ({ event, data }) => {
            if (cancelled) return
            if (event === 'connected') {
              setLiveConnected(true)
              return
            }
            if (event === 'snapshot' || event === 'update') {
              applyLiveSnapshot(data)
              setLiveConnected(true)
            }
          },
        })
      } catch {
        if (cancelled || abort.signal.aborted) return
        setLiveConnected(false)
        void loadMachines()
        reconnectTimer = window.setTimeout(() => {
          void connect()
        }, 5_000)
        return
      }
      if (!cancelled && !abort.signal.aborted) {
        setLiveConnected(false)
        reconnectTimer = window.setTimeout(() => {
          void connect()
        }, 3_000)
      }
    }

    void connect()
    return () => {
      cancelled = true
      setLiveConnected(false)
      abort.abort()
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
    }
  }, [applyLiveSnapshot, loadMachines, liveKey])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (liveConnected) {
      // Con live: máquinas vienen por SSE; historial/eventos se refrescan más lento
      const eventsPoll = window.setInterval(() => {
        void loadEvents()
        void loadBoardsHistory()
      }, Math.max(eventsPollMs, 15_000))
      return () => window.clearInterval(eventsPoll)
    }
    const machinesPoll = window.setInterval(() => {
      void loadMachines()
    }, machinesPollMs)
    const eventsPoll = window.setInterval(() => {
      void loadEvents()
      void loadBoardsHistory()
    }, eventsPollMs)
    return () => {
      window.clearInterval(machinesPoll)
      window.clearInterval(eventsPoll)
    }
  }, [loadMachines, loadEvents, loadBoardsHistory, machinesPollMs, eventsPollMs, liveConnected])

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [])

  void tick

  return (
    <div className="dash">
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="card__title" style={{ margin: 0 }}>
            Seccionadores
          </h1>
          <button
            type="button"
            className={`seguimiento-live biesse-monitor-live-btn${liveConnected ? '' : ' seguimiento-live--off'}`}
            title={
              liveConnected
                ? 'Canal en vivo conectado'
                : 'Canal en vivo desconectado — clic para reintentar'
            }
            onClick={() => {
              if (!liveConnected) setLiveKey((n) => n + 1)
            }}
          >
            <span className="seguimiento-live__dot" aria-hidden />
            Live
          </button>
        </div>
        {err ? (
          <div className="form-error" style={{ marginTop: '0.75rem' }} role="alert">
            <p style={{ margin: 0 }}>{err}</p>
            {isNotFoundError(err) ? (
              <p className="small" style={{ margin: '0.5rem 0 0' }}>
                El backend aún no tiene estas rutas. Reinicie/redeploy{' '}
                <strong>module-system</strong> (puerto 8080) con el código actual y vuelva a
                conectar Live.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {monitorAlerts.alerts.length ? (
        <div className="card pad biesse-alerts" style={{ marginBottom: '1rem' }} role="alert">
          <h2 className="card__title" style={{ fontSize: '1rem', marginBottom: 0 }}>
            Alertas
          </h2>
          <ul className="biesse-alerts__list">
            {monitorAlerts.alerts.map((a) => (
              <li
                key={a.text}
                className={a.level === 'danger' ? 'biesse-alerts__item--danger' : undefined}
              >
                {a.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {eventSummary.length ? (
        <div
          className="card pad"
          style={{
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'stretch',
          }}
        >
          <div className="small muted" style={{ width: '100%' }}>
            KPIs eventos (24 h)
          </div>
          {eventSummary.slice(0, 8).map((row) => (
            <div key={row.action} className="pad surface-2" style={{ borderRadius: 8, minWidth: 120 }}>
              <div className="small muted">{row.action}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{row.total ?? 0}</div>
            </div>
          ))}
        </div>
      ) : null}

      {loading && !machines.length && !err ? (
        <p className="muted pad">Cargando seccionadores…</p>
      ) : null}

      <div
        className="module-grid"
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          marginBottom: '1rem',
        }}
      >
        {!machines.length && !loading && !err ? (
          <div className="card pad">
            <p className="muted small">
              No hay seccionadores registrados. Agréguelos en Gestión → Configuración → Gestionar
              seccionadoras.
            </p>
          </div>
        ) : null}
        {machines.map((m) => {
          const id = m.machine_id ?? m.machineId
          const live = isMachineLive(m, staleMs)
          const stateRaw = m.state ?? ''
          const stateLabel = formatMachineState(stateRaw, live)
          const job = m.job_name ?? m.jobName
          const started = m.job_started_at ?? m.jobStartedAt
          const hbAt = m.last_heartbeat_at ?? m.lastHeartbeatAt
          const hbRel = heartbeatAgo(hbAt, { coarse: !live })
          const dur =
            live && started
              ? durationLive(started)
              : String(stateRaw).toUpperCase() === 'RUN' && live
                ? durationLive(started)
                : null
          const health = effectiveHealth(m, live)
          const queue = m.pending_queue_size ?? m.pendingQueueSize ?? 0
          const agentVer = m.agent_version ?? m.agentVersion
          const lastErr = m.last_error ?? m.lastError
          const errShort = shortAgentError(lastErr)
          const lastPart = m.last_part ?? m.lastPart
          const boardsDone = m.boards_done ?? m.boardsDone ?? 0
          const piecesDone = m.pieces_produced ?? m.piecesProduced ?? 0
          const piecesTotal = m.pieces_total ?? m.piecesTotal ?? 0
          const piecesPct = progressPct(piecesDone, piecesTotal)
          const liveRow = Array.isArray(boardsLive?.machines)
            ? boardsLive.machines.find(
                (r) => Number(r.machine_id ?? r.machineId) === Number(id),
              )
            : null
          const boardsToday = liveRow?.boards_today ?? liveRow?.boardsToday ?? null
          return (
            <article
              key={id}
              className={`card pad biesse-machine-card${live ? '' : ' biesse-machine-card--offline'}${String(stateRaw).toUpperCase() === 'PAUSE' ? ' biesse-machine-card--pause' : ''}`}
            >
              <header className="biesse-machine-card__head">
                <strong className="biesse-machine-card__title">
                  {m.machine_name ?? m.machineName ?? `Seccionador #${id}`}
                </strong>
                <div className="biesse-machine-card__badges">
                  <span
                    className={`seguimiento-live${live ? '' : ' seguimiento-live--off'}`}
                    title={live ? 'Heartbeat reciente' : 'Sin heartbeat reciente'}
                  >
                    <span className="seguimiento-live__dot" aria-hidden />
                    Live
                  </span>
                </div>
              </header>
              <dl className="biesse-machine-dl">
                <div>
                  <dt>Salud agente</dt>
                  <dd>
                    <span className={healthTag(health)} title={lastErr || undefined}>
                      {healthLabel(health, { live })}
                    </span>
                    {agentVer ? <span className="muted small"> · v{agentVer}</span> : null}
                  </dd>
                </div>
                {Number(queue) > 0 ? (
                  <div>
                    <dt>Cola offline</dt>
                    <dd>
                      <strong>{queue}</strong> eventos
                    </dd>
                  </div>
                ) : null}
                {errShort ? (
                  <div>
                    <dt>Último error</dt>
                    <dd className="small biesse-machine-dl__err" title={lastErr || undefined}>
                      {errShort}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className={stateTag(live ? stateRaw : '')}>{stateLabel}</span>
                  </dd>
                </div>
                <div>
                  <dt>Job / OP</dt>
                  <dd className="biesse-machine-dl__clip" title={job || undefined}>
                    {job || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Patrón</dt>
                  <dd>{m.pattern_name ?? m.patternName ?? '—'}</dd>
                </div>
                <div>
                  <dt>Última pieza</dt>
                  <dd className="biesse-machine-dl__clip" title={lastPart || undefined}>
                    {lastPart || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Piezas</dt>
                  <dd>
                    <strong>{progressLabel(piecesDone, piecesTotal)}</strong>
                    {piecesTotal > 0 ? (
                      <span className="muted small"> del total ERP</span>
                    ) : (
                      <span className="muted small"> en sesión</span>
                    )}
                    {piecesPct != null ? (
                      <div className="biesse-progress" title={`${piecesPct}%`}>
                        <div className="biesse-progress__bar" style={{ width: `${piecesPct}%` }} />
                      </div>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>Planchas</dt>
                  <dd>
                    <strong>{boardsDone}</strong>
                    <span className="muted small"> en sesión</span>
                    {boardsToday != null ? (
                      <span className="muted small"> · hoy {boardsToday}</span>
                    ) : null}
                  </dd>
                </div>
                {dur ? (
                  <div>
                    <dt>Tiempo cortando</dt>
                    <dd>
                      <strong>{dur}</strong>
                      {String(stateRaw).toUpperCase() === 'PAUSE' ? (
                        <span className="muted small"> (en pausa)</span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>{live ? 'Último heartbeat' : 'Última señal'}</dt>
                  <dd className="small">
                    {hbRel ? <strong>{hbRel}</strong> : '—'}
                    {hbAt ? <span className="muted"> · {fmtTs(hbAt)}</span> : null}
                  </dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>

      <section className="card pad" style={{ marginBottom: '1rem' }}>
        <h2 className="card__title" style={{ fontSize: '1rem' }}>
          Planchas en tiempo real
        </h2>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Una plancha = board OSI (<code>Boards done</code> / <code>boards_done</code>), no una pieza
          individual. Por máquina: sesión/job actual. Totales: en RUN (vivo) y del día.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            marginTop: '0.75rem',
            alignItems: 'stretch',
          }}
        >
          <div className="pad surface-2" style={{ borderRadius: 8, minWidth: 140 }}>
            <div className="small muted">Total en RUN (vivo)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
              {boardsLive?.total_live ?? 0}
            </div>
          </div>
          <div className="pad surface-2" style={{ borderRadius: 8, minWidth: 140 }}>
            <div className="small muted">Planchas hoy</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
              {boardsLive?.total_today ?? 0}
            </div>
          </div>
        </div>
        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Seccionador</th>
                <th>Estado</th>
                <th>Job</th>
                <th>Tiempo cortando</th>
                <th>Planchas sesión</th>
                <th>Planchas hoy</th>
              </tr>
            </thead>
            <tbody>
              {(boardsLive?.machines ?? []).map((row) => {
                const rowLive = isMachineLive(row, staleMs)
                const cutting =
                  rowLive && row.job_started_at ? durationLive(row.job_started_at) : null
                return (
                <tr key={row.machine_id}>
                  <td className="small">
                    {row.machine_name || `#${row.machine_id}`}
                    <span
                      className={`seguimiento-live${rowLive ? '' : ' seguimiento-live--off'}`}
                      style={{ marginLeft: 6 }}
                      title={rowLive ? 'Heartbeat reciente' : 'Sin heartbeat reciente'}
                    >
                      <span className="seguimiento-live__dot" aria-hidden />
                      Live
                    </span>
                  </td>
                  <td>
                    <span className={stateTag(row.state)}>{formatMachineState(row.state, rowLive)}</span>
                  </td>
                  <td className="small">{row.job_name || '—'}</td>
                  <td className="small">{cutting ? <strong>{cutting}</strong> : '—'}</td>
                  <td className="small">
                    <strong>{row.boards_done ?? 0}</strong>
                  </td>
                  <td className="small">{row.boards_today ?? 0}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
          {!(boardsLive?.machines?.length) ? (
            <p className="muted pad small">Sin datos de planchas en vivo aún.</p>
          ) : null}
        </div>
      </section>

      <section className="card pad" style={{ marginBottom: '1rem' }}>
        <h2 className="card__title" style={{ fontSize: '1rem' }}>
          Historial de planchas
        </h2>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Registros persistidos al cortar planchas (evento <code>Boards done</code> o incremento de
          status). Filtre por fechas y seccionador.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'flex-end',
            marginTop: '0.75rem',
          }}
        >
          <label className="field">
            <span className="small">Desde</span>
            <input
              type="date"
              value={boardsFrom}
              onChange={(e) => setBoardsFrom(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="small">Hasta</span>
            <input type="date" value={boardsTo} onChange={(e) => setBoardsTo(e.target.value)} />
          </label>
          <label className="field">
            <span className="small">Seccionador</span>
            <select
              value={boardsMachineId}
              onChange={(e) => setBoardsMachineId(e.target.value)}
            >
              <option value="">Todos</option>
              {machines.map((m) => {
                const id = m.machine_id ?? m.machineId
                return (
                  <option key={id} value={String(id)}>
                    {m.machine_name ?? m.machineName ?? `Seccionador #${id}`}
                  </option>
                )
              })}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void loadBoardsHistory()}
          >
            Aplicar filtro
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            marginTop: '0.75rem',
          }}
        >
          <div className="pad surface-2" style={{ borderRadius: 8, minWidth: 160 }}>
            <div className="small muted">Total en rango</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {boardsSummary?.grand_total
                ?? boardsHistoryTotal
                ?? boardsHistory.reduce((acc, r) => acc + (Number(r.boards_delta) || 0), 0)}
            </div>
          </div>
          {(boardsSummary?.by_machine ?? []).map((row) => (
            <div
              key={row.machine_id}
              className="pad surface-2"
              style={{ borderRadius: 8, minWidth: 140 }}
            >
              <div className="small muted">{row.machine_name || `#${row.machine_id}`}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{row.boards_total ?? 0}</div>
              <div className="small muted">{row.cut_events ?? 0} eventos</div>
            </div>
          ))}
        </div>
        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Seccionador</th>
                <th>Job / obra</th>
                <th>Δ Planchas</th>
                <th>Total tras corte</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {boardsHistory.map((row) => (
                <tr key={row.id ?? row.event_uid}>
                  <td className="small muted">{fmtTs(row.event_time ?? row.created_at)}</td>
                  <td className="small">{row.machine_name ?? row.machine_id ?? '—'}</td>
                  <td className="small">
                    {row.job_name || '—'}
                    {row.order_id != null ? <div className="muted">#{row.order_id}</div> : null}
                  </td>
                  <td className="small">
                    <strong>{row.boards_delta ?? 0}</strong>
                  </td>
                  <td className="small">{row.boards_total_after ?? '—'}</td>
                  <td>
                    <span className="tag">
                      {row.source === 'STATUS_DELTA' ? 'Status' : row.source === 'EVENT' ? 'Evento' : row.source || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!boardsHistory.length ? (
            <p className="muted pad small">
              Sin planchas en este rango. Aparecen al cortar tableros en el seccionador.
            </p>
          ) : null}
        </div>
      </section>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section className="card">
          <h2 className="card__title pad" style={{ fontSize: '1rem', marginBottom: 0 }}>
            Eventos recientes
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Seccionador</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id ?? ev.event_uid}>
                    <td className="small muted">{fmtTs(ev.event_time ?? ev.created_at)}</td>
                    <td className="small">{ev.machine_name ?? ev.machine_id ?? '—'}</td>
                    <td className="small">{ev.event_type}</td>
                    <td className="small">
                      {(ev.description || ev.code || '').slice(0, 60)}
                      {ev.ordername ? <span className="muted"> · {ev.ordername}</span> : null}
                    </td>
                    <td>
                      <span className="tag">{ev.processed_action ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!events.length ? <p className="muted pad small">Sin eventos aún.</p> : null}
          </div>
        </section>

        <section className="card">
          <h2 className="card__title pad" style={{ fontSize: '1rem', marginBottom: 0 }}>
            Piezas cortadas / stickers
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Código</th>
                  <th>Seccionador</th>
                  <th>Mapa</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {cuts.map((c) => (
                  <tr key={c.cut_piece_id}>
                    <td className="small muted">{fmtTs(c.created_at)}</td>
                    <td className="small">
                      {c.unit_code || c.osi_part_id || '—'}
                      {(c.order_name || c.ordername) ? (
                        <div className="muted">{c.order_name || c.ordername}</div>
                      ) : null}
                    </td>
                    <td className="small">{c.machine_name ?? '—'}</td>
                    <td>
                      <span className="tag">{c.map_status ?? '—'}</span>
                    </td>
                    <td>
                      {c.printed ? <span className="tag tag--ok">OK</span> : <span className="tag">Pend.</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!cuts.length ? <p className="muted pad small">Sin piezas cortadas registradas.</p> : null}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 className="card__title pad" style={{ fontSize: '1rem', marginBottom: 0 }}>
          Historial de corte por obra
        </h2>
        <p className="muted small pad" style={{ marginTop: 0, paddingBottom: 0 }}>
          Duración total que demoró cada obra (suma de ventanas CORTE_FIN). Filtre por OP si quiere
          acotar.
        </p>
        <div
          className="pad"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}
        >
          <label className="field">
            <span className="small">OP / buscar</span>
            <input
              type="text"
              placeholder="S14783"
              value={cutOpFilter}
              onChange={(e) => setCutOpFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setCutOpApplied(cutOpFilter.trim())
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setCutOpApplied(cutOpFilter.trim())}
          >
            Filtrar tiempos
          </button>
          {cutOpApplied ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setCutOpFilter('')
                setCutOpApplied('')
              }}
            >
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Obra / OP</th>
                <th>Duración total</th>
                <th>Sesiones</th>
                <th>Seccionador(es)</th>
                <th>Inicio</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              {cutSummary.map((row) => (
                <tr key={row.orderid ?? `${row.op_codigo}-${row.ordername}`}>
                  <td className="small">
                    {row.ordername || '—'}
                    {row.orderid != null ? <div className="muted">#{row.orderid}</div> : null}
                    {row.op_codigo ? <div className="muted">{row.op_codigo}</div> : null}
                  </td>
                  <td className="small">
                    <strong>{row.total_duration_label || '0s'}</strong>
                  </td>
                  <td className="small">{row.sessions ?? 0}</td>
                  <td className="small">
                    {Array.isArray(row.seccionadores) && row.seccionadores.length
                      ? row.seccionadores.join(', ')
                      : '—'}
                  </td>
                  <td className="small muted">{fmtTs(row.first_start)}</td>
                  <td className="small muted">{fmtTs(row.last_end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cutSummary.length ? (
            <p className="muted pad small">Sin historial agregado aún (requiere CORTE_FIN en trazabilidad).</p>
          ) : null}
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 className="card__title pad" style={{ fontSize: '1rem', marginBottom: 0 }}>
          Alarmas OSI (Message)
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Seccionador</th>
                <th>Código</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {alarms.map((ev) => (
                <tr key={ev.id ?? ev.event_uid}>
                  <td className="small muted">{fmtTs(ev.event_time ?? ev.created_at)}</td>
                  <td className="small">{ev.machine_name ?? ev.machine_id ?? '—'}</td>
                  <td className="small">{ev.code || '—'}</td>
                  <td className="small">{(ev.description || '').slice(0, 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!alarms.length ? (
            <p className="muted pad small">Sin alarmas OSI recientes.</p>
          ) : null}
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 className="card__title pad" style={{ fontSize: '1rem', marginBottom: 0 }}>
          Tiempos de corte (eventos)
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Obra / OP</th>
                <th>Evento</th>
                <th>Seccionador</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              {cutTimes.map((row) => (
                <tr key={row.id ?? `${row.accion}-${row.fecha}`}>
                  <td className="small muted">{fmtTs(row.fecha)}</td>
                  <td className="small">
                    {row.ordername || '—'}
                    {row.op_codigo ? <div className="muted">{row.op_codigo}</div> : null}
                  </td>
                  <td>
                    <span className="tag">{row.accion}</span>
                  </td>
                  <td className="small">{row.seccionador || '—'}</td>
                  <td className="small">
                    {row.duration_label || (row.accion === 'CORTE_INICIO' ? 'en curso / inicio' : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cutTimes.length ? (
            <p className="muted pad small">
              Sin CORTE_INICIO / CORTE_FIN aún. Aparecen al iniciar y pausar/fin de job en el seccionador.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
