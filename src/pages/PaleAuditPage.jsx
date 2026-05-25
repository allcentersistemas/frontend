import { Navigate, useLocation } from 'react-router-dom'

/** Enlaces antiguos …/pales/auditoria → Gestión → Auditoría → Palés. */
export function PaleAuditPage() {
  const location = useLocation()
  const target = location.pathname.replace(/\/pales\/auditoria\/?$/, '/gestion')
  const p = new URLSearchParams()
  p.set('tab', 'auditoria')
  p.set('audit', 'pales')
  return <Navigate to={`${target}?${p}`} replace />
}
