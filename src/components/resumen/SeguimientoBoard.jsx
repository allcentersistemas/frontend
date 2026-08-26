import { useEffect, useMemo, useState } from 'react'
import * as systemApi from '../../api/systemApi'
import { ESTADOS_SEGUIMIENTO, estadoTagClass, formatEstadoProyecto } from '../../utils/proyectoOptimizacion.js'

const COLUMNS = ESTADOS_SEGUIMIENTO.map((id) => ({
  id,
  hint:
    id === 'VENDIDO'
      ? 'Vendido por el vendedor'
      : id === 'PRODUCCION'
        ? 'Sin automatizar por ahora'
        : id === 'DESPACHO'
          ? 'Automático al escanear en la app Android'
          : id === 'LISTO_PARA_ENTREGAR'
            ? 'Automático al escanear el 100% de las piezas'
            : 'Cuando se marca como entregado en Android',
}))

const VIEW_TABS = [
  { id: 'proyecto', label: 'Por proyecto' },
  { id: 'op', label: 'Por OP' },
  { id: 'xml', label: 'Por XML/obra' },
]

function formatOrderEstado(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'COMPLETADA' || e === 'COMPLETADO') return 'Completada'
  if (e === 'PRODUCCION') return 'Producción'
  if (e === 'OPTIMIZADO') return 'Optimizado'
  if (e === 'EN_PROCESO') return 'En proceso'
  if (e === 'PENDIENTE') return 'Pendiente'
  return estado || '—'
}

function orderEstadoTagClass(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'COMPLETADA' || e === 'COMPLETADO' || e === 'PRODUCCION') return 'tag tag--ok'
  if (e === 'OPTIMIZADO' || e === 'EN_PROCESO') return 'tag'
  return 'tag'
}

function heartbeatAgo(value) {
  if (!value) return null
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return null
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (sec < 5) return 'ahora'
  if (sec < 60) return `hace ${sec}s`
  const m = Math.floor(sec / 60)
  if (m < 60) return `hace ${m}m`
  return `hace ${Math.floor(m / 60)}h`
}

function machineStateTag(state) {
  const s = String(state ?? '').toUpperCase()
  if (s === 'RUN') return 'tag tag--ok'
  if (s === 'EMERGENCY') return 'tag tag--danger'
  return 'tag'
}

/**
 * @param {{
 *   proyectos?: Array<object>,
 *   ops?: Array<object>,
 *   machines?: Array<object>,
 *   cutSummary?: Array<object>,
 *   loading?: boolean,
 *   onRefresh?: () => Promise<void>|void,
 * }} props
 */
export function SeguimientoBoard({
  proyectos = [],
  ops = [],
  machines = [],
  cutSummary = [],
  loading = false,
  onRefresh,
}) {
  const [viewMode, setViewMode] = useState('proyecto')
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')
  const [expandedOp, setExpandedOp] = useState(() => new Set())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!machines.length) return undefined
    const t = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [machines.length])

  void tick

  const byEstado = useMemo(() => {
    const map = Object.fromEntries(ESTADOS_SEGUIMIENTO.map((e) => [e, []]))
    for (const p of proyectos) {
      const estado = p.estado
      if (map[estado]) map[estado].push(p)
    }
    return map
  }, [proyectos])

  const obras = useMemo(() => {
    const rows = []
    const seen = new Set()
    for (const op of ops) {
      for (const p of op.proyectos ?? []) {
        for (const o of p.ordenes ?? []) {
          const biesseId = o.biesseOrderId ?? o.biesse_order_id
          const name = o.biesseOrderName ?? o.biesse_order_name
          if (biesseId == null && !name) continue
          const key = biesseId != null ? `id:${biesseId}` : `name:${name}`
          if (seen.has(key)) continue
          seen.add(key)
          rows.push({
            key,
            biesseOrderId: biesseId,
            orderName: name || (biesseId != null ? `#${biesseId}` : '—'),
            ordenCodigo: o.codigo || (o.ordenId != null ? `Orden #${o.ordenId}` : '—'),
            ordenId: o.ordenId,
            opCodigo: op.opCodigo ?? op.op_codigo ?? '—',
            proyectoNombre: p.nombre || (p.proyectoId != null ? `Proyecto #${p.proyectoId}` : '—'),
            proyectoEstado: p.estado,
            estadoEscaneo: o.estadoEscaneo ?? o.estado_escaneo ?? null,
            porcentaje:
              typeof o.porcentaje === 'number'
                ? o.porcentaje
                : o.porcentaje != null
                  ? Number(o.porcentaje)
                  : null,
          })
        }
      }
    }
    return rows
  }, [ops])

  const cutByOrderId = useMemo(() => {
    const map = new Map()
    for (const row of cutSummary) {
      const id = row.orderid ?? row.orderId
      if (id != null) map.set(Number(id), row)
    }
    return map
  }, [cutSummary])

  const cutByName = useMemo(() => {
    const map = new Map()
    for (const row of cutSummary) {
      const name = row.ordername ?? row.orderName
      if (name) map.set(String(name).toLowerCase(), row)
    }
    return map
  }, [cutSummary])

  async function markEntregado(id) {
    setBusyId(id)
    setMsg('')
    try {
      await systemApi.markProyectoEntregado(id)
      setMsg('Proyecto marcado como entregado.')
      await onRefresh?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo marcar como entregado.')
    } finally {
      setBusyId(null)
    }
  }

  function toggleOp(opCodigo) {
    setExpandedOp((prev) => {
      const next = new Set(prev)
      if (next.has(opCodigo)) next.delete(opCodigo)
      else next.add(opCodigo)
      return next
    })
  }

  const emptyAssignHint =
    'Asigne obras Biesse en proyecto optimización para ver avance por OP o XML/obra.'

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">Seguimiento post-venta</h1>
          <p className="dash-header__lead">
            Después de <strong>Vendido</strong>: despacho (primer escaneo en Android), listo para
            entregar (100% de piezas) y entregado (marcado en Android). Producción aún no se automatiza.
          </p>
        </div>
        {onRefresh ? (
          <button type="button" className="btn btn--ghost" onClick={() => void onRefresh()} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        ) : null}
      </header>

      {machines.length > 0 ? (
        <div
          className="card pad"
          style={{
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.65rem',
            alignItems: 'center',
          }}
          aria-label="Estado de seccionadoras"
        >
          <span className="small muted" style={{ marginRight: 4 }}>
            Seccionadoras
          </span>
          {machines.map((m) => {
            const id = m.machine_id ?? m.machineId
            const online = Boolean(m.online)
            const state = m.state ?? '—'
            const job = m.job_name ?? m.jobName
            const hb = heartbeatAgo(m.last_heartbeat_at ?? m.lastHeartbeatAt)
            return (
              <span
                key={id}
                className="small"
                style={{
                  display: 'inline-flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                  border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
                  borderRadius: 8,
                  padding: '0.25rem 0.55rem',
                }}
              >
                <strong>{m.machine_name ?? m.machineName ?? `#${id}`}</strong>
                <span className={online ? 'tag tag--ok' : 'tag'}>{online ? 'Online' : 'Offline'}</span>
                <span className={machineStateTag(state)}>{state}</span>
                {job ? <span className="muted">{job}</span> : null}
                {hb ? <span className="muted">{hb}</span> : null}
              </span>
            )
          })}
        </div>
      ) : null}

      <div
        className="tabs"
        role="tablist"
        aria-label="Vista de seguimiento"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}
      >
        {VIEW_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={viewMode === t.id}
            className={viewMode === t.id ? 'btn btn--primary' : 'btn btn--ghost'}
            onClick={() => setViewMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg ? (
        <p className="muted small pad" role="status" style={{ paddingTop: 0 }}>
          {msg}
        </p>
      ) : null}

      {loading && !proyectos.length && !ops.length ? (
        <div className="app-loading" style={{ minHeight: '30vh' }}>
          <div className="app-loading__spinner" aria-hidden />
          <p className="text-sm">Cargando seguimiento…</p>
        </div>
      ) : null}

      {!loading || proyectos.length || ops.length ? (
        <>
          {viewMode === 'proyecto' ? (
            <div className="seguimiento-board">
              {COLUMNS.map((col) => (
                <section key={col.id} className="seguimiento-col card">
                  <h2 className="seguimiento-col__title">
                    <span className={estadoTagClass(col.id)}>{formatEstadoProyecto(col.id)}</span>
                    <span className="muted small">{byEstado[col.id]?.length ?? 0}</span>
                  </h2>
                  <p className="muted small seguimiento-col__hint">{col.hint}</p>
                  <ul className="seguimiento-col__list">
                    {(byEstado[col.id] ?? []).length === 0 ? (
                      <li className="muted small">Sin proyectos</li>
                    ) : (
                      (byEstado[col.id] ?? []).map((p) => (
                        <li key={p.id} className="seguimiento-card">
                          <strong>{p.nombre || `Proyecto #${p.id}`}</strong>
                          <span className="muted small">{p.cliente || 'Sin cliente'}</span>
                          {col.id === 'LISTO_PARA_ENTREGAR' ? (
                            <button
                              type="button"
                              className="btn btn--sm btn--primary"
                              disabled={busyId === p.id}
                              onClick={() => void markEntregado(p.id)}
                            >
                              {busyId === p.id ? '…' : 'Marcar entregado'}
                            </button>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}

          {viewMode === 'op' ? (
            <div className="stack gap-3" style={{ paddingTop: 0 }}>
              {!ops.length ? (
                <div className="card pad">
                  <p style={{ margin: 0 }}>No hay OPs vinculadas a proyectos en seguimiento.</p>
                  <p className="muted small" style={{ margin: '0.5rem 0 0' }}>
                    {emptyAssignHint}
                  </p>
                </div>
              ) : (
                <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {ops.map((op) => {
                    const key = op.opCodigo || op.op_codigo || '—'
                    const open = expandedOp.has(key)
                    const pct =
                      typeof op.porcentaje === 'number'
                        ? op.porcentaje
                        : op.porcentaje != null
                          ? Number(op.porcentaje)
                          : null
                    return (
                      <li key={key} className="card pad">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                            textAlign: 'left',
                            gap: 12,
                          }}
                          onClick={() => toggleOp(key)}
                          aria-expanded={open}
                        >
                          <span>
                            <strong>OP {key}</strong>
                            <span className="muted small" style={{ marginLeft: 8 }}>
                              {(op.proyectos ?? []).length} proyecto(s)
                              {op.totalObrasBiesse != null || op.total_obras_biesse != null
                                ? ` · ${op.totalObrasBiesse ?? op.total_obras_biesse} obra(s)`
                                : ''}
                            </span>
                          </span>
                          <span className="small">
                            {pct != null && !Number.isNaN(pct) ? `${pct}%` : '—'}
                            {op.avanceLabel || op.avance_label ? (
                              <span className="muted"> · {op.avanceLabel || op.avance_label}</span>
                            ) : null}
                            <span className="muted" style={{ marginLeft: 8 }}>
                              {open ? '▾' : '▸'}
                            </span>
                          </span>
                        </button>
                        {open ? (
                          <ul
                            className="stack gap-2"
                            style={{ listStyle: 'none', padding: '0.75rem 0 0', margin: 0 }}
                          >
                            {(op.proyectos ?? []).map((p) => (
                              <li key={p.proyectoId} className="seguimiento-card" style={{ border: 'none' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                  <strong>{p.nombre || `Proyecto #${p.proyectoId}`}</strong>
                                  <span className={estadoTagClass(p.estado)}>
                                    {formatEstadoProyecto(p.estado)}
                                  </span>
                                </div>
                                <span className="muted small">{p.cliente || 'Sin cliente'}</span>
                                <ul className="small" style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                                  {(p.ordenes ?? []).map((o) => (
                                    <li key={o.ordenId}>
                                      {o.codigo || `Orden #${o.ordenId}`}
                                      {o.biesseOrderName || o.biesse_order_name ? (
                                        <span className="muted">
                                          {' '}
                                          → {o.biesseOrderName || o.biesse_order_name}
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                                {p.estado === 'LISTO_PARA_ENTREGAR' ? (
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--primary"
                                    style={{ marginTop: 6 }}
                                    disabled={busyId === p.proyectoId}
                                    onClick={() => void markEntregado(p.proyectoId)}
                                  >
                                    {busyId === p.proyectoId ? '…' : 'Marcar entregado'}
                                  </button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {viewMode === 'xml' ? (
            <div className="card">
              {!obras.length ? (
                <div className="pad">
                  <p style={{ margin: 0 }}>No hay obras Biesse (XML) vinculadas.</p>
                  <p className="muted small" style={{ margin: '0.5rem 0 0' }}>
                    {emptyAssignHint}
                  </p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Obra / XML</th>
                        <th>OP</th>
                        <th>Proyecto</th>
                        <th>Estado escaneo</th>
                        <th>Avance</th>
                        <th>Tiempo corte</th>
                        <th>Orden</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obras.map((row) => {
                        const cut =
                          (row.biesseOrderId != null ? cutByOrderId.get(Number(row.biesseOrderId)) : null) ||
                          cutByName.get(String(row.orderName).toLowerCase()) ||
                          null
                        const pct =
                          row.porcentaje != null && !Number.isNaN(row.porcentaje)
                            ? row.porcentaje
                            : cut?.porcentaje != null
                              ? Number(cut.porcentaje)
                              : null
                        return (
                          <tr key={row.key}>
                            <td className="small">
                              <strong>{row.orderName}</strong>
                              {row.biesseOrderId != null ? (
                                <div className="muted">#{row.biesseOrderId}</div>
                              ) : null}
                            </td>
                            <td className="small">{row.opCodigo}</td>
                            <td className="small">
                              {row.proyectoNombre}
                              {row.proyectoEstado ? (
                                <div>
                                  <span className={estadoTagClass(row.proyectoEstado)}>
                                    {formatEstadoProyecto(row.proyectoEstado)}
                                  </span>
                                </div>
                              ) : null}
                            </td>
                            <td className="small">
                              <span className={orderEstadoTagClass(row.estadoEscaneo)}>
                                {formatOrderEstado(row.estadoEscaneo)}
                              </span>
                            </td>
                            <td className="small">
                              {pct != null && !Number.isNaN(pct) ? `${pct}%` : '—'}
                            </td>
                            <td className="small muted">
                              {cut?.total_duration_label || cut?.totalDurationLabel || '—'}
                            </td>
                            <td className="small muted">{row.ordenCodigo}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
