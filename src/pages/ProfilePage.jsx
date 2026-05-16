import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as employeeApi from '../api/employeeApi'
import { useAuth } from '../auth/AuthContext'

const emptyForm = () => ({
  firstName: '',
  secondLastName: '',
  lastName: '',
  phone: '',
  mobilePhone: '',
  personalEmail: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  provinceOrState: '',
  postalCode: '',
  country: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
  notes: '',
})

function toForm(e) {
  return {
    firstName: e.firstName ?? '',
    secondLastName: e.secondLastName ?? '',
    lastName: e.lastName ?? '',
    phone: e.phone ?? '',
    mobilePhone: e.mobilePhone ?? '',
    personalEmail: e.personalEmail ?? '',
    addressLine1: e.addressLine1 ?? '',
    addressLine2: e.addressLine2 ?? '',
    city: e.city ?? '',
    provinceOrState: e.provinceOrState ?? '',
    postalCode: e.postalCode ?? '',
    country: e.country ?? '',
    emergencyContactName: e.emergencyContactName ?? '',
    emergencyContactRelation: e.emergencyContactRelation ?? '',
    emergencyContactPhone: e.emergencyContactPhone ?? '',
    notes: e.notes ?? '',
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { reloadMe, logout } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwErr, setPwErr] = useState(null)
  const [pwOk, setPwOk] = useState(null)

  const [logoutAllBusy, setLogoutAllBusy] = useState(false)
  const [logoutAllErr, setLogoutAllErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const me = await employeeApi.fetchMe()
        if (!cancelled) setForm(toForm(me))
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error al cargar perfil')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setOk(null)
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErr('Nombre y primer apellido son obligatorios.')
      return
    }
    setSaving(true)
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        secondLastName: form.secondLastName.trim(),
        phone: form.phone.trim(),
        mobilePhone: form.mobilePhone.trim(),
        personalEmail: form.personalEmail.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim(),
        city: form.city.trim(),
        provinceOrState: form.provinceOrState.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactRelation: form.emergencyContactRelation.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        notes: form.notes.trim(),
      }
      await employeeApi.patchMyProfile(body)
      setOk('Cambios guardados.')
      await reloadMe()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function onChangePassword(e) {
    e.preventDefault()
    setPwErr(null)
    setPwOk(null)
    if (newPw.length < 8) {
      setPwErr('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPw !== newPw2) {
      setPwErr('La confirmación no coincide.')
      return
    }
    setPwBusy(true)
    try {
      await employeeApi.changePassword({
        currentPassword: curPw,
        newPassword: newPw,
      })
      setPwOk('Contraseña actualizada. Vuelve a iniciar sesión en otros dispositivos si aplica.')
      setCurPw('')
      setNewPw('')
      setNewPw2('')
    } catch (ex) {
      setPwErr(ex instanceof Error ? ex.message : 'No se pudo cambiar la contraseña')
    } finally {
      setPwBusy(false)
    }
  }

  async function onLogoutAllSessions() {
    setLogoutAllErr(null)
    if (
      !window.confirm(
        '¿Revocar todos los refresh tokens de tu cuenta en todos los dispositivos? Tendrás que iniciar sesión de nuevo en cualquier sitio.',
      )
    ) {
      return
    }
    setLogoutAllBusy(true)
    try {
      await employeeApi.logoutAll()
      await logout()
      navigate('/login', { replace: true })
    } catch (ex) {
      setLogoutAllErr(ex instanceof Error ? ex.message : 'No se pudo revocar sesiones')
    } finally {
      setLogoutAllBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Cargando perfil…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__head">
        <h1>Mi perfil</h1>
        <p className="page__lead">
          Datos personales y contacto. El correo de acceso no se cambia desde aquí.
        </p>
      </header>

      <form className="card pad profile-form" onSubmit={(e) => void onSubmit(e)}>
        <h2 className="card__title">Identidad</h2>
        <div className="form-row-2">
          <label className="field">
            <span>Nombre</span>
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Segundo apellido</span>
            <input
              value={form.secondLastName}
              onChange={(e) => setForm((f) => ({ ...f, secondLastName: e.target.value }))}
            />
          </label>
        </div>
        <label className="field">
          <span>Primer apellido</span>
          <input
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            required
          />
        </label>

        <h2 className="card__title profile-form__h">Contacto</h2>
        <div className="form-row-2">
          <label className="field">
            <span>Teléfono</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Móvil</span>
            <input
              value={form.mobilePhone}
              onChange={(e) => setForm((f) => ({ ...f, mobilePhone: e.target.value }))}
            />
          </label>
        </div>
        <label className="field">
          <span>Email personal</span>
          <input
            type="email"
            value={form.personalEmail}
            onChange={(e) => setForm((f) => ({ ...f, personalEmail: e.target.value }))}
          />
        </label>

        <h2 className="card__title profile-form__h">Dirección</h2>
        <label className="field">
          <span>Línea 1</span>
          <input
            value={form.addressLine1}
            onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>Línea 2</span>
          <input
            value={form.addressLine2}
            onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
          />
        </label>
        <div className="form-row-2">
          <label className="field">
            <span>Ciudad</span>
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </label>
          <label className="field">
            <span>Provincia / estado</span>
            <input
              value={form.provinceOrState}
              onChange={(e) => setForm((f) => ({ ...f, provinceOrState: e.target.value }))}
            />
          </label>
        </div>
        <div className="form-row-2">
          <label className="field">
            <span>Código postal</span>
            <input
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>País</span>
            <input
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </label>
        </div>

        <h2 className="card__title profile-form__h">Contacto de emergencia</h2>
        <div className="form-row-2">
          <label className="field">
            <span>Nombre</span>
            <input
              value={form.emergencyContactName}
              onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Parentesco</span>
            <input
              value={form.emergencyContactRelation}
              onChange={(e) => setForm((f) => ({ ...f, emergencyContactRelation: e.target.value }))}
            />
          </label>
        </div>
        <label className="field">
          <span>Teléfono emergencia</span>
          <input
            value={form.emergencyContactPhone}
            onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
          />
        </label>

        <h2 className="card__title profile-form__h">Notas</h2>
        <label className="field">
          <span>Notas internas (visibles según política)</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>

        {err ? <p className="form-inline-error">{err}</p> : null}
        {ok ? <p className="form-success">{ok}</p> : null}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <section className="card pad profile-form" style={{ marginTop: '1.5rem' }}>
        <h2 className="card__title">Seguridad</h2>
        <p className="muted small form-hint">
          <code className="code-inline">POST /api/auth/change-password</code> y{' '}
          <code className="code-inline">POST /api/auth/logout-all</code> (module-system).
        </p>
        <form className="form-section" onSubmit={(e) => void onChangePassword(e)}>
          <div className="form-row-2">
            <label className="field">
              <span>Contraseña actual</span>
              <input
                type="password"
                autoComplete="current-password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Nueva contraseña (mín. 8)</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                minLength={8}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>Confirmar nueva contraseña</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {pwErr ? <p className="form-inline-error">{pwErr}</p> : null}
          {pwOk ? <p className="form-success">{pwOk}</p> : null}
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={pwBusy}>
              {pwBusy ? 'Actualizando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>

        <div className="form-section" style={{ marginTop: '1.25rem' }}>
          <p className="muted small">
            Revoca todos los refresh tokens de tu usuario. Tras confirmar, la app te llevará al inicio de sesión.
          </p>
          {logoutAllErr ? <p className="form-inline-error">{logoutAllErr}</p> : null}
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              disabled={logoutAllBusy}
              onClick={() => void onLogoutAllSessions()}
            >
              {logoutAllBusy ? 'Procesando…' : 'Cerrar todas las demás sesiones'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
              Cerrar sesión aquí
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
