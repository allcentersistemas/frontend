import { useCallback, useEffect, useState } from 'react'
import * as biesseApi from '../api/biesseApi'

function fmtTs(value) {
  if (!value) return '—'
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
  } catch {
    return String(value)
  }
}

function stateTag(state) {
  const s = String(state ?? '').toUpperCase()
  if (s === 'RUN') return 'tag tag--ok'
  if (s === 'IDLE') return 'tag'
  if (s === 'EMERGENCY') return 'tag tag--danger'
  return 'tag'
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

export function BiesseMonitorPanel() {
  const [machines, setMachines] = useState([])
  const [events, setEvents] = useState([])
  const [cuts, setCuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [m, e, c] = await Promise.all([
        biesseApi.listAgentMachines(),
        biesseApi.listAgentEvents(100),
        biesseApi.listAgentCutPieces(40),
      ])
      setMachines(Array.isArray(m) ? m : [])
      setEvents(Array.isArray(e) ? e : [])
      setCuts(Array.isArray(c) ? c : [])
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo cargar el monitor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const poll = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(poll)
  }, [load])

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
            <h1 className="card__title">Monitor Biesse CNC</h1>
            <p className="muted small" style={{ marginTop: '0.35rem' }}>
              Estado en vivo del agente OSI (Event.log). Al iniciar un programa la obra pasa a{' '}
              <strong>Producción</strong> y se registra trazabilidad de tiempos.
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            Actualizar
          </button>
        </div>
        {err ? (
          <p className="form-error" style={{ marginTop: '0.75rem' }} role="alert">
            {err}
          </p>
        ) : null}
      </div>

      {loading && !machines.length ? (
        <p className="muted pad">Cargando máquinas…</p>
      ) : null}

      <div className="module-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '1rem' }}>
        {!machines.length && !loading ? (
          <div className="card pad">
            <p className="muted small">
              No hay máquinas registradas. Arranca <code>module-biesse</code> (bootstrap crea una) y
              configura el agente Win10 con URL <code>:8086</code> y el token.
            </p>
          </div>
        ) : null}
        {machines.map((m) => {
          const id = m.machine_id ?? m.machineId
          const online = Boolean(m.online)
          const state = m.state ?? '—'
          const job = m.job_name ?? m.jobName
          const started = m.job_started_at ?? m.jobStartedAt
          const dur = state === 'RUN' ? durationLive(started) : null
          return (
            <article key={id} className="card pad">
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <strong>{m.machine_name ?? m.machineName ?? `Máquina #${id}`}</strong>
                <span className={online ? 'tag tag--ok' : 'tag'}>
                  {onlineLabel(online, m.last_heartbeat_at ?? m.lastHeartbeatAt)}
                </span>
              </header>
              <dl className="inv-dl" style={{ marginTop: '0.75rem' }}>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className={stateTag(state)}>{state}</span>
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
                  <dt>Tableros / piezas</dt>
                  <dd>
                    {m.boards_done ?? m.boardsDone ?? 0} / {m.pieces_produced ?? m.piecesProduced ?? 0}
                  </dd>
                </div>
                {dur ? (
                  <div>
                    <dt>Tiempo de corte</dt>
                    <dd>{dur}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Heartbeat</dt>
                  <dd className="small muted">{fmtTs(m.last_heartbeat_at ?? m.lastHeartbeatAt)}</dd>
                </div>
                {(m.health_status || m.healthStatus) && (m.health_status ?? m.healthStatus) !== 'OK' ? (
                  <div>
                    <dt>Salud</dt>
                    <dd>{m.health_status ?? m.healthStatus}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          )
        })}
      </div>

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
                  <th>Máq.</th>
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
                      {ev.ordername ? (
                        <span className="muted"> · {ev.ordername}</span>
                      ) : null}
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
                      {c.ordername ? <div className="muted">{c.ordername}</div> : null}
                    </td>
                    <td>
                      <span className="tag">{c.map_status ?? '—'}</span>
                    </td>
                    <td>
                      {c.printed ? (
                        <span className="tag tag--ok">OK</span>
                      ) : (
                        <span className="tag">Pend.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!cuts.length ? <p className="muted pad small">Sin piezas cortadas registradas.</p> : null}
          </div>
        </section>
      </div>
    </div>
  )
}
