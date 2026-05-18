import { biesseApiBase, systemApiBase } from '../config/env'

let tokens = null
const listeners = []

let systemExtraHeadersFn = () => ({})

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

/** Registra cabeceras extra en llamadas a module-system (auditoría, actor, etc.). */
export function configureSystemExtraHeaders(getter) {
  systemExtraHeadersFn = typeof getter === 'function' ? getter : () => ({})
}

/** @deprecated Usar configureSystemExtraHeaders */
export const configureTransportExtraHeaders = configureSystemExtraHeaders
/** @deprecated Usar configureSystemExtraHeaders */
export const configureRmExtraHeaders = configureSystemExtraHeaders
/** @deprecated Usar configureSystemExtraHeaders */
export const configureInventoryExtraHeaders = configureSystemExtraHeaders

function collectSystemExtraHeaders() {
  const extra = systemExtraHeadersFn()
  if (!extra || typeof extra !== 'object') return {}
  const merged = {}
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && String(v).trim() !== '') {
      merged[k] = String(v).trim()
    }
  }
  return merged
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
async function backendJson(apiBase, path, init, { mergeSystemHeaders = false } = {}) {
  const { skipAuth, ...rest } = init ?? {}
  const headers = new Headers(rest.headers)
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (mergeSystemHeaders) {
    for (const [k, v] of Object.entries(collectSystemExtraHeaders())) {
      headers.set(k, v)
    }
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

/** module-system (monolito) */
export async function systemJson(path, init) {
  return backendJson(systemApiBase, path, init, { mergeSystemHeaders: true })
}

/** module-biesse (escaneo OSI) */
export async function biesseJson(path, init) {
  return backendJson(biesseApiBase, path, init)
}

export async function refreshSessionRequest(body) {
  return systemJson('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function biessePingText() {
  const t = getStoredTokens()
  const headers = new Headers()
  if (t?.accessToken) {
    headers.set('Authorization', `Bearer ${t.accessToken}`)
  }
  const url = `${biesseApiBase}/api/biesse/scan/stats/general`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`)
  const payload = await res.json()
  return JSON.stringify(payload, null, 2)
}
