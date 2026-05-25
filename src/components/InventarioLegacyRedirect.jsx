import { Navigate, useLocation } from 'react-router-dom'

/**
 * Redirige rutas antiguas …/ordenes y …/pales al hub Inventario.
 * Preserva query (?id=, ?tab=auditoria → gestión).
 */
export function InventarioLegacyRedirect({ area }) {
  const location = useLocation()
  const segment = area === 'ordenes' ? 'ordenes' : 'pales'
  const pattern = new RegExp(`/${segment}(/.*)?$`)
  if (!pattern.test(location.pathname)) {
    return <Navigate to=".." replace />
  }

  const params = new URLSearchParams(location.search)
  if (params.get('tab') === 'auditoria') {
    const gestionPath = location.pathname.replace(pattern, '/gestion')
    const audit = area === 'ordenes' ? 'ordenes' : 'pales'
    const p = new URLSearchParams()
    p.set('tab', 'auditoria')
    p.set('audit', audit)
    return <Navigate to={`${gestionPath}?${p}`} replace />
  }

  const targetPath = location.pathname.replace(pattern, '/inventario')
  const p = new URLSearchParams(location.search)
  p.set('area', area)
  if (area === 'pales' && params.get('id')) {
    p.set('id', params.get('id'))
    const mode = params.get('mode')
    if (mode === 'edit') p.set('mode', 'edit')
  }
  const search = p.toString() ? `?${p}` : ''
  return <Navigate to={`${targetPath}${search}${location.hash}`} replace />
}
