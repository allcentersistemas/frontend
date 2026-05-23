import { useEffect, useState } from 'react'
import * as biesseApi from '../api/biesseApi'
import { ModuleFilterGrid, ModuleListCard } from '../components/module/ModuleChrome.jsx'
import { auditPick } from '../utils/auditDisplay.js'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Contenido de auditoría Biesse embebido en Órdenes (misma página, pestaña). */
export function OrderAuditPanel() {
  const [filters, setFilters] = useState({ orderId: '', partId: '', action: '' })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await biesseApi.listBiesseAudit({
          orderId: filters.orderId.trim() || undefined,
          partId: filters.partId.trim() || undefined,
          action: filters.action.trim() || undefined,
          limit: 200,
        })
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'No se pudo cargar auditoría de órdenes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filters.orderId, filters.partId, filters.action])

  const toolbar = (
    <ModuleFilterGrid>
      <label className="field">
        <span className="small">Orden</span>
        <input
          inputMode="numeric"
          value={filters.orderId}
          onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))}
          placeholder="orderId"
        />
      </label>
      <label className="field">
        <span className="small">Parte</span>
        <input
          inputMode="numeric"
          value={filters.partId}
          onChange={(e) => setFilters((s) => ({ ...s, partId: e.target.value }))}
          placeholder="partId"
        />
      </label>
      <label className="field">
        <span className="small">Acción</span>
        <input
          value={filters.action}
          onChange={(e) => setFilters((s) => ({ ...s, action: e.target.value }))}
          placeholder="ESCANEAR, UPDATE…"
        />
      </label>
      <div className="field" style={{ justifyContent: 'flex-end' }}>
        <span className="small" style={{ visibility: 'hidden' }}>
          .
        </span>
        <button type="button" className="btn btn--ghost" onClick={() => setFilters({ orderId: '', partId: '', action: '' })}>
          Limpiar
        </button>
      </div>
    </ModuleFilterGrid>
  )

  return (
    <>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h2 className="card__title">Auditoría de órdenes</h2>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Trazabilidad contextual de escaneos y cambios registrados para órdenes Biesse.
        </p>
      </div>

      <ModuleListCard title="Eventos" error={err} loading={loading} toolbar={toolbar}>
        {!loading ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Orden</th>
                    <th>Parte</th>
                    <th>Usuario</th>
                    <th>Equipo</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id ?? `${row.orderid}-${row.partid}-${index}`}>
                      <td className="small">
                        {formatDateTime(row.occurred_at ?? row.occurredAt ?? row.fecha ?? row.created_at)}
                      </td>
                      <td>{row.action ?? row.accion ?? '—'}</td>
                      <td className="small">{row.orderid ?? row.orderId ?? '—'}</td>
                      <td className="small">{row.partid ?? row.partId ?? '—'}</td>
                      <td className="small" title={String(auditPick(row, 'usuarioid', 'usuarioId') ?? '')}>
                        {auditPick(row, 'usuarioid', 'usuarioId') != null
                          ? `#${auditPick(row, 'usuarioid', 'usuarioId')}`
                          : '—'}
                      </td>
                      <td className="small" title={String(auditPick(row, 'equipo') ?? '')}>
                        {auditPick(row, 'equipo') ?? '—'}
                      </td>
                      <td className="small">{auditPick(row, 'metodo') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length ? <p className="muted pad">Sin auditoría para los filtros actuales.</p> : null}
          </>
        ) : null}
      </ModuleListCard>
    </>
  )
}
