/** Número de parte desde texto OSI del agente (ej. "Part 5" → 5). */
function parsePartNumberFromOsi(osi) {
  if (osi == null || osi === '') return null
  const m = /\bP?\s*(\d+)\b/i.exec(String(osi).trim())
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

/**
 * Respaldo visual: solo marca cortada en memoria si la BD aún no la tiene.
 * Tras desplegar module-biesse, el detalle ya trae {@code cortada} desde la BD.
 */
export function applyAgentCutsToOrderDetail(detail, cuts) {
  if (!detail || !Array.isArray(cuts) || !cuts.length) return detail

  const partIdByNumber = new Map()
  for (const part of detail.partes ?? []) {
    const pn = Number(part.partNumber)
    const pid = Number(part.partId)
    if (Number.isFinite(pn) && pn > 0 && Number.isFinite(pid) && pid > 0) {
      partIdByNumber.set(pn, pid)
    }
  }

  /** partId → Map(pieceNum → cortadaPor) */
  const cutByPart = new Map()
  const sequentialNext = new Map()

  const sorted = [...cuts].sort((a, b) => cutSortKey(a) - cutSortKey(b))

  for (const cut of sorted) {
    const unit = String(cut.unit_code ?? cut.unitCode ?? '')
    let partId = Number(cut.part_id ?? cut.partId)

    if (!Number.isFinite(partId) || partId <= 0) {
      const partNum =
        partNumFromUnitCode(unit) ?? parsePartNumberFromOsi(cut.osi_part_id ?? cut.osiPartId)
      if (partNum != null) partId = partIdByNumber.get(partNum)
    }
    if (!Number.isFinite(partId) || partId <= 0) continue

    let pieceNum = pieceNumFromUnitCode(unit)
    if (!Number.isFinite(pieceNum) || pieceNum <= 0) {
      pieceNum = (sequentialNext.get(partId) ?? 0) + 1
    }
    sequentialNext.set(partId, Math.max(sequentialNext.get(partId) ?? 0, pieceNum))

    const machine = cut.machine_name ?? cut.machineName ?? null
    if (!cutByPart.has(partId)) cutByPart.set(partId, new Map())
    cutByPart.get(partId).set(pieceNum, machine)
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
      }))
    }

    const maxNeeded = Math.max(...cutMap.keys(), piezas.length, scheduled)
    while (piezas.length < maxNeeded) {
      piezas.push({
        piezaId: null,
        numeroPieza: piezas.length + 1,
        escaneado: false,
        fechaEscaneo: null,
        cortada: false,
        cortadaAt: null,
        cortadaPor: null,
      })
    }

    return {
      ...part,
      piezas: piezas.map((z) => {
        const n = Number(z.numeroPieza)
        if (!cutMap.has(n) || z.cortada) return z
        const por = cutMap.get(n)
        return {
          ...z,
          cortada: true,
          cortadaPor: por ?? z.cortadaPor ?? null,
        }
      }),
    }
  })

  return { ...detail, partes }
}
