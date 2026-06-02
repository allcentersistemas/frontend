import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { useAuth } from '../auth/AuthContext'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { CanButton } from '../components/CanButton'
import { DetailModal } from '../components/DetailModal'
import { categoriaLabel } from '../utils/stockCategoryLabels'
import { familiaLabel } from '../utils/familiaLabels'

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
  const [familias, setFamilias] = useState([])
  const [familiaDraft, setFamiliaDraft] = useState('')
  const [familiaSaving, setFamiliaSaving] = useState(false)
  const [familiaMsg, setFamiliaMsg] = useState(null)
  const [familiaErr, setFamiliaErr] = useState(null)

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
    void systemApi
      .listInventoryFamilias()
      .then((list) => setFamilias(Array.isArray(list) ? list : []))
      .catch(() => setFamilias([]))
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

  useEffect(() => {
    const code = detail?.item?.familiaCodigo
    setFamiliaDraft(code == null || code === '' ? '' : String(code))
    setFamiliaMsg(null)
    setFamiliaErr(null)
  }, [detail?.item?.id, detail?.item?.familiaCodigo])

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setDetailErr(null)
    setFamiliaMsg(null)
    setFamiliaErr(null)
  }

  async function saveFamilia() {
    if (selectedId == null) return
    setFamiliaSaving(true)
    setFamiliaMsg(null)
    setFamiliaErr(null)
    try {
      const updated = await systemApi.updateInventoryItemFamilia(selectedId, familiaDraft || null)
      setDetail((prev) => (prev?.item ? { ...prev, item: { ...prev.item, ...updated } } : prev))
      setListBody((prev) => {
        if (!prev?.content) return prev
        return {
          ...prev,
          content: prev.content.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
        }
      })
      setFamiliaMsg('Familia actualizada.')
    } catch (e) {
      setFamiliaErr(e instanceof Error ? e.message : 'No se pudo guardar la familia')
    } finally {
      setFamiliaSaving(false)
    }
  }

  function exportStockCsv() {
    const head = ['id', 'sku', 'name', 'unit', 'familiaCodigo', 'active', 'createdAt']
    const lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [r.id, r.sku, r.name, r.unit, r.familiaCodigo, r.active, r.createdAt]
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
          Consulta de kardex por sucursal. Asigne familia <strong>Tablero</strong> o <strong>Canto</strong> en el detalle
          del artículo para que aparezca en la planilla de corte del portal cliente. El stock se actualiza al crear
          palés, cerrarlos con piezas y al despachar guías.
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
                <th>Familia</th>
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
                  <td className="small">{familiaLabel(r.familiaCodigo)}</td>
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
              <dt>Familia (planilla cliente)</dt>
              <dd>{familiaLabel(detail.item.familiaCodigo)}</dd>
              <dt>Saldo disponible {sucursalIdForDetail ? 'en sucursal' : 'global'}</dt>
              <dd>{esc(detail.balanceOnHand)}</dd>
            </dl>
            <Can I={ACTION.UPDATE} a={FEATURE.INVENTORY_STOCK}>
              <div
                className="pad"
                style={{
                  marginTop: '1rem',
                  borderTop: '1px solid var(--border, #e5e7eb)',
                  paddingTop: '1rem',
                }}
              >
                <h3 className="card__title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                  Familia para planilla de corte
                </h3>
                <p className="muted small" style={{ marginBottom: '0.75rem' }}>
                  Los artículos con familia Tablero o Canto se listan en el portal del cliente al capturar detalles de
                  orden. Sin familia, solo aplican reglas por prefijo de SKU (TAB/TBL/CANT).
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                  <label className="field" style={{ flex: '1 1 220px', margin: 0 }}>
                    <span>Familia</span>
                    <select
                      value={familiaDraft}
                      onChange={(e) => setFamiliaDraft(e.target.value)}
                      disabled={familiaSaving}
                    >
                      <option value="">Sin familia</option>
                      {familias.map((f) => (
                        <option key={f.codigo} value={f.codigo}>
                          {f.etiqueta ?? f.codigo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <CanButton
                    I={ACTION.UPDATE}
                    a={FEATURE.INVENTORY_STOCK}
                    className="btn btn--primary"
                    disabled={familiaSaving}
                    onClick={() => void saveFamilia()}
                  >
                    {familiaSaving ? 'Guardando…' : 'Guardar familia'}
                  </CanButton>
                </div>
                {familiaMsg ? (
                  <p className="small" style={{ color: 'var(--success, #0d7a3e)', marginTop: '0.5rem' }}>
                    {familiaMsg}
                  </p>
                ) : null}
                {familiaErr ? (
                  <p className="small" style={{ color: 'var(--danger, #b00020)', marginTop: '0.5rem' }}>
                    {familiaErr}
                  </p>
                ) : null}
              </div>
            </Can>
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
              palés. No se registran ajustes manuales ni materiales sueltos en ingreso/salida RM.
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
