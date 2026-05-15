/** Une clases condicionales (sin dependencia externa). */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}
