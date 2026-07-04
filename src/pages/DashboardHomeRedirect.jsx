import { Navigate } from 'react-router-dom'
import { defaultDashboardPath } from '../access/permissions'
import { useAuth } from '../auth/AuthContext'

/** Ruta inicial del dashboard: inventario, proyectos o perfil según permisos (no siempre resumen). */
export function DashboardHomeRedirect() {
  const { employee, allowedDashboard } = useAuth()

  if (!employee || !allowedDashboard) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={defaultDashboardPath(allowedDashboard, employee)} replace />
}
