import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import {
  buildMonitorAlerts,
  fmtTs,
  healthLabel,
  healthTag,
  heartbeatAgo,
  isEffectivelyOnline,
  lastSeenAt,
} from '../utils/biesseMonitorUtils'

function stateTag(state) {
  const s = String(state ?? '').toUpperCase()
  if (s === 'RUN') return 'tag tag--ok'
  if (s === 'IDLE') return 'tag'
  if (s === 'EMERGENCY') return 'tag tag--danger'
  return 'tag'
}

function formatMachineState(state, online) {
  const raw = state == null || state === '' ? '' : String(state).trim()
  const upper = raw.toUpperCase()
  if (!online) {
    if (!raw || upper === 'UNKNOWN' || upper === '—') return 'Sin señal'
    return `${upper} (último)`
  }
  if (!raw || upper === 'UNKNOWN') return 'Sin estado OSI'
  return upper
}

function onlineLabel(online, heartbeatAt) {
  if (online) return 'Online'
  if (heartbeatAt) return 'Offline'
  return 'Sin señal'
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

function daysAgoLocalISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toLocalISODate(d)
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
  const [boardsFrom, setBoardsFrom] = useState(() => daysAgoLocalISO(7))
  const [boardsTo, setBoardsTo] = useState(() => toLocalISODate())
  const [boardsMachineId, setBoardsMachineId] = useState('')
  const [events, setEvents] = useState([])
  const [cuts, setCuts] = useState([])
  const [cutTimes, setCutTimes] = useState([])
  const [cutSummary, setCutSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0)
  const [lastMachinesAt, setLastMachinesAt] = useState(null)

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
      setLastMachinesAt(Date.now())
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
          })
          .catch(() => null),
      ])
      setBoardsHistory(Array.isArray(hist?.items) ? hist.items : [])
      setBoardsSummary(sum && typeof sum === 'object' ? sum : null)
    } catch {
      setBoardsHistory([])
      setBoardsSummary(null)
    }
  }, [boardsFrom, boardsTo, boardsMachineId])

  const loadEvents = useCallback(async () => {
    try {
      const [e, c, t, s, summary, alarmRows] = await Promise.all([
        systemApi.listAgentEvents(100).catch(() => []),
        systemApi.listAgentCutPieces({ limit: 40 }).catch(() => []),
        systemApi.listAgentCutTimes({ limit: 40 }).catch(() => []),
        systemApi.listAgentCutTimesSummary({ limit: 30 }).catch(() => []),
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
  }, [])

  const load = useCallback(async () => {
    await Promise.all([loadMonitorConfig(), loadMachines(), loadEvents(), loadBoardsHistory()])
  }, [loadMonitorConfig, loadMachines, loadEvents, loadBoardsHistory])

  useEffect(() => {
    void load()
    const machinesPoll = window.setInterval(() => void loadMachines(), machinesPollMs)
    const eventsPoll = window.setInterval(() => {
      void loadEvents()
      void loadBoardsHistory()
    }, eventsPollMs)
    return () => {
      window.clearInterval(machinesPoll)
      window.clearInterval(eventsPoll)
    }
  }, [load, loadMachines, loadEvents, loadBoardsHistory, machinesPollMs, eventsPollMs])

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [])

  void tick

  return (
    <div className="dash">
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="card__title">Seccionadores</h1>
            <p className="muted small" style={{ marginTop: '0.35rem' }}>
              Monitoreo en vivo del agente OSI (<code>agente_biesse_win10</code>): estados, tiempos,
              planchas, eventos y cortes. Máquinas cada {machinesPollMs / 1000}s; eventos/cortes cada{' '}
              {eventsPollMs / 1000}s. TTL online: {monitorConfig?.onlineStaleSeconds ?? 90}s. Para crear máquinas o rotar tokens use Gestión → Configuración.
            </p>
            {lastMachinesAt ? (
              <p className="small muted" style={{ marginTop: '0.25rem' }} role="status">
                Monitor actualizado {heartbeatAgo(lastMachinesAt) || 'ahora'}
              </p>
            ) : null}
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            Actualizar
          </button>
        </div>
        {err ? (
          <div className="form-error" style={{ marginTop: '0.75rem' }} role="alert">
            <p style={{ margin: 0 }}>{err}</p>
            {isNotFoundError(err) ? (
              <p className="small" style={{ margin: '0.5rem 0 0' }}>
                El backend aún no tiene estas rutas. Reinicie/redeploy{' '}
                <strong>module-system</strong> (puerto 8080) con el código actual y vuelva a
                actualizar.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {monitorAlerts.alerts.length ? (
        <div className="card pad" style={{ marginBottom: '1rem' }} role="alert">
          <h2 className="card__title" style={{ fontSize: '1rem' }}>
            Alertas
          </h2>
          <ul className="small" style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
            {monitorAlerts.alerts.map((a) => (
              <li
                key={a.text}
                style={{ color: a.level === 'danger' ? 'var(--danger, #c0392b)' : undefined }}
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
          const online = isEffectivelyOnline(m, staleMs)
          const stateRaw = m.state ?? ''
          const stateLabel = formatMachineState(stateRaw, online)
          const job = m.job_name ?? m.jobName
          const started = m.job_started_at ?? m.jobStartedAt
          const hbAt = m.last_heartbeat_at ?? m.lastHeartbeatAt
          const hbRel = heartbeatAgo(hbAt, { coarse: !online })
          const dur = String(stateRaw).toUpperCase() === 'RUN' && online ? durationLive(started) : null
          const health = m.health_status ?? m.healthStatus ?? 'OK'
          const queue = m.pending_queue_size ?? m.pendingQueueSize ?? 0
          const agentVer = m.agent_version ?? m.agentVersion
          const lastErr = m.last_error ?? m.lastError
          return (
            <article key={id} className="card pad">
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <strong>{m.machine_name ?? m.machineName ?? `Seccionador #${id}`}</strong>
                <span className={online ? 'tag tag--ok' : 'tag'}>
                  {onlineLabel(online, hbAt)}
                </span>
              </header>
              <dl className="inv-dl" style={{ marginTop: '0.75rem' }}>
                <div>
                  <dt>Salud agente</dt>
                  <dd>
                    <span className={healthTag(health)} title={lastErr || undefined}>
                      {healthLabel(health)}
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
                {lastErr ? (
                  <div>
                    <dt>Último error</dt>
                    <dd className="small" title={lastErr}>
                      {String(lastErr).slice(0, 80)}
                      {String(lastErr).length > 80 ? '…' : ''}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className={stateTag(online ? stateRaw : '')}>{stateLabel}</span>
                  </dd>
                </div>
                <div>
                  <dt>Job / OP</dt>
                  <dd>{job || '—'}</dd>
                </div>
                <div>
                  <dt>Patrón</dt>
                  <dd>{m.pattern_name ?? m.patternName ?? '—'}</dd>
                </div>
                <div>
                  <dt>Última pieza</dt>
                  <dd>{m.last_part ?? m.lastPart ?? '—'}</dd>
                </div>
                <div>
                  <dt>Planchas / piezas (sesión)</dt>
                  <dd>
                    {m.boards_done ?? m.boardsDone ?? 0} / {m.pieces_produced ?? m.piecesProduced ?? 0}
                  </dd>
                </div>
                {dur ? (
                  <div>
                    <dt>Tiempo de corte (vivo)</dt>
                    <dd>{dur}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{online ? 'Último heartbeat' : 'Última señal'}</dt>
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
          individual. Por máquina: sesión/job actual. Totales: en RUN (vivo), online y del día.
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
            <div className="small muted">Total online</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
              {boardsLive?.total_online ?? 0}
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
                <th>Planchas sesión</th>
                <th>Planchas hoy</th>
              </tr>
            </thead>
            <tbody>
              {(boardsLive?.machines ?? []).map((row) => {
                const rowOnline = isEffectivelyOnline(row, staleMs)
                return (
                <tr key={row.machine_id}>
                  <td className="small">
                    {row.machine_name || `#${row.machine_id}`}
                    {rowOnline ? (
                      <span className="tag tag--ok" style={{ marginLeft: 6 }}>
                        Online
                      </span>
                    ) : (
                      <span className="tag" style={{ marginLeft: 6 }}>
                        Offline
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={stateTag(row.state)}>{formatMachineState(row.state, isEffectivelyOnline(row, staleMs))}</span>
                  </td>
                  <td className="small">{row.job_name || '—'}</td>
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
                  <td className="small">{row.total_duration_label || '0s'}</td>
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
