import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Sesión activa (cualquier rol del portal empleados). */
export function RequireLoggedIn() {
  const { ready, employee } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" aria-hidden />
        <p className="text-sm">Cargando sesión…</p>
      </div>
    )
  }

  if (!employee) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
