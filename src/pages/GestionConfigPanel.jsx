import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { canResetKardex, canViewGestionMenu, roleNamesFromEmployee } from '../auth/roles'
import * as systemApi from '../api/systemApi'

export function GestionConfigPanel() {
  const { employee } = useAuth()
  const roleNames = roleNamesFromEmployee(employee)
  const canManage = canViewGestionMenu(roleNames)
  const canReset = canResetKardex(roleNames)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingMail, setTestingMail] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)

  const [kardexEnabled, setKardexEnabled] = useState(true)
  const [mailEnabled, setMailEnabled] = useState(false)
  const [mailFrom, setMailFrom] = useState('')
  const [mailFromName, setMailFromName] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(false)
  const [smtpAuth, setSmtpAuth] = useState(false)
  const [smtpStarttls, setSmtpStarttls] = useState(true)
  const [testMailTo, setTestMailTo] = useState('')
  const [plantillaInfo, setPlantillaInfo] = useState(null)
  const [plantillaFile, setPlantillaFile] = useState(null)
  const [uploadingPlantilla, setUploadingPlantilla] = useState(false)
  const [savingAi, setSavingAi] = useState(false)
  const [aiVisionEnabled, setAiVisionEnabled] = useState(false)
  const [aiProvider, setAiProvider] = useState('claude')
  const [aiModel, setAiModel] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiApiKeyConfigured, setAiApiKeyConfigured] = useState(false)

  const applyConfig = useCallback((cfg) => {
    setKardexEnabled(Boolean(cfg.kardexEnabled))
    setMailEnabled(Boolean(cfg.mailEnabled))
    setMailFrom(cfg.mailFrom ?? '')
    setMailFromName(cfg.mailFromName ?? '')
    setSmtpHost(cfg.smtpHost ?? '')
    setSmtpPort(cfg.smtpPort ?? 587)
    setSmtpUsername(cfg.smtpUsername ?? '')
    setSmtpPasswordConfigured(Boolean(cfg.smtpPasswordConfigured))
    setSmtpAuth(Boolean(cfg.smtpAuth))
    setSmtpStarttls(cfg.smtpStarttls !== false)
    setSmtpPassword('')
    setAiVisionEnabled(Boolean(cfg.aiVisionEnabled))
    setAiProvider(cfg.aiProvider === 'openai' ? 'openai' : 'claude')
    setAiModel(cfg.aiModel ?? '')
    setAiApiKeyConfigured(Boolean(cfg.aiApiKeyConfigured))
    setAiApiKey('')
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [cfg, plantilla] = await Promise.all([
        systemApi.fetchAppConfig(),
        systemApi.fetchPlantillaPlanillaInfo().catch(() => null),
      ])
      applyConfig(cfg)
      setPlantillaInfo(plantilla)
    } catch (e) {
      setErr(e?.message ?? 'No se pudo cargar la configuración')
    } finally {
      setLoading(false)
    }
  }, [applyConfig])

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
      const body = {
        kardexEnabled,
        mailEnabled,
        mailFrom,
        mailFromName,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUsername,
        smtpAuth,
        smtpStarttls,
      }
      if (smtpPassword.trim()) {
        body.smtpPassword = smtpPassword
      }
      const updated = await systemApi.updateAppConfig(body)
      applyConfig(updated)
      setOk('Configuración guardada')
    } catch (e2) {
      setErr(e2?.message ?? 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function submitAiConfig(e) {
    e.preventDefault()
    setSavingAi(true)
    setErr(null)
    setOk(null)
    try {
      const body = {
        aiVisionEnabled,
        aiProvider,
        aiModel: aiModel.trim(),
      }
      if (aiApiKey.trim()) {
        body.aiApiKey = aiApiKey.trim()
      }
      const updated = await systemApi.updateAppConfig(body)
      applyConfig(updated)
      setOk(
        aiVisionEnabled
          ? 'Importación por foto (IA) activada. Los clientes verán el botón en la planilla.'
          : 'Importación por foto (IA) desactivada. El botón no aparece en el portal cliente.',
      )
    } catch (e2) {
      setErr(e2?.message ?? 'No se pudo guardar la configuración de IA')
    } finally {
      setSavingAi(false)
    }
  }

  async function sendTestMail() {
    setTestingMail(true)
    setErr(null)
    setOk(null)
    try {
      await systemApi.testAppMail({ to: testMailTo.trim() })
      setOk('Correo de prueba enviado')
    } catch (e) {
      setErr(e?.message ?? 'No se pudo enviar el correo de prueba')
    } finally {
      setTestingMail(false)
    }
  }

  async function resetKardex() {
    const confirmed = window.confirm(
      '¿Reiniciar todo el kardex de inventario?\n\nSe eliminarán todos los artículos y movimientos de stock (inv_item e inv_stock_movement). Esta acción no se puede deshacer.',
    )
    if (!confirmed) return
    setResetting(true)
    setErr(null)
    setOk(null)
    try {
      const result = await systemApi.resetKardexInventory()
      setOk(
        `Kardex reiniciado: ${result.movementsDeleted ?? 0} movimientos y ${result.itemsDeleted ?? 0} artículos eliminados.`,
      )
    } catch (e) {
      setErr(e?.message ?? 'No se pudo reiniciar el kardex')
    } finally {
      setResetting(false)
    }
  }

  async function uploadPlantilla() {
    if (!plantillaFile) {
      setErr('Seleccione un archivo Excel (.xlsx)')
      return
    }
    setUploadingPlantilla(true)
    setErr(null)
    setOk(null)
    try {
      const info = await systemApi.uploadPlantillaPlanilla(plantillaFile)
      setPlantillaInfo(info)
      setPlantillaFile(null)
      setOk('Plantilla de planilla de corte actualizada. Los clientes la descargarán desde el portal.')
    } catch (e) {
      setErr(e?.message ?? 'No se pudo subir la plantilla')
    } finally {
      setUploadingPlantilla(false)
    }
  }

  async function removePlantilla() {
    if (!window.confirm('¿Eliminar la plantilla del servidor? Los clientes volverán a la plantilla generada localmente.')) {
      return
    }
    setUploadingPlantilla(true)
    setErr(null)
    setOk(null)
    try {
      await systemApi.deletePlantillaPlanilla()
      setPlantillaInfo({ available: false, filename: '', sizeBytes: 0, uploadedAt: '' })
      setOk('Plantilla eliminada')
    } catch (e) {
      setErr(e?.message ?? 'No se pudo eliminar la plantilla')
    } finally {
      setUploadingPlantilla(false)
    }
  }

  function formatBytes(bytes) {
    if (bytes == null || bytes <= 0) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!canManage) {
    return (
      <div className="card pad">
        <p className="muted">Solo administradores pueden acceder a la configuración del sistema.</p>
      </div>
    )
  }

  if (loading) {
    return <p className="muted pad">Cargando configuración…</p>
  }

  return (
    <>
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Ajustes globales del portal: kardex, plantilla de planilla, importación por foto (IA) y correo SMTP.
        Los cambios aplican de inmediato sin reiniciar el servidor.
      </p>

      {err ? <p className="form-inline-error" style={{ marginBottom: '0.75rem' }}>{err}</p> : null}
      {ok ? <p className="form-success" style={{ marginBottom: '0.75rem' }}>{ok}</p> : null}

      <div className="card pad form-section" style={{ marginBottom: '1rem' }}>
        <h2>Kardex de inventario</h2>
        <p className="muted small form-hint">
          El kardex se actualiza automáticamente al abrir/cerrar palés y al registrar entradas/salidas RM.
          Si lo desactiva, esas operaciones continúan pero no generan movimientos de stock.
        </p>
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={kardexEnabled}
            onChange={(e) => setKardexEnabled(e.target.checked)}
          />
          <span>Kardex activo (registrar movimientos automáticos)</span>
        </label>

        {canReset ? (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border, #ddd)' }}>
            <h3 className="small" style={{ marginBottom: '0.35rem' }}>Reinicio completo</h3>
            <p className="muted small form-hint">
              Borra todos los artículos y movimientos del kardex. Solo Sistemas / Master.
            </p>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ color: 'var(--danger, #b00020)', borderColor: 'var(--danger, #b00020)' }}
              disabled={resetting || saving}
              onClick={() => void resetKardex()}
            >
              {resetting ? 'Reiniciando…' : 'Reiniciar kardex completo'}
            </button>
          </div>
        ) : null}
      </div>

      <div className="card pad form-section" style={{ marginBottom: '1rem' }}>
        <h2>Plantilla planilla de corte</h2>
        <p className="muted small form-hint">
          Suba el Excel que los clientes descargarán en el portal (botón «Descargar plantilla»). Si no hay
          archivo cargado, el cliente usa la plantilla generada automáticamente.
        </p>
        {plantillaInfo?.available ? (
          <p className="small" style={{ marginBottom: '0.75rem' }}>
            Actual: <strong>{plantillaInfo.filename || 'plantilla_listado_piezas.xlsx'}</strong>
            {' · '}
            {formatBytes(plantillaInfo.sizeBytes)}
            {plantillaInfo.uploadedAt
              ? ` · ${new Date(plantillaInfo.uploadedAt).toLocaleString()}`
              : ''}
          </p>
        ) : (
          <p className="muted small" style={{ marginBottom: '0.75rem' }}>
            No hay plantilla cargada en el servidor.
          </p>
        )}
        <div className="form-row-2" style={{ alignItems: 'flex-end' }}>
          <label className="field">
            <span>Archivo Excel (.xlsx / .xls)</span>
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => setPlantillaFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn btn--primary"
              disabled={uploadingPlantilla || !plantillaFile}
              onClick={() => void uploadPlantilla()}
            >
              {uploadingPlantilla ? 'Subiendo…' : 'Subir plantilla'}
            </button>
            {plantillaInfo?.available ? (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={uploadingPlantilla}
                  onClick={() => void systemApi.downloadPlantillaPlanillaAdmin().catch((e) => setErr(e.message))}
                >
                  Descargar
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={uploadingPlantilla}
                  style={{ color: 'var(--danger, #b00020)' }}
                  onClick={() => void removePlantilla()}
                >
                  Eliminar
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card pad form-section" style={{ marginBottom: '1rem' }}>
        <h2>Importar medidas por foto (IA)</h2>
        <p className="muted small form-hint">
          Permite a los clientes del portal subir una foto de una hoja de medidas (a mano o impresa) y
          rellenar Cantidad, Largo, Ancho, cantos (L1–A2) y ranuras. Si lo desactiva, el botón no aparece.
          La API key se guarda en el servidor y nunca se envía al navegador del cliente.
        </p>
        <form onSubmit={(e) => void submitAiConfig(e)}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={aiVisionEnabled}
              onChange={(e) => setAiVisionEnabled(e.target.checked)}
            />
            <span>Habilitar importación por foto con IA</span>
          </label>

          <div className="form-row-2">
            <label className="field">
              <span>Proveedor de IA</span>
              <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                <option value="claude">Claude (Anthropic)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
              </select>
            </label>
            <label className="field">
              <span>Modelo (opcional)</span>
              <input
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder={
                  aiProvider === 'openai' ? 'gpt-4o' : 'claude-sonnet-5'
                }
              />
            </label>
          </div>

          <label className="field">
            <span>API key</span>
            <input
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder={
                aiApiKeyConfigured
                  ? '•••••••• (ya configurada; deje vacío para no cambiar)'
                  : aiProvider === 'openai'
                    ? 'sk-…'
                    : 'sk-ant-…'
              }
              autoComplete="new-password"
            />
          </label>
          <p className="muted small form-hint">
            {aiProvider === 'openai'
              ? 'Obtenga la key en platform.openai.com. Modelo por defecto: gpt-4o.'
              : 'Obtenga la key en console.anthropic.com. Deje el modelo vacío o use el ID exacto: claude-sonnet-5 (no «sonnet 5»).'}
          </p>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={savingAi || saving}>
              {savingAi ? 'Guardando…' : 'Guardar configuración IA'}
            </button>
          </div>
        </form>
      </div>

      <div className="card pad form-section">
        <h2>Correo (SMTP)</h2>
        <form onSubmit={(e) => void submitConfig(e)}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={mailEnabled}
              onChange={(e) => setMailEnabled(e.target.checked)}
            />
            <span>Correo activo</span>
          </label>

          <div className="form-row-2">
            <label className="field">
              <span>Remitente (From)</span>
              <input
                type="email"
                value={mailFrom}
                onChange={(e) => setMailFrom(e.target.value)}
                placeholder="noreply@empresa.com"
              />
            </label>
            <label className="field">
              <span>Nombre remitente</span>
              <input
                value={mailFromName}
                onChange={(e) => setMailFromName(e.target.value)}
                placeholder="AllCenter"
              />
            </label>
          </div>

          <div className="form-row-2">
            <label className="field">
              <span>Servidor SMTP</span>
              <input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </label>
            <label className="field">
              <span>Puerto</span>
              <input
                type="number"
                min={1}
                max={65535}
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-row-2">
            <label className="field">
              <span>Usuario SMTP</span>
              <input
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Contraseña SMTP</span>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={smtpPasswordConfigured ? '•••••••• (sin cambiar)' : ''}
                autoComplete="new-password"
              />
            </label>
          </div>

          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={smtpAuth}
              onChange={(e) => setSmtpAuth(e.target.checked)}
            />
            <span>Autenticación SMTP</span>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={smtpStarttls}
              onChange={(e) => setSmtpStarttls(e.target.checked)}
            />
            <span>STARTTLS (puerto 587)</span>
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving || resetting}>
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border, #ddd)' }}>
          <h3 className="small" style={{ marginBottom: '0.35rem' }}>Probar envío</h3>
          <div className="form-row-2" style={{ alignItems: 'flex-end' }}>
            <label className="field">
              <span>Enviar prueba a</span>
              <input
                type="email"
                value={testMailTo}
                onChange={(e) => setTestMailTo(e.target.value)}
                placeholder="tu@correo.com"
              />
            </label>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={testingMail || saving || !testMailTo.trim()}
              onClick={() => void sendTestMail()}
            >
              {testingMail ? 'Enviando…' : 'Enviar correo de prueba'}
            </button>
          </div>
          <p className="muted small form-hint">
            Guarde primero la configuración SMTP si acaba de cambiarla. El envío usa los valores guardados.
          </p>
        </div>
      </div>
    </>
  )
}
