import { Navigate, useLocation } from 'react-router-dom'

/** Redirige rutas antiguas del menú (p. ej. /transporte → /gestion). */
export function LegacySegmentRedirect({ fromSegment, toSegment, defaultTab }) {
  const location = useLocation()
  const pattern = new RegExp(`/${fromSegment}/?$`)
  if (!pattern.test(location.pathname)) {
    return <Navigate to={`../${toSegment}`} replace relative="path" />
  }
  let search = location.search
  if (defaultTab && !new URLSearchParams(search).get('tab')) {
    const p = new URLSearchParams(search)
    p.set('tab', defaultTab)
    search = `?${p}`
  }
  return <Navigate to={`../${toSegment}${search}${location.hash}`} replace relative="path" />
}
