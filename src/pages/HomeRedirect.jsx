import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { defaultDashboardPath } from '../access/permissions'

export function HomeRedirect() {
  const { ready, employee, allowedDashboard } = useAuth()

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" aria-hidden />
        <p className="text-sm">Cargando…</p>
      </div>
    )
  }

  if (!employee || !allowedDashboard) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={defaultDashboardPath(allowedDashboard, employee)} replace />
}
