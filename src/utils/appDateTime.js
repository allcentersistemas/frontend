/** Zona horaria de la operación (Perú). */
export const APP_TIMEZONE = 'America/Lima'

const NAIVE_ISO =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/

/**
 * Fechas del backend Java (LocalDateTime) llegan sin zona; se interpretan como hora de Lima.
 */
export function parseAppDateTime(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const raw = String(value).trim()
  if (!raw) return null
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = raw.replace(' ', 'T').match(NAIVE_ISO)
  if (m) {
    const [, y, mo, d, h, mi, se = '0'] = m
    const withOffset = `${y}-${mo}-${d}T${h}:${mi}:${se.padStart(2, '0')}-05:00`
    const parsed = new Date(withOffset)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

export function formatAppDateTime(value, options = {}) {
  const date = parseAppDateTime(value)
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: APP_TIMEZONE,
      dateStyle: options.dateStyle ?? 'medium',
      timeStyle: options.timeStyle ?? 'short',
      ...options,
    }).format(date)
  } catch {
    return String(value)
  }
}
