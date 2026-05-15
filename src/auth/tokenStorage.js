import { tokenStorageKind } from '../config/security'

const STORAGE_KEY = 'appscanner.auth.v1'

function backend() {
  return tokenStorageKind === 'local' ? localStorage : sessionStorage
}

export function loadAuthTokens() {
  try {
    const raw = backend().getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p?.accessToken && p?.refreshToken) return p
  } catch {
    /* ignore */
  }
  return null
}

export function saveAuthTokens(tokens) {
  if (!tokens) {
    backend().removeItem(STORAGE_KEY)
    return
  }
  backend().setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
  )
}

export function clearAuthTokens() {
  backend().removeItem(STORAGE_KEY)
}
