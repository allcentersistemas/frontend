import { useMemo, useState } from 'react'
import { ESTADOS_SEGUIMIENTO, estadoTagClass, formatEstadoProyecto } from '../../utils/proyectoOptimizacion.js'

/** Estados del tablero y cuándo se alcanza cada uno. */
const SEGUIMIENTO_COLUMN_META = [
  {
    id: 'OPTIMIZADO',
    title: 'Optimizado',
    trigger: 'Sync Appscanner sube el XML',
    meaning: 'Obra importada; aún no cortada en seccionadora.',
  },
  {
    id: 'PRODUCCION',
    title: 'Producción',
    trigger: 'Agente CNC detecta el job / XML',
    meaning: 'Seccionadora trabajando o ya cortó esta obra.',
  },
  {
    id: 'DESPACHO',
    title: 'Despacho',
    trigger: 'Primer escaneo de piezas (Android / palé)',
    meaning: 'Hay piezas escaneadas; faltan por completar.',
  },
  {
    id: 'LISTO_PARA_ENTREGAR',
    title: 'Listo para entrega',
    trigger: 'Escaneo al 100%',
    meaning: 'Todas las piezas/partes escaneadas.',
  },
  {
    id: 'ENTREGADO',
    title: 'Entregado',
    trigger: 'Marcado entregado en la app',
    meaning: 'Obra cerrada / entregada al cliente.',
  },
]

const DEFAULT_SINCE = '2026-08-26'

function normalizeObraEstado(raw) {
  const e = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (e === 'COMPLETADA' || e === 'COMPLETADO') return 'LISTO_PARA_ENTREGAR'
  if (e === 'EN_PROCESO') return 'DESPACHO'
  return e
}

/**
 * @param {{
 *   obras?: Array<object>,
 *   loading?: boolean,
 *   since?: string,
 *   onSinceChange?: (yyyyMmDd: string) => void,
 *   onRefresh?: () => Promise<void>|void,
 * }} props
 */
export function SeguimientoBoard({
  obras = [],
  loading = false,
  since = DEFAULT_SINCE,
  onSinceChange,
  onRefresh,
}) {
  const sinceValue = since || DEFAULT_SINCE
  const [sinceDraft, setSinceDraft] = useState(sinceValue)
  const [sinceSynced, setSinceSynced] = useState(sinceValue)
  if (sinceValue !== sinceSynced) {
    setSinceSynced(sinceValue)
    setSinceDraft(sinceValue)
  }

  const byEstado = useMemo(() => {
    const map = Object.fromEntries(ESTADOS_SEGUIMIENTO.map((e) => [e, []]))
    for (const o of obras) {
      const estado = normalizeObraEstado(o.estadoEscaneo ?? o.estado_escaneo ?? o.estado)
      if (map[estado]) map[estado].push(o)
    }
    return map
  }, [obras])

  function applySince(e) {
    e?.preventDefault?.()
    const value = String(sinceDraft || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    onSinceChange?.(value)
  }

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">Seguimiento por XML</h1>
          <p className="dash-header__lead">
            Flujo de cada obra (XML):{' '}
            <strong>Optimizado</strong> → <strong>Producción</strong> → <strong>Despacho</strong> →{' '}
            <strong>Listo</strong> → <strong>Entregado</strong>.
          </p>
        </div>
        {onRefresh ? (
          <button type="button" className="btn btn--ghost" onClick={() => void onRefresh()} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        ) : null}
      </header>

      <form className="seguimiento-filters" onSubmit={applySince}>
        <label className="field">
          <span className="field__label">Desde</span>
          <input
            type="date"
            className="input"
            value={sinceDraft}
            onChange={(ev) => setSinceDraft(ev.target.value)}
            disabled={loading}
          />
        </label>
        <button type="submit" className="btn btn--primary btn--sm" disabled={loading}>
          Filtrar
        </button>
        <p className="muted small seguimiento-filters__hint">
          Solo obras creadas o actualizadas desde esta fecha (p. ej. al pasar a Producción).
        </p>
      </form>

      <div className="seguimiento-legend card pad">
        <p className="small" style={{ margin: '0 0 0.5rem' }}>
          <strong>Qué significa cada estado</strong>
        </p>
        <ul className="seguimiento-legend__list">
          {SEGUIMIENTO_COLUMN_META.map((col) => (
            <li key={col.id}>
              <span className={estadoTagClass(col.id)}>{col.title}</span>
              <span className="muted small">
                {col.trigger} — {col.meaning}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {loading && !obras.length ? (
        <div className="app-loading" style={{ minHeight: '30vh' }}>
          <div className="app-loading__spinner" aria-hidden />
          <p className="text-sm">Cargando seguimiento…</p>
        </div>
      ) : null}

      {!loading || obras.length ? (
        <div className="seguimiento-board">
          {SEGUIMIENTO_COLUMN_META.map((col) => (
            <section key={col.id} className="seguimiento-col card">
              <h2 className="seguimiento-col__title">
                <span className={estadoTagClass(col.id)}>{formatEstadoProyecto(col.id)}</span>
                <span className="muted small">{byEstado[col.id]?.length ?? 0}</span>
              </h2>
              <p className="muted small seguimiento-col__hint">
                <strong>Cuándo:</strong> {col.trigger}
              </p>
              <p className="muted small seguimiento-col__hint">{col.meaning}</p>
              <ul className="seguimiento-col__list">
                {(byEstado[col.id] ?? []).length === 0 ? (
                  <li className="muted small">Sin obras</li>
                ) : (
                  (byEstado[col.id] ?? []).map((o) => {
                    const id = o.orderId ?? o.orderid
                    const name = o.orderName ?? o.ordername ?? `Obra #${id}`
                    const op = o.opCodigo ?? o.op_codigo
                    const booking = o.bookingCode ?? o.bookingcode
                    const pct = o.porcentaje
                    const avance = o.avanceLabel ?? o.avance_label
                    const seccionador = o.seccionador
                    return (
                      <li key={id} className="seguimiento-card">
                        <strong>{name}</strong>
                        {op ? <span className="muted small">OP {op}</span> : null}
                        {booking ? <span className="muted small">{booking}</span> : null}
                        {avance || pct != null ? (
                          <span className="muted small">
                            {avance || `${pct ?? 0}%`}
                            {pct != null && avance ? ` · ${pct}%` : null}
                          </span>
                        ) : null}
                        {seccionador ? (
                          <span className="muted small">Seccionador: {seccionador}</span>
                        ) : null}
                      </li>
                    )
                  })
                )}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  )
}
