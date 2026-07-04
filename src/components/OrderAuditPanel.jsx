import { useEffect, useMemo, useState } from 'react'
import * as biesseApi from '../api/biesseApi'
import * as systemApi from '../api/systemApi'
import { ModuleFilterGrid, ModuleListCard } from '../components/module/ModuleChrome.jsx'
import { auditPick } from '../utils/auditDisplay.js'
import { biesseActorLabel, parseBiesseAuditDetails } from '../utils/biesseAuditParse.js'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Contenido de auditoría Biesse embebido en Órdenes (misma página, pestaña). */
export function OrderAuditPanel() {
  const [filters, setFilters] = useState({ orderId: '', partId: '', action: '' })
  const [rows, setRows] = useState([])
  const [employeeMap, setEmployeeMap] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    void systemApi
      .listAuditEmployeeDirectory()
      .then((list) => {
        const map = new Map()
        for (const e of Array.isArray(list) ? list : []) {
          if (e?.id != null) map.set(Number(e.id), e)
        }
        setEmployeeMap(map)
      })
      .catch(() => setEmployeeMap(new Map()))
  }, [])

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

  const enrichedRows = useMemo(
    () =>
      rows.map((row, index) => {
        const parsed = parseBiesseAuditDetails(row)
        return {
          key: row.id ?? `${row.orderid}-${row.partid}-${index}`,
          fecha: row.occurred_at ?? row.occurredAt ?? row.fecha ?? row.created_at,
          accion: row.action ?? row.accion ?? '—',
          exito: row.exito,
          orderId: row.orderid ?? row.orderId ?? '—',
          partId: row.partid ?? row.partId ?? '—',
          piezaId: parsed.piezaId ?? '—',
          paleCodigo: parsed.paleCodigo ?? '—',
          actor: biesseActorLabel(row, employeeMap),
          equipo: auditPick(row, 'equipo') ?? '—',
          metodo: auditPick(row, 'metodo') ?? '—',
          detalles: parsed.detalles || '—',
        }
      }),
    [rows, employeeMap],
  )

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
          placeholder="ESCANEAR, ESCANEAR_PIEZA…"
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
          Quién escaneó, en qué orden, parte, pieza y palé (si aplica).
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
                    <th>Pieza</th>
                    <th>Palé</th>
                    <th>Usuario</th>
                    <th>Equipo</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedRows.map((row) => (
                    <tr key={row.key}>
                      <td className="small">{formatDateTime(row.fecha)}</td>
                      <td>
                        {row.accion}
                        {row.exito === false ? <span className="text-warn small"> · falló</span> : null}
                      </td>
                      <td className="small">{row.orderId}</td>
                      <td className="small">{row.partId}</td>
                      <td className="small">{row.piezaId}</td>
                      <td className="small">{row.paleCodigo}</td>
                      <td className="small" title={row.actor}>
                        {row.actor}
                      </td>
                      <td className="small">{row.equipo}</td>
                      <td className="small" title={row.detalles}>
                        {row.detalles}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!enrichedRows.length ? <p className="muted pad">Sin auditoría para los filtros actuales.</p> : null}
          </>
        ) : null}
      </ModuleListCard>
    </>
  )
}
