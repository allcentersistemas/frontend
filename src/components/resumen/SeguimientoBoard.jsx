import { useMemo, useState } from 'react'
import * as systemApi from '../../api/systemApi'
import { ESTADOS_SEGUIMIENTO, estadoTagClass, formatEstadoProyecto } from '../../utils/proyectoOptimizacion.js'

const COLUMN_HINTS = {
  OPTIMIZADO: 'Obra Biesse / XML importado (optimizado)',
  PRODUCCION: 'Automático al iniciar corte en seccionadora',
  DESPACHO: 'Automático al escanear en la app Android',
  LISTO_PARA_ENTREGAR: 'Automático al escanear el 100% de las piezas',
  ENTREGADO: 'Cuando se marca como entregado en Android',
}

const COLUMNS = ESTADOS_SEGUIMIENTO.map((id) => ({
  id,
  hint: COLUMN_HINTS[id] ?? '',
}))

/**
 * @param {{
 *   proyectos?: Array<object>,
 *   loading?: boolean,
 *   onRefresh?: () => Promise<void>|void,
 * }} props
 */
export function SeguimientoBoard({ proyectos = [], loading = false, onRefresh }) {
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
            Flujo operativo:{' '}
            <strong>Optimizado</strong> → Producción → Despacho → Listo para entregar → Entregado.
          </p>
        </div>
        {onRefresh ? (
          <button type="button" className="btn btn--ghost" onClick={() => void onRefresh()} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        ) : null}
      </header>

      {msg ? (
        <p className="muted small pad" role="status" style={{ paddingTop: 0 }}>
          {msg}
        </p>
      ) : null}

      {loading && !proyectos.length ? (
        <div className="app-loading" style={{ minHeight: '30vh' }}>
          <div className="app-loading__spinner" aria-hidden />
          <p className="text-sm">Cargando seguimiento…</p>
        </div>
      ) : null}

      {!loading || proyectos.length ? (
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
    </div>
  )
}
