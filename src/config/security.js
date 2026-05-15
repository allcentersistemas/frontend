/** Flags y validaciones de seguridad (build-time Vite). */

export const isProduction = import.meta.env.PROD
export const isStaging = import.meta.env.MODE === 'staging'

function envFlag(name, defaultValue) {
  const raw = import.meta.env[name]
  if (raw === undefined || raw === '') return defaultValue
  return raw === 'true' || raw === '1'
}

/** Registro público (employee/client portal en otros frontends). */
export const registrationEnabled = envFlag('VITE_AUTH_REGISTRATION_ENABLED', !isProduction)

/**
 * session = cierra al cerrar pestaña (recomendado prod).
 * local = persiste entre sesiones (solo desarrollo).
 */
export const tokenStorageKind =
  import.meta.env.VITE_TOKEN_STORAGE === 'local' ? 'local' : 'session'

export function assertSecureDeployment() {
  if (!isProduction && !isStaging) return

  const bases = [
    import.meta.env.VITE_EMPLOYEE_API_BASE,
    import.meta.env.VITE_ORDER_API_BASE,
    import.meta.env.VITE_TRANSPORT_API_BASE,
    import.meta.env.VITE_OSI_API_BASE,
    import.meta.env.VITE_PALES_SERVICE_API_BASE,
    import.meta.env.VITE_LOCATION_API_BASE,
    import.meta.env.VITE_INVENTORY_API_BASE,
    import.meta.env.VITE_RM_API_BASE,
    import.meta.env.VITE_CLIENT_API_BASE,
  ].filter(Boolean)

  for (const base of bases) {
    if (typeof base === 'string' && base.startsWith('http://')) {
      console.error(
        `[seguridad] ${base} usa HTTP en entorno ${import.meta.env.MODE}. Use HTTPS o rutas relativas detrás del proxy.`,
      )
    }
  }

  if (tokenStorageKind === 'local') {
    console.warn(
      '[seguridad] VITE_TOKEN_STORAGE=local en prod/staging: los tokens persisten en localStorage (mayor riesgo XSS).',
    )
  }
}
