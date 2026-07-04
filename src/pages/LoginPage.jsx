import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import { defaultDashboardPath } from '../access/permissions'
import {
  AuthField,
  AuthShell,
  AuthSubmitButton,
  authInputClass,
} from '../components/AuthShell'

export function LoginPage() {
  const { ready, employee, allowedDashboard, login } = useAuth()

  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (ready && employee && allowedDashboard) {
    return <Navigate to={defaultDashboardPath(allowedDashboard, employee)} replace />
  }

  async function onSubmit(e) {
    e.preventDefault()

    setError(null)
    setLoading(true)

    try {
      const landing = await login(username.trim(), password)

      navigate(landing, {
        replace: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Bienvenido">
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
        <AuthField label="Usuario" icon={Mail}>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className={`${authInputClass} pl-12`}
          />
        </AuthField>

        <AuthField label="Contraseña" icon={Lock}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className={`${authInputClass} pl-12`}
          />
        </AuthField>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <AuthSubmitButton loading={loading}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Entrando...
            </>
          ) : (
            'Ingresar'
          )}
        </AuthSubmitButton>
      </form>
    </AuthShell>
  )
}
