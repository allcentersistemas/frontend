import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { CanButton } from '../components/CanButton'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'

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

function isNotFoundError(message) {
  const m = String(message ?? '').toLowerCase()
  return m.includes('not found') || m.includes('404')
}

export function BiesseMonitorPanel() {
  const [machines, setMachines] = useState([])
  const [events, setEvents] = useState([])
  const [cuts, setCuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0)

  const [machineName, setMachineName] = useState('BIESSE-OSI')
  const [plantName, setPlantName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [newToken, setNewToken] = useState(null)
  const [tokenMsg, setTokenMsg] = useState(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [m, e, c] = await Promise.all([
        systemApi.listAgentMachines(),
        systemApi.listAgentEvents(100).catch(() => []),
        systemApi.listAgentCutPieces(40).catch(() => []),
      ])
      setMachines(Array.isArray(m) ? m : [])
      setEvents(Array.isArray(e) ? e : [])
      setCuts(Array.isArray(c) ? c : [])
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : 'No se pudo cargar el monitor'
      setErr(msg)
      setMachines([])
      setEvents([])
      setCuts([])
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

  async function handleCreateMachine(e) {
    e.preventDefault()
    setCreateBusy(true)
    setTokenMsg(null)
    setNewToken(null)
    try {
      const res = await systemApi.createAgentMachine({
        machineName: machineName.trim() || 'BIESSE-OSI',
        plantName: plantName.trim() || undefined,
      })
      setNewToken(res?.token ?? null)
      setTokenMsg(res?.message ?? 'Token creado. Cópielo ahora.')
      await load()
    } catch (ex) {
      setTokenMsg(ex instanceof Error ? ex.message : 'No se pudo crear la máquina')
    } finally {
      setCreateBusy(false)
    }
  }

  async function handleRotate(machineId) {
    if (!window.confirm('¿Rotar el token? El agente deberá actualizar config.json.')) return
    setCreateBusy(true)
    setTokenMsg(null)
    setNewToken(null)
    try {
      const res = await systemApi.rotateAgentMachineToken(machineId)
      setNewToken(res?.token ?? null)
      setTokenMsg(res?.message ?? 'Token rotado.')
      await load()
    } catch (ex) {
      setTokenMsg(ex instanceof Error ? ex.message : 'No se pudo rotar el token')
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div className="dash">
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="card__title">Monitor Biesse CNC</h1>
            <p className="muted small" style={{ marginTop: '0.35rem' }}>
              Estado en vivo del agente OSI (<code>agente_biesse_win10</code>). Cree un token aquí y
              póngalo en el agente con URL <code>http://IP-SERVIDOR:8080</code> (module-system).
            </p>
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

      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h2 className="card__title" style={{ fontSize: '1rem' }}>
          Conectar agente (token)
        </h2>
        <p className="muted small">
          En la PC del CNC: abra el agente, configure API base <code>http://IP:8080</code> y pegue el
          token (header <code>X-Agent-Token</code> / config.json). Solo roles admin pueden crear o
          rotar tokens.
        </p>
        <form
          onSubmit={(e) => void handleCreateMachine(e)}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginTop: '0.75rem' }}
        >
          <label className="field">
            <span className="small">Nombre máquina</span>
            <input value={machineName} onChange={(e) => setMachineName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="small">Planta (opcional)</span>
            <input value={plantName} onChange={(e) => setPlantName(e.target.value)} placeholder="Planta 1" />
          </label>
          <CanButton
            I={ACTION.UPDATE}
            a={FEATURE.BIESSE_ORDERS}
            type="submit"
            className="btn btn--primary"
            disabled={createBusy}
          >
            {createBusy ? 'Creando…' : 'Crear máquina + token'}
          </CanButton>
        </form>
        {tokenMsg ? (
          <p className="small" style={{ marginTop: '0.75rem' }} role="status">
            {tokenMsg}
          </p>
        ) : null}
        {newToken ? (
          <div
            className="pad"
            style={{
              marginTop: '0.75rem',
              background: 'var(--surface-2, #f4f4f5)',
              borderRadius: 8,
              wordBreak: 'break-all',
            }}
          >
            <strong className="small">Token (cópielo ahora):</strong>
            <code style={{ display: 'block', marginTop: 6 }}>{newToken}</code>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginTop: 8 }}
              onClick={() => void navigator.clipboard?.writeText(newToken)}
            >
              Copiar token
            </button>
          </div>
        ) : null}
      </div>

      {loading && !machines.length && !err ? (
        <p className="muted pad">Cargando máquinas…</p>
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
              No hay máquinas. Cree una arriba para generar el token del agente.
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
              </dl>
              <CanButton
                I={ACTION.UPDATE}
                a={FEATURE.BIESSE_ORDERS}
                type="button"
                className="btn btn--ghost"
                style={{ marginTop: '0.5rem' }}
                disabled={createBusy}
                onClick={() => void handleRotate(id)}
              >
                Rotar token
              </CanButton>
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
    </div>
  )
}
