import { Navigate, useLocation } from 'react-router-dom'

/** Compatibilidad: enlaces antiguos a …/pales/auditoria abren Pales con pestaña Auditoría. */
export function PaleAuditPage() {
  const { pathname } = useLocation()
  const target = pathname.replace(/\/auditoria\/?$/, '') || pathname
  return <Navigate to={`${target}?tab=auditoria`} replace />
}
