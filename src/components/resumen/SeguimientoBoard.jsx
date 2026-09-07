import { useEffect, useMemo, useRef, useState } from 'react'
import { ESTADOS_SEGUIMIENTO, estadoTagClass, formatEstadoProyecto } from '../../utils/proyectoOptimizacion.js'

const FLIGHT_MS = 1600
const ARRIVE_MS = 2200

/** Incluye VENDIDO: proyectos esperando que todas las órdenes tengan XML. */
const BOARD_ESTADOS = ['VENDIDO', ...ESTADOS_SEGUIMIENTO]

const COL_LABEL = {
  VENDIDO: 'Vendido',
  OPTIMIZADO: 'Optimizado',
  PRODUCCION: 'Producción',
  DESPACHO: 'Despacho',
  LISTO_PARA_ENTREGAR: 'Listo',
  ENTREGADO: 'Entregado',
}

const SEGUIMIENTO_COLUMNS = BOARD_ESTADOS.map((id) => ({
  id,
  label: COL_LABEL[id] ?? id,
}))

function normalizeEstado(raw) {
  const e = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (e === 'COMPLETADA' || e === 'COMPLETADO') return 'LISTO_PARA_ENTREGAR'
  if (e === 'EN_PROCESO') return 'DESPACHO'
  if (e === 'PENDIENTE' || e === '') return 'OPTIMIZADO'
  return e
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

function OrdenRow({ orden }) {
  const estado = orden.biesseOrderId == null ? null : normalizeEstado(orden.estadoEscaneo)
  const name = orden.biesseOrderName || orden.codigo || (orden.ordenId != null ? `Orden #${orden.ordenId}` : 'Orden')
  return (
    <li className="seguimiento-orden">
      <div className="seguimiento-orden__head">
        <strong className="seguimiento-orden__name" title={name}>
          {name}
        </strong>
        {estado ? (
          <span className={`${estadoTagClass(estado)} seguimiento-orden__tag`}>{formatEstadoProyecto(estado)}</span>
        ) : (
          <span className="tag seguimiento-orden__tag">Sin XML</span>
        )}
      </div>
      <div className="seguimiento-orden__meta">
        {orden.codigo ? <span className="muted small">{orden.codigo}</span> : null}
        {orden.opCodigo ? <span className="muted small">OP {orden.opCodigo}</span> : null}
        {orden.seccionador ? <span className="muted small">Secc. {orden.seccionador}</span> : null}
      </div>
      {orden.biesseOrderId != null ? (
        <>
          <ProgressRow label="Escaneo" pct={orden.porcentaje} detail={orden.avanceLabel || null} tone="scan" />
          <ProgressRow
            label="Cortes"
            pct={orden.porcentajeCorte}
            detail={orden.avanceCorteLabel || null}
            tone="cut"
          />
        </>
      ) : (
        <p className="muted small" style={{ margin: '0.35rem 0 0' }}>
          Anidar XML en Mis proyectos para avanzar.
        </p>
      )}
    </li>
  )
}

/**
 * Tablero Seguimiento: cards de proyecto (columna = estado cuello de botella),
 * con cada orden/XML y su estado individual dentro.
 *
 * @param {{
 *   proyectos?: Array<object>,
 *   loading?: boolean,
 *   live?: boolean,
 *   onReconnectLive?: () => void,
 * }} props
 */
export function SeguimientoBoard({ proyectos = [], loading = false, live = false, onReconnectLive }) {
  const prevEstadosRef = useRef(new Map())
  const primedRef = useRef(false)
  const [flights, setFlights] = useState([])
  const [arrived, setArrived] = useState(() => new Set())

  const byEstado = useMemo(() => {
    const map = Object.fromEntries(BOARD_ESTADOS.map((e) => [e, []]))
    for (const p of proyectos) {
      const estado = normalizeEstado(p.estado)
      if (map[estado]) map[estado].push(p)
      else if (map.VENDIDO) map.VENDIDO.push(p)
    }
    return map
  }, [proyectos])

  const totalProyectos = proyectos.length
  const totalOrdenes = useMemo(
    () => proyectos.reduce((acc, p) => acc + (Array.isArray(p.ordenes) ? p.ordenes.length : 0), 0),
    [proyectos],
  )

  useEffect(() => {
    const prev = prevEstadosRef.current
    const next = new Map()
    const newFlights = []
    const newlyArrived = []

    for (const p of proyectos) {
      const id = p.proyectoId
      if (id == null) continue
      const estado = normalizeEstado(p.estado)
      next.set(String(id), estado)
      if (!primedRef.current) continue
      const before = prev.get(String(id))
      if (before && before !== estado) {
        const fromIdx = BOARD_ESTADOS.indexOf(before)
        const toIdx = BOARD_ESTADOS.indexOf(estado)
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          newFlights.push({
            key: `${id}-${before}-${estado}-${Date.now()}`,
            name: p.nombre || `Proyecto #${id}`,
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
      return
    }

    if (newFlights.length) {
      setFlights((f) => [...f, ...newFlights].slice(-8))
      setArrived((prevSet) => {
        const s = new Set(prevSet)
        for (const id of newlyArrived) s.add(id)
        return s
      })
      const t = window.setTimeout(() => {
        setArrived((prevSet) => {
          const s = new Set(prevSet)
          for (const id of newlyArrived) s.delete(id)
          return s
        })
      }, ARRIVE_MS)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [proyectos])

  function dismissFlight(key) {
    setFlights((f) => f.filter((x) => x.key !== key))
  }

  const steps = SEGUIMIENTO_COLUMNS.length

  return (
    <div className="seguimiento">
      <header className="seguimiento-top">
        <div className="seguimiento-top__main">
          <div className="seguimiento-top__title-row">
            <h1 className="seguimiento-top__title">Seguimiento</h1>
            <span className={`seguimiento-live${live ? '' : ' seguimiento-live--off'}`}>
              <span className="seguimiento-live__dot" aria-hidden />
              {live ? 'En vivo' : 'Reconectando…'}
            </span>
            {!live && typeof onReconnectLive === 'function' ? (
              <button type="button" className="seguimiento-live-btn" onClick={onReconnectLive}>
                <span className="seguimiento-live-btn__dot" aria-hidden />
                Reintentar
              </button>
            ) : null}
          </div>
          <p className="seguimiento-top__lead muted small">
            Proyectos agrupando sus órdenes/XML. El proyecto solo avanza cuando{' '}
            <strong>todas</strong> las órdenes llegan a ese estado.
          </p>
          <p className="seguimiento-top__count muted small">
            {totalProyectos} proyecto{totalProyectos === 1 ? '' : 's'} · {totalOrdenes} orden
            {totalOrdenes === 1 ? '' : 'es'}
          </p>
        </div>
      </header>

      {loading && !proyectos.length ? (
        <div className="app-loading" style={{ minHeight: '30vh' }}>
          <div className="app-loading__spinner" aria-hidden />
          <p className="text-sm">Cargando seguimiento…</p>
        </div>
      ) : null}

      {!loading || proyectos.length ? (
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
                    <span
                      className={`${estadoTagClass(col.id)} seguimiento-col__tag`}
                      title={col.id === 'LISTO_PARA_ENTREGAR' ? 'Listo para entregar' : col.label}
                    >
                      {col.label}
                    </span>
                    <span className="seguimiento-col__count">{count}</span>
                  </h2>
                  <ul className="seguimiento-col__list">
                    {count === 0 ? (
                      <li className="seguimiento-empty muted small">Sin proyectos</li>
                    ) : (
                      (byEstado[col.id] ?? []).map((p) => {
                        const id = p.proyectoId
                        const isArrived = arrived.has(String(id))
                        const ordenes = Array.isArray(p.ordenes) ? p.ordenes : []
                        return (
                          <li
                            key={id}
                            className={`seguimiento-card seguimiento-card--proyecto${isArrived ? ' seguimiento-card--arrive' : ''}`}
                          >
                            <strong className="seguimiento-card__name" title={p.nombre || ''}>
                              {p.nombre || `Proyecto #${id}`}
                            </strong>
                            <div className="seguimiento-card__meta">
                              {p.cliente ? <span className="muted small">{p.cliente}</span> : null}
                              <span className="muted small">
                                {p.ordenesConXml ?? ordenes.filter((o) => o.biesseOrderId != null).length}/
                                {p.totalOrdenes ?? ordenes.length} con XML
                              </span>
                            </div>
                            {ordenes.length ? (
                              <ul className="seguimiento-ordenes">
                                {ordenes.map((o) => (
                                  <OrdenRow key={o.ordenId ?? `${id}-${o.biesseOrderId}`} orden={o} />
                                ))}
                              </ul>
                            ) : (
                              <p className="muted small">Sin órdenes</p>
                            )}
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
