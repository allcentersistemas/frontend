import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import * as biesseApi from '../api/biesseApi'
import { normalizeStickerPrintRow } from '../utils/stickerAudit.js'
import { biesseAuditSummary } from '../utils/biesseAuditParse.js'

const SOURCE_LABELS = {
  employee: 'Empleados',
  transport: 'Flota',
  stickers: 'Stickers',
  biesse: 'Biesse',
  pales: 'Palés',
}

function auditMatches(row, text) {
  const needle = text.trim().toLowerCase()
  if (!needle) return true
  return [row.source, row.action, row.entityType, row.entityId, row.actorEmail, row.details]
    .some((value) => String(value ?? '').toLowerCase().includes(needle))
}

function parseOccurredAt(value) {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
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
  if (source === 'pales') {
    const rows = Array.isArray(payload) ? payload : []
    return rows.map((a) => ({
      raw: a,
      source: 'pales',
      id: a.id,
      occurredAt: a.occurredAt ?? a.occurred_at,
      action: a.action ?? a.accion,
      entityType: 'Pale',
      entityId: a.paleId ?? a.paleid,
      actorEmail: a.actorEmail ?? (a.actorEmployeeId != null ? `#${a.actorEmployeeId}` : null),
      details: a.details ?? a.paleCodigo,
    }))
  }
  if (source === 'stickers') {
    const rows = Array.isArray(payload) ? payload : []
    return rows
      .map(normalizeStickerPrintRow)
      .filter(Boolean)
      .map((a) => ({
        raw: a.raw,
        source: 'stickers',
        id: a.id,
        occurredAt: a.fecha,
        action: 'IMPRIMIR_STICKER',
        entityType: 'Orden/Biesse',
        entityId: a.orderId,
        actorEmail: a.usuarioEmail,
        details: a.detalle,
      }))
  }
  return (Array.isArray(payload) ? payload : []).map((a) => ({
    raw: a,
    source: 'biesse',
    id: a.auditoriaid ?? a.id,
    occurredAt: a.fecha,
    action: a.accion,
    entityType: 'Orden/Biesse',
    entityId: a.ordername ?? a.orderid ?? a.partcode ?? a.partid,
    actorEmail: a.usuarioid != null ? `empleado #${a.usuarioid}` : null,
    details: [biesseAuditSummary(a), a.detalles, a.exito === false ? '(falló)' : null].filter(Boolean).join(' · '),
  }))
}

function formatDetail(row) {
  if (row.source === 'employee' && row.raw) {
    const d = row.raw
    return [
      d.details,
      d.clientIpPublic || d.directRemoteIp ? `IP: ${d.clientIpPublic ?? d.directRemoteIp}` : null,
      d.userAgent ? `UA: ${d.userAgent}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  }
  return row.details ?? '—'
}

/** Vista unificada: empleados, flota, pales, Biesse y stickers en una sola tabla filtrable. */
export function UnifiedAuditPanel() {
  const [audit, setAudit] = useState(null)
  const [auditPage, setAuditPage] = useState(0)
  const [auditPageData, setAuditPageData] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [auditDetail, setAuditDetail] = useState(null)
  const [auditDetailLoading, setAuditDetailLoading] = useState(false)
  const [auditSource, setAuditSource] = useState('all')
  const [auditText, setAuditText] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [sourceErrors, setSourceErrors] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const bump = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setErr(null)
      setLoading(true)
      setSourceErrors([])
      try {
        const requests = []
        if (auditSource === 'all' || auditSource === 'employee') {
          requests.push({
            key: 'employee',
            promise: systemApi.auditEntries({ page: auditPage, size: 30, sort: 'occurredAt,desc' }),
          })
        }
        if (auditSource === 'all' || auditSource === 'transport') {
          requests.push({
            key: 'transport',
            promise: systemApi.listTransportAuditoria({ page: auditPage, size: 30 }),
          })
        }
        if (auditSource === 'all' || auditSource === 'pales') {
          requests.push({
            key: 'pales',
            promise: systemApi.listPalletAudit({ limit: 30 }),
          })
        }
        if (auditSource === 'all' || auditSource === 'biesse') {
          requests.push({
            key: 'biesse',
            promise: biesseApi.listBiesseAudit({ limit: 30, offset: auditPage * 30 }),
          })
        }
        if (auditSource === 'all' || auditSource === 'stickers') {
          requests.push({
            key: 'stickers',
            promise: systemApi.listStickerPrints({ limit: 30 }),
          })
        }
        const settled = await Promise.allSettled(requests.map((r) => r.promise))
        const errors = []
        const rows = settled
          .flatMap((result, index) => {
            const key = requests[index].key
            if (result.status !== 'fulfilled') {
              errors.push(key)
              return []
            }
            return normalizeAuditRows(key, result.value)
          })
          .filter((row) => auditMatches(row, auditText))
          .sort((a, b) => parseOccurredAt(b.occurredAt) - parseOccurredAt(a.occurredAt))
        const employeeResult = settled[requests.findIndex((r) => r.key === 'employee')]
        const page =
          employeeResult?.status === 'fulfilled' ? employeeResult.value : null
        if (!cancelled) {
          setAuditPageData(page)
          setAudit(rows)
          setSourceErrors(errors)
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

  const selectedDetailText = useMemo(() => {
    if (!selectedRow) return ''
    return formatDetail(selectedRow)
  }, [selectedRow])

  async function loadEmployeeDetail(id) {
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

  function onRowClick(row) {
    setSelectedRow(row)
    setAuditDetail(null)
    if (row.source === 'employee' && row.id) {
      void loadEmployeeDetail(row.id)
    }
  }

  if (loading && audit == null) {
    return <p className="muted pad">Cargando auditoría…</p>
  }

  return (
    <div className="card card--table pad">
      {err ? <p className="form-error pad">{err}</p> : null}
      {sourceErrors.length ? (
        <p className="text-warn small pad">
          No se pudieron cargar: {sourceErrors.map((s) => SOURCE_LABELS[s] ?? s).join(', ')}. El resto de fuentes
          sigue visible.
        </p>
      ) : null}
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Eventos de empleados, flota, palés, stickers y trazabilidad Biesse. Ordenados por fecha (más reciente primero).
      </p>
      <div className="toolbar--wrap" style={{ marginBottom: '1rem' }}>
        <label className="field">
          <span>Fuente</span>
          <select
            value={auditSource}
            onChange={(e) => {
              setAuditSource(e.target.value)
              setAuditPage(0)
              setSelectedRow(null)
              setAuditDetail(null)
            }}
          >
            <option value="all">Todas</option>
            <option value="employee">Gestión / empleados</option>
            <option value="transport">Gestión / flota</option>
            <option value="pales">Palés</option>
            <option value="biesse">Biesse / órdenes</option>
            <option value="stickers">Impresión stickers</option>
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
        <button type="button" className="btn btn--ghost" onClick={bump} disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar'}
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
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {(audit ?? []).map((a) => (
              <tr
                key={`${a.source}-${a.id}`}
                className={
                  selectedRow?.source === a.source && selectedRow?.id === a.id ? 'table__row--active' : undefined
                }
                style={{ cursor: 'pointer' }}
                onClick={() => onRowClick(a)}
              >
                <td className="small">{SOURCE_LABELS[a.source] ?? a.source}</td>
                <td className="small">{String(a.occurredAt ?? '—')}</td>
                <td>{String(a.action)}</td>
                <td>
                  {a.entityType} {a.entityId ? `#${a.entityId}` : ''}
                </td>
                <td className="small">{a.actorEmail ?? '—'}</td>
                <td className="small truncate" style={{ maxWidth: 220 }}>
                  {a.details ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!audit?.length && !loading ? <p className="muted pad">Sin eventos para el filtro actual.</p> : null}
      {selectedRow ? (
        <div className="card pad" style={{ marginTop: '1rem', background: 'var(--surface-2, #f7f7f8)' }}>
          <h3 className="card__title">
            Detalle · {SOURCE_LABELS[selectedRow.source] ?? selectedRow.source} #{selectedRow.id}
          </h3>
          {auditDetailLoading ? (
            <p className="muted small">Cargando detalle ampliado…</p>
          ) : (
            <dl className="kv">
              <div>
                <dt>Detalles</dt>
                <dd className="small" style={{ whiteSpace: 'pre-wrap' }}>
                  {auditDetail?.details ?? selectedDetailText}
                </dd>
              </div>
              {auditDetail ? (
                <>
                  <div>
                    <dt>IP cliente</dt>
                    <dd className="small">{auditDetail.clientIpPublic ?? auditDetail.directRemoteIp ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>User-Agent</dt>
                    <dd className="small">{auditDetail.userAgent ?? '—'}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          )}
        </div>
      ) : null}
      {auditPageData && typeof auditPageData.totalPages === 'number' && auditSource === 'employee' ? (
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <span className="muted small">
            Página empleados {(auditPageData.number ?? auditPage) + 1} de {auditPageData.totalPages ?? 1} ·{' '}
            {auditPageData.totalElements ?? 0} eventos
          </span>
          <button
            type="button"
            className="btn"
            disabled={auditPage <= 0}
            onClick={() => {
              setAuditPage((p) => Math.max(0, p - 1))
              setSelectedRow(null)
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
              setSelectedRow(null)
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
