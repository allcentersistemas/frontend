import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import * as systemApi from '../api/systemApi'
import { RmPhotoRow } from '../components/RmAuthPhoto.jsx'
import { systemApiBase } from '../config/env'
import { FEATURE } from '../access/permissionCatalog'
import { useAppAbility } from '../access/useAppAbility'
import { InventoryGuiasPanel } from './InventoryGuiasPanel.jsx'
import { StockAlmacenPanel } from './StockAlmacenPanel.jsx'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
}

const DECISION_LABEL = {
  RECHAZO_TOTAL: 'Rechazo total',
  RECHAZO_PARCIAL: 'Rechazo parcial',
  RECEPCION_CONDICIONADA: 'Recepción condicionada',
  DEVOLUCION_INMEDIATA: 'Devolución inmediata',
}

function decisionLabel(code) {
  if (!code) return '—'
  const k = String(code).trim().toUpperCase()
  return DECISION_LABEL[k] ?? code
}

/** Mapa transporteId → texto corto (placa · marca) para filas y detalle de entradas RM. */
function buildTransportLabelMap(list) {
  const m = new Map()
  if (!Array.isArray(list)) return m
  for (const v of list) {
    if (v == null || v.transporteId == null) continue
    const id = Number(v.transporteId)
    if (Number.isNaN(id)) continue
    const placa = typeof v.placa === 'string' ? v.placa.trim() : ''
    const marca = typeof v.marca === 'string' ? v.marca.trim() : ''
    const label = [placa, marca].filter(Boolean).join(' · ') || `ID ${id}`
    m.set(id, label)
  }
  return m
}

function transporteLabel(transportById, transporteId) {
  if (transporteId == null || transporteId === '') return '—'
  const id = Number(transporteId)
  if (Number.isNaN(id)) return String(transporteId)
  return transportById.get(id) ?? `ID ${id}`
}

function csvEscape(s) {
  const t = String(s ?? '')
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

function haystack(...parts) {
  return parts
    .filter((p) => p != null && p !== '')
    .join(' ')
    .toLowerCase()
}

function rowMatchesRmFilter(tab, row, transportById, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (tab === 'entradas') {
    const tidLabel = transporteLabel(transportById, row.transporteId)
    return haystack(row.id, row.fecha, row.hora, row.transporteId, tidLabel, row.lineas, row.createdAt).includes(q)
  }
  if (tab === 'salidas') {
    return haystack(row.id, row.fecha, row.horaCabecera, row.lineas, row.createdAt).includes(q)
  }
  if (tab === 'vehiculos') {
    return haystack(row.id, row.fecha, row.placa, row.chofer, row.marca, row.createdAt).includes(q)
  }
  return haystack(row.id, row.razonSocialNombre, row.decision, row.createdAt).includes(q)
}

function downloadTextFile(filename, text) {
  const blob = new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportRmPageCsv(tab, rows, transportById) {
  const q = tab
  let head
  let lines
  if (q === 'entradas') {
    head = ['id', 'fecha', 'hora', 'transporteId', 'vehiculo', 'lineas', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      const label = transporteLabel(transportById, r.transporteId)
      lines.push(
        [r.id, r.fecha, r.hora, r.transporteId ?? '', label, r.lineas ?? '', r.createdAt]
          .map((c) => csvEscape(c))
          .join(','),
      )
    }
  } else if (q === 'salidas') {
    head = ['id', 'fecha', 'horaCabecera', 'lineas', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      lines.push([r.id, r.fecha, r.horaCabecera, r.lineas ?? '', r.createdAt].map((c) => csvEscape(c)).join(','))
    }
  } else if (q === 'vehiculos') {
    head = ['id', 'fecha', 'placa', 'chofer', 'marca', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      lines.push([r.id, r.fecha, r.placa, r.chofer, r.marca, r.createdAt].map((c) => csvEscape(c)).join(','))
    }
  } else {
    head = ['id', 'razonSocialNombre', 'decision', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [r.id, r.razonSocialNombre, decisionLabel(r.decision), r.createdAt].map((c) => csvEscape(c)).join(','),
      )
    }
  }
  downloadTextFile(`inventario-rm-${tab}-pagina.csv`, lines.join('\n'))
}

const TABS = [
  { id: 'entradas', label: 'Entradas (MP)' },
  { id: 'salidas', label: 'Salidas' },
  { id: 'vehiculos', label: 'Vehículos (RM)' },
  { id: 'actas', label: 'Actas NC' },
]

function resolveAreaTab(raw) {
  if (raw === 'guias' || raw === 'stock' || raw === 'rm') return raw
  return 'rm'
}

export function InventoryPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAppAbility()
  const canView = ability.can('view', FEATURE.INVENTORY)
  const canViewTransportCatalog = ability.can('view', FEATURE.TRANSPORT_VEHICLES)

  const [areaTab, setAreaTabState] = useState(() => resolveAreaTab(searchParams.get('area')))

  const setAreaTab = useCallback(
    (next) => {
      setAreaTabState(next)
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'rm') {
            p.delete('area')
          } else {
            p.set('area', next)
          }
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
  const [listFilter, setListFilter] = useState('')

  const [tab, setTab] = useState('entradas')
  const [page, setPage] = useState(0)
  const pageSize = 15

  const [listBody, setListBody] = useState(null)
  const [listLoading, setListLoading] = useState(false)
  const [listErr, setListErr] = useState(null)

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState(null)

  const [transportById, setTransportById] = useState(() => new Map())
  const [transportCatalogErr, setTransportCatalogErr] = useState(null)

  const rows = useMemo(() => systemApi.pageContent(listBody), [listBody])
  const meta = useMemo(() => systemApi.pageMeta(listBody), [listBody])
  const filteredRows = useMemo(
    () => rows.filter((r) => rowMatchesRmFilter(tab, r, transportById, listFilter)),
    [rows, tab, transportById, listFilter],
  )

  useEffect(() => {
    const fromUrl = resolveAreaTab(searchParams.get('area'))
    setAreaTabState((current) => (current === fromUrl ? current : fromUrl))
  }, [searchParams])

  const gestionVehiculoHref = useCallback(
    (transporteId) =>
      `${location.pathname.replace(/\/inventario\/?$/, '/gestion')}?vehiculo=${encodeURIComponent(String(transporteId))}`,
    [location.pathname],
  )

  const loadList = useCallback(async () => {
    if (!canView || areaTab !== 'rm') return
    setListLoading(true)
    setListErr(null)
    try {
      let body
      if (tab === 'entradas') {
        body = await systemApi.listRegistrosEntrada({ page, size: pageSize })
      } else if (tab === 'salidas') {
        body = await systemApi.listRegistrosSalida({ page, size: pageSize })
      } else if (tab === 'vehiculos') {
        body = await systemApi.listRegistrosVehiculo({ page, size: pageSize })
      } else {
        body = await systemApi.listActasConformidad({ page, size: pageSize })
      }
      setListBody(body)
    } catch (e) {
      setListBody(null)
      setListErr(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setListLoading(false)
    }
  }, [canView, areaTab, tab, page, pageSize])

  const loadTransportCatalog = useCallback(async () => {
    if (!canView || areaTab !== 'rm' || !canViewTransportCatalog) {
      setTransportById(new Map())
      setTransportCatalogErr(null)
      return
    }
    setTransportCatalogErr(null)
    try {
      const list = await systemApi.listTransporteVehiculos()
      setTransportById(buildTransportLabelMap(list))
    } catch (e) {
      setTransportById(new Map())
      setTransportCatalogErr(e instanceof Error ? e.message : 'No se pudo cargar la flota')
    }
  }, [canView, areaTab, canViewTransportCatalog])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    void loadTransportCatalog()
  }, [loadTransportCatalog])

  useEffect(() => {
    setPage(0)
    setDetail(null)
    setDetailErr(null)
    setListFilter('')
  }, [tab])

  const openDetail = useCallback(
    async (id) => {
      if (!canView) return
      setDetailLoading(true)
      setDetailErr(null)
      setDetail(null)
      try {
        let data
        if (tab === 'entradas') {
          data = await systemApi.getRegistroEntrada(id)
        } else if (tab === 'salidas') {
          data = await systemApi.getRegistroSalida(id)
        } else if (tab === 'vehiculos') {
          data = await systemApi.getRegistroVehiculo(id)
        } else {
          data = await systemApi.getActaConformidad(id)
        }
        setDetail({ tab, id, data })
      } catch (e) {
        setDetailErr(e instanceof Error ? e.message : 'Error al cargar detalle')
      } finally {
        setDetailLoading(false)
      }
    },
    [canView, tab],
  )

  if (!canView) {
    return (
      <div className="card pad">
        <h1 className="card__title">Inventario / recepción</h1>
        <p className="muted">No tienes permiso para ver este módulo.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
        <button
          type="button"
          className={areaTab === 'rm' ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => setAreaTab('rm')}
        >
          Recepción RM (app)
        </button>
        <button
          type="button"
          className={areaTab === 'stock' ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => setAreaTab('stock')}
        >
          Almacén (stock)
        </button>
        <button
          type="button"
          className={areaTab === 'guias' ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => setAreaTab('guias')}
        >
          Guías de despacho
        </button>
      </div>

      {areaTab === 'guias' ? (
        <InventoryGuiasPanel />
      ) : areaTab === 'stock' ? (
        <>
          <div className="card pad" style={{ marginBottom: '1rem' }}>
            <h1 className="card__title">Inventario · almacén</h1>
            <p className="muted small" style={{ marginTop: '0.35rem' }}>
              API <code>module-system</code>:{' '}
              <code className="small">{systemApiBase}</code> (<code>VITE_SYSTEM_API_BASE</code>).
            </p>
          </div>
          <StockAlmacenPanel />
        </>
      ) : (
        <>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h1 className="card__title">Inventario / recepción (module-system)</h1>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Consulta de registros enviados desde la app móvil. RM:{' '}
          <code className="small">{systemApiBase}</code>
          {' · '}
          Flota (vehículos en entradas RM): <code className="small">{systemApiBase}</code>.
        </p>
        {transportCatalogErr ? (
          <p className="small" style={{ marginTop: '0.5rem', color: 'var(--danger, #b00020)' }}>
            {transportCatalogErr} — en entradas solo verás el ID de vehículo hasta que la API de flota responda.
          </p>
        ) : null}
        {canView && !canViewTransportCatalog ? (
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            Sin permiso de flota: en entradas se muestra el ID de vehículo. Pide acceso a «Gestión · vehículos» si
            necesitas placa y marca.
          </p>
        ) : null}
      </div>

      <div className="tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'btn btn--primary' : 'btn btn--ghost'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="split">
        <div className="card">
          <div className="pad" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <h2 className="card__title" style={{ margin: 0 }}>
              Listado
            </h2>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={listLoading}
              onClick={() => {
                void loadList()
                void loadTransportCatalog()
              }}
            >
              Actualizar
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!filteredRows.length}
              onClick={() => exportRmPageCsv(tab, filteredRows, transportById)}
            >
              CSV (vista)
            </button>
          </div>
          <div className="pad" style={{ paddingTop: 0 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="small">Filtrar filas visibles (texto libre)</span>
              <input
                type="search"
                value={listFilter}
                onChange={(e) => setListFilter(e.target.value)}
                placeholder="Ej. placa, ID, fecha…"
              />
            </label>
          </div>
          {listErr ? <p className="pad" style={{ color: 'var(--danger, #b00020)' }}>{listErr}</p> : null}
          {listLoading ? (
            <p className="muted pad">Cargando…</p>
          ) : (
            <div className="table-wrap">
              {tab === 'entradas' ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Vehículo</th>
                      <th>Líneas</th>
                      <th>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
                        <td>{r.id}</td>
                        <td>{esc(r.fecha)}</td>
                        <td className="small">{esc(r.hora)}</td>
                        <td className="small" title={r.transporteId != null ? `ID ${r.transporteId}` : ''}>
                          {transporteLabel(transportById, r.transporteId)}
                        </td>
                        <td>{r.lineas ?? '—'}</td>
                        <td className="small">{formatDateTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === 'salidas' ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Hora cab.</th>
                      <th>Líneas</th>
                      <th>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
                        <td>{r.id}</td>
                        <td>{esc(r.fecha)}</td>
                        <td className="small">{esc(r.horaCabecera)}</td>
                        <td>{r.lineas ?? '—'}</td>
                        <td className="small">{formatDateTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === 'vehiculos' ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Placa</th>
                      <th>Chofer</th>
                      <th>Marca</th>
                      <th>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
                        <td>{r.id}</td>
                        <td>{esc(r.fecha)}</td>
                        <td>{esc(r.placa)}</td>
                        <td className="small">{esc(r.chofer)}</td>
                        <td className="small">{esc(r.marca)}</td>
                        <td className="small">{formatDateTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === 'actas' ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Proveedor / razón social</th>
                      <th>Decisión</th>
                      <th>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
                        <td>{r.id}</td>
                        <td className="small">{esc(r.razonSocialNombre)}</td>
                        <td className="small">{decisionLabel(r.decision)}</td>
                        <td className="small">{formatDateTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {!filteredRows.length && !listErr ? (
                <p className="muted pad">
                  {rows.length ? 'Ninguna fila coincide con el filtro de esta página.' : 'No hay registros en esta página.'}
                </p>
              ) : null}
            </div>
          )}

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
              Página {meta.number + 1} de {Math.max(1, meta.totalPages)} · {meta.totalElements} registros
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

        <div className="card detail-panel">
          <h2 className="card__title pad">Detalle</h2>
          {detailErr ? <p className="pad" style={{ color: 'var(--danger, #b00020)' }}>{detailErr}</p> : null}
          {detailLoading ? <p className="muted pad">Cargando detalle…</p> : null}
          {!detailLoading && !detail && !detailErr ? (
            <p className="muted pad">Selecciona una fila para ver el detalle y las fotos.</p>
          ) : null}

          {detail?.tab === 'entradas' && detail.data ? (
            <div className="pad">
              <dl className="inv-dl">
                <dt>ID</dt>
                <dd>{detail.data.id}</dd>
                <dt>Fecha</dt>
                <dd>{esc(detail.data.fecha)}</dd>
                <dt>Hora</dt>
                <dd>{esc(detail.data.hora)}</dd>
                <dt>Vehículo</dt>
                <dd className="small">
                  {transporteLabel(transportById, detail.data.transporteId)}
                  {detail.data.transporteId != null ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      ID flota: {detail.data.transporteId}
                    </span>
                  ) : null}
                  {detail.data.transporteId != null && canViewTransportCatalog ? (
                    <span className="small" style={{ display: 'block', marginTop: '0.35rem' }}>
                      <Link to={gestionVehiculoHref(detail.data.transporteId)}>Abrir en Gestión</Link>
                    </span>
                  ) : null}
                </dd>
                <dt>Registrado por</dt>
                <dd className="small">{esc(detail.data.createdByEmail)}</dd>
                <dt>Creado</dt>
                <dd className="small">{formatDateTime(detail.data.createdAt)}</dd>
                <dt>Chofer ingreso</dt>
                <dd className="small">
                  {detail.data.choferIngresoNombre != null && detail.data.choferIngresoNombre !== ''
                    ? esc(detail.data.choferIngresoNombre)
                    : '—'}
                  {detail.data.choferIngresoEmpleadoId != null ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      Empleado id: {detail.data.choferIngresoEmpleadoId}
                    </span>
                  ) : null}
                </dd>
                <dt>Kilometraje ingreso</dt>
                <dd>{esc(detail.data.kilometrajeIngreso)}</dd>
                <dt>Recepción</dt>
                <dd className="small">
                  {esc(detail.data.recepcionEstado)}
                  {detail.data.validadoAt != null ? (
                    <span style={{ display: 'block', marginTop: '0.25rem' }}>
                      Validado: {formatDateTime(detail.data.validadoAt)} · {esc(detail.data.validadoPorEmail)}
                    </span>
                  ) : null}
                </dd>
                <dt>Chofer validación</dt>
                <dd className="small">
                  {detail.data.choferValidacionNombre != null && detail.data.choferValidacionNombre !== ''
                    ? esc(detail.data.choferValidacionNombre)
                    : '—'}
                  {detail.data.choferValidacionEmpleadoId != null ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      Empleado id: {detail.data.choferValidacionEmpleadoId}
                    </span>
                  ) : null}
                </dd>
              </dl>
              <p className="small" style={{ marginTop: '0.75rem' }}>
                Fotos vehículo (cabecera)
              </p>
              <RmPhotoRow urls={detail.data.cabeceraVehiculoPhotoUrls} />
              <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Líneas
              </h3>
              {(detail.data.detalles ?? []).map((d) => (
                <div key={d.id} className="card" style={{ marginTop: '0.75rem', padding: '0.75rem' }}>
                  <p className="small">
                    <strong>{esc(d.proveedor)}</strong> — {esc(d.material)}
                  </p>
                  <p className="muted small">
                    OC: {esc(d.ocNumero)} · Guía: {esc(d.guiaNumero)} · Color/modelo: {esc(d.colorModelo)} · Cant.:{' '}
                    {esc(d.cantidadRecibida)} · Unidad: {esc(d.unidad)}
                  </p>
                  <RmPhotoRow urls={d.photoUrls} />
                </div>
              ))}
            </div>
          ) : null}

          {detail?.tab === 'salidas' && detail.data ? (
            <div className="pad">
              <dl className="inv-dl">
                <dt>ID</dt>
                <dd>{detail.data.id}</dd>
                <dt>Fecha</dt>
                <dd>{esc(detail.data.fecha)}</dd>
                <dt>Hora cabecera</dt>
                <dd>{esc(detail.data.horaCabecera)}</dd>
                <dt>Vehículo</dt>
                <dd className="small">
                  {transporteLabel(transportById, detail.data.transporteId)}
                  {detail.data.transporteId != null ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      ID flota: {detail.data.transporteId}
                    </span>
                  ) : null}
                </dd>
                <dt>Chofer salida</dt>
                <dd className="small">
                  {detail.data.choferSalidaNombre != null && detail.data.choferSalidaNombre !== ''
                    ? esc(detail.data.choferSalidaNombre)
                    : '—'}
                  {detail.data.choferSalidaEmpleadoId != null ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      Empleado id: {detail.data.choferSalidaEmpleadoId}
                    </span>
                  ) : null}
                </dd>
                <dt>Recepción / validación</dt>
                <dd className="small">
                  {esc(detail.data.recepcionEstado)}
                  {detail.data.validadoAt != null ? (
                    <span style={{ display: 'block', marginTop: '0.25rem' }}>
                      Validado: {formatDateTime(detail.data.validadoAt)} · {esc(detail.data.validadoPorEmail)}
                    </span>
                  ) : null}
                </dd>
                <dt>Chofer validación</dt>
                <dd className="small">
                  {detail.data.choferValidacionNombre != null && detail.data.choferValidacionNombre !== ''
                    ? esc(detail.data.choferValidacionNombre)
                    : '—'}
                  {detail.data.choferValidacionEmpleadoId != null ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      Empleado id: {detail.data.choferValidacionEmpleadoId}
                    </span>
                  ) : null}
                </dd>
                <dt>Registrado por</dt>
                <dd className="small">{esc(detail.data.createdByEmail)}</dd>
                <dt>Creado</dt>
                <dd className="small">{formatDateTime(detail.data.createdAt)}</dd>
              </dl>
              <p className="small" style={{ marginTop: '0.75rem' }}>
                Fotos cabecera
              </p>
              <RmPhotoRow urls={detail.data.cabeceraPhotoUrls} />
              <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Líneas
              </h3>
              {(detail.data.detalles ?? []).map((d) => (
                <div key={d.id} className="card" style={{ marginTop: '0.75rem', padding: '0.75rem' }}>
                  <p className="small">
                    <strong>{esc(d.destino)}</strong> — {esc(d.materialProducto)} · {esc(d.cantidad)} {esc(d.unidad)}
                  </p>
                  <p className="muted small">
                    Hora línea: {esc(d.hora)} · RQM: {esc(d.noRqmVale)} · Guía: {esc(d.noGuia)} · Recibe:{' '}
                    {esc(d.recibeFirma)} · Entrega RCI: {esc(d.entregaRci)}
                  </p>
                  <RmPhotoRow urls={d.photoUrls} />
                </div>
              ))}
            </div>
          ) : null}

          {detail?.tab === 'vehiculos' && detail.data ? (
            <div className="pad">
              <dl className="inv-dl">
                <dt>ID</dt>
                <dd>{detail.data.id}</dd>
                <dt>Fecha</dt>
                <dd>{esc(detail.data.fecha)}</dd>
                <dt>Placa</dt>
                <dd>{esc(detail.data.placa)}</dd>
                <dt>Marca</dt>
                <dd>{esc(detail.data.marca)}</dd>
                <dt>Chofer</dt>
                <dd>{esc(detail.data.chofer)}</dd>
                <dt>Hora ingreso / salida</dt>
                <dd className="small">
                  {esc(detail.data.horaIngreso)} / {esc(detail.data.horaSalida)}
                </dd>
                <dt>Kilometraje</dt>
                <dd>{esc(detail.data.kilometraje)}</dd>
                <dt>Registrado por</dt>
                <dd className="small">{esc(detail.data.createdByEmail)}</dd>
                <dt>Creado</dt>
                <dd className="small">{formatDateTime(detail.data.createdAt)}</dd>
              </dl>
              <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Productos transportados
              </h3>
              <ul className="small" style={{ margin: '0.5rem 0 0 1rem' }}>
                {(detail.data.productos ?? []).length === 0 ? (
                  <li className="muted">Sin productos en el registro (registros antiguos).</li>
                ) : (
                  (detail.data.productos ?? []).map((p, i) => (
                    <li key={i}>
                      {esc(p.materialProducto)} — {esc(p.cantidad)} {esc(p.unidad)}
                    </li>
                  ))
                )}
              </ul>
              <p className="small" style={{ marginTop: '0.75rem' }}>
                Fotos
              </p>
              <RmPhotoRow urls={detail.data.photoUrls} />
            </div>
          ) : null}

          {detail?.tab === 'actas' && detail.data ? (
            <div className="pad">
              <dl className="inv-dl">
                <dt>ID</dt>
                <dd>{detail.data.id}</dd>
                <dt>Razón social</dt>
                <dd>{esc(detail.data.razonSocialNombre)}</dd>
                <dt>Guía remisión</dt>
                <dd>{esc(detail.data.guiaRemisionNum)}</dd>
                <dt>Factura / OC</dt>
                <dd>{esc(detail.data.facturaOrdenCompraNum)}</dd>
                <dt>Transportista</dt>
                <dd className="small">{esc(detail.data.transportistaNombrePlaca)}</dd>
                <dt>Decisión</dt>
                <dd>{decisionLabel(detail.data.decision)}</dd>
                <dt>Cant. conforme (parcial)</dt>
                <dd>{detail.data.cantidadConformeUnidades ?? '—'}</dd>
                <dt>Obs. decisión</dt>
                <dd className="small">{esc(detail.data.observacionesDecision)}</dd>
                <dt>Registrado por</dt>
                <dd className="small">{esc(detail.data.createdByEmail)}</dd>
                <dt>Creado</dt>
                <dd className="small">{formatDateTime(detail.data.createdAt)}</dd>
              </dl>
              <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Tipos de no conformidad
              </h3>
              <ul className="small" style={{ margin: '0.5rem 0 0 1rem' }}>
                {(detail.data.tipos ?? []).map((t) => (
                  <li key={t.tipo}>
                    {t.marcado ? '☑' : '☐'} {esc(t.tipo)}
                    {t.detalle ? ` — ${esc(t.detalle)}` : ''}
                  </li>
                ))}
              </ul>
              <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Descripción ampliada
              </h3>
              <pre className="card__pre" style={{ whiteSpace: 'pre-wrap' }}>
                {esc(detail.data.descripcionAmpliada)}
              </pre>
              <p className="small" style={{ marginTop: '0.75rem' }}>
                Fotos
              </p>
              <RmPhotoRow urls={detail.data.photoUrls} />
            </div>
          ) : null}
        </div>
      </div>
      </>
      )}

      <style>{`
        .inv-dl { display: grid; grid-template-columns: 140px 1fr; gap: 0.35rem 1rem; margin: 0; }
        .inv-dl dt { margin: 0; color: var(--text-muted, #666); font-size: 0.85rem; }
        .inv-dl dd { margin: 0; font-size: 0.9rem; }
        tr.inv-row-selected { background: var(--surface-2, rgba(0,0,0,0.06)); }
        .inv-photo-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
        .inv-photo-row img,
        .inv-photo-thumb { max-width: 160px; max-height: 160px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border, #e5e4e7); }
      `}</style>
    </div>
  )
}

