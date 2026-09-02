import { biesseJson } from './http'

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/** Acepta boolean nativo o flags PG/JDBC (`t`/`f`, `true`/`false`, 1/0). */
function toBool(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value == null) return false
  const s = String(value).trim().toLowerCase()
  return s === 't' || s === 'true' || s === '1' || s === 'yes'
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
  const raw = await biesseJson(`/api/biesse/scan/orders${suffix}`)
  return normalizeOrderListPayload(raw)
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
  const raw = await biesseJson(`/api/biesse/scan/orders/${orderId}`)
  const order = toOrderRow(raw.order ?? {})
  const stats = raw.part_stats ?? {}
  const partsRaw = Array.isArray(raw.parts) ? raw.parts : []
  const partes = partsRaw.map((part) => {
    const scheduled = toNumber(part.cantidad)
    const scanned = toNumber(part.cantidad_escaneada ?? part.cantidadEscaneada)
    const nested = Array.isArray(part.piezas) ? part.piezas : []
    const nestedFiltered =
      scheduled > 0
        ? nested.filter((z) => {
            const n = toNumber(z.numero_pieza ?? z.numeroPieza)
            return n >= 1 && n <= scheduled
          })
        : nested
    const piezas =
      nestedFiltered.length > 0
        ? nestedFiltered.map((z) => ({
            piezaId: toNumber(z.piezaid ?? z.piezaId) || null,
            numeroPieza: toNumber(z.numero_pieza ?? z.numeroPieza) || 1,
            escaneado: toBool(z.escaneado),
            fechaEscaneo: z.fecha_escaneo ?? z.fechaEscaneo ?? null,
            cortada: toBool(z.cortada),
            cortadaAt: z.cortada_at ?? z.cortadaAt ?? null,
            cortadaPor: z.cortada_por ?? z.cortadaPor ?? null,
            corteError: toBool(z.corte_error ?? z.corteError),
            corteErrorMsg: z.corte_error_msg ?? z.corteErrorMsg ?? null,
            corteCount: toNumber(z.corte_count ?? z.corteCount) || (toBool(z.cortada) ? 1 : 0),
          }))
        : Array.from({ length: Math.max(scheduled, 1) }, (_, i) => ({
            piezaId: null,
            numeroPieza: i + 1,
            escaneado: scheduled > 0 ? false : false,
            fechaEscaneo: null,
            cortada: false,
            cortadaAt: null,
            cortadaPor: null,
            corteError: false,
            corteErrorMsg: null,
            corteCount: 0,
          }))
    // Si hay plan, rellenar huecos 1..cantidad sin inventar más allá.
    if (scheduled > 0) {
      const byNum = new Map(piezas.map((z) => [z.numeroPieza, z]))
      const filled = []
      for (let i = 1; i <= scheduled; i++) {
        filled.push(
          byNum.get(i) ?? {
            piezaId: null,
            numeroPieza: i,
            escaneado: false,
            fechaEscaneo: null,
            cortada: false,
            cortadaAt: null,
            cortadaPor: null,
            corteError: false,
            corteErrorMsg: null,
            corteCount: 0,
          },
        )
      }
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
        cantidadEscaneada: scanned,
        escaneado: toBool(part.escaneado),
        piezas: filled,
      }
    }
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
      cantidadEscaneada: scanned,
      escaneado: toBool(part.escaneado),
      piezas,
    }
  })
  const totalPartes = toNumber(stats.total ?? order.totalPartes)
  const partesEscaneadas = toNumber(stats.escaneadas ?? order.partesEscaneadas)
  const partesPendientes = toNumber(stats.pendientes ?? Math.max(totalPartes - partesEscaneadas, 0))
  const totalPiezas = partes.reduce((acc, part) => acc + Math.max(toNumber(part.cantidad), 0), 0)
  const piezasEscaneadas = partsRaw.reduce(
    (acc, part) => acc + toNumber(part.cantidad_escaneada ?? part.cantidadEscaneada),
    0,
  )
  const piezasCortadas = partes.reduce((acc, part) => {
    const scheduled = Math.max(toNumber(part.cantidad), 0)
    const piezas = Array.isArray(part.piezas) ? part.piezas : []
    const cutInPlan = piezas.filter((z) => {
      const n = toNumber(z.numeroPieza)
      const inPlan = scheduled <= 0 || (n >= 1 && n <= scheduled)
      return inPlan && Boolean(z.cortada)
    }).length
    return acc + cutInPlan
  }, 0)
  const porcentajeEscaneoPiezas =
    totalPiezas > 0 ? Math.round((piezasEscaneadas * 1000) / totalPiezas) / 10 : 0
  const porcentajeCorte =
    totalPiezas > 0 ? Math.round((piezasCortadas * 1000) / totalPiezas) / 10 : 0

  return {
    ...order,
    partes,
    totalPartes,
    partesEscaneadas,
    partesPendientes,
    totalPiezas,
    piezasEscaneadas,
    piezasCortadas,
    porcentajeCompletado:
      totalPiezas > 0
        ? porcentajeEscaneoPiezas
        : totalPartes > 0
          ? (partesEscaneadas / totalPartes) * 100
          : order.porcentajeCompletado,
    porcentajeCorte,
    avanceCorteLabel: `${piezasCortadas}/${totalPiezas} cortes`,
    avanceEscaneoLabel:
      totalPiezas > 0
        ? `${piezasEscaneadas}/${totalPiezas} piezas`
        : `${partesEscaneadas}/${totalPartes} partes`,
  }
}

export async function updateOrder(orderId, body) {
  return biesseJson(`/api/biesse/scan/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteOrder(orderId) {
  return biesseJson(`/api/biesse/scan/orders/${orderId}`, {
    method: 'DELETE',
  })
}

export async function fetchDespachoDashboard() {
  try {
    const raw = await biesseJson('/api/biesse/scan/users/me/stats')
    return {
      ordenesDistintasEscaneadas: toNumber(raw.contributedOrders),
      totalRegistrosAuditoria: toNumber(raw.totalScanned),
    }
  } catch {
    return null
  }
}

export async function listPendingParts(limit = 100) {
  const q = new URLSearchParams()
  q.set('limit', String(limit))
  return biesseJson(`/api/biesse/scan/parts/pending?${q}`)
}

export async function scanPart(body) {
  return biesseJson('/api/biesse/scan/parts/scan', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function scanPiece(body) {
  return biesseJson('/api/biesse/scan/pieces/scan', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function myScannedParts(params = {}) {
  const q = new URLSearchParams()
  q.set('limit', String(params.limit ?? 100))
  if (params.fromDate != null && String(params.fromDate).trim() !== '') {
    q.set('fromDate', String(params.fromDate).trim())
  }
  if (params.toDate != null && String(params.toDate).trim() !== '') {
    q.set('toDate', String(params.toDate).trim())
  }
  return biesseJson(`/api/biesse/scan/parts/scanned/me?${q}`)
}

export async function generalScanStats() {
  return biesseJson('/api/biesse/scan/stats/general')
}

export async function completeOrder(orderId, method = 'MANUAL') {
  const q = new URLSearchParams({ method: String(method) })
  return biesseJson(`/api/biesse/scan/orders/${orderId}/complete?${q}`, {
    method: 'POST',
  })
}

export async function resolvePieceByCode(code) {
  const q = new URLSearchParams({ code: String(code) })
  return biesseJson(`/api/biesse/scan/pieces/resolve?${q}`)
}

export async function getPieceById(pieceId) {
  return biesseJson(`/api/biesse/scan/pieces/${pieceId}`)
}

export async function listBiesseAudit(params = {}) {
  const q = new URLSearchParams()
  if (params.orderId != null && String(params.orderId).trim() !== '') q.set('orderId', String(params.orderId).trim())
  if (params.partId != null && String(params.partId).trim() !== '') q.set('partId', String(params.partId).trim())
  if (params.orderQ != null && String(params.orderQ).trim() !== '') q.set('orderQ', String(params.orderQ).trim())
  if (params.partQ != null && String(params.partQ).trim() !== '') q.set('partQ', String(params.partQ).trim())
  if (params.action != null && String(params.action).trim() !== '') q.set('action', String(params.action).trim())
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const suffix = q.toString() ? `?${q}` : ''
  return biesseJson(`/api/biesse/scan/audit${suffix}`)
}

/** Trazabilidad OP/obra (BD obras) */
export async function listOpTrazabilidad({ op, orderId, limit = 100 } = {}) {
  const q = new URLSearchParams()
  if (op) q.set('op', String(op))
  if (orderId != null) q.set('orderId', String(orderId))
  q.set('limit', String(limit))
  return biesseJson(`/api/biesse/scan/trazabilidad?${q}`)
}

/** Agrupación por OP (S14531, 31174, …) con obras/XML y % avance */
export async function listOpsPage({ q, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (q != null && String(q).trim() !== '') params.set('q', String(q).trim())
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  const raw = await biesseJson(`/api/biesse/scan/ops?${params}`)
  const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : []
  const total =
    typeof raw?.totalCount === 'number'
      ? raw.totalCount
      : typeof raw?.totalElements === 'number'
        ? raw.totalElements
        : items.length
  return { items, totalCount: total }
}


