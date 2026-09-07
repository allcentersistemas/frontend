import { Navigate, useLocation } from 'react-router-dom'
import { INVENTORY_AREAS } from '../pages/inventoryAreas.js'
import { useAuth } from '../auth/AuthContext'
import { defaultInventoryPath } from '../access/permissions'

const AREA_GROUP = new Map(INVENTORY_AREAS.map((a) => [a.id, a.group]))

/**
 * El hub único "Inventario" se dividió en Producción y Almacén. Todo link viejo
 * (…/inventario?area=pales, favoritos, etc.) sigue funcionando: se reenvía al hub
 * correcto según el área pedida, preservando el resto de la query.
 */
export function InventarioGroupRedirect() {
  const location = useLocation()
  const { employee, allowedDashboard } = useAuth()
  const params = new URLSearchParams(location.search)
  const area = params.get('area')
  const group = area ? AREA_GROUP.get(area) : null

  if (group) {
    return <Navigate to={`../${group}${location.search}`} replace relative="path" />
  }

  const base = `/dashboard/${allowedDashboard}`
  const fallback = defaultInventoryPath(base, employee) ?? `${base}/produccion`
  return <Navigate to={fallback} replace />
}

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
