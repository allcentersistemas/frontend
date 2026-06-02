import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { useAuth } from '../auth/AuthContext'
import { DetailModal } from '../components/DetailModal'
import { ModuleTabs } from '../components/module/ModuleChrome.jsx'
import { categoriaLabel } from '../utils/stockCategoryLabels'
import { inferStockItemType, stockItemTypeLabel, STOCK_ITEM_TYPES } from '../utils/stockItemTypes'

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
  const [tipoFilter, setTipoFilter] = useState('')
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

  const rows = useMemo(() => systemApi.pageContent(listBody), [listBody])
  const meta = useMemo(() => systemApi.pageMeta(listBody), [listBody])

  const sucursalIdForFilter = useMemo(() => {
    const raw = filterSucursalId === '' ? null : Number(filterSucursalId)
    return raw != null && Number.isFinite(raw) && raw > 0 ? raw : null
  }, [filterSucursalId])

  const sucursalNombre = useMemo(() => {
    if (sucursalIdForFilter == null) return null
    return branches.find((b) => b.id === sucursalIdForFilter)?.nombre ?? `Sucursal #${sucursalIdForFilter}`
  }, [branches, sucursalIdForFilter])

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
        sucursalId: sucursalIdForFilter ?? undefined,
        tipo: tipoFilter || undefined,
      })
      setListBody(body)
    } catch (e) {
      setListBody(null)
      setListErr(e instanceof Error ? e.message : 'Error al cargar artículos')
    } finally {
      setListLoading(false)
    }
  }, [page, pageSize, q, sucursalIdForFilter, tipoFilter])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    setPage(0)
  }, [q, sucursalIdForFilter, tipoFilter])

  const fetchDetail = useCallback(
    async (id) => {
      setDetailLoading(true)
      setDetailErr(null)
      setDetail(null)
      try {
        const data = await systemApi.getInventoryItemDetail(id, {
          sucursalId: sucursalIdForFilter ?? undefined,
        })
        setDetail(data)
      } catch (e) {
        setDetailErr(e instanceof Error ? e.message : 'Error al cargar detalle')
      } finally {
        setDetailLoading(false)
      }
    },
    [sucursalIdForFilter],
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
    const head = ['id', 'tipo', 'sku', 'name', 'unit', 'balanceOnHand', 'active', 'createdAt']
    const lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [r.id, inferStockItemType(r), r.sku, r.name, r.unit, r.balanceOnHand, r.active, r.createdAt]
          .map((c) => csvEscape(c))
          .join(','),
      )
    }
    downloadCsv(`inventario-stock-pag${page + 1}.csv`, lines)
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
          Kardex de almacén por sucursal. <strong>Palés</strong> (unidad logística) y <strong>piezas</strong> (contenido
          al cerrar palé) se listan por separado. Seleccione sucursal para ver solo el stock de ese almacén.
        </p>
      </div>

      <div className="card">
        <div className="pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 160px', margin: 0 }}>
            <span>Buscar (SKU / nombre)</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="field" style={{ flex: '1 1 200px', margin: 0 }}>
            <span>Sucursal</span>
            <select
              value={filterSucursalId === '' ? '' : String(filterSucursalId)}
              onChange={(e) => setFilterSucursalId(e.target.value)}
            >
              <option value="">Todas (catálogo global)</option>
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

        <div className="pad" style={{ paddingTop: 0 }}>
          <ModuleTabs
            ariaLabel="Tipo de artículo"
            activeId={tipoFilter || ''}
            onChange={(id) => setTipoFilter(id)}
            tabs={STOCK_ITEM_TYPES.map((t) => ({ id: t.id, label: t.label }))}
          />
        </div>

        {sucursalNombre ? (
          <p className="pad muted small" style={{ paddingTop: 0 }}>
            Stock con saldo en: <strong>{sucursalNombre}</strong>
            {tipoFilter ? ` · tipo ${stockItemTypeLabel(tipoFilter)}` : ''}
          </p>
        ) : (
          <p className="pad muted small" style={{ paddingTop: 0 }}>
            Vista global del catálogo — elija una sucursal para filtrar por almacén (solo artículos con saldo en esa
            sucursal).
          </p>
        )}

        {listErr ? <p className="pad" style={{ color: 'var(--danger, #b00020)' }}>{listErr}</p> : null}
        {listLoading ? <p className="muted pad">Cargando…</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Unidad</th>
                {sucursalIdForFilter != null ? <th>Saldo disp.</th> : null}
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tipo = inferStockItemType(r)
                return (
                  <tr
                    key={r.id}
                    className={selectedId === r.id ? 'inv-row-selected' : undefined}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td>
                      <span className="tag">{stockItemTypeLabel(tipo)}</span>
                    </td>
                    <td className="small">{esc(r.sku)}</td>
                    <td className="small">{esc(r.name)}</td>
                    <td>{esc(r.unit)}</td>
                    {sucursalIdForFilter != null ? <td>{esc(r.balanceOnHand)}</td> : null}
                    <td>{r.active === false ? 'No' : 'Sí'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && !listLoading ? (
            <p className="muted pad">
              {sucursalIdForFilter != null
                ? 'Sin stock en esta sucursal para el filtro actual.'
                : 'Sin artículos en esta página.'}
            </p>
          ) : null}
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
              <dt>Tipo</dt>
              <dd>{stockItemTypeLabel(inferStockItemType(detail.item))}</dd>
              <dt>SKU</dt>
              <dd>{esc(detail.item.sku)}</dd>
              <dt>Nombre</dt>
              <dd>{esc(detail.item.name)}</dd>
              <dt>Unidad</dt>
              <dd>{esc(detail.item.unit)}</dd>
              <dt>Saldo disponible {sucursalIdForFilter ? 'en sucursal' : 'global'}</dt>
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
            <p className="muted small pad" style={{ marginTop: '1rem' }}>
              Los movimientos aparecen al registrar palés en almacén, al cerrar palés con piezas y al despachar guías con
              palés.
            </p>
            <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem', paddingLeft: '1rem' }}>
              Últimos movimientos (kardex)
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
                        Sin movimientos{sucursalIdForFilter ? ' en esta sucursal' : ''}.
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
