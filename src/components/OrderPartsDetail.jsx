/** Detalle de partes/piezas de una orden Biesse (medidas, avance 1/2, colores). */
export function OrderPartsDetail({ partes = [] }) {
  if (!partes.length) {
    return <p className="muted small">Sin partes en esta orden.</p>
  }

  return (
    <ul className="order-parts-list">
      {partes.map((p) => {
        const scheduled = Math.max(Number(p.cantidad) || 0, 0)
        const scanned = Math.max(Number(p.cantidadEscaneada) || 0, 0)
        const piezas = Array.isArray(p.piezas) ? p.piezas : []
        const piezasTot = piezas.length > 0 ? piezas.length : scheduled
        const piezasDone = piezas.length > 0 ? piezas.filter((z) => z.escaneado).length : scanned
        const partDone = Boolean(p.escaneado) || (scheduled > 0 && scanned >= scheduled)
        const partPartial = !partDone && (scanned > 0 || piezasDone > 0)

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
  )
}
