import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Auditoría de empleados, roles, login y configuración del sistema. */
export function SystemAuditPanel() {
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(0)
  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [text, setText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await systemApi.auditEntries({
        page,
        size: 40,
        sort: 'occurredAt,desc',
        entityType: 'Employee,Role,AUTH,AppConfig',
      })
      const content = Array.isArray(data?.content) ? data.content : []
      const q = text.trim().toLowerCase()
      setRows(
        q
          ? content.filter((r) =>
              [r.action, r.entityType, r.entityId, r.actorEmail, r.details]
                .some((v) => String(v ?? '').toLowerCase().includes(q)),
            )
          : content,
      )
      setPageData(data)
    } catch (e) {
      setRows([])
      setErr(e instanceof Error ? e.message : 'No se pudo cargar auditoría del sistema')
    } finally {
      setLoading(false)
    }
  }, [page, text])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="card card--table pad">
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Cambios en empleados, roles, inicios de sesión y configuración.
      </p>
      <div className="toolbar--wrap" style={{ marginBottom: '1rem' }}>
        <label className="field">
          <span>Buscar</span>
          <input value={text} onChange={(e) => { setText(e.target.value); setPage(0) }} placeholder="acción, actor, detalle…" />
        </label>
        <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
          Actualizar
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
                <td className="small">{r.details ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && !loading ? <p className="muted pad">Sin eventos.</p> : null}
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
