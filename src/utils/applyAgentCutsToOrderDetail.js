/** Número de parte desde texto OSI del agente (ej. "Part 5", "Part5", "P5" → 5). */
function parsePartNumberFromOsi(osi) {
  if (osi == null || osi === '') return null
  const s = String(osi).trim()
  const m = /(?:^|\b)P(?:art)?\s*0*(\d+)\b/i.exec(s) || /\b(\d+)\b/.exec(s)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

function partNumFromUnitCode(unit) {
  const suffix = /-P?(\d+)-(\d+)\s*$/i.exec(String(unit ?? ''))
  return suffix ? Number(suffix[1]) : null
}

function pieceNumFromUnitCode(unit) {
  const suffix = /-P?(\d+)-(\d+)\s*$/i.exec(String(unit ?? ''))
  return suffix ? Number(suffix[2]) : null
}

function cutSortKey(cut) {
  const ts = Date.parse(cut.created_at ?? cut.createdAt ?? '')
  if (Number.isFinite(ts)) return ts
  return Number(cut.cut_piece_id ?? cut.cutPieceId) || 0
}

function isUnmappedCut(cut) {
  const status = String(cut.map_status ?? cut.mapStatus ?? '').toUpperCase()
  return status === 'UNMAPPED' || status === 'ERROR' || status === 'PART_UNMAPPED'
}

/**
 * Respaldo visual: marca cortada / error de captura en memoria si la BD aún no lo tiene.
 * No inventa piezas fuera de cantidad. No afecta PRODUCCION.
 */
export function applyAgentCutsToOrderDetail(detail, cuts) {
  if (!detail || !Array.isArray(cuts) || !cuts.length) return detail

  const partIdByNumber = new Map()
  const cantidadByPartId = new Map()
  for (const part of detail.partes ?? []) {
    const pn = Number(part.partNumber)
    const pid = Number(part.partId)
    if (Number.isFinite(pn) && pn > 0 && Number.isFinite(pid) && pid > 0) {
      partIdByNumber.set(pn, pid)
    }
    if (Number.isFinite(pid) && pid > 0) {
      cantidadByPartId.set(pid, Math.max(Number(part.cantidad) || 0, 0))
    }
  }

  /** partId → Map(pieceNum → { por, error, errorMsg, count }) */
  const cutByPart = new Map()
  const sequentialNext = new Map()

  const sorted = [...cuts].sort((a, b) => cutSortKey(a) - cutSortKey(b))

  for (const cut of sorted) {
    const unit = String(cut.unit_code ?? cut.unitCode ?? '')
    const eventUid = String(cut.event_uid ?? cut.eventUid ?? '')
    let partId = Number(cut.part_id ?? cut.partId)
    const unmapped = isUnmappedCut(cut)

    if (!Number.isFinite(partId) || partId <= 0) {
      const partNum =
        partNumFromUnitCode(unit) ?? parsePartNumberFromOsi(cut.osi_part_id ?? cut.osiPartId)
      if (partNum != null) partId = partIdByNumber.get(partNum)
    }
    if (!Number.isFinite(partId) || partId <= 0) continue

    // status-cut sin sufijo -N: no inventar avance visual 1..cantidad
    let pieceNum = pieceNumFromUnitCode(unit)
    if ((!Number.isFinite(pieceNum) || pieceNum <= 0) && eventUid.toLowerCase().startsWith('status-cut-')) {
      continue
    }

    const qty = cantidadByPartId.get(partId) ?? 0
    if (!Number.isFinite(pieceNum) || pieceNum <= 0) {
      const next = (sequentialNext.get(partId) ?? 0) + 1
      if (qty > 0 && next > qty) {
        if (unmapped && qty > 0) pieceNum = qty
        else continue
      } else {
        pieceNum = next
      }
    }
    if (qty > 0 && pieceNum > qty) {
      if (unmapped) pieceNum = qty
      else continue
    }

    sequentialNext.set(partId, Math.max(sequentialNext.get(partId) ?? 0, pieceNum))

    const machine = cut.machine_name ?? cut.machineName ?? null
    if (!cutByPart.has(partId)) cutByPart.set(partId, new Map())
    const prev = cutByPart.get(partId).get(pieceNum)
    const count = (prev?.count ?? 0) + 1
    cutByPart.get(partId).set(pieceNum, {
      por: machine ?? prev?.por ?? null,
      error: unmapped || Boolean(prev?.error),
      errorMsg: unmapped
        ? `Sin mapeo ERP (${String(cut.osi_part_id ?? cut.osiPartId ?? '').slice(0, 80)})`
        : (prev?.errorMsg ?? null),
      count,
    })
  }

  if (!cutByPart.size) return detail

  const partes = (detail.partes ?? []).map((part) => {
    const cutMap = cutByPart.get(Number(part.partId))
    if (!cutMap?.size) return part

    const scheduled = Math.max(Number(part.cantidad) || 0, 0)
    let piezas = Array.isArray(part.piezas) ? [...part.piezas] : []
    if (!piezas.length && scheduled > 0) {
      piezas = Array.from({ length: scheduled }, (_, i) => ({
        piezaId: null,
        numeroPieza: i + 1,
        escaneado: false,
        fechaEscaneo: null,
        cortada: false,
        cortadaAt: null,
        cortadaPor: null,
        corteError: false,
        corteErrorMsg: null,
        corteCount: 0,
      }))
    }

    if (scheduled > 0) {
      piezas = piezas.filter((z) => {
        const n = Number(z.numeroPieza)
        return Number.isFinite(n) && n >= 1 && n <= scheduled
      })
      while (piezas.length < scheduled) {
        const used = new Set(piezas.map((z) => Number(z.numeroPieza)))
        let next = 1
        while (used.has(next)) next += 1
        if (next > scheduled) break
        piezas.push({
          piezaId: null,
          numeroPieza: next,
          escaneado: false,
          fechaEscaneo: null,
          cortada: false,
          cortadaAt: null,
          cortadaPor: null,
          corteError: false,
          corteErrorMsg: null,
          corteCount: 0,
        })
      }
      piezas.sort((a, b) => Number(a.numeroPieza) - Number(b.numeroPieza))
    }

    return {
      ...part,
      piezas: piezas.map((z) => {
        const n = Number(z.numeroPieza)
        if (!cutMap.has(n)) return z
        if (scheduled > 0 && n > scheduled) return z
        if (z.escaneado) return z
        const info = cutMap.get(n)
        if (info?.error && !z.cortada) {
          return {
            ...z,
            corteError: true,
            corteErrorMsg: info.errorMsg ?? z.corteErrorMsg ?? 'Error al capturar',
          }
        }
        const count = Math.max(Number(z.corteCount) || 0, info?.count ?? 1)
        return {
          ...z,
          cortada: true,
          cortadaPor: info?.por ?? z.cortadaPor ?? null,
          corteError: false,
          corteErrorMsg: null,
          corteCount: count,
        }
      }),
    }
  })

  return { ...detail, partes }
}
