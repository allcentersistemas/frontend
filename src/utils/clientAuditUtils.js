export const CLIENT_AUDIT_ACTION_LABELS = {
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGIN_FAILURE: 'Intento fallido',
  CREATE: 'Cuenta creada',
  PASSWORD_CHANGED: 'Contraseña actualizada',
  LOGOUT_ALL: 'Sesiones cerradas',
}

export function clientAuditActionLabel(action) {
  return CLIENT_AUDIT_ACTION_LABELS[action] || action || '—'
}

export function summarizeClientAuditDevice(event) {
  if (event?.deviceName) return event.deviceName
  if (!event?.userAgent) return '—'
  const ua = event.userAgent
  if (ua.length <= 80) return ua
  return `${ua.slice(0, 77)}…`
}
