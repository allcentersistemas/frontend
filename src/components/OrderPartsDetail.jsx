import { useMemo, useState } from 'react'

const PART_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'partial', label: 'En proceso' },
  { id: 'done', label: 'Escaneadas' },
]

function partScanStatus(part) {
  const scheduled = Math.max(Number(part.cantidad) || 0, 0)
  const scanned = Math.max(Number(part.cantidadEscaneada) || 0, 0)
  const piezas = Array.isArray(part.piezas) ? part.piezas : []
  const piezasTot = piezas.length > 0 ? piezas.length : scheduled
  const piezasDone = piezas.length > 0 ? piezas.filter((z) => z.escaneado).length : scanned
  const done = Boolean(part.escaneado) || (scheduled > 0 && scanned >= scheduled)
  const partial = !done && (scanned > 0 || piezasDone > 0)
  return {
    scheduled,
    scanned,
    piezas,
    piezasTot,
    piezasDone,
    status: done ? 'done' : partial ? 'partial' : 'pending',
  }
}

/** Detalle de partes/piezas de una orden Biesse (medidas, avance 1/2, colores). */
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
    for (const row of enriched) next[row.status] += 1
    return next
  }, [enriched])

  const visible = useMemo(() => {
    if (filter === 'all') return enriched
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

      {!visible.length ? (
        <p className="muted small">
          No hay partes en estado «{PART_FILTERS.find((f) => f.id === filter)?.label ?? filter}».
        </p>
      ) : (
        <ul className="order-parts-list">
          {visible.map(({ part: p, scheduled, scanned, piezas, piezasTot, piezasDone, status }) => {
            const partDone = status === 'done'
            const partPartial = status === 'partial'
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
                  <span className={partDone ? 'tag tag--ok' : partPartial ? 'tag' : 'tag'}>
                    {partDone ? 'Escaneada' : partPartial ? 'En proceso' : 'Pendiente'}
                  </span>
                </div>

                {(p.descripcion || p.descripcion1) && (
                  <p className="order-part__desc small muted">
                    {[p.descripcion, p.descripcion1].filter(Boolean).join(' · ')}
                  </p>
                )}

                <div className="order-part__meta small">
                  <span>
                    <strong>Avance:</strong> {scanned} / {scheduled || piezasTot || '—'}
                    {scheduled > 1 || piezasTot > 1 ? ` (${piezasDone} de ${piezasTot} piezas)` : ''}
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
                    {piezas.map((z) => (
                      <span
                        key={z.piezaId ?? `n-${z.numeroPieza}`}
                        role="listitem"
                        className={`order-piece ${z.escaneado ? 'order-piece--ok' : ''}`}
                        title={z.escaneado ? 'Pieza escaneada' : 'Pendiente'}
                      >
                        {z.numeroPieza}
                        {z.escaneado ? ' ✓' : ''}
                      </span>
                    ))}
                  </div>
                ) : scheduled > 0 ? (
                  <div className="order-pieces-grid" role="list">
                    {Array.from({ length: scheduled }, (_, i) => {
                      const n = i + 1
                      const ok = n <= scanned
                      return (
                        <span
                          key={n}
                          role="listitem"
                          className={`order-piece ${ok ? 'order-piece--ok' : ''}`}
                        >
                          {n}
                          {ok ? ' ✓' : ''}
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
