import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { CanButton } from '../components/CanButton'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import {
  fmtTs,
  healthLabel,
  healthTag,
  isEffectivelyOnline,
} from '../utils/biesseMonitorUtils'

const DEFAULT_STALE_MS = 90_000

function onlineLabel(online, heartbeatAt) {
  if (online) return 'Online'
  if (heartbeatAt) return 'Offline'
  return 'Sin señal'
}

export function SeccionadorasConfigPanel() {
  const [machines, setMachines] = useState([])
  const [staleMs, setStaleMs] = useState(DEFAULT_STALE_MS)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const [machineName, setMachineName] = useState('BIESSE-OSI')
  const [plantName, setPlantName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [newToken, setNewToken] = useState(null)
  const [tokenMsg, setTokenMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      const [m, cfg] = await Promise.all([
        systemApi.listAgentMachines(),
        systemApi.getAgentMonitorConfig().catch(() => null),
      ])
      if (cfg?.onlineStaleSeconds) setStaleMs(cfg.onlineStaleSeconds * 1000)
      const list = Array.isArray(m) ? [...m] : []
      list.sort((a, b) => Number(a.machine_id ?? a.machineId ?? 0) - Number(b.machine_id ?? b.machineId ?? 0))
      setMachines(list)
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

  async function handleDelete(machineId, machineLabel) {
    const label = machineLabel || `Seccionador #${machineId}`
    if (
      !window.confirm(
        `¿Eliminar «${label}»? Se borrarán también sus eventos y planchas asociadas. Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }
    setCreateBusy(true)
    setTokenMsg(null)
    setNewToken(null)
    try {
      await systemApi.deleteAgentMachine(machineId)
      setTokenMsg(`Seccionador «${label}» eliminado.`)
      await load()
    } catch (ex) {
      setTokenMsg(ex instanceof Error ? ex.message : 'No se pudo eliminar el seccionador')
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

      <details className="pad surface-2" style={{ marginTop: '1rem', borderRadius: 8 }}>
        <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>
          Runbook de despliegue (agente v1.7+)
        </summary>
        <ol className="small muted" style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
          <li>Crear seccionador + token arriba → copiar a <code>config.json</code> en la PC OSI.</li>
          <li>
            Compilar en Windows: <code>build-agents.bat</code> → instalar exe Win10 en{' '}
            <code>%ProgramData%\AllCenter\BiesseAgent\</code>.
          </li>
          <li>
            Config: API <code>http://IP-SERVIDOR:8080</code>, token, ruta <code>Event.log</code>, impresora Zebra
            modo <strong>raw</strong>.
          </li>
          <li>
            Activar: impresora + imprimir al corte. Opcional: «Esperar confirmación ERP» si la red es inestable.
          </li>
          <li>Prueba etiqueta LEdit → Start program → 1er corte → escanear QR Android.</li>
          <li>
            Servicio Windows (sin sesión): <code>install-service.bat</code> como administrador en la carpeta{' '}
            <code>dist/Win10</code>.
          </li>
          <li>Verificar monitor Inventario → Seccionadores: salud OK, cola 0, versión ≥ 1.7.0.</li>
        </ol>
      </details>

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
              <th>Salud / cola</th>
              <th>Agente</th>
              <th>Último heartbeat</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => {
              const id = m.machine_id ?? m.machineId
              const name = m.machine_name ?? m.machineName ?? `Seccionador #${id}`
              const online = isEffectivelyOnline(m, staleMs)
              const hbAt = m.last_heartbeat_at ?? m.lastHeartbeatAt
              const health = m.health_status ?? m.healthStatus ?? 'OK'
              const queue = m.pending_queue_size ?? m.pendingQueueSize ?? 0
              const agentVer = m.agent_version ?? m.agentVersion
              return (
                <tr key={id}>
                  <td className="small">
                    <strong>{name}</strong>
                  </td>
                  <td className="small muted">{m.plant_name ?? m.plantName ?? '—'}</td>
                  <td>
                    <span className={online ? 'tag tag--ok' : 'tag'}>{onlineLabel(online, hbAt)}</span>
                  </td>
                  <td className="small">
                    <span className={healthTag(health)}>{healthLabel(health)}</span>
                    {Number(queue) > 0 ? (
                      <span className="muted"> · cola {queue}</span>
                    ) : null}
                  </td>
                  <td className="small muted">{agentVer ? `v${agentVer}` : '—'}</td>
                  <td className="small muted">{fmtTs(hbAt)}</td>
                  <td style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
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
                    <CanButton
                      I={ACTION.UPDATE}
                      a={FEATURE.BIESSE_ORDERS}
                      type="button"
                      className="btn btn--ghost"
                      disabled={createBusy}
                      onClick={() => void handleDelete(id, name)}
                    >
                      Eliminar
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
