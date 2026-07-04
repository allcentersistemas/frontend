import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Auditoría de proyectos de optimización (estados, edición, envío). */
export function ProyectoAuditPanel() {
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(0)
  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [proyectoId, setProyectoId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const params = {
        page,
        size: 40,
        sort: 'occurredAt,desc',
        entityType: 'ProyectoOptimizacion,Orden,OrdenDetalle',
      }
      const trimmed = proyectoId.trim()
      if (trimmed) params.entityId = trimmed
      const data = await systemApi.auditEntries(params)
      setRows(Array.isArray(data?.content) ? data.content : [])
      setPageData(data)
    } catch (e) {
      setRows([])
      setErr(e instanceof Error ? e.message : 'No se pudo cargar auditoría de proyectos')
    } finally {
      setLoading(false)
    }
  }, [page, proyectoId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="card card--table pad">
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Creación, envío, cambios de estado y edición de proyectos de optimización.
      </p>
      <div className="toolbar--wrap" style={{ marginBottom: '1rem' }}>
        <label className="field">
          <span>Proyecto (ID)</span>
          <input
            value={proyectoId}
            onChange={(e) => { setProyectoId(e.target.value); setPage(0) }}
            placeholder="Opcional"
          />
        </label>
        <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
          Buscar
        </button>
      </div>
      {err ? <p className="form-error">{err}</p> : null}
      {loading && !rows.length ? <p className="muted">Cargando…</p> : null}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Actor</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="small">{formatDateTime(r.occurredAt)}</td>
                <td>{r.action}</td>
                <td className="small">
                  {r.entityType} {r.entityId ? `#${r.entityId}` : ''}
                </td>
                <td className="small">{r.actorEmail ?? '—'}</td>
                <td className="small" style={{ whiteSpace: 'pre-wrap' }}>
                  {r.details ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && !loading ? <p className="muted pad">Sin eventos de proyectos.</p> : null}
      {pageData?.totalPages > 1 ? (
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className="muted small">
            Página {(pageData.number ?? page) + 1} de {pageData.totalPages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={pageData.last === true}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  )
}
