import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { dashboardPath } from './roles'

export function RequireAuth({ role }) {
  const { ready, employee, allowedDashboard } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" aria-hidden />
        <p className="text-sm">Cargando sesión…</p>
      </div>
    )
  }

  if (!employee || !allowedDashboard) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedDashboard !== role) {
    return <Navigate to={dashboardPath(allowedDashboard)} replace />
  }

  return <Outlet />
}
