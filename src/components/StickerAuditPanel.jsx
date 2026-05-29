import { useCallback, useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { CanButton } from './CanButton.jsx'
import { ACTION } from '../access/rolePermissions'
import { FEATURE } from '../access/permissionCatalog'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

export function StickerAuditPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [orderId, setOrderId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const params = { limit: 200 }
      const trimmed = orderId.trim()
      if (trimmed) params.orderId = Number(trimmed)
      const list = await systemApi.listStickerPrints(params)
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setRows([])
      setErr(e instanceof Error ? e.message : 'No se pudo cargar impresiones de stickers')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="pad">
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Historial de impresiones de stickers (órdenes Biesse). Cada registro se guarda al imprimir desde Órdenes.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem', alignItems: 'flex-end' }}>
        <label className="small">
          Orden (ID)
          <input
            className="input"
            style={{ display: 'block', marginTop: 4, minWidth: 120 }}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Opcional"
          />
        </label>
        <CanButton I={ACTION.AUDIT} a={FEATURE.BIESSE_STICKER_AUDIT} type="button" className="btn btn--primary" onClick={() => void load()}>
          Buscar
        </CanButton>
      </div>
      {err ? <p className="form-error">{err}</p> : null}
      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && !rows.length && !err ? <p className="muted">Sin registros de impresión.</p> : null}
      {rows.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Orden</th>
                <th>Parte</th>
                <th>Piezas</th>
                <th>Impreso por</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id ?? `${r.orderId}-${r.printedAt}-${r.partId}`}>
                  <td className="small">{formatDateTime(r.printedAt ?? r.fechaImpresion ?? r.createdAt)}</td>
                  <td>{r.orderId ?? r.orderid ?? '—'}</td>
                  <td>{r.partId ?? r.partid ?? r.partCode ?? '—'}</td>
                  <td>{r.pieceCount ?? r.cantidadPiezas ?? r.quantity ?? '—'}</td>
                  <td className="small">{r.printedByEmail ?? r.actorEmail ?? r.usuario ?? '—'}</td>
                  <td className="small">{r.notes ?? r.observaciones ?? r.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
