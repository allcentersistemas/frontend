/** URL del módulo Gestión → Cliente portal (auditoría y cuentas del portal). */
export function gestionClientePortalHref(base, clientId) {
  const root = `${base.replace(/\/$/, '')}/clientes/${clientId}/`
  if (clientId == null || clientId === '') return root
  return `${root}?cliente=${clientId}`
}
