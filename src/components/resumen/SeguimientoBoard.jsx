import { useEffect, useMemo, useRef, useState } from 'react'
import { ESTADOS_SEGUIMIENTO, estadoTagClass } from '../../utils/proyectoOptimizacion.js'

const DEFAULT_SINCE = '2026-08-26'
const FLIGHT_MS = 1600
const ARRIVE_MS = 2200

/** Etiquetas cortas para el tablero (evitan aplastar / scroll horizontal). */
const COL_LABEL = {
  OPTIMIZADO: 'Optimizado',
  PRODUCCION: 'Producción',
  DESPACHO: 'Despacho',
  LISTO_PARA_ENTREGAR: 'Listo',
  ENTREGADO: 'Entregado',
}

const SEGUIMIENTO_COLUMNS = ESTADOS_SEGUIMIENTO.map((id) => ({
  id,
  label: COL_LABEL[id] ?? id,
}))

function normalizeObraEstado(raw) {
  const e = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (e === 'COMPLETADA' || e === 'COMPLETADO') return 'LISTO_PARA_ENTREGAR'
  if (e === 'EN_PROCESO') return 'DESPACHO'
  return e
}

function obraId(o) {
  return o.orderId ?? o.orderid
}

function obraName(o) {
  const id = obraId(o)
  return o.orderName ?? o.ordername ?? (id != null ? `Obra #${id}` : 'Obra')
}

function clampPct(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

function ProgressRow({ label, pct, detail, tone = 'scan' }) {
  const value = clampPct(pct)
  return (
    <div className={`seguimiento-progress seguimiento-progress--${tone}`}>
      <div className="seguimiento-progress__head">
        <span>{label}</span>
        <span className="seguimiento-progress__pct">{value.toFixed(value % 1 ? 1 : 0)}%</span>
      </div>
      <div
        className="seguimiento-progress__track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="seguimiento-progress__fill" style={{ width: `${value}%` }} />
      </div>
      {detail ? <span className="seguimiento-progress__detail muted">{detail}</span> : null}
    </div>
  )
}

/**
 * @param {{
 *   obras?: Array<object>,
 *   loading?: boolean,
 *   live?: boolean,
 *   since?: string,
 *   onSinceChange?: (yyyyMmDd: string) => void,
 * }} props
 */
export function SeguimientoBoard({
  obras = [],
  loading = false,
  live = false,
  since = DEFAULT_SINCE,
  onSinceChange,
}) {
  const sinceValue = since || DEFAULT_SINCE
  const [sinceDraft, setSinceDraft] = useState(sinceValue)
  const [sinceSynced, setSinceSynced] = useState(sinceValue)
  if (sinceValue !== sinceSynced) {
    setSinceSynced(sinceValue)
    setSinceDraft(sinceValue)
  }

  const prevEstadosRef = useRef(new Map())
  const primedRef = useRef(false)
  const [flights, setFlights] = useState([])
  const [arrived, setArrived] = useState(() => new Set())

  const byEstado = useMemo(() => {
    const map = Object.fromEntries(ESTADOS_SEGUIMIENTO.map((e) => [e, []]))
    for (const o of obras) {
      const estado = normalizeObraEstado(o.estadoEscaneo ?? o.estado_escaneo ?? o.estado)
      if (map[estado]) map[estado].push(o)
    }
    return map
  }, [obras])

  const totalObras = obras.length

  useEffect(() => {
    const prev = prevEstadosRef.current
    const next = new Map()
    const newFlights = []
    const newlyArrived = []

    for (const o of obras) {
      const id = obraId(o)
      if (id == null) continue
      const estado = normalizeObraEstado(o.estadoEscaneo ?? o.estado_escaneo ?? o.estado)
      next.set(String(id), estado)
      const old = prev.get(String(id))
      if (primedRef.current && old && old !== estado) {
        const fromIdx = ESTADOS_SEGUIMIENTO.indexOf(old)
        const toIdx = ESTADOS_SEGUIMIENTO.indexOf(estado)
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          newFlights.push({
            key: `${id}-${old}-${estado}-${Date.now()}`,
            id,
            name: obraName(o),
            fromIdx,
            toIdx,
          })
          newlyArrived.push(String(id))
        }
      }
    }

    prevEstadosRef.current = next
    if (!primedRef.current) {
      primedRef.current = true
    }

    if (newFlights.length) {
      setFlights((f) => [...f, ...newFlights].slice(-8))
      setArrived((prevSet) => {
        const s = new Set(prevSet)
        for (const id of newlyArrived) s.add(id)
        return s
      })
      const clearArrive = window.setTimeout(() => {
        setArrived((prevSet) => {
          const s = new Set(prevSet)
          for (const id of newlyArrived) s.delete(id)
          return s
        })
      }, ARRIVE_MS)
      return () => window.clearTimeout(clearArrive)
    }
  }, [obras])

  function dismissFlight(key) {
    setFlights((f) => f.filter((x) => x.key !== key))
  }

  function applySince(e) {
    e?.preventDefault?.()
    const value = String(sinceDraft || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    onSinceChange?.(value)
  }

  const steps = ESTADOS_SEGUIMIENTO.length

  return (
    <div className="dash seguimiento-page">
      <header className="seguimiento-top">
        <div className="seguimiento-top__main">
          <div className="seguimiento-top__title-row">
            <h1 className="seguimiento-top__title">Seguimiento</h1>
            <span
              className={`seguimiento-live${live ? '' : ' seguimiento-live--off'}`}
              title={live ? 'Canal en vivo conectado' : 'Reconectando canal en vivo…'}
            >
              <span className="seguimiento-live__dot" aria-hidden />
              {live ? 'En vivo' : loading ? 'Conectando…' : 'Reconectando…'}
            </span>
            <span className="seguimiento-top__count muted small">{totalObras} obras</span>
          </div>
          <p className="seguimiento-top__lead muted small">
            Optimizado → Producción → Despacho → Listo → Entregado
          </p>
        </div>

        <form className="seguimiento-filters" onSubmit={applySince}>
          <label className="field">
            <span className="field__label">Desde</span>
            <input
              type="date"
              className="input"
              value={sinceDraft}
              onChange={(ev) => setSinceDraft(ev.target.value)}
              disabled={loading && !obras.length}
            />
          </label>
          <button type="submit" className="btn btn--primary btn--sm" disabled={loading && !obras.length}>
            Filtrar
          </button>
        </form>
      </header>

      {loading && !obras.length ? (
        <div className="app-loading" style={{ minHeight: '30vh' }}>
          <div className="app-loading__spinner" aria-hidden />
          <p className="text-sm">Conectando seguimiento en vivo…</p>
        </div>
      ) : null}

      {!loading || obras.length ? (
        <>
          <div className="seguimiento-rail" aria-hidden={flights.length === 0}>
            <div className="seguimiento-rail__line" />
            <div className="seguimiento-rail__stops">
              {SEGUIMIENTO_COLUMNS.map((col) => (
                <div key={col.id} className="seguimiento-rail__stop">
                  <span className="seguimiento-rail__dot" />
                  <span className="seguimiento-rail__label">{col.label}</span>
                </div>
              ))}
            </div>
            {flights.map((f) => {
              const fromPct = ((f.fromIdx + 0.5) / steps) * 100
              const toPct = ((f.toIdx + 0.5) / steps) * 100
              return (
                <div
                  key={f.key}
                  className="seguimiento-flight"
                  style={{
                    '--from-pct': `${fromPct}%`,
                    '--to-pct': `${toPct}%`,
                    animationDuration: `${FLIGHT_MS}ms`,
                  }}
                  onAnimationEnd={() => dismissFlight(f.key)}
                >
                  <span className="seguimiento-flight__glow" />
                  <span className="seguimiento-flight__chip" title={f.name}>
                    {f.name}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="seguimiento-board">
            {SEGUIMIENTO_COLUMNS.map((col) => {
              const count = byEstado[col.id]?.length ?? 0
              return (
                <section key={col.id} className={`seguimiento-col seguimiento-col--${col.id.toLowerCase()}`}>
                  <h2 className="seguimiento-col__title">
                    <span className={`${estadoTagClass(col.id)} seguimiento-col__tag`} title={col.id === 'LISTO_PARA_ENTREGAR' ? 'Listo para entregar' : col.label}>
                      {col.label}
                    </span>
                    <span className="seguimiento-col__count">{count}</span>
                  </h2>
                  <ul className="seguimiento-col__list">
                    {count === 0 ? (
                      <li className="seguimiento-empty muted small">Sin obras</li>
                    ) : (
                      (byEstado[col.id] ?? []).map((o) => {
                        const id = obraId(o)
                        const name = obraName(o)
                        const op = o.opCodigo ?? o.op_codigo
                        const booking = o.bookingCode ?? o.bookingcode
                        const pct = o.porcentaje
                        const avance = o.avanceLabel ?? o.avance_label
                        const pctCorte = o.porcentajeCorte ?? o.porcentaje_corte
                        const avanceCorte = o.avanceCorteLabel ?? o.avance_corte_label
                        const seccionador = o.seccionador
                        const isArrived = arrived.has(String(id))
                        return (
                          <li
                            key={id}
                            className={`seguimiento-card${isArrived ? ' seguimiento-card--arrive' : ''}`}
                          >
                            <strong className="seguimiento-card__name" title={name}>
                              {name}
                            </strong>
                            <div className="seguimiento-card__meta">
                              {op ? <span className="muted small">OP {op}</span> : null}
                              {booking ? <span className="muted small">{booking}</span> : null}
                              {seccionador ? (
                                <span className="muted small">Secc. {seccionador}</span>
                              ) : null}
                            </div>
                            <ProgressRow label="Escaneo" pct={pct} detail={avance || null} tone="scan" />
                            <ProgressRow label="Cortes" pct={pctCorte} detail={avanceCorte || null} tone="cut" />
                          </li>
                        )
                      })
                    )}
                  </ul>
                </section>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
