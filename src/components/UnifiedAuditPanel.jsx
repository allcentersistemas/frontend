import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import * as biesseApi from '../api/biesseApi'

function auditMatches(row, text) {
  const needle = text.trim().toLowerCase()
  if (!needle) return true
  return [row.source, row.action, row.entityType, row.entityId, row.actorEmail, row.details]
    .some((value) => String(value ?? '').toLowerCase().includes(needle))
}

export function normalizeAuditRows(source, payload) {
  if (source === 'employee') {
    const rows = Array.isArray(payload?.content) ? payload.content : []
    return rows.map((a) => ({
      raw: a,
      source: 'employee',
      id: a.id,
      occurredAt: a.occurredAt,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      actorEmail: a.actorEmail,
      details: a.details,
    }))
  }
  if (source === 'transport') {
    const rows = Array.isArray(payload?.content) ? payload.content : []
    return rows.map((a) => ({
      raw: a,
      source: 'transport',
      id: a.id,
      occurredAt: a.occurredAt,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      actorEmail: a.actorEmail ?? (a.actorEmployeeId != null ? `#${a.actorEmployeeId}` : null),
      details: a.details,
    }))
  }
  return (Array.isArray(payload) ? payload : []).map((a) => ({
    raw: a,
    source: 'biesse',
    id: a.auditoriaid ?? a.id,
    occurredAt: a.fecha,
    action: a.accion,
    entityType: 'Orden/Biesse',
    entityId: a.orderid ?? a.partid,
    actorEmail: a.usuarioid != null ? `empleado #${a.usuarioid}` : null,
    details: a.detalles,
  }))
}

/** Vista unificada: empleados, flota y Biesse en una sola tabla filtrable. */
export function UnifiedAuditPanel() {
  const [audit, setAudit] = useState(null)
  const [auditPage, setAuditPage] = useState(0)
  const [auditPageData, setAuditPageData] = useState(null)
  const [auditDetail, setAuditDetail] = useState(null)
  const [auditDetailLoading, setAuditDetailLoading] = useState(false)
  const [auditSource, setAuditSource] = useState('all')
  const [auditText, setAuditText] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const bump = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setErr(null)
      setLoading(true)
      try {
        const requests = []
        if (auditSource === 'all' || auditSource === 'employee') {
          requests.push(
            systemApi.auditEntries({ page: auditPage, size: 30, sort: 'occurredAt,desc' }).then((data) => ['employee', data]),
          )
        }
        if (auditSource === 'all' || auditSource === 'transport') {
          requests.push(systemApi.listTransportAuditoria({ page: auditPage, size: 30 }).then((data) => ['transport', data]))
        }
        if (auditSource === 'all' || auditSource === 'biesse') {
          requests.push(biesseApi.listBiesseAudit({ limit: 30, offset: auditPage * 30 }).then((data) => ['biesse', data]))
        }
        const settled = await Promise.allSettled(requests)
        const rows = settled
          .flatMap((result) => {
            if (result.status !== 'fulfilled') return []
            const [source, payload] = result.value
            return normalizeAuditRows(source, payload)
          })
          .filter((row) => auditMatches(row, auditText))
        const page =
          settled.find((result) => result.status === 'fulfilled' && result.value[0] === 'employee')?.value[1] ?? null
        if (!cancelled) {
          setAuditPageData(page)
          setAudit(rows)
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Sin permiso o error de red')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [auditSource, auditText, auditPage, refreshKey])

  async function loadAuditDetail(id) {
    setAuditDetailLoading(true)
    setAuditDetail(null)
    try {
      const d = await systemApi.getAuditEntryById(id)
      setAuditDetail(d)
    } catch {
      setAuditDetail(null)
    } finally {
      setAuditDetailLoading(false)
    }
  }

  if (loading && audit == null) {
    return <p className="muted pad">Cargando auditoría…</p>
  }

  return (
    <div className="card card--table pad">
      {err ? <p className="form-error pad">{err}</p> : null}
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Eventos de empleados/roles, flota y trazabilidad Biesse en una sola vista.
      </p>
      <div className="toolbar--wrap" style={{ marginBottom: '1rem' }}>
        <label className="field">
          <span>Fuente</span>
          <select
            value={auditSource}
            onChange={(e) => {
              setAuditSource(e.target.value)
              setAuditPage(0)
              setAuditDetail(null)
            }}
          >
            <option value="all">Todas</option>
            <option value="employee">Gestión / empleados</option>
            <option value="transport">Gestión / flota</option>
            <option value="biesse">Biesse / órdenes</option>
          </select>
        </label>
        <label className="field">
          <span>Filtro texto</span>
          <input
            value={auditText}
            onChange={(e) => {
              setAuditText(e.target.value)
              setAuditPage(0)
            }}
            placeholder="acción, entidad, actor, detalle…"
          />
        </label>
        <button type="button" className="btn btn--ghost" onClick={bump}>
          Actualizar
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fuente</th>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {(audit ?? []).map((a) => (
              <tr
                key={`${a.source}-${a.id}`}
                className={auditDetail?.id === a.id ? 'table__row--active' : undefined}
                style={{ cursor: a.source === 'employee' ? 'pointer' : 'default' }}
                onClick={() => {
                  if (a.source === 'employee') void loadAuditDetail(a.id)
                }}
              >
                <td className="small">{a.source}</td>
                <td className="small">{String(a.occurredAt ?? '—')}</td>
                <td>{String(a.action)}</td>
                <td>
                  {a.entityType} {a.entityId ? `#${a.entityId}` : ''}
                </td>
                <td className="small">{a.actorEmail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!audit?.length && !loading ? <p className="muted pad">Sin eventos para el filtro actual.</p> : null}
      {auditDetailLoading ? (
        <p className="muted pad">Cargando detalle…</p>
      ) : auditDetail ? (
        <div className="card pad" style={{ marginTop: '1rem', background: 'var(--surface-2, #f7f7f8)' }}>
          <h3 className="card__title">Detalle auditoría #{auditDetail.id}</h3>
          <dl className="kv">
            <div>
              <dt>Detalles</dt>
              <dd className="small" style={{ whiteSpace: 'pre-wrap' }}>
                {auditDetail.details ?? '—'}
              </dd>
            </div>
            <div>
              <dt>IP cliente</dt>
              <dd className="small">{auditDetail.clientIpPublic ?? auditDetail.directRemoteIp ?? '—'}</dd>
            </div>
            <div>
              <dt>User-Agent</dt>
              <dd className="small">{auditDetail.userAgent ?? '—'}</dd>
            </div>
          </dl>
        </div>
      ) : null}
      {auditPageData && typeof auditPageData.totalPages === 'number' ? (
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <span className="muted small">
            Página {(auditPageData.number ?? auditPage) + 1}
            {auditSource === 'employee'
              ? ` de ${auditPageData.totalPages ?? 1} · ${auditPageData.totalElements ?? 0} eventos`
              : ''}
          </span>
          <button
            type="button"
            className="btn"
            disabled={auditPage <= 0}
            onClick={() => {
              setAuditPage((p) => Math.max(0, p - 1))
              setAuditDetail(null)
            }}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn"
            disabled={
              auditPageData.last === true ||
              (auditPageData.totalPages != null && auditPage >= auditPageData.totalPages - 1)
            }
            onClick={() => {
              setAuditPage((p) => p + 1)
              setAuditDetail(null)
            }}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  )
}
