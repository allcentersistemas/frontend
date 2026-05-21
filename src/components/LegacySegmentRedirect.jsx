import { Navigate, useLocation } from 'react-router-dom'

/** Redirige rutas antiguas del menú (p. ej. /transporte → /gestion). */
export function LegacySegmentRedirect({ fromSegment, toSegment }) {
  const location = useLocation()
  const pattern = new RegExp(`/${fromSegment}/?$`)
  if (!pattern.test(location.pathname)) {
    return <Navigate to=".." replace />
  }
  const target = location.pathname.replace(pattern, `/${toSegment}`) + location.search + location.hash
  return <Navigate to={target} replace />
}
