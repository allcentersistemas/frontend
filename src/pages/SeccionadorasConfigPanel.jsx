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

function onlineLabel(online, heartbeatAt) {
  if (online) return 'Online'
  if (heartbeatAt) return 'Offline'
  return 'Sin señal'
}

export function SeccionadorasConfigPanel() {
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const [machineName, setMachineName] = useState('BIESSE-OSI')
  const [plantName, setPlantName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [newToken, setNewToken] = useState(null)
  const [tokenMsg, setTokenMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      const m = await systemApi.listAgentMachines()
      setMachines(Array.isArray(m) ? m : [])
      setErr(null)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo cargar las seccionadoras')
      setMachines([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
      setTokenMsg(ex instanceof Error ? ex.message : 'No se pudo crear el seccionador')
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
    <div className="card pad form-section" style={{ marginBottom: '1rem' }}>
      <h2>Gestionar seccionadoras</h2>
      <p className="muted small form-hint">
        Alta de máquinas, tokens del agente OSI y rotación. En la PC del seccionador configure API base{' '}
        <code>http://IP-SERVIDOR:8080</code> (module-system) y pegue el token (header{' '}
        <code>X-Agent-Token</code> / config.json). El monitoreo en vivo está en Inventario → Seccionadores.
      </p>

      {err ? (
        <p className="form-inline-error" style={{ marginBottom: '0.75rem' }} role="alert">
          {err}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void handleCreateMachine(e)}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginTop: '0.5rem' }}
      >
        <label className="field">
          <span className="small">Nombre seccionador</span>
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
          {createBusy ? 'Creando…' : 'Crear seccionador + token'}
        </CanButton>
      </form>

      {tokenMsg ? (
        <p className="small" style={{ marginTop: '0.75rem' }} role="status">
          {tokenMsg}
        </p>
      ) : null}
      {newToken ? (
        <div className="pad surface-2" style={{ marginTop: '0.75rem', borderRadius: 8, wordBreak: 'break-all' }}>
          <strong className="small">Token (cópielo ahora):</strong>
          <code className="code-inline" style={{ display: 'block', marginTop: 6 }}>
            {newToken}
          </code>
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

      {loading && !machines.length && !err ? (
        <p className="muted small" style={{ marginTop: '1rem' }}>
          Cargando seccionadoras…
        </p>
      ) : null}

      <div className="table-wrap" style={{ marginTop: '1rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Planta</th>
              <th>Estado enlace</th>
              <th>Último heartbeat</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => {
              const id = m.machine_id ?? m.machineId
              const online = Boolean(m.online)
              const hbAt = m.last_heartbeat_at ?? m.lastHeartbeatAt
              return (
                <tr key={id}>
                  <td className="small">
                    <strong>{m.machine_name ?? m.machineName ?? `Seccionador #${id}`}</strong>
                  </td>
                  <td className="small muted">{m.plant_name ?? m.plantName ?? '—'}</td>
                  <td>
                    <span className={online ? 'tag tag--ok' : 'tag'}>{onlineLabel(online, hbAt)}</span>
                  </td>
                  <td className="small muted">{fmtTs(hbAt)}</td>
                  <td>
                    <CanButton
                      I={ACTION.UPDATE}
                      a={FEATURE.BIESSE_ORDERS}
                      type="button"
                      className="btn btn--ghost"
                      disabled={createBusy}
                      onClick={() => void handleRotate(id)}
                    >
                      Rotar token
                    </CanButton>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!machines.length && !loading && !err ? (
          <p className="muted pad small">No hay seccionadoras. Cree una arriba para generar el token del agente.</p>
        ) : null}
      </div>
    </div>
  )
}
