import { useMemo, useState } from 'react'

const PART_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'partial', label: 'En proceso' },
  { id: 'done', label: 'Escaneadas' },
]

/**
 * Prioridad visual del número de pieza:
 * - pendiente: sin cortar ni escanear (gris)
 * - error: fallo al capturar/mapear en agente (rojo) — solo visual
 * - cortada: agente marcó corte, aún no escaneada (ámbar)
 * - escaneada: escaneado (verde), con o sin corte
 */
function pieceVisualStatus({ cortada, escaneado, corteError }) {
  if (Boolean(escaneado)) return 'scanned'
  if (Boolean(cortada)) return 'cut'
  if (Boolean(corteError)) return 'error'
  return 'pending'
}

function pieceClassName(status) {
  if (status === 'cut') return 'order-piece order-piece--cut'
  if (status === 'scanned') return 'order-piece order-piece--ok'
  if (status === 'error') return 'order-piece order-piece--error'
  return 'order-piece order-piece--pending'
}

function pieceTitle(z, status) {
  if (status === 'cut') {
    const por = z.cortadaPor ? ` (${z.cortadaPor})` : ''
    return `Cortada${por} · pendiente de escaneo`
  }
  if (status === 'scanned') {
    return z.cortada ? 'Cortada y escaneada' : 'Escaneada'
  }
  if (status === 'error') {
    return z.corteErrorMsg ? `Error captura: ${z.corteErrorMsg}` : 'Error al capturar (sin mapeo ERP)'
  }
  return 'Pendiente (sin corte ni escaneo)'
}

function partTagClass(status) {
  if (status === 'done') return 'tag tag--ok'
  if (status === 'cut') return 'tag tag--estado-produccion'
  if (status === 'partial') return 'tag tag--estado-atencion'
  return 'tag'
}

function partTagLabel(status) {
  if (status === 'done') return 'Escaneada'
  if (status === 'cut') return 'Cortada'
  if (status === 'partial') return 'En proceso'
  return 'Pendiente'
}

function partScanStatus(part) {
  const scheduled = Math.max(Number(part.cantidad) || 0, 0)
  const scanned = Math.max(Number(part.cantidadEscaneada) || 0, 0)
  const rawPiezas = Array.isArray(part.piezas) ? part.piezas : []
  // Solo piezas 1..cantidad del plan; ignora filas fantasma del agente CNC.
  const piezas =
    scheduled > 0
      ? rawPiezas.filter((z) => {
          const n = Number(z.numeroPieza ?? z.numero_pieza)
          return Number.isFinite(n) && n >= 1 && n <= scheduled
        })
      : rawPiezas
  const piezasTot = scheduled > 0 ? scheduled : piezas.length
  const piezasDone =
    piezas.length > 0
      ? piezas.filter((z) => z.escaneado).length
      : scanned
  const piezasCut = piezas.length > 0 ? piezas.filter((z) => z.cortada).length : 0
  const done =
    Boolean(part.escaneado) ||
    (scheduled > 0 && scanned >= scheduled) ||
    (piezasTot > 0 && piezasDone >= piezasTot)
  const allCutNotDone = !done && piezasTot > 0 && piezasCut >= piezasTot
  const partial = !done && !allCutNotDone && (scanned > 0 || piezasDone > 0 || piezasCut > 0)
  let status = 'pending'
  if (done) status = 'done'
  else if (allCutNotDone) status = 'cut'
  else if (partial) status = 'partial'
  return {
    scheduled,
    scanned,
    piezas,
    piezasTot,
    piezasDone,
    piezasCut,
    status,
  }
}

/** Detalle de partes/piezas de una orden Biesse (medidas, avance, colores por estado). */
export function OrderPartsDetail({ partes = [] }) {
  const [filter, setFilter] = useState('all')

  const enriched = useMemo(
    () =>
      (partes ?? []).map((p) => ({
        part: p,
        ...partScanStatus(p),
      })),
    [partes],
  )

  const counts = useMemo(() => {
    const next = { all: enriched.length, pending: 0, partial: 0, done: 0 }
    for (const row of enriched) {
      if (row.status === 'done') next.done += 1
      else if (row.status === 'pending') next.pending += 1
      else next.partial += 1 // partial + cut → «En proceso»
    }
    return next
  }, [enriched])

  const visible = useMemo(() => {
    if (filter === 'all') return enriched
    if (filter === 'partial') {
      return enriched.filter((row) => row.status === 'partial' || row.status === 'cut')
    }
    return enriched.filter((row) => row.status === filter)
  }, [enriched, filter])

  if (!partes.length) {
    return <p className="muted small">Sin partes en esta orden.</p>
  }

  return (
    <div className="order-parts-panel">
      <div className="order-parts-filters" role="group" aria-label="Filtrar partes por estado">
        {PART_FILTERS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`btn btn--sm ${filter === opt.id ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setFilter(opt.id)}
            aria-pressed={filter === opt.id}
          >
            {opt.label}
            <span className="order-parts-filters__count">{counts[opt.id]}</span>
          </button>
        ))}
      </div>

      <p className="order-pieces-legend small muted" aria-label="Leyenda de colores de piezas">
        <span className="order-piece order-piece--pending order-piece--legend">Pendiente</span>
        <span className="order-piece order-piece--cut order-piece--legend">Cortada</span>
        <span className="order-piece order-piece--error order-piece--legend">Error captura</span>
        <span className="order-piece order-piece--ok order-piece--legend">Escaneada</span>
      </p>

      {!visible.length ? (
        <p className="muted small">
          No hay partes en estado «{PART_FILTERS.find((f) => f.id === filter)?.label ?? filter}».
        </p>
      ) : (
        <ul className="order-parts-list">
          {visible.map(({ part: p, scheduled, scanned, piezas, piezasTot, piezasDone, status }) => {
            const partDone = status === 'done'
            const partPartial = status === 'partial' || status === 'cut'
            const longitud = p.longitud
            const ancho = p.ancho
            const hasMeasures =
              (longitud != null && longitud > 0) || (ancho != null && ancho > 0)

            return (
              <li
                key={p.partId}
                className={`order-part ${partDone ? 'order-part--done' : partPartial ? 'order-part--partial' : ''}`}
              >
                <div className="order-part__head">
                  <span className="order-part__code">{p.partCode ?? `Parte ${p.partId}`}</span>
                  <span className={partTagClass(status)}>{partTagLabel(status)}</span>
                </div>

                {(p.descripcion || p.descripcion1) && (
                  <p className="order-part__desc small muted">
                    {[p.descripcion, p.descripcion1].filter(Boolean).join(' · ')}
                  </p>
                )}

                <div className="order-part__meta small">
                  <span>
                    <strong>Avance:</strong> {scanned} / {scheduled || '—'}
                    {scheduled > 1 ? ` (${piezasDone} de ${scheduled} piezas)` : ''}
                  </span>
                  {p.material ? (
                    <span>
                      <strong>Material:</strong> {p.material}
                    </span>
                  ) : null}
                  {hasMeasures ? (
                    <span>
                      <strong>Medidas:</strong> {longitud ?? '—'} × {ancho ?? '—'}
                    </span>
                  ) : null}
                </div>

                {piezas.length > 0 ? (
                  <div className="order-pieces-grid" role="list" aria-label="Piezas de la parte">
                    {piezas.map((z) => {
                      const visual = pieceVisualStatus(z)
                      return (
                        <span
                          key={z.piezaId ?? `n-${z.numeroPieza}`}
                          role="listitem"
                          className={pieceClassName(visual)}
                          title={pieceTitle(z, visual)}
                        >
                          {z.numeroPieza}
                        </span>
                      )
                    })}
                  </div>
                ) : scheduled > 0 ? (
                  <div className="order-pieces-grid" role="list">
                    {Array.from({ length: scheduled }, (_, i) => {
                      const n = i + 1
                      // Sin filas en piezas: solo se puede inferir escaneo por cantidad_escaneada.
                      const z = { cortada: false, escaneado: n <= scanned, corteError: false }
                      const visual = pieceVisualStatus(z)
                      return (
                        <span
                          key={n}
                          role="listitem"
                          className={pieceClassName(visual)}
                          title={pieceTitle(z, visual)}
                        >
                          {n}
                        </span>
                      )
                    })}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
