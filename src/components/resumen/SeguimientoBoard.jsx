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

export function SeguimientoBoard({ proyectos = [], onRefresh }) {
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')

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
      </header>
      {msg ? (
        <p className="muted small pad" role="status">
          {msg}
        </p>
      ) : null}
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
    </div>
  )
}
