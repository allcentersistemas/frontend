import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { defaultDashboardPath } from './permissions'

/**
 * Guard de ruta por feature (defensa en profundidad; cada página ya filtra su propio
 * contenido con CASL). Antes de esto la única protección a nivel de router era el
 * "dashboard shell" (produccion/admin-produccion/despacho).
 */
export function RequireFeature({ check, children }) {
  const { employee, allowedDashboard } = useAuth()
  if (check(employee)) {
    return children
  }
  return <Navigate to={defaultDashboardPath(allowedDashboard, employee)} replace />
}
