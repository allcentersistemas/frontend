import { useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import {
  ModuleFilterGrid,
  ModuleHeader,
  ModuleListCard,
} from '../components/module/ModuleChrome.jsx'
import { shortUa } from '../utils/auditDisplay.js'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Contenido de auditoría de pales embebido en Pales (misma página, pestaña). */
export function PaleAuditPanel() {
  const [filters, setFilters] = useState({ paleId: '', action: '' })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await systemApi.listPalletAudit({
          paleId: filters.paleId.trim() || undefined,
          action: filters.action.trim() || undefined,
          limit: 200,
        })
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'No se pudo cargar auditoría de pales')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filters.paleId, filters.action])

  const toolbar = (
    <ModuleFilterGrid>
      <label className="field">
        <span className="small">Pale</span>
        <input
          inputMode="numeric"
          value={filters.paleId}
          onChange={(e) => setFilters((s) => ({ ...s, paleId: e.target.value }))}
          placeholder="paleId"
        />
      </label>
      <label className="field">
        <span className="small">Acción</span>
        <input
          value={filters.action}
          onChange={(e) => setFilters((s) => ({ ...s, action: e.target.value }))}
          placeholder="CREATE, UPDATE, DELETE_DETAIL…"
        />
      </label>
      <div className="field" style={{ justifyContent: 'flex-end' }}>
        <span className="small" style={{ visibility: 'hidden' }}>
          .
        </span>
        <button type="button" className="btn btn--ghost" onClick={() => setFilters({ paleId: '', action: '' })}>
          Limpiar
        </button>
      </div>
    </ModuleFilterGrid>
  )

  return (
    <>
      <ModuleHeader
        title="Auditoría de pales"
        lead="Trazabilidad contextual de creación, edición, cierre y cambios de detalles del pale."
      />

      <ModuleListCard title="Eventos" error={err} loading={loading} toolbar={toolbar}>
        {!loading ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Pale</th>
                    <th>Usuario</th>
                    <th>Equipo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id ?? `${row.paleid}-${index}`}>
                      <td className="small">{formatDateTime(row.occurred_at ?? row.occurredAt ?? row.created_at)}</td>
                      <td>{row.action ?? row.accion ?? '—'}</td>
                      <td className="small">{row.paleid ?? row.paleId ?? '—'}</td>
                      <td className="small" title={shortUa(row)}>
                        {shortUa(row)}
                      </td>
                      <td className="small">{row.equipo ?? row.device ?? '—'}</td>
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
