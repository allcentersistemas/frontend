import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { systemApiBase } from '../config/env'
import { useAuth } from '../auth/AuthContext'
import { CanButton } from '../components/CanButton'
import { DetailModal } from '../components/DetailModal'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { categoriaLabel, STOCK_CATEGORIES } from '../utils/stockCategoryLabels'

function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
}

function csvEscape(s) {
  const t = String(s ?? '')
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

function downloadCsv(filename, lines) {
  const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function StockAlmacenPanel() {
  const { employee } = useAuth()
  const defaultSucursalId = employee?.branchId ?? null

  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 15
  const [listBody, setListBody] = useState(null)
  const [listLoading, setListLoading] = useState(false)
  const [listErr, setListErr] = useState(null)

  const [branches, setBranches] = useState([])
  const [filterSucursalId, setFilterSucursalId] = useState(defaultSucursalId ?? '')

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState(null)

  const [newSku, setNewSku] = useState('')
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('UN')
  const [createMsg, setCreateMsg] = useState(null)

  const [movQty, setMovQty] = useState('')
  const [movReason, setMovReason] = useState('')
  const [movRef, setMovRef] = useState('')
  const [movCategoria, setMovCategoria] = useState('DISPONIBLE')
  const [movObservaciones, setMovObservaciones] = useState('')

  const rows = useMemo(() => systemApi.pageContent(listBody), [listBody])
  const meta = useMemo(() => systemApi.pageMeta(listBody), [listBody])

  const sucursalIdForDetail = useMemo(() => {
    const raw = filterSucursalId === '' ? null : Number(filterSucursalId)
    return raw != null && Number.isFinite(raw) && raw > 0 ? raw : null
  }, [filterSucursalId])

  const sucursalNombre = useMemo(() => {
    if (sucursalIdForDetail == null) return null
    return branches.find((b) => b.id === sucursalIdForDetail)?.nombre ?? `Sucursal #${sucursalIdForDetail}`
  }, [branches, sucursalIdForDetail])

  useEffect(() => {
    void systemApi.listBranches().then(setBranches).catch(() => setBranches([]))
  }, [])

  useEffect(() => {
    if (defaultSucursalId != null && filterSucursalId === '') {
      setFilterSucursalId(String(defaultSucursalId))
    }
  }, [defaultSucursalId, filterSucursalId])

  const loadList = useCallback(async () => {
    setListLoading(true)
    setListErr(null)
    try {
      const body = await systemApi.listInventoryItems({
        page,
        size: pageSize,
        q: q.trim() || undefined,
      })
      setListBody(body)
    } catch (e) {
      setListBody(null)
      setListErr(e instanceof Error ? e.message : 'Error al cargar artículos')
    } finally {
      setListLoading(false)
    }
  }, [page, pageSize, q])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const fetchDetail = useCallback(
    async (id) => {
      setDetailLoading(true)
      setDetailErr(null)
      setDetail(null)
      try {
        const data = await systemApi.getInventoryItemDetail(id, {
          sucursalId: sucursalIdForDetail ?? undefined,
        })
        setDetail(data)
      } catch (e) {
        setDetailErr(e instanceof Error ? e.message : 'Error al cargar detalle')
      } finally {
        setDetailLoading(false)
      }
    },
    [sucursalIdForDetail],
  )

  useEffect(() => {
    if (selectedId == null) return
    void fetchDetail(selectedId)
  }, [selectedId, fetchDetail])

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setDetailErr(null)
  }

  function exportStockCsv() {
    const head = ['id', 'sku', 'name', 'unit', 'active', 'createdAt']
    const lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [r.id, r.sku, r.name, r.unit, r.active, r.createdAt].map((c) => csvEscape(c)).join(','),
      )
    }
    downloadCsv(`inventario-stock-pag${page + 1}.csv`, lines)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateMsg(null)
    try {
      await systemApi.createInventoryItem({
        sku: newSku.trim(),
        name: newName.trim(),
        unit: newUnit.trim() || 'UN',
      })
      setNewSku('')
      setNewName('')
      setNewUnit('UN')
      setCreateMsg('Artículo creado.')
      await loadList()
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : 'No se pudo crear')
    }
  }

  async function handleMovement(e) {
    e.preventDefault()
    if (selectedId == null) return
    if (sucursalIdForDetail == null) {
      setDetailErr('Selecciona una sucursal (almacén) para registrar el movimiento.')
      return
    }
    setDetailErr(null)
    try {
      const qty = Number(String(movQty).replace(',', '.'))
      if (!Number.isFinite(qty) || qty === 0) {
        setDetailErr('Cantidad inválida (use negativo para salida).')
        return
      }
      await systemApi.addInventoryMovement(selectedId, {
        quantityChange: qty,
        reason: movReason.trim(),
        externalRef: movRef.trim() || undefined,
        sucursalId: sucursalIdForDetail,
        categoriaCodigo: movCategoria,
        observaciones: movObservaciones.trim() || undefined,
      })
      setMovQty('')
      setMovReason('')
      setMovRef('')
      setMovObservaciones('')
      await fetchDetail(selectedId)
      await loadList()
    } catch (err) {
      setDetailErr(err instanceof Error ? err.message : 'No se pudo registrar movimiento')
    }
  }

  const detailTitle = detail?.item
    ? `${detail.item.sku} — ${detail.item.name}`
    : selectedId
      ? `Artículo #${selectedId}`
      : 'Detalle'

  return (
    <div>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <p className="muted small" style={{ margin: 0 }}>
          Stock por sucursal (almacén). Ingresos RM, salidas, palés y movimientos manuales usan la sucursal del
          empleado. API: <code>{systemApiBase}</code>.
        </p>
      </div>

      <div className="card">
        <div className="pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 160px', margin: 0 }}>
            <span>Buscar (SKU / nombre)</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="field" style={{ flex: '1 1 200px', margin: 0 }}>
            <span>Sucursal (saldo y movimientos)</span>
            <select
              value={filterSucursalId === '' ? '' : String(filterSucursalId)}
              onChange={(e) => {
                setFilterSucursalId(e.target.value)
                if (selectedId != null) void fetchDetail(selectedId)
              }}
            >
              <option value="">Todas (vista global)</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.nombre ?? `#${b.id}`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn--ghost" disabled={listLoading} onClick={() => void loadList()}>
            Buscar
          </button>
          <button type="button" className="btn btn--ghost" disabled={!rows.length} onClick={exportStockCsv}>
            CSV página
          </button>
        </div>
        {listErr ? <p className="pad" style={{ color: 'var(--danger, #b00020)' }}>{listErr}</p> : null}
        {listLoading ? <p className="muted pad">Cargando…</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Unidad</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={selectedId === r.id ? 'inv-row-selected' : undefined}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td>{r.id}</td>
                  <td className="small">{esc(r.sku)}</td>
                  <td className="small">{esc(r.name)}</td>
                  <td>{esc(r.unit)}</td>
                  <td>{r.active === false ? 'No' : 'Sí'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !listLoading ? <p className="muted pad">Sin artículos en esta página.</p> : null}
        </div>
        <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={page <= 0 || listLoading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </button>
          <span className="muted small">
            Página {meta.number + 1} de {Math.max(1, meta.totalPages)} · {meta.totalElements} artículos
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={listLoading || page + 1 >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>

        <h3 className="card__title pad" style={{ marginTop: '1rem' }}>
          Nuevo artículo
        </h3>
        <form className="form-section pad" onSubmit={handleCreate}>
          <label className="field">
            <span>SKU *</span>
            <input value={newSku} onChange={(e) => setNewSku(e.target.value)} required maxLength={64} />
          </label>
          <label className="field">
            <span>Nombre *</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required maxLength={512} />
          </label>
          <label className="field">
            <span>Unidad</span>
            <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} maxLength={32} />
          </label>
          <div className="form-actions">
            <CanButton I={ACTION.CREATE} a={FEATURE.INVENTORY} type="submit" className="btn btn--primary">
              Crear artículo
            </CanButton>
          </div>
          {createMsg ? <p className="small muted">{createMsg}</p> : null}
        </form>
      </div>

      <DetailModal
        open={selectedId != null}
        title={detailTitle}
        subtitle={
          sucursalNombre
            ? `Almacén: ${sucursalNombre}`
            : 'Vista global — elige sucursal arriba para saldos por almacén'
        }
        onClose={closeDetail}
      >
        {detailLoading ? <p className="muted">Cargando…</p> : null}
        {detailErr ? <p style={{ color: 'var(--danger, #b00020)' }}>{detailErr}</p> : null}
        {detail?.item ? (
          <>
            <dl className="inv-dl">
              <dt>ID</dt>
              <dd>{detail.item.id}</dd>
              <dt>SKU</dt>
              <dd>{esc(detail.item.sku)}</dd>
              <dt>Nombre</dt>
              <dd>{esc(detail.item.name)}</dd>
              <dt>Unidad</dt>
              <dd>{esc(detail.item.unit)}</dd>
              <dt>Saldo {sucursalIdForDetail ? 'en sucursal' : 'global'}</dt>
              <dd>{esc(detail.balanceOnHand)}</dd>
            </dl>
            {(detail.balancesByCategoria ?? []).length > 0 ? (
              <>
                <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                  Saldo por categoría
                </h3>
                <ul className="small" style={{ margin: '0.5rem 0 0 1rem' }}>
                  {(detail.balancesByCategoria ?? []).map((b) => (
                    <li key={b.categoriaCodigo}>
                      {esc(b.categoriaEtiqueta ?? categoriaLabel(b.categoriaCodigo))}: {esc(b.balance)}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
              Registrar movimiento manual
            </h3>
            {sucursalIdForDetail == null ? (
              <p className="muted small">Selecciona una sucursal en el listado para poder mover stock.</p>
            ) : (
              <form className="form-section" onSubmit={handleMovement}>
                <label className="field">
                  <span>Cantidad (+ / −) *</span>
                  <input
                    inputMode="decimal"
                    value={movQty}
                    onChange={(e) => setMovQty(e.target.value)}
                    placeholder="ej. 10 o -2"
                    required
                  />
                </label>
                <label className="field">
                  <span>Categoría</span>
                  <select value={movCategoria} onChange={(e) => setMovCategoria(e.target.value)}>
                    {STOCK_CATEGORIES.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Motivo *</span>
                  <input value={movReason} onChange={(e) => setMovReason(e.target.value)} required maxLength={256} />
                </label>
                <label className="field">
                  <span>Observaciones</span>
                  <textarea
                    rows={2}
                    value={movObservaciones}
                    onChange={(e) => setMovObservaciones(e.target.value)}
                    placeholder="Ej. pieza rota, merca…"
                  />
                </label>
                <label className="field">
                  <span>Referencia externa</span>
                  <input value={movRef} onChange={(e) => setMovRef(e.target.value)} maxLength={128} />
                </label>
                <div className="form-actions">
                  <CanButton I={ACTION.CREATE} a={FEATURE.INVENTORY} type="submit" className="btn btn--primary">
                    Guardar movimiento
                  </CanButton>
                </div>
              </form>
            )}
            <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
              Últimos movimientos
            </h3>
            <div className="table-wrap">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cant.</th>
                    <th>Categoría</th>
                    <th>Motivo</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.recentMovements ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted small">
                        Sin movimientos{sucursalIdForDetail ? ' en esta sucursal' : ''}.
                      </td>
                    </tr>
                  ) : (
                    (detail.recentMovements ?? []).map((m) => (
                      <tr key={m.id}>
                        <td className="small">{esc(m.createdAt)}</td>
                        <td>{esc(m.quantityChange)}</td>
                        <td className="small">{categoriaLabel(m.categoriaCodigo)}</td>
                        <td className="small">{esc(m.reason)}</td>
                        <td className="small">{esc(m.observaciones)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </DetailModal>
    </div>
  )
}
