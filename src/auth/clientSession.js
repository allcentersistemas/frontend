/** Hostname que el navegador reporta al backend (cabecera X-Client-Hostname). */
export function getClientHostname() {
  if (typeof window === 'undefined') return 'unknown'
  return window.location.hostname || 'localhost'
}

export function sessionClientHeaders() {
  return {
    'X-Client-Hostname': getClientHostname(),
  }
}
