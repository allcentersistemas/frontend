import { useEffect, useMemo, useRef, useState } from 'react'
import { formatAppDateTime, formatDurationInEstado, parseAppDateTime } from '../../utils/appDateTime.js'
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

const OBRA_ESTADOS = new Set(['OPTIMIZADO', 'PRODUCCION', 'DESPACHO', 'LISTO_PARA_ENTREGAR', 'ENTREGADO'])

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

function limaTodayKey() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return null
  }
}

function isSameLimaDay(value, dayKey) {
  if (!dayKey) return true
  const d = parseAppDateTime(value)
  if (!d) return false
  try {
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
    return key === dayKey
  } catch {
    return false
  }
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

/** Orden anidada dentro de card de proyecto (fase comercial). */
function OrdenRow({ orden, nowTick }) {
  const hasXml = orden.biesseOrderId != null
  const estado = hasXml ? normalizeEstado(orden.estadoEscaneo) : null
  const name =
    orden.biesseOrderName || orden.codigo || (orden.ordenId != null ? `Orden #${orden.ordenId}` : 'Orden')
  const estadoDesde = orden.estadoDesde ?? orden.estado_desde ?? null
  const enEstado = hasXml ? formatDurationInEstado(estadoDesde, new Date(nowTick)) : ''
  const desdeLabel = formatAppDateTime(estadoDesde, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

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
          <span className="tag seguimiento-orden__tag">Sin XML</span>
        )}
      </div>
      <div className="seguimiento-orden__meta">
        {orden.codigo ? <span className="muted small">{orden.codigo}</span> : null}
        {orden.opCodigo ? <span className="muted small">OP {orden.opCodigo}</span> : null}
      </div>
      {enEstado ? (
        <p className="seguimiento-orden__tiempo">
          En XML · <strong>{enEstado}</strong>
          {desdeLabel && desdeLabel !== '—' ? <span className="muted"> · {desdeLabel}</span> : null}
        </p>
      ) : !hasXml ? (
        <p className="seguimiento-orden__tiempo muted">Falta anidar XML</p>
      ) : null}
    </li>
  )
}

/** Card de XML en columnas de obra (Optimizado → Entregado). */
function XmlCard({ item, nowTick, arrived }) {
  const { proyecto, orden, estado } = item
  const name =
    orden.biesseOrderName || orden.codigo || (orden.ordenId != null ? `Orden #${orden.ordenId}` : 'XML')
  const estadoDesde = orden.estadoDesde ?? orden.estado_desde ?? null
  const enEstado = formatDurationInEstado(estadoDesde, new Date(nowTick))
  const desdeLabel = formatAppDateTime(estadoDesde, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const flightKey = String(orden.ordenId ?? orden.biesseOrderId)
  const isArrived = arrived.has(flightKey)

  return (
    <li
      className={`seguimiento-card seguimiento-card--xml${isArrived ? ' seguimiento-card--arrive' : ''}`}
    >
      <div className="seguimiento-card__head">
        <strong className="seguimiento-card__name" title={name}>
          {name}
        </strong>
        <span className={`${estadoTagClass(estado)} seguimiento-card__estado`}>
          {formatEstadoProyecto(estado)}
        </span>
      </div>
      <div className="seguimiento-card__meta">
        <span className="muted small" title={proyecto.nombre || ''}>
          {proyecto.nombre || `Proyecto #${proyecto.proyectoId}`}
        </span>
        {proyecto.cliente ? <span className="muted small">{proyecto.cliente}</span> : null}
        {orden.opCodigo ? <span className="muted small">OP {orden.opCodigo}</span> : null}
        {orden.seccionador ? <span className="muted small">Secc. {orden.seccionador}</span> : null}
      </div>
      {enEstado ? (
        <p
          className="seguimiento-card__tiempo"
          title={desdeLabel && desdeLabel !== '—' ? `Desde ${desdeLabel}` : undefined}
        >
          En este estado · <strong>{enEstado}</strong>
          {desdeLabel && desdeLabel !== '—' ? (
            <span className="muted"> · desde {desdeLabel}</span>
          ) : null}
        </p>
      ) : null}
      <ProgressRow label="Escaneo" pct={orden.porcentaje} detail={orden.avanceLabel || null} tone="scan" />
      <ProgressRow
        label="Cortes"
        pct={orden.porcentajeCorte}
        detail={orden.avanceCorteLabel || null}
        tone="cut"
      />
    </li>
  )
}

function ProyectoCard({ proyecto, nowTick, arrived }) {
  const id = proyecto.proyectoId
  const isArrived = arrived.has(`p-${id}`)
  const ordenes = Array.isArray(proyecto.ordenes) ? proyecto.ordenes : []
  const estadoDesde = proyecto.estadoDesde ?? proyecto.estado_desde ?? null
  const enEstado = formatDurationInEstado(estadoDesde, new Date(nowTick))
  const desdeLabel = formatAppDateTime(estadoDesde, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const estado = normalizeEstado(proyecto.estado)

  return (
    <li
      className={`seguimiento-card seguimiento-card--proyecto${isArrived ? ' seguimiento-card--arrive' : ''}`}
    >
      <div className="seguimiento-card__head">
        <strong className="seguimiento-card__name" title={proyecto.nombre || ''}>
          {proyecto.nombre || `Proyecto #${id}`}
        </strong>
        <span className={`${estadoTagClass(estado)} seguimiento-card__estado`}>
          {formatEstadoProyecto(estado)}
        </span>
      </div>
      {enEstado ? (
        <p className="seguimiento-card__tiempo" title={desdeLabel ? `Desde ${desdeLabel}` : undefined}>
          En estado · <strong>{enEstado}</strong>
          {desdeLabel ? <span className="muted"> · desde {desdeLabel}</span> : null}
        </p>
      ) : null}
      <div className="seguimiento-card__meta">
        {proyecto.cliente ? <span className="muted small">{proyecto.cliente}</span> : null}
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
              nowTick={nowTick}
            />
          ))}
        </ul>
      ) : (
        <p className="muted small">Sin órdenes</p>
      )}
    </li>
  )
}

/**
 * Tablero híbrido:
 * - Comercial (Enviado→Vendido): cards de **proyecto**
 * - Obra (Optimizado→Entregado): cards de **XML** (el agente mueve el XML)
 */
export function SeguimientoBoard({ proyectos = [], loading = false, live = false, onReconnectLive }) {
  const prevXmlEstadosRef = useRef(new Map())
  const primedRef = useRef(false)
  const rootRef = useRef(null)
  const [flights, setFlights] = useState([])
  const [arrived, setArrived] = useState(() => new Set())
  const [fullscreen, setFullscreen] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const todayKey = useMemo(() => limaTodayKey(), [nowTick])

  /** Proyectos en columnas comerciales. */
  const proyectosByEstado = useMemo(() => {
    const map = Object.fromEntries(
      BOARD_ESTADOS.filter((e) => COL_PHASE[e] === 'comercial').map((e) => [e, []]),
    )
    for (const p of proyectos) {
      const estado = normalizeEstado(p.estado)
      if (map[estado]) map[estado].push(p)
    }
    return map
  }, [proyectos])

  /** XMLs planos en columnas de obra (según estado_escaneo). */
  const xmlByEstado = useMemo(() => {
    const map = Object.fromEntries(
      BOARD_ESTADOS.filter((e) => COL_PHASE[e] === 'obra').map((e) => [e, []]),
    )
    for (const p of proyectos) {
      const ordenes = Array.isArray(p.ordenes) ? p.ordenes : []
      for (const orden of ordenes) {
        if (orden?.biesseOrderId == null) continue
        let estado = normalizeEstado(orden.estadoEscaneo)
        if (!OBRA_ESTADOS.has(estado)) {
          // Estados raros / comerciales en XML: tratar como optimizado operativo.
          estado = 'OPTIMIZADO'
        }
        if (estado === 'ENTREGADO') {
          const desde = orden.estadoDesde ?? orden.estado_desde
          if (desde && !isSameLimaDay(desde, todayKey)) {
            continue
          }
        }
        map[estado]?.push({
          key: `${p.proyectoId}-${orden.ordenId ?? orden.biesseOrderId}`,
          proyecto: p,
          orden,
          estado,
        })
      }
    }
    return map
  }, [proyectos, todayKey])

  const totalProyectos = proyectos.length
  const totalXml = useMemo(
    () =>
      Object.values(xmlByEstado).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0),
    [xmlByEstado],
  )

  useEffect(() => {
    const prev = prevXmlEstadosRef.current
    const next = new Map()
    const newFlights = []
    const newlyArrived = []

    for (const list of Object.values(xmlByEstado)) {
      for (const item of list) {
        const id = String(item.orden.ordenId ?? item.orden.biesseOrderId)
        next.set(id, item.estado)
        if (!primedRef.current) continue
        const before = prev.get(id)
        if (before && before !== item.estado) {
          const fromIdx = BOARD_ESTADOS.indexOf(before)
          const toIdx = BOARD_ESTADOS.indexOf(item.estado)
          if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
            const name =
              item.orden.biesseOrderName ||
              item.orden.codigo ||
              item.proyecto.nombre ||
              `XML #${id}`
            newFlights.push({
              key: `${id}-${before}-${item.estado}-${Date.now()}`,
              name,
              fromIdx,
              toIdx,
            })
            newlyArrived.push(id)
          }
        }
      }
    }

    prevXmlEstadosRef.current = next
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
  }, [xmlByEstado])

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
    void el.requestFullscreen().catch(() => {})
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
            <strong>Comercial</strong> (hasta Vendido): cards de <strong>proyecto</strong>.{' '}
            <strong>Obra</strong> (Optimizado→Entregado): cards de <strong>XML</strong> — el agente
            mueve cada XML a Producción; el proyecto CRM avanza solo cuando{' '}
            <em>todos</em> sus XML llegan.
            {fullscreen ? (
              <>
                {' '}
                <span className="seguimiento-fs-hint">Esc para salir.</span>
              </>
            ) : null}
          </p>
          <p className="seguimiento-top__count muted small">
            {totalProyectos} proyecto{totalProyectos === 1 ? '' : 's'} · {totalXml} XML en obra
          </p>
        </div>
        <div className="seguimiento-top__aside">
          <div className="seguimiento-legend" aria-hidden>
            <span className="seguimiento-legend__item seguimiento-legend__item--comercial">
              Comercial = proyecto
            </span>
            <span className="seguimiento-legend__item seguimiento-legend__item--obra">
              Obra = XML
            </span>
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
              const isObra = col.phase === 'obra'
              const list = isObra ? xmlByEstado[col.id] ?? [] : proyectosByEstado[col.id] ?? []
              const count = list.length
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
                          ? 'XML entregados solo del día'
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
                      ? 'XML · solo hoy'
                      : col.id === 'COTIZADO'
                        ? 'Proyectos · 5 días'
                        : isObra
                          ? 'Por XML'
                          : 'Por proyecto'}
                  </p>
                  <ul className="seguimiento-col__list">
                    {count === 0 ? (
                      <li className="seguimiento-empty muted small">Vacío</li>
                    ) : isObra ? (
                      list.map((item) => (
                        <XmlCard
                          key={item.key}
                          item={item}
                          nowTick={nowTick}
                          arrived={arrived}
                        />
                      ))
                    ) : (
                      list.map((p) => (
                        <ProyectoCard
                          key={p.proyectoId}
                          proyecto={p}
                          nowTick={nowTick}
                          arrived={arrived}
                        />
                      ))
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
