/** Decodifica el payload JWT (sin verificar firma; solo para decidir refresh proactivo). */
function decodeJwtPayload(token) {
  const parts = String(token).split('.')
  if (parts.length < 2) return null
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  try {
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export function getAccessTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return null
  return payload.exp * 1000
}

/** true si el access token ya caducó (o caduca en los próximos skewSeconds). */
export function isAccessTokenExpired(token, skewSeconds = 30) {
  const expMs = getAccessTokenExpiryMs(token)
  if (expMs == null) return false
  return Date.now() >= expMs - skewSeconds * 1000
}
