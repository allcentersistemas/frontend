import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { canViewBackupMenu, roleNamesFromEmployee } from '../auth/roles'
import * as systemApi from '../api/systemApi'

function formatBytes(bytes) {
  if (bytes == null || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatInstant(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function statusLabel(status) {
  if (status === 'SUCCESS') return 'Completado'
  if (status === 'FAILED') return 'Error'
  if (status === 'RUNNING') return 'En curso'
  return status ?? '—'
}

export function GestionBackupPanel() {
  const { employee } = useAuth()
  const canManage = canViewBackupMenu(roleNamesFromEmployee(employee))

  const [config, setConfig] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)

  const [enabled, setEnabled] = useState(false)
  const [intervalHours, setIntervalHours] = useState(24)
  const [scheduledHour, setScheduledHour] = useState(3)
  const [saveToFolder, setSaveToFolder] = useState(true)
  const [sendByEmail, setSendByEmail] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState('')
  const [includeBiesseDb, setIncludeBiesseDb] = useState(true)
  const [retentionCount, setRetentionCount] = useState(7)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [cfg, hist] = await Promise.all([
        systemApi.fetchBackupConfig(),
        systemApi.fetchBackupHistory(),
      ])
      setConfig(cfg)
      setHistory(hist ?? [])
      setEnabled(Boolean(cfg.enabled))
      setIntervalHours(cfg.intervalHours ?? 24)
      setScheduledHour(cfg.scheduledHour ?? 3)
      setSaveToFolder(cfg.saveToFolder !== false)
      setSendByEmail(Boolean(cfg.sendByEmail))
      setEmailRecipients(cfg.emailRecipients ?? '')
      setIncludeBiesseDb(cfg.includeBiesseDb !== false)
      setRetentionCount(cfg.retentionCount ?? 7)
    } catch (e) {
      setErr(e?.message ?? 'No se pudo cargar la configuración de backups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canManage) {
      void load()
    } else {
      setLoading(false)
    }
  }, [canManage, load])

  async function submitConfig(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    setOk(null)
    try {
      const updated = await systemApi.updateBackupConfig({
        enabled,
        intervalHours: Number(intervalHours),
        scheduledHour: Number(scheduledHour),
        saveToFolder,
        sendByEmail,
        emailRecipients,
        includeBiesseDb,
        retentionCount: Number(retentionCount),
      })
      setConfig(updated)
      setOk('Configuración guardada')
    } catch (e2) {
      setErr(e2?.message ?? 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function runBackupNow() {
    setRunning(true)
    setErr(null)
    setOk(null)
    try {
      await systemApi.runBackupNow()
      setOk('Backup ejecutado correctamente')
      const hist = await systemApi.fetchBackupHistory()
      setHistory(hist ?? [])
      const cfg = await systemApi.fetchBackupConfig()
      setConfig(cfg)
    } catch (e) {
      setErr(e?.message ?? 'El backup falló')
      const hist = await systemApi.fetchBackupHistory()
      setHistory(hist ?? [])
    } finally {
      setRunning(false)
    }
  }

  async function downloadFile(runId, filename) {
    setErr(null)
    try {
      await systemApi.downloadBackupFile(runId, filename)
    } catch (e) {
      setErr(e?.message ?? 'No se pudo descargar el archivo')
    }
  }

  if (!canManage) {
    return (
      <div className="card pad">
        <p className="muted">Solo el rol Master puede configurar backups.</p>
      </div>
    )
  }

  if (loading) {
    return <p className="muted pad">Cargando backups…</p>
  }

  return (
    <>
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Copias de seguridad de PostgreSQL (<code className="code-inline">app_db</code>
        {config?.biesseConfigured ? ' y obras' : ''}). Por defecto: cada 24 h a las 3:00.
        Los backups automáticos se revisan cada 15 minutos.
      </p>

      {config && !config.pgDumpAvailable ? (
        <div className="card pad" style={{ marginBottom: '1rem', borderColor: 'var(--warn, #c90)' }}>
          <p className="form-inline-error" style={{ margin: 0 }}>
            <strong>pg_dump no disponible</strong> en el servidor. En Docker, reconstruya module-system
            (incluye postgresql-client).
          </p>
        </div>
      ) : null}

      <div className="card pad form-section">
        <h2>Configuración</h2>
        <form onSubmit={(e) => void submitConfig(e)}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Backups automáticos activos</span>
          </label>

          <div className="form-row-2">
            <label className="field">
              <span>Intervalo (horas)</span>
              <input
                type="number"
                min={1}
                max={168}
                value={intervalHours}
                onChange={(e) => setIntervalHours(e.target.value)}
                required
              />
              <span className="muted small form-hint">
                24 h = diario; 168 h = semanal. Con 24 h o más, se usa la hora del día indicada.
              </span>
            </label>
            <label className="field">
              <span>Hora del día (0–23)</span>
              <input
                type="number"
                min={0}
                max={23}
                value={scheduledHour}
                onChange={(e) => setScheduledHour(e.target.value)}
                required
              />
            </label>
          </div>

          <fieldset style={{ border: 'none', padding: 0, margin: '0.75rem 0' }}>
            <legend className="small" style={{ marginBottom: '0.35rem' }}>Destino</legend>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={saveToFolder}
                onChange={(e) => setSaveToFolder(e.target.checked)}
              />
              <span>Guardar en carpeta del servidor</span>
            </label>
            {config?.storageRoot ? (
              <p className="muted small form-hint">Ruta: {config.storageRoot}</p>
            ) : null}
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={sendByEmail}
                onChange={(e) => setSendByEmail(e.target.checked)}
                disabled={!config?.mailAvailable}
              />
              <span>Enviar por correo</span>
            </label>
            {!config?.mailAvailable ? (
              <p className="muted small form-hint">
                SMTP desactivado. Configure APP_MAIL_ENABLED y credenciales SMTP en el servidor.
              </p>
            ) : null}
          </fieldset>

          {sendByEmail ? (
            <label className="field">
              <span>Correos destino (separados por coma)</span>
              <input
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="admin@empresa.com, respaldo@empresa.com"
              />
            </label>
          ) : null}

          <div className="form-row-2">
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={includeBiesseDb}
                onChange={(e) => setIncludeBiesseDb(e.target.checked)}
                disabled={!config?.biesseConfigured}
              />
              <span>Incluir base Biesse (obras)</span>
            </label>
            <label className="field">
              <span>Copias a conservar</span>
              <input
                type="number"
                min={1}
                max={100}
                value={retentionCount}
                onChange={(e) => setRetentionCount(e.target.value)}
                required
              />
            </label>
          </div>

          {config?.lastSuccessfulRunAt ? (
            <p className="muted small">
              Último backup exitoso: {formatInstant(config.lastSuccessfulRunAt)}
            </p>
          ) : null}

          {err ? <p className="form-inline-error">{err}</p> : null}
          {ok ? <p className="form-success">{ok}</p> : null}

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving || running}>
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={running || saving || !config?.pgDumpAvailable}
              onClick={() => void runBackupNow()}
            >
              {running ? 'Generando backup…' : 'Generar backup ahora'}
            </button>
          </div>
        </form>
      </div>

      <div className="card card--table" style={{ marginTop: '1rem' }}>
        <h2 className="card__title pad">Historial</h2>
        {history.length === 0 ? (
          <p className="muted pad">Aún no hay backups registrados.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Origen</th>
                  <th>Tamaño</th>
                  <th>Archivos</th>
                  <th>Correo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="small">{formatInstant(row.startedAt)}</td>
                    <td>
                      <span className={row.status === 'FAILED' ? 'form-inline-error' : undefined}>
                        {statusLabel(row.status)}
                      </span>
                      {row.message && row.status === 'FAILED' ? (
                        <div className="muted small">{row.message}</div>
                      ) : null}
                    </td>
                    <td className="small">{row.triggerType === 'MANUAL' ? 'Manual' : 'Programado'}</td>
                    <td className="small">{formatBytes(row.totalBytes)}</td>
                    <td className="small">
                      {(row.files ?? []).length === 0
                        ? '—'
                        : row.files.map((f) =>
                            f.downloadable ? (
                              <button
                                key={f.name}
                                type="button"
                                className="linkish"
                                style={{ display: 'block', textAlign: 'left' }}
                                onClick={() => void downloadFile(row.id, f.name)}
                              >
                                {f.name}
                              </button>
                            ) : (
                              <span key={f.name} className="muted" style={{ display: 'block' }}>
                                {f.name}
                              </span>
                            ),
                          )}
                    </td>
                    <td className="small">{row.emailed ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
