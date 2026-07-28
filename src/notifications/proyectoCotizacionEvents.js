/** Evento DOM cuando llega una nueva solicitud de cotización (lista puede refrescarse). */
export const PROYECTO_COTIZACION_EVENT = 'appscanner:proyecto-cotizacion'

export function dispatchProyectoCotizacionNotification(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROYECTO_COTIZACION_EVENT, { detail }))
}
