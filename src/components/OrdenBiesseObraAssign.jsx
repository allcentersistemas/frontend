import { useEffect, useRef, useState } from 'react'
import * as systemApi from '../api/systemApi'

/**
 * Selector para vincular una orden de planilla con una obra Biesse.
 * @param {{
 *   orden: { id: number, biesseOrderId?: number|null, biesseOrderName?: string|null, opCodigo?: string|null },
 *   onAssigned?: (orden: object) => void,
 *   disabled?: boolean,
 * }} props
 */
export function OrdenBiesseObraAssign({ orden, onAssigned, disabled = false }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const debounceRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setItems([])
      setLoading(false)
      return
    }
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const query = q.trim()
    if (!query) {
      setItems([])
      setLoading(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true)
        setMsg('')
        try {
          const res = await systemApi.listBiesseObrasForAssign({ q: query, limit: 25, offset: 0 })
          setItems(Array.isArray(res?.items) ? res.items.filter((i) => i.orderId != null) : [])
        } catch (e) {
          setItems([])
          setMsg(e instanceof Error ? e.message : 'No se pudieron listar obras')
        } finally {
          setLoading(false)
        }
      })()
    }, 280)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q, open])

  async function assign(biesseOrderId) {
    setBusy(true)
    setMsg('')
    try {
      const updated = await systemApi.assignOrdenBiesseObra(orden.id, biesseOrderId)
      setOpen(false)
      setQ('')
      onAssigned?.(updated)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo asignar la obra')
    } finally {
      setBusy(false)
    }
  }

  const linked = orden?.biesseOrderId != null

  return (
    <div ref={rootRef} className="stack gap-1" style={{ minWidth: 0, width: '100%' }}>
      <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
        <span className="muted">Estado:</span>
        {linked ? (
          <>
            <strong style={{ wordBreak: 'break-word' }}>{orden.biesseOrderName || `#${orden.biesseOrderId}`}</strong>
            {orden.opCodigo ? <span className="muted small">OP {orden.opCodigo}</span> : null}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={disabled || busy}
              onClick={() => void assign(null)}
            >
              {busy ? '…' : 'Quitar'}
            </button>
          </>
        ) : (
          <span className="muted">Sin asignar</span>
        )}
      </div>
      {!disabled ? (
        <div style={{ position: 'relative' }}>
          <input
            type="search"
            className="input"
            placeholder="Escriba para buscar XML / obra…"
            value={q}
            disabled={busy}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            aria-label="Buscar obra Biesse"
            autoComplete="off"
          />
          {open ? (
            <ul
              className="card pad"
              style={{
                position: 'absolute',
                zIndex: 30,
                left: 0,
                right: 0,
                margin: '4px 0 0',
                padding: '0.35rem',
                listStyle: 'none',
                maxHeight: 260,
                overflow: 'auto',
              }}
            >
              {loading ? <li className="muted small pad">Buscando…</li> : null}
              {!loading && !q.trim() ? (
                <li className="muted small pad">Empiece a escribir el nombre, booking o id del XML</li>
              ) : null}
              {!loading && q.trim() && items.length === 0 ? (
                <li className="muted small pad">Sin resultados</li>
              ) : null}
              {!loading && q.trim()
                ? items.map((item) => (
                    <li key={item.orderId}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}
                        disabled={busy}
                        onClick={() => void assign(item.orderId)}
                      >
                        <span>
                          <strong>{item.orderName || `#${item.orderId}`}</strong>
                          {item.bookingCode ? (
                            <span className="muted small"> · {item.bookingCode}</span>
                          ) : null}
                          {item.opCodigo ? (
                            <span className="muted small"> · OP {item.opCodigo}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))
                : null}
            </ul>
          ) : null}
        </div>
      ) : null}
      {msg ? (
        <p className="form-error small" role="alert" style={{ margin: 0 }}>
          {msg}
        </p>
      ) : null}
    </div>
  )
}
