import { osiJson } from './http'

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function toOrderRow(raw) {
  return {
    orderId: toNumber(raw.orderid ?? raw.orderId),
    orderName: raw.ordername ?? raw.orderName ?? '',
    bookingCode: raw.bookingcode ?? raw.bookingCode ?? null,
    fechaCreacion: raw.fechacreacion ?? raw.fechaCreacion ?? null,
    estadoEscaneo: raw.estado_escaneo ?? raw.estadoEscaneo ?? null,
    fechaCompletado: raw.fecha_completado ?? raw.fechaCompletado ?? null,
    observaciones: raw.observaciones ?? null,
    partesEscaneadas: toNumber(raw.partes_escaneadas ?? raw.partesEscaneadas),
    totalPartes: toNumber(raw.partes_totales ?? raw.totalPartes),
  }
}

function normalizeOrderListPayload(raw) {
  if (Array.isArray(raw)) {
    const items = raw.map(toOrderRow)
    return { items, totalCount: items.length }
  }
  if (raw && typeof raw === 'object') {
    const o = raw
    const items = o.items ?? o.content ?? o.data
    const total = o.totalCount ?? o.totalElements ?? o.total
    return {
      items: Array.isArray(items) ? items.map(toOrderRow) : [],
      totalCount:
        typeof total === 'number'
          ? total
          : typeof total === 'string'
            ? Number.parseInt(total, 10) || 0
            : Array.isArray(items)
              ? items.length
              : 0,
    }
  }
  return { items: [], totalCount: 0 }
}

export async function listOrdersPage(params) {
  const q = new URLSearchParams()
  if (params?.orderId != null && String(params.orderId).trim() !== '') {
    q.set('orderId', String(params.orderId).trim())
  }
  if (params?.estado) q.set('state', params.estado)
  if (params?.q != null && String(params.q).trim() !== '') {
    q.set('q', String(params.q).trim())
  }
  if (params?.fromDate) q.set('fromDate', params.fromDate)
  if (params?.toDate) q.set('toDate', params.toDate)
  if (params?.limit != null) q.set('limit', String(params.limit))
  if (params?.offset != null) q.set('offset', String(params.offset))
  const suffix = q.toString() ? `?${q}` : ''
  const raw = await osiJson(`/api/biesse/scan/orders${suffix}`)
  const payload = normalizeOrderListPayload(raw)

  if (!params?.q) return payload
  const needle = params.q.trim().toLowerCase()
  if (!needle) return payload
  const filtered = payload.items.filter((item) =>
    [item.orderName, item.bookingCode, String(item.orderId)].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(needle),
    ),
  )
  return { items: filtered, totalCount: filtered.length }
}

function toDimNumber(value) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(String(value).replace(',', '.'))
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export async function orderDetail(orderId) {
  const raw = await osiJson(`/api/biesse/scan/orders/${orderId}`)
  const order = toOrderRow(raw.order ?? {})
  const stats = raw.part_stats ?? {}
  const partsRaw = Array.isArray(raw.parts) ? raw.parts : []
  const partes = partsRaw.map((part) => {
    const scheduled = toNumber(part.cantidad)
    const scanned = toNumber(part.cantidad_escaneada ?? part.cantidadEscaneada)
    const nested = Array.isArray(part.piezas) ? part.piezas : []
    const piezas =
      nested.length > 0
        ? nested.map((z) => ({
            piezaId: toNumber(z.piezaid ?? z.piezaId) || null,
            numeroPieza: toNumber(z.numero_pieza ?? z.numeroPieza) || 1,
            escaneado: Boolean(z.escaneado),
            fechaEscaneo: z.fecha_escaneo ?? z.fechaEscaneo ?? null,
          }))
        : Array.from({ length: Math.max(scheduled, scanned, 1) }, (_, i) => ({
            piezaId: null,
            numeroPieza: i + 1,
            escaneado: false,
            fechaEscaneo: null,
          }))
    return {
      partId: toNumber(part.partid ?? part.partId),
      partCode: part.partcode ?? part.partCode ?? null,
      partNumber: toNumber(part.partnumber ?? part.partNumber),
      descripcion: part.descripcion ?? null,
      descripcion1: part.descripcion1 ?? null,
      material: part.material ?? null,
      matedgeup: part.matedgeup ?? null,
      matedgelo: part.matedgelo ?? null,
      matedgel: part.matedgel ?? null,
      matedger: part.matedger ?? null,
      longitud: toDimNumber(part.longitud),
      ancho: toDimNumber(part.ancho),
      cantidad: scheduled,
      escaneado: Boolean(part.escaneado),
      piezas,
    }
  })
  const totalPartes = toNumber(stats.total ?? order.totalPartes)
  const partesEscaneadas = toNumber(stats.escaneadas ?? order.partesEscaneadas)
  const partesPendientes = toNumber(stats.pendientes ?? Math.max(totalPartes - partesEscaneadas, 0))
  const totalPiezas = partsRaw.reduce((acc, part) => acc + toNumber(part.cantidad), 0)
  const piezasEscaneadas = partsRaw.reduce(
    (acc, part) => acc + toNumber(part.cantidad_escaneada ?? part.cantidadEscaneada),
    0,
  )

  return {
    ...order,
    partes,
    totalPartes,
    partesEscaneadas,
    partesPendientes,
    totalPiezas,
    piezasEscaneadas,
    porcentajeCompletado:
      totalPartes > 0 ? (partesEscaneadas / totalPartes) * 100 : order.porcentajeCompletado,
  }
}

/** PATCH /api/biesse/scan/orders/{orderId} */
export async function updateOrder(orderId, body) {
  return osiJson(`/api/biesse/scan/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function fetchDespachoDashboard() {
  try {
    const raw = await osiJson('/api/biesse/scan/users/me/stats')
    return {
      ordenesDistintasEscaneadas: toNumber(raw.contributedOrders),
      totalRegistrosAuditoria: toNumber(raw.totalScanned),
    }
  } catch {
    return null
  }
}

/** GET /api/biesse/scan/parts/pending?limit= */
export async function listPendingParts(limit = 100) {
  const q = new URLSearchParams()
  q.set('limit', String(limit))
  return osiJson(`/api/biesse/scan/parts/pending?${q}`)
}

/**
 * POST /api/biesse/scan/parts/scan
 * Body: partId, scannedQuantity, observations?, equipment?, method?, scanTimeMs?, location?
 */
export async function scanPart(body) {
  return osiJson('/api/biesse/scan/parts/scan', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * POST /api/biesse/scan/pieces/scan
 * Body: pieceId (req), observations?, equipment?
 */
export async function scanPiece(body) {
  return osiJson('/api/biesse/scan/pieces/scan', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** GET /api/biesse/scan/parts/scanned/me */
export async function myScannedParts(params = {}) {
  const q = new URLSearchParams()
  q.set('limit', String(params.limit ?? 100))
  if (params.fromDate != null && String(params.fromDate).trim() !== '') {
    q.set('fromDate', String(params.fromDate).trim())
  }
  if (params.toDate != null && String(params.toDate).trim() !== '') {
    q.set('toDate', String(params.toDate).trim())
  }
  return osiJson(`/api/biesse/scan/parts/scanned/me?${q}`)
}

/** GET /api/biesse/scan/stats/general */
export async function generalScanStats() {
  return osiJson('/api/biesse/scan/stats/general')
}

/** POST /api/biesse/scan/orders/{orderId}/complete?method= */
export async function completeOrder(orderId, method = 'MANUAL') {
  const q = new URLSearchParams({ method: String(method) })
  return osiJson(`/api/biesse/scan/orders/${orderId}/complete?${q}`, {
    method: 'POST',
  })
}

/** GET /api/biesse/scan/pieces/resolve?code= */
export async function resolvePieceByCode(code) {
  const q = new URLSearchParams({ code: String(code) })
  return osiJson(`/api/biesse/scan/pieces/resolve?${q}`)
}

/** GET /api/biesse/scan/pieces/{pieceId} */
export async function getPieceById(pieceId) {
  return osiJson(`/api/biesse/scan/pieces/${pieceId}`)
}

/**
 * POST /api/biesse/impresion/sticker
 * Audita una impresión (cabecera + 1..n detalles).
 * @param {{
 *   orderId: number,
 *   metodo?: string,
 *   equipo?: string,
 *   ubicacion?: string,
 *   userAgent?: string,
 *   observaciones?: string,
 *   detalles: Array<{ partId: number|null, piezaId?: number|null, numeroPieza?: number, codigoQr?: string|null, snapshot?: string|null }>
 * }} body
 */
export async function recordStickerPrint(body) {
  return osiJson('/api/biesse/impresion/sticker', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** GET /api/biesse/impresion/sticker?orderId=&fromDate=&toDate=&limit= */
export async function listStickerPrints(params = {}) {
  const q = new URLSearchParams()
  if (params.orderId != null) q.set('orderId', String(params.orderId))
  if (params.fromDate) q.set('fromDate', String(params.fromDate))
  if (params.toDate) q.set('toDate', String(params.toDate))
  q.set('limit', String(params.limit ?? 100))
  return osiJson(`/api/biesse/impresion/sticker?${q}`)
}

/** GET /api/biesse/scan/audit */
export async function listBiesseAudit(params = {}) {
  const q = new URLSearchParams()
  if (params.orderId != null && String(params.orderId).trim() !== '') q.set('orderId', String(params.orderId).trim())
  if (params.partId != null && String(params.partId).trim() !== '') q.set('partId', String(params.partId).trim())
  if (params.action != null && String(params.action).trim() !== '') q.set('action', String(params.action).trim())
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const suffix = q.toString() ? `?${q}` : ''
  return osiJson(`/api/biesse/scan/audit${suffix}`)
}
