import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { clientAuditActionLabel, summarizeClientAuditDevice } from '../utils/clientAuditUtils'
import { formatAppDateTime } from '../utils/appDateTime'

export function ClientAuditSummary({ client }) {
  if (!client) return null
  return (
    <dl className="client-audit-summary">
      <div>
        <dt>Cuenta creada</dt>
        <dd>{formatAppDateTime(client.createdAt)}</dd>
      </div>
      <div>
        <dt>Último acceso</dt>
        <dd>{formatAppDateTime(client.lastLoginAt)}</dd>
      </div>
      <div>
        <dt>IP último acceso</dt>
        <dd>{client.lastLoginIp || '—'}</dd>
      </div>
      <div>
        <dt>Total de accesos</dt>
        <dd>{client.loginCount != null ? String(client.loginCount) : '—'}</dd>
      </div>
    </dl>
  )
}

export function ClientLoginHistorySection({ clientId, compact = false }) {
  const [history, setHistory] = useState({ items: [], page: 0, size: 20, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)

  const loadHistory = useCallback(
    async (pageIndex = 0) => {
      if (!clientId) return
      setLoading(true)
      setError('')
      try {
        const data = await systemApi.getClientLoginHistory(clientId, { page: pageIndex, size: 20 })
        setHistory(data)
        setPage(data.page ?? pageIndex)
      } catch (err) {
        setHistory({ items: [], page: 0, size: 20, totalElements: 0 })
        setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.')
      } finally {
        setLoading(false)
      }
    },
    [clientId],
  )

  useEffect(() => {
    void loadHistory(0)
  }, [loadHistory])

  const totalPages = Math.max(1, Math.ceil((history.totalElements || 0) / (history.size || 20)))

  return (
    <section className={compact ? 'client-audit-history client-audit-history--compact' : 'client-audit-history'}>
      <h3 className="card__title">Historial de acceso</h3>
      <p className="muted small" style={{ marginTop: '0.35rem' }}>
        Inicios de sesión, intentos fallidos y cambios de seguridad del portal cliente.
      </p>

      {error ? <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p> : null}

      {loading ? (
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Cargando historial…
        </p>
      ) : history.items?.length ? (
        <>
          <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Evento</th>
                  <th>IP</th>
                  <th>Dispositivo / navegador</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((event) => (
                  <tr key={event.id}>
                    <td className="small">{formatAppDateTime(event.occurredAt)}</td>
                    <td className="small">
                      <span
                        className={
                          event.action === 'LOGIN_FAILURE'
                            ? 'client-audit-event client-audit-event--fail'
                            : 'client-audit-event'
                        }
                      >
                        {clientAuditActionLabel(event.action)}
                      </span>
                      {event.details ? (
                        <span className="muted small" style={{ display: 'block', marginTop: '0.2rem' }}>
                          {event.details}
                        </span>
                      ) : null}
                    </td>
                    <td className="small">{event.clientIp || '—'}</td>
                    <td className="small client-audit-ua">{summarizeClientAuditDevice(event)}</td>
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
                onClick={() => void loadHistory(page - 1)}
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
                onClick={() => void loadHistory(page + 1)}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Aún no hay eventos registrados para este cliente.
        </p>
      )}
    </section>
  )
}
