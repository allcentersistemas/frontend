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
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const cfg = await systemApi.fetchAppConfig()
      applyConfig(cfg)
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
        Ajustes globales del portal: kardex de almacén y correo SMTP. Los cambios aplican de inmediato
        sin reiniciar el servidor.
      </p>

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

          {err ? <p className="form-inline-error">{err}</p> : null}
          {ok ? <p className="form-success">{ok}</p> : null}

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
