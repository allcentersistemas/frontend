import { Navigate, useLocation } from 'react-router-dom'

/** Enlaces antiguos …/ordenes/auditoria → Gestión → Auditoría → Órdenes. */
export function OrderAuditPage() {
  const location = useLocation()
  const target = location.pathname.replace(/\/ordenes\/auditoria\/?$/, '/gestion')
  const p = new URLSearchParams()
  p.set('tab', 'auditoria')
  p.set('audit', 'ordenes')
  return <Navigate to={`${target}?${p}`} replace />
}
