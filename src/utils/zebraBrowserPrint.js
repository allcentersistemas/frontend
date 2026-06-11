/**
 * Cliente mínimo para Zebra Browser Print (servicio local en puertos 9100/9101).
 * @see https://www.zebra.com/us/en/support-downloads/printer-software/by-request-software.html
 */

const BP_BASES = [
  'http://127.0.0.1:9100',
  'http://localhost:9100',
  'https://127.0.0.1:9101',
  'https://localhost:9101',
]

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function bpFetch(path, init) {
  let lastErr = null
  for (const base of BP_BASES) {
    try {
      const res = await fetch(`${base}${path}`, init)
      if (res.ok) return res
      lastErr = new Error(`Browser Print respondió ${res.status}`)
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastErr ?? new Error('Zebra Browser Print no está en ejecución')
}

/** @returns {Promise<boolean>} */
export async function isZebraBrowserPrintAvailable() {
  try {
    await getDefaultZebraPrinter()
    return true
  } catch {
    return false
  }
}

/** @returns {Promise<Record<string, unknown>>} */
export async function getDefaultZebraPrinter() {
  const res = await bpFetch('/default?type=printer', { method: 'GET' })
  const device = await res.json()
  if (!device || typeof device !== 'object' || !device.uid) {
    throw new Error('No hay impresora Zebra configurada en Browser Print')
  }
  return device
}

/**
 * @param {string} zpl
 * @param {Record<string, unknown>|null} [device]
 */
export async function sendZplToZebra(zpl, device = null) {
  const printer = device ?? (await getDefaultZebraPrinter())
  const res = await bpFetch('/write', {
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: JSON.stringify({ device: printer, data: zpl }),
  })
  if (!res.ok) {
    throw new Error('No se pudo enviar la etiqueta a la impresora Zebra')
  }
}

/** @param {string} zpl @param {string} [filename] */
export function downloadZplFile(zpl, filename = 'etiqueta.zpl') {
  const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const ZEBRA_BROWSER_PRINT_URL =
  'https://www.zebra.com/us/en/support-downloads/printer-software/by-request-software.html'
