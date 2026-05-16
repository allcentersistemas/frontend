import {
  clientPortalApiBase,
  employeeApiBase,
  locationCatalogApiBase,
  orderApiBase,
  osiApiBase,
  paleServiceApiBase,
  rmApiBase,
  transportApiBase,
  inventoryApiBase,
} from '../config/env'

let tokens = null
const listeners = []

export function getStoredTokens() {
  return tokens
}

export function setStoredTokens(next) {
  tokens = next
  for (const l of listeners) {
    l(next)
  }
}

export function subscribeTokens(listener) {
  listeners.push(listener)
  return () => {
    const i = listeners.indexOf(listener)
    if (i >= 0) listeners.splice(i, 1)
  }
}

let refreshFn = null

export function configureTokenRefresh(fn) {
  refreshFn = fn
}

async function tryRefresh() {
  if (!refreshFn) return false
  const session = await refreshFn()
  if (!session) return false
  setStoredTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
  return true
}

async function parseJson(text) {
  if (!text) {
    throw new SyntaxError('empty body')
  }
  return JSON.parse(text)
}

function isNoContent(res) {
  return res.status === 204 || res.status === 205
}

/**
 * Extrae texto útil para el usuario desde respuestas de error típicas
 * (empleados `ApiErrorResponse`, transport `ApiErrorResponse`, etc.).
 */
function formatErrorPayload(payload) {
  if (payload == null || typeof payload !== 'object') {
    return null
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }
  if (payload.details && typeof payload.details === 'object') {
    const pairs = Object.entries(payload.details).filter(([, v]) => v != null)
    if (pairs.length > 0) {
      return pairs.map(([k, v]) => `${k}: ${v}`).join('; ')
    }
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim()
  }
  return null
}

async function readErrorDetail(res) {
  const fallback = res.statusText || `HTTP ${res.status}`
  const text = await res.text().catch(() => '')
  if (!text) return fallback
  try {
    const payload = JSON.parse(text)
    return (formatErrorPayload(payload) ?? text.trim()) || fallback
  } catch {
    return text.trim() || fallback
  }
}

/**
 * `init` puede incluir `skipAuth: true` para llamadas públicas (login, refresh…).
 */
async function backendJson(apiBase, path, init) {
  const { skipAuth, ...rest } = init ?? {}
  const headers = new Headers(rest.headers)
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (!skipAuth) {
    const t = getStoredTokens()
    if (t?.accessToken) {
      headers.set('Authorization', `Bearer ${t.accessToken}`)
    }
  }
  const url = `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`
  let res = await fetch(url, {
    ...rest,
    headers,
    credentials: 'omit',
    referrerPolicy: 'strict-origin-when-cross-origin',
  })

  if (res.status === 401 && !skipAuth && getStoredTokens()?.refreshToken) {
    const ok = await tryRefresh()
    if (ok) {
      const t2 = getStoredTokens()
      if (t2?.accessToken) {
        headers.set('Authorization', `Bearer ${t2.accessToken}`)
      }
      res = await fetch(url, { ...rest, headers })
    }
  }

  if (!res.ok) {
    const detail = await readErrorDetail(res)
    throw new Error(detail || `HTTP ${res.status}`)
  }

  const text = await res.text()
  if (isNoContent(res)) {
    return undefined
  }
  return parseJson(text)
}

export async function employeeJson(path, init) {
  return backendJson(employeeApiBase, path, init)
}

export async function osiJson(path, init) {
  return backendJson(osiApiBase, path, init)
}

export async function orderJson(path, init) {
  return backendJson(orderApiBase, path, init)
}

let transportExtraHeadersFn = () => ({})

/**
 * Cabeceras extra en todas las llamadas a module-system (p. ej. actor para auditoría).
 * El AuthContext suele registrar aquí X-Actor-Employee-Id y X-Actor-Email.
 */
export function configureTransportExtraHeaders(getter) {
  transportExtraHeadersFn = typeof getter === 'function' ? getter : () => ({})
}

/** module-system */
export async function transportJson(path, init) {
  const extra = transportExtraHeadersFn()
  const headers = new Headers(init?.headers)
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && String(v).trim() !== '') {
      headers.set(k, String(v).trim())
    }
  }
  return backendJson(transportApiBase, path, { ...init, headers })
}

/** module-system: sucursales y ubicaciones bajo `/api/location/…` */
export async function locationCatalogJson(path, init) {
  return backendJson(locationCatalogApiBase, path, init)
}

/** module-system: `/api/pallets/…` */
export async function paleModuleJson(path, init) {
  return backendJson(paleServiceApiBase, path, init)
}

let rmExtraHeadersFn = () => ({})

/**
 * Cabeceras extra en module-system (p. ej. X-User-Email para auditoría en servidor).
 */
export function configureRmExtraHeaders(getter) {
  rmExtraHeadersFn = typeof getter === 'function' ? getter : () => ({})
}

/** module-system: `/api/rm/…` */
export async function rmJson(path, init) {
  const extra = rmExtraHeadersFn()
  const headers = new Headers(init?.headers)
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && String(v).trim() !== '') {
      headers.set(k, String(v).trim())
    }
  }
  return backendJson(rmApiBase, path, { ...init, headers })
}

let inventoryExtraHeadersFn = () => ({})

export function configureInventoryExtraHeaders(getter) {
  inventoryExtraHeadersFn = typeof getter === 'function' ? getter : () => ({})
}

/** module-system: `/api/inventory/…` */
export async function inventoryJson(path, init) {
  const extra = inventoryExtraHeadersFn()
  const headers = new Headers(init?.headers)
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && String(v).trim() !== '') {
      headers.set(k, String(v).trim())
    }
  }
  return backendJson(inventoryApiBase, path, { ...init, headers })
}

/** module-system portal */
export async function clientPortalJson(path, init) {
  return backendJson(clientPortalApiBase, path, init)
}

export async function refreshSessionRequest(body) {
  return employeeJson('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function osiPingText() {
  const t = getStoredTokens()
  const headers = new Headers()
  if (t?.accessToken) {
    headers.set('Authorization', `Bearer ${t.accessToken}`)
  }
  const url = `${osiApiBase}/api/biesse/scan/stats/general`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`)
  const payload = await res.json()
  return JSON.stringify(payload, null, 2)
}
