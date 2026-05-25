import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { CanButton } from './CanButton'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Auditoría de vehículos / flota (antes pestaña en Gestión flota). */
export function TransportAuditPanel() {
  const [auditFilters, setAuditFilters] = useState({ entityType: '', entityId: '', correlationId: '' })
  const [auditPage, setAuditPage] = useState(0)
  const [auditData, setAuditData] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [err, setErr] = useState(null)

  const loadAuditoria = useCallback(async () => {
    setAuditLoading(true)
    setErr(null)
    try {
      const data = await systemApi.listTransportAuditoria({
        entityType: auditFilters.entityType.trim() || undefined,
        entityId: auditFilters.entityId.trim() || undefined,
        correlationId: auditFilters.correlationId.trim() || undefined,
        page: auditPage,
        size: 30,
      })
      setAuditData(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setAuditData(null)
      setErr(e instanceof Error ? e.message : 'Error al cargar auditoría')
    } finally {
      setAuditLoading(false)
    }
  }, [auditFilters.entityType, auditFilters.entityId, auditFilters.correlationId, auditPage])

  useEffect(() => {
    void loadAuditoria()
  }, [loadAuditoria])

  return (
    <div className="card card--table pad">
      <h2 className="card__title">Auditoría de flota</h2>
      {err ? <p className="form-error pad">{err}</p> : null}
      <form
        className="form-row-2"
        onSubmit={(e) => {
          e.preventDefault()
          setAuditPage(0)
          void loadAuditoria()
        }}
      >
        <label className="field">
          <span>Tipo entidad</span>
          <select value={auditFilters.entityType} onChange={(e) => setAuditFilters((f) => ({ ...f, entityType: e.target.value }))}>
            <option value="">(todos)</option>
            <option value="Transporte">Vehículo / flota</option>
          </select>
        </label>
        <label className="field">
          <span>Entity ID</span>
          <input value={auditFilters.entityId} onChange={(e) => setAuditFilters((f) => ({ ...f, entityId: e.target.value }))} />
        </label>
        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
          <CanButton I={ACTION.AUDIT} a={FEATURE.TRANSPORT_AUDIT} type="submit" className="btn btn--primary">
            Buscar
          </CanButton>
          <CanButton I={ACTION.AUDIT} a={FEATURE.TRANSPORT_AUDIT} type="button" className="btn" onClick={() => void loadAuditoria()}>
            Actualizar
          </CanButton>
        </div>
      </form>
      {auditLoading ? (
        <p className="muted pad">Cargando…</p>
      ) : (
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>ID</th>
                <th>Actor</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(auditData?.content) ? auditData.content : []).map((row) => (
                <tr key={row.id}>
                  <td className="small">{formatDateTime(row.occurredAt)}</td>
                  <td>{row.action}</td>
                  <td className="small">{row.entityType}</td>
                  <td className="small">{row.entityId ?? '—'}</td>
                  <td className="small">{row.actorEmail ?? '—'}</td>
                  <td className="small">{row.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
