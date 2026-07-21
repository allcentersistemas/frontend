import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { formatAppDateTime } from '../utils/appDateTime'

function formatTokens(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('es-PE')
}

export function ClientAiUsageSection({ clientId, compact = false }) {
  const [data, setData] = useState({
    items: [],
    page: 0,
    size: 20,
    totalElements: 0,
    summary: { totalUploads: 0, successCount: 0, failCount: 0, inputTokens: 0, outputTokens: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)

  const loadUsage = useCallback(
    async (pageIndex = 0) => {
      if (!clientId) return
      setLoading(true)
      setError('')
      try {
        const result = await systemApi.getClientAiUsage(clientId, { page: pageIndex, size: 20 })
        setData(result)
        setPage(result.page ?? pageIndex)
      } catch (err) {
        setData({
          items: [],
          page: 0,
          size: 20,
          totalElements: 0,
          summary: { totalUploads: 0, successCount: 0, failCount: 0, inputTokens: 0, outputTokens: 0 },
        })
        setError(err instanceof Error ? err.message : 'No se pudo cargar el uso de IA.')
      } finally {
        setLoading(false)
      }
    },
    [clientId],
  )

  useEffect(() => {
    void loadUsage(0)
  }, [loadUsage])

  const summary = data.summary || {}
  const totalPages = Math.max(1, Math.ceil((data.totalElements || 0) / (data.size || 20)))

  return (
    <section className={compact ? 'client-audit-history client-audit-history--compact' : 'client-audit-history'}>
      <h3 className="card__title">Uso de importación por foto</h3>
      <p className="muted small" style={{ marginTop: '0.35rem' }}>
        Cada intento de lectura con IA (éxito o rechazo) queda registrado con tokens del proveedor.
      </p>

      <dl className="client-audit-summary" style={{ marginTop: '0.75rem' }}>
        <div>
          <dt>Subidas</dt>
          <dd>{formatTokens(summary.totalUploads)}</dd>
        </div>
        <div>
          <dt>Exitosas</dt>
          <dd>{formatTokens(summary.successCount)}</dd>
        </div>
        <div>
          <dt>Fallidas</dt>
          <dd>{formatTokens(summary.failCount)}</dd>
        </div>
        <div>
          <dt>Tokens entrada / salida</dt>
          <dd>
            {formatTokens(summary.inputTokens)} / {formatTokens(summary.outputTokens)}
          </dd>
        </div>
      </dl>

      {error ? <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p> : null}

      {loading ? (
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Cargando uso…
        </p>
      ) : data.items?.length ? (
        <>
          <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Resultado</th>
                  <th>Filas</th>
                  <th>Tokens</th>
                  <th>Modelo</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="small">{formatAppDateTime(row.createdAt)}</td>
                    <td className="small">
                      <span
                        className={
                          row.success
                            ? 'client-audit-event'
                            : 'client-audit-event client-audit-event--fail'
                        }
                      >
                        {row.success ? 'OK' : 'Falló'}
                      </span>
                    </td>
                    <td className="small">{row.filasCount ?? 0}</td>
                    <td className="small">
                      {formatTokens(row.inputTokens)} / {formatTokens(row.outputTokens)}
                    </td>
                    <td className="small">
                      {[row.provider, row.model].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="small">{row.rejectReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="client-audit-pagination">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={page <= 0}
                onClick={() => void loadUsage(page - 1)}
              >
                Anterior
              </button>
              <span className="muted small">
                Página {page + 1} de {totalPages}
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={page + 1 >= totalPages}
                onClick={() => void loadUsage(page + 1)}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Aún no hay importaciones por foto registradas para este cliente.
        </p>
      )}
    </section>
  )
}
