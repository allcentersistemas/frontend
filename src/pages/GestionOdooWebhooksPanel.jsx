import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { formatAppDateTime } from '../utils/appDateTime'

export function GestionOdooWebhooksPanel() {
  const [tipo, setTipo] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ items: [], page: 0, size: 20, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [openId, setOpenId] = useState(null)

  const load = useCallback(
    async (pageIndex = 0, tipoFilter = tipo) => {
      setLoading(true)
      setErr('')
      try {
        const result = await systemApi.listOdooWebhooks({ tipo: tipoFilter, page: pageIndex, size: 20 })
        setData(result)
        setPage(result.page ?? pageIndex)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'No se pudieron cargar los webhooks.')
      } finally {
        setLoading(false)
      }
    },
    [tipo],
  )

  useEffect(() => {
    void load(0, tipo)
  }, [load, tipo])

  const totalPages = Math.max(1, Math.ceil((data.totalElements || 0) / (data.size || 20)))

  return (
    <div className="card pad">
      <h2 className="card__title">Webhooks Odoo</h2>
      <p className="muted small" style={{ marginTop: '0.35rem' }}>
        Endpoints públicos para probar desde Odoo. Por ahora <strong>solo se registran</strong>; no
        cambian el estado del proyecto:
      </p>
      <ul className="muted small" style={{ marginTop: '0.5rem' }}>
        <li>
          <code className="code-inline">POST https://portal.allcenter.pe/webhook/odoo-orden-compra</code>
        </li>
        <li>
          <code className="code-inline">POST https://portal.allcenter.pe/webhook/odoo-pago</code>
        </li>
      </ul>
      <p className="muted small" style={{ marginTop: '0.5rem' }}>
        Incluya en el JSON <code className="code-inline">proyecto_id</code>, <code className="code-inline">referencia</code> o{' '}
        <code className="code-inline">nombre</code> del proyecto.
      </p>

      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <label className="field">
          <span>Tipo</span>
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Todos</option>
            <option value="ORDEN_COMPRA">Orden de compra</option>
            <option value="PAGO">Pago</option>
          </select>
        </label>
        <button type="button" className="btn btn--ghost" onClick={() => void load(page, tipo)}>
          Actualizar
        </button>
      </div>

      {err ? (
        <p className="form-error" role="alert">
          {err}
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      <div className="table-wrap" style={{ marginTop: '1rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Tipo</th>
              <th>Acción</th>
              <th>Proyecto</th>
              <th>IP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Aún no hay eventos. Envíe un POST desde Odoo para verlo aquí.
                </td>
              </tr>
            ) : (
              (data.items ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="small whitespace-nowrap">{formatAppDateTime(row.receivedAt)}</td>
                  <td>{row.tipo}</td>
                  <td>{row.actionTaken || '—'}</td>
                  <td>{row.matchedProyectoId ? `#${row.matchedProyectoId}` : '—'}</td>
                  <td className="small">{row.remoteIp || '—'}</td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpenId(openId === row.id ? null : row.id)}>
                      {openId === row.id ? 'Ocultar' : 'Payload'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {openId ? (
        <pre className="code-block" style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', maxHeight: 280, overflow: 'auto' }}>
          {(data.items ?? []).find((r) => r.id === openId)?.payload || ''}
        </pre>
      ) : null}
      <div className="pager">
        <span className="pager__info">
          Página {page + 1} / {totalPages} · {data.totalElements ?? 0} eventos
        </span>
        <div className="pager__btns">
          <button type="button" className="btn btn--ghost" disabled={page <= 0} onClick={() => void load(page - 1, tipo)}>
            Anterior
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={page + 1 >= totalPages}
            onClick={() => void load(page + 1, tipo)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
