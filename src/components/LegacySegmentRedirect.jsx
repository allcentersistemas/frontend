import { Navigate, useLocation } from 'react-router-dom'

/** Redirige rutas antiguas del menú (p. ej. /transporte → /gestion). */
export function LegacySegmentRedirect({ fromSegment, toSegment, defaultTab }) {
  const location = useLocation()
  const pattern = new RegExp(`/${fromSegment}/?$`)
  if (!pattern.test(location.pathname)) {
    return <Navigate to=".." replace />
  }
  let search = location.search
  if (defaultTab && !new URLSearchParams(search).get('tab')) {
    const p = new URLSearchParams(search)
    p.set('tab', defaultTab)
    search = `?${p}`
  }
  const target = location.pathname.replace(pattern, `/${toSegment}`) + search + location.hash
  return <Navigate to={target} replace />
}
