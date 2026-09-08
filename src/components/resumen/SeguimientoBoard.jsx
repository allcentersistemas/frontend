import { useEffect, useMemo, useRef, useState } from 'react'
import { estadoTagClass, formatEstadoProyecto } from '../../utils/proyectoOptimizacion.js'

const FLIGHT_MS = 1600
const ARRIVE_MS = 2200

/** Pipeline completo: comercial + producción. */
const BOARD_ESTADOS = [
  'ENVIADO',
  'EN_ATENCION',
  'COTIZADO',
  'VENDIDO',
  'OPTIMIZADO',
  'PRODUCCION',
  'DESPACHO',
  'LISTO_PARA_ENTREGAR',
  'ENTREGADO',
]

const COL_LABEL = {
  ENVIADO: 'Enviado',
  EN_ATENCION: 'Atención',
  COTIZADO: 'Cotizado',
  VENDIDO: 'Vendido',
  OPTIMIZADO: 'Optimizado',
  PRODUCCION: 'Producción',
  DESPACHO: 'Despacho',
  LISTO_PARA_ENTREGAR: 'Listo',
  ENTREGADO: 'Hoy',
}

const COL_PHASE = {
  ENVIADO: 'comercial',
  EN_ATENCION: 'comercial',
  COTIZADO: 'comercial',
  VENDIDO: 'comercial',
  OPTIMIZADO: 'obra',
  PRODUCCION: 'obra',
  DESPACHO: 'obra',
  LISTO_PARA_ENTREGAR: 'obra',
  ENTREGADO: 'obra',
}

const SEGUIMIENTO_COLUMNS = BOARD_ESTADOS.map((id) => ({
  id,
  label: COL_LABEL[id] ?? id,
  phase: COL_PHASE[id] ?? 'obra',
}))

function normalizeEstado(raw) {
  const e = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (e === 'ENVIANDO') return 'ENVIADO'
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

function OrdenRow({ orden, proyectoEstado }) {
  const hasXml = orden.biesseOrderId != null
  const estado = hasXml ? normalizeEstado(orden.estadoEscaneo) : null
  const name =
    orden.biesseOrderName || orden.codigo || (orden.ordenId != null ? `Orden #${orden.ordenId}` : 'Orden')
  const proj = normalizeEstado(proyectoEstado)
  const showProgress = hasXml && BOARD_ESTADOS.indexOf(proj) >= BOARD_ESTADOS.indexOf('VENDIDO')

  return (
    <li className="seguimiento-orden">
      <div className="seguimiento-orden__head">
        <strong className="seguimiento-orden__name" title={name}>
          {name}
        </strong>
        {estado ? (
          <span className={`${estadoTagClass(estado)} seguimiento-orden__tag`}>
            {formatEstadoProyecto(estado)}
          </span>
        ) : (
          <span className="tag seguimiento-orden__tag">Pendiente</span>
        )}
      </div>
      <div className="seguimiento-orden__meta">
        {orden.codigo ? <span className="muted small">{orden.codigo}</span> : null}
        {orden.opCodigo ? <span className="muted small">OP {orden.opCodigo}</span> : null}
        {orden.seccionador ? <span className="muted small">Secc. {orden.seccionador}</span> : null}
      </div>
      {showProgress ? (
        <>
          <ProgressRow label="Escaneo" pct={orden.porcentaje} detail={orden.avanceLabel || null} tone="scan" />
          <ProgressRow
            label="Cortes"
            pct={orden.porcentajeCorte}
            detail={orden.avanceCorteLabel || null}
            tone="cut"
          />
        </>
      ) : null}
    </li>
  )
}

/**
 * Tablero Seguimiento: ENVIADO → ENTREGADO.
 * Columna = estado del proyecto (cuello de botella); dentro, estado por orden/XML.
 */
export function SeguimientoBoard({ proyectos = [], loading = false, live = false, onReconnectLive }) {
  const prevEstadosRef = useRef(new Map())
  const primedRef = useRef(false)
  const rootRef = useRef(null)
  const [flights, setFlights] = useState([])
  const [arrived, setArrived] = useState(() => new Set())
  const [fullscreen, setFullscreen] = useState(false)

  const byEstado = useMemo(() => {
    const map = Object.fromEntries(BOARD_ESTADOS.map((e) => [e, []]))
    for (const p of proyectos) {
      const estado = normalizeEstado(p.estado)
      if (map[estado]) map[estado].push(p)
      else if (map.ENVIADO) map.ENVIADO.push(p)
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

  useEffect(() => {
    if (!fullscreen) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event) {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fullscreen])

  useEffect(() => {
    if (!fullscreen) return undefined
    const el = rootRef.current
    if (!el || typeof el.requestFullscreen !== 'function') return undefined
    let cancelled = false
    void el.requestFullscreen().catch(() => {
      /* CSS fullscreen sigue activo si el navegador bloquea la API nativa */
    })
    function onFsChange() {
      if (cancelled) return
      if (!document.fullscreenElement) setFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      cancelled = true
      document.removeEventListener('fullscreenchange', onFsChange)
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [fullscreen])

  function dismissFlight(key) {
    setFlights((f) => f.filter((x) => x.key !== key))
  }

  function toggleFullscreen() {
    setFullscreen((v) => !v)
  }

  const steps = SEGUIMIENTO_COLUMNS.length

  return (
    <div
      ref={rootRef}
      className={`seguimiento${fullscreen ? ' seguimiento--fullscreen' : ''}`}
    >
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
            <button
              type="button"
              className="seguimiento-fs-btn"
              onClick={toggleFullscreen}
              aria-pressed={fullscreen}
              title={fullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
            >
              {fullscreen ? 'Salir' : 'Pantalla completa'}
            </button>
          </div>
          <p className="seguimiento-top__lead muted small">
            De <strong>Enviado</strong> a <strong>Entregado</strong>. El proyecto avanza cuando{' '}
            <strong>todas</strong> las órdenes llegan; cada orden muestra su avance de obra/XML.
            En <strong>Hoy</strong> solo aparecen entregas del día.
            {fullscreen ? (
              <>
                {' '}
                <span className="seguimiento-fs-hint">Esc para salir.</span>
              </>
            ) : null}
          </p>
          <p className="seguimiento-top__count muted small">
            {totalProyectos} proyecto{totalProyectos === 1 ? '' : 's'} · {totalOrdenes} orden
            {totalOrdenes === 1 ? '' : 'es'}
          </p>
        </div>
        <div className="seguimiento-top__aside">
          <div className="seguimiento-legend" aria-hidden>
            <span className="seguimiento-legend__item seguimiento-legend__item--comercial">Comercial</span>
            <span className="seguimiento-legend__item seguimiento-legend__item--obra">Obra / XML</span>
          </div>
        </div>
      </header>

      {loading && !proyectos.length ? (
        <div className="app-loading" style={{ minHeight: '30vh' }}>
          <div className="app-loading__spinner" aria-hidden />
          <p className="text-sm">Cargando seguimiento…</p>
        </div>
      ) : null}

      {!loading || proyectos.length ? (
        <div className="seguimiento-track">
          <div className="seguimiento-rail" aria-hidden={flights.length === 0}>
            <div className="seguimiento-rail__line" />
            <div className="seguimiento-rail__stops">
              {SEGUIMIENTO_COLUMNS.map((col) => (
                <div
                  key={col.id}
                  className={`seguimiento-rail__stop seguimiento-rail__stop--${col.phase}`}
                >
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

          <div className="seguimiento-board seguimiento-board--full">
            {SEGUIMIENTO_COLUMNS.map((col) => {
              const count = byEstado[col.id]?.length ?? 0
              return (
                <section
                  key={col.id}
                  className={`seguimiento-col seguimiento-col--${col.id.toLowerCase()} seguimiento-col--phase-${col.phase}`}
                >
                  <h2 className="seguimiento-col__title">
                    <span
                      className={`${estadoTagClass(col.id)} seguimiento-col__tag`}
                      title={
                        col.id === 'ENTREGADO'
                          ? 'Entregados solo del día de hoy'
                          : col.id === 'LISTO_PARA_ENTREGAR'
                            ? 'Listo para entregar'
                            : col.label
                      }
                    >
                      {col.id === 'ENTREGADO' ? 'Entregado' : col.label}
                    </span>
                    <span className="seguimiento-col__count">{count}</span>
                  </h2>
                  <p className="seguimiento-col__phase muted">
                    {col.id === 'ENTREGADO'
                      ? 'Solo hoy'
                      : col.phase === 'comercial'
                        ? 'Proyecto'
                        : 'Órdenes / XML'}
                  </p>
                  <ul className="seguimiento-col__list">
                    {count === 0 ? (
                      <li className="seguimiento-empty muted small">Vacío</li>
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
                            <div className="seguimiento-card__head">
                              <strong className="seguimiento-card__name" title={p.nombre || ''}>
                                {p.nombre || `Proyecto #${id}`}
                              </strong>
                              <span
                                className={`${estadoTagClass(normalizeEstado(p.estado))} seguimiento-card__estado`}
                              >
                                {formatEstadoProyecto(normalizeEstado(p.estado))}
                              </span>
                            </div>
                            <div className="seguimiento-card__meta">
                              {p.cliente ? <span className="muted small">{p.cliente}</span> : null}
                              <span className="muted small">
                                {ordenes.length} orden{ordenes.length === 1 ? '' : 'es'}
                              </span>
                            </div>
                            {ordenes.length ? (
                              <ul className="seguimiento-ordenes">
                                {ordenes.map((o) => (
                                  <OrdenRow
                                    key={o.ordenId ?? `${id}-${o.biesseOrderId}`}
                                    orden={o}
                                    proyectoEstado={p.estado}
                                  />
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
        </div>
      ) : null}
    </div>
  )
}
