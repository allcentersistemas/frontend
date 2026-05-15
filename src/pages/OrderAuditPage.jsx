import { Navigate, useLocation } from 'react-router-dom'

/** Compatibilidad: enlaces antiguos a …/ordenes/auditoria abren Órdenes con pestaña Auditoría. */
export function OrderAuditPage() {
  const { pathname } = useLocation()
  const target = pathname.replace(/\/auditoria\/?$/, '') || pathname
  return <Navigate to={`${target}?tab=auditoria`} replace />
}
