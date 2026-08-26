import { useMemo, useState } from 'react'
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

/**
 * @param {{
 *   proyectos?: Array<object>,
 *   ops?: Array<object>,
 *   onRefresh?: () => Promise<void>|void,
 * }} props
 */
export function SeguimientoBoard({ proyectos = [], ops = [], onRefresh }) {
  const [viewMode, setViewMode] = useState('proyecto')
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')
  const [expandedOp, setExpandedOp] = useState(() => new Set())

  const byEstado = useMemo(() => {
    const map = Object.fromEntries(ESTADOS_SEGUIMIENTO.map((e) => [e, []]))
    for (const p of proyectos) {
      const estado = p.estado
      if (map[estado]) map[estado].push(p)
    }
    return map
  }, [proyectos])

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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="small muted" htmlFor="seguimiento-view">
            Vista
          </label>
          <select
            id="seguimiento-view"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="proyecto">Por proyecto</option>
            <option value="op">Por OP</option>
          </select>
        </div>
      </header>
      {msg ? (
        <p className="muted small pad" role="status">
          {msg}
        </p>
      ) : null}

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
      ) : (
        <div className="stack gap-3 pad" style={{ paddingTop: 0 }}>
          {!ops.length ? (
            <p className="muted">
              No hay órdenes vinculadas a una OP. Asigna obras Biesse desde el detalle del proyecto.
            </p>
          ) : (
            <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {ops.map((op) => {
                const key = op.opCodigo || '—'
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
                          {op.totalObrasBiesse != null ? ` · ${op.totalObrasBiesse} obra(s)` : ''}
                        </span>
                      </span>
                      <span className="small">
                        {pct != null && !Number.isNaN(pct) ? `${pct}%` : '—'}
                        {op.avanceLabel ? (
                          <span className="muted"> · {op.avanceLabel}</span>
                        ) : null}
                        <span className="muted" style={{ marginLeft: 8 }}>
                          {open ? '▾' : '▸'}
                        </span>
                      </span>
                    </button>
                    {open ? (
                      <ul className="stack gap-2" style={{ listStyle: 'none', padding: '0.75rem 0 0', margin: 0 }}>
                        {(op.proyectos ?? []).map((p) => (
                          <li key={p.proyectoId} className="seguimiento-card" style={{ border: 'none' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                              <strong>{p.nombre || `Proyecto #${p.proyectoId}`}</strong>
                              <span className={estadoTagClass(p.estado)}>{formatEstadoProyecto(p.estado)}</span>
                            </div>
                            <span className="muted small">{p.cliente || 'Sin cliente'}</span>
                            <ul className="small" style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                              {(p.ordenes ?? []).map((o) => (
                                <li key={o.ordenId}>
                                  {o.codigo || `Orden #${o.ordenId}`}
                                  {o.biesseOrderName ? (
                                    <span className="muted"> → {o.biesseOrderName}</span>
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
      )}
    </div>
  )
}
