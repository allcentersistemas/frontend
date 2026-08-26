import { useMemo, useState } from 'react'
import * as systemApi from '../../api/systemApi'
import { ESTADOS_SEGUIMIENTO, estadoTagClass, formatEstadoProyecto } from '../../utils/proyectoOptimizacion.js'

const COLUMN_HINTS = {
  OPTIMIZADO: 'Cuando el sync sube el XML (import Appscanner)',
  PRODUCCION: 'Cuando el agente CNC detecta el nombre del XML',
  DESPACHO: 'Cuando se empieza a escanear piezas en Android',
  LISTO_PARA_ENTREGAR: 'Cuando el escaneo llega al 100%',
  ENTREGADO: 'Cuando se marca como entregado (app o portal)',
}

const COLUMNS = ESTADOS_SEGUIMIENTO.map((id) => ({
  id,
  hint: COLUMN_HINTS[id] ?? '',
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

/**
 * @param {{
 *   obras?: Array<object>,
 *   loading?: boolean,
 *   onRefresh?: () => Promise<void>|void,
 * }} props
 */
export function SeguimientoBoard({ obras = [], loading = false, onRefresh }) {
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')

  const byEstado = useMemo(() => {
    const map = Object.fromEntries(ESTADOS_SEGUIMIENTO.map((e) => [e, []]))
    for (const o of obras) {
      const estado = normalizeObraEstado(o.estadoEscaneo ?? o.estado_escaneo ?? o.estado)
      if (map[estado]) map[estado].push(o)
    }
    return map
  }, [obras])

  async function markEntregado(orderId) {
    setBusyId(orderId)
    setMsg('')
    try {
      await systemApi.markObraEntregado(orderId)
      setMsg('Obra marcada como entregada.')
      await onRefresh?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo marcar como entregada.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">Seguimiento por XML</h1>
          <p className="dash-header__lead">
            Trazabilidad de obra Biesse:{' '}
            <strong>Optimizado</strong> → Producción → Despacho → Listo para entrega → Entregado.
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

      {loading && !obras.length ? (
        <div className="app-loading" style={{ minHeight: '30vh' }}>
          <div className="app-loading__spinner" aria-hidden />
          <p className="text-sm">Cargando seguimiento…</p>
        </div>
      ) : null}

      {!loading || obras.length ? (
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
                        {col.id === 'LISTO_PARA_ENTREGAR' ? (
                          <button
                            type="button"
                            className="btn btn--sm btn--primary"
                            disabled={busyId === id}
                            onClick={() => void markEntregado(id)}
                          >
                            {busyId === id ? '…' : 'Marcar entregado'}
                          </button>
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
