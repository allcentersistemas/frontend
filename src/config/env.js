function trimSlash(s) {
  return String(s).replace(/\/+$/, '')
}

/**
 * Bases API alineadas con Android (BuildConfig) y docker/Caddy:
 * - dev: localhost:8080 / :8086 (Android emulador: 10.0.2.2)
 * - prod: /api-system y /api-biesse en https://app.allcenter.pe
 */
export const systemApiBase = resolveApiBase(
  'VITE_SYSTEM_API_BASE',
  '/api-system',
  'http://localhost:8080',
)

export const biesseApiBase = resolveApiBase(
  'VITE_BIESSE_API_BASE',
  '/api-biesse',
  'http://localhost:8086',
)

function resolveApiBase(envKey, prodPathPrefix, devDefault) {
  const raw = import.meta.env[envKey]
  if (raw !== undefined && raw !== '') {
    return trimSlash(raw)
  }
  if (import.meta.env.PROD || import.meta.env.MODE === 'staging') {
    return prodPathPrefix
  }
  return trimSlash(devDefault)
}

/** @deprecated Usar systemApiBase */
export const employeeApiBase = systemApiBase
/** @deprecated Usar biesseApiBase */
export const osiApiBase = biesseApiBase
