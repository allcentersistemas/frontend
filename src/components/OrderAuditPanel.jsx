import { useEffect, useMemo, useState } from 'react'
import * as biesseApi from '../api/biesseApi'
import * as systemApi from '../api/systemApi'
import { ModuleFilterGrid, ModuleListCard } from '../components/module/ModuleChrome.jsx'
import { auditPick } from '../utils/auditDisplay.js'
import {
  biesseActorLabel,
  biesseAuditOrderLabel,
  biesseAuditPartLabel,
  biesseAuditPieceLabel,
  parseBiesseAuditDetails,
} from '../utils/biesseAuditParse.js'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Contenido de auditoría Biesse embebido en Órdenes (misma página, pestaña). */
export function OrderAuditPanel() {
  const [filters, setFilters] = useState({ orderQ: '', partQ: '', action: '' })
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
          orderQ: filters.orderQ.trim() || undefined,
          partQ: filters.partQ.trim() || undefined,
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
  }, [filters.orderQ, filters.partQ, filters.action])

  const enrichedRows = useMemo(
    () =>
      rows.map((row, index) => {
        const parsed = parseBiesseAuditDetails(row)
        return {
          key: row.auditoriaid ?? row.id ?? `${row.orderid}-${row.partid}-${index}`,
          fecha: row.fecha ?? row.occurred_at ?? row.occurredAt ?? row.created_at,
          accion: row.accion ?? row.action ?? '—',
          exito: row.exito,
          orden: biesseAuditOrderLabel(row, parsed),
          parte: biesseAuditPartLabel(row, parsed),
          pieza: biesseAuditPieceLabel(row, parsed),
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
          value={filters.orderQ}
          onChange={(e) => setFilters((s) => ({ ...s, orderQ: e.target.value }))}
          placeholder="Nombre orden o #id"
        />
      </label>
      <label className="field">
        <span className="small">Parte</span>
        <input
          value={filters.partQ}
          onChange={(e) => setFilters((s) => ({ ...s, partQ: e.target.value }))}
          placeholder="P2 o #id"
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
        <button type="button" className="btn btn--ghost" onClick={() => setFilters({ orderQ: '', partQ: '', action: '' })}>
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
          Seguimiento por nombre de orden, código de parte (p. ej. P2) y número de pieza (p. ej. Pieza 3).
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
                      <td className="small">{row.orden}</td>
                      <td className="small">{row.parte}</td>
                      <td className="small">{row.pieza}</td>
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
