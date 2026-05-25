import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as systemApi from '../api/systemApi'
import { RmPhotoRow } from '../components/RmAuthPhoto.jsx'
import { DetailModal } from '../components/DetailModal.jsx'
import { categoriaLabel } from '../utils/stockCategoryLabels.js'
import { systemApiBase } from '../config/env'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { useAppAbility } from '../access/useAppAbility'
import { OrdersPage } from './OrdersPage'
import { PalesPage } from './PalesPage'
import {
  buildRmVehiculoMap,
  formatNumeroRegistro,
  rmVehiculoLabel,
  rowMatchesRmFilters,
  tipoRegistroLabel,
} from '../rm/inventoryRmUtils.js'
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
    const label = [placa, marca].filter(Boolean).join(' · ') || 'Vehículo de flota'
    m.set(id, label)
  }
  return m
}

function transporteLabel(transportById, transporteId) {
  if (transporteId == null || transporteId === '') return '—'
  const id = Number(transporteId)
  if (Number.isNaN(id)) return String(transporteId)
  return transportById.get(id) ?? '—'
}

function csvEscape(s) {
  const t = String(s ?? '')
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

const RM_LIST_PAGE_SIZE = 25
const EMPTY_RM_FILTERS = {
  q: '',
  fechaDesde: '',
  fechaHasta: '',
  tipoRegistro: '',
  placaChofer: '',
}

function downloadTextFile(filename, text) {
  const blob = new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportRmPageCsv(tab, rows, vehiculoById) {
  const q = tab
  let head
  let lines
  if (q === 'entradas') {
    head = ['numeroRegistro', 'fecha', 'hora', 'vehiculo', 'oc', 'guia', 'lineas', 'estado', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [
          r.numeroRegistro,
          r.fecha,
          r.hora,
          rmVehiculoLabel(vehiculoById, r.registroVehiculoId),
          r.ocNumero,
          r.guiaNumero,
          r.lineas ?? '',
          r.recepcionEstado,
          r.createdAt,
        ]
          .map((c) => csvEscape(c))
          .join(','),
      )
    }
  } else if (q === 'salidas') {
    head = ['numeroRegistro', 'fecha', 'horaCabecera', 'vehiculo', 'lineas', 'estado', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [
          r.numeroRegistro,
          r.fecha,
          r.horaCabecera,
          rmVehiculoLabel(vehiculoById, r.registroVehiculoId),
          r.lineas ?? '',
          r.recepcionEstado,
          r.createdAt,
        ]
          .map((c) => csvEscape(c))
          .join(','),
      )
    }
  } else if (q === 'vehiculos') {
    head = ['numeroRegistro', 'tipoRegistro', 'fecha', 'placa', 'chofer', 'marca', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [
          r.numeroRegistro,
          tipoRegistroLabel(r.tipoRegistro),
          r.fecha,
          r.placa,
          r.chofer,
          r.marca,
          r.createdAt,
        ]
          .map((c) => csvEscape(c))
          .join(','),
      )
    }
  } else {
    head = ['razonSocialNombre', 'decision', 'creado']
    lines = [head.join(',')]
    for (const r of rows) {
      lines.push(
        [r.razonSocialNombre, decisionLabel(r.decision), r.createdAt].map((c) => csvEscape(c)).join(','),
      )
    }
  }
  downloadTextFile(`inventario-rm-${tab}-filtrado.csv`, lines.join('\n'))
}

const TABS = [
  { id: 'entradas', label: 'Entradas' },
  { id: 'salidas', label: 'Salidas' },
  { id: 'vehiculos', label: 'Vehículos' },
  { id: 'actas', label: 'Actas NC' },
]

const INVENTORY_AREAS = [
  { id: 'ordenes', label: 'Órdenes Biesse', feature: FEATURE.BIESSE_ORDERS },
  { id: 'pales', label: 'Palés', feature: FEATURE.PALES_LIST },
  { id: 'guias', label: 'Guías de despacho', feature: FEATURE.INVENTORY_GUIAS },
  { id: 'stock', label: 'Almacén (stock)', feature: FEATURE.INVENTORY_STOCK },
  { id: 'rm', label: 'Recepción mercadería', feature: FEATURE.INVENTORY_RM },
]

function resolveAreaTab(raw, allowedIds) {
  if (raw && allowedIds.includes(raw)) return raw
  return allowedIds[0] ?? 'stock'
}

function canViewArea(ability, feature) {
  return ability.can(ACTION.VIEW, feature) || ability.can(ACTION.MANAGE, 'all')
}

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAppAbility()
  const allowedAreas = useMemo(
    () => INVENTORY_AREAS.filter((a) => canViewArea(ability, a.feature)),
    [ability],
  )
  const canView = allowedAreas.length > 0
  const canViewRm = canViewArea(ability, FEATURE.INVENTORY_RM)
  const canViewGuias = canViewArea(ability, FEATURE.INVENTORY_GUIAS)
  const canViewStock = canViewArea(ability, FEATURE.INVENTORY_STOCK)
  const canViewOrders = canViewArea(ability, FEATURE.BIESSE_ORDERS)
  const canViewPales = canViewArea(ability, FEATURE.PALES_LIST)
  const canViewTransportCatalog = ability.can('view', FEATURE.TRANSPORT_VEHICLES)

  const allowedIds = useMemo(() => allowedAreas.map((a) => a.id), [allowedAreas])

  const [areaTab, setAreaTabState] = useState(() =>
    resolveAreaTab(searchParams.get('area'), allowedIds.length ? allowedIds : ['stock']),
  )

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
          if (next !== 'pales') {
            p.delete('id')
            p.delete('mode')
          }
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
  const [rmFilters, setRmFilters] = useState(() => ({ ...EMPTY_RM_FILTERS }))

  const [tab, setTab] = useState('entradas')
  const [clientPage, setClientPage] = useState(0)

  const [allRows, setAllRows] = useState([])
  const [listTruncated, setListTruncated] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [listErr, setListErr] = useState(null)

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState(null)
  const [detailVehiculo, setDetailVehiculo] = useState(null)

  const [vehiculoById, setVehiculoById] = useState(() => new Map())
  const [vehiculoIndexErr, setVehiculoIndexErr] = useState(null)

  const [transportById, setTransportById] = useState(() => new Map())
  const [transportCatalogErr, setTransportCatalogErr] = useState(null)

  const filteredRows = useMemo(
    () => allRows.filter((r) => rowMatchesRmFilters(tab, r, vehiculoById, rmFilters)),
    [allRows, tab, vehiculoById, rmFilters],
  )
  const clientTotalPages = Math.max(1, Math.ceil(filteredRows.length / RM_LIST_PAGE_SIZE))
  const pagedRows = useMemo(() => {
    const start = clientPage * RM_LIST_PAGE_SIZE
    return filteredRows.slice(start, start + RM_LIST_PAGE_SIZE)
  }, [filteredRows, clientPage])

  useEffect(() => {
    const fromUrl = resolveAreaTab(searchParams.get('area'), allowedIds)
    setAreaTabState((current) => (current === fromUrl ? current : fromUrl))
  }, [searchParams, allowedIds])

  const loadVehiculoIndex = useCallback(async () => {
    if (!canViewRm || areaTab !== 'rm') return
    setVehiculoIndexErr(null)
    try {
      const { items } = await systemApi.fetchAllPaged(
        (p) => systemApi.listRegistrosVehiculo(p),
        { size: 100, maxItems: 3000 },
      )
      setVehiculoById(buildRmVehiculoMap(items))
    } catch (e) {
      setVehiculoById(new Map())
      setVehiculoIndexErr(e instanceof Error ? e.message : 'No se pudo cargar vehículos RM')
    }
  }, [canViewRm, areaTab])

  const loadList = useCallback(async () => {
    if (!canViewRm || areaTab !== 'rm') return
    setListLoading(true)
    setListErr(null)
    try {
      let listFn
      if (tab === 'entradas') listFn = systemApi.listRegistrosEntrada
      else if (tab === 'salidas') listFn = systemApi.listRegistrosSalida
      else if (tab === 'vehiculos') listFn = systemApi.listRegistrosVehiculo
      else listFn = systemApi.listActasConformidad
      const { items, truncated } = await systemApi.fetchAllPaged(listFn, { size: 100, maxItems: 2000 })
      setAllRows(items)
      setListTruncated(truncated)
    } catch (e) {
      setAllRows([])
      setListErr(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setListLoading(false)
    }
  }, [canViewRm, areaTab, tab])

  const loadTransportCatalog = useCallback(async () => {
    if (!canViewRm || areaTab !== 'rm' || !canViewTransportCatalog) {
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
  }, [canViewRm, areaTab, canViewTransportCatalog])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    void loadVehiculoIndex()
  }, [loadVehiculoIndex])

  useEffect(() => {
    void loadTransportCatalog()
  }, [loadTransportCatalog])

  useEffect(() => {
    setClientPage(0)
    setDetail(null)
    setDetailErr(null)
    setDetailVehiculo(null)
    setRmFilters({ ...EMPTY_RM_FILTERS })
  }, [tab])

  useEffect(() => {
    setClientPage(0)
  }, [rmFilters, tab])

  const openDetail = useCallback(
    async (id) => {
      if (!canViewRm) return
      setDetailLoading(true)
      setDetailErr(null)
      setDetailVehiculo(null)
      setDetail({ tab, id, data: null })
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
        const rvId = data?.registroVehiculoId
        if (rvId != null && tab !== 'vehiculos') {
          const cached = vehiculoById.get(Number(rvId))
          if (cached) {
            setDetailVehiculo(cached)
          } else {
            try {
              const v = await systemApi.getRegistroVehiculo(rvId)
              setDetailVehiculo(
                buildRmVehiculoMap([v]).get(Number(rvId)) ?? {
                  label: [v.placa, v.marca, v.chofer].filter(Boolean).join(' · ') || 'Vehículo RM',
                  placa: v.placa,
                  marca: v.marca,
                  chofer: v.chofer,
                  tipoRegistro: v.tipoRegistro,
                  numeroRegistro: v.numeroRegistro,
                },
              )
            } catch {
              setDetailVehiculo(null)
            }
          }
        }
      } catch (e) {
        setDetailErr(e instanceof Error ? e.message : 'Error al cargar detalle')
      } finally {
        setDetailLoading(false)
      }
    },
    [canViewRm, tab, vehiculoById],
  )

  const closeDetail = useCallback(() => {
    setDetail(null)
    setDetailErr(null)
    setDetailVehiculo(null)
    setDetailLoading(false)
  }, [])

  const detailModalTitle = useMemo(() => {
    if (!detail?.data) return detail?.id != null ? `Registro #${detail.id}` : 'Detalle'
    if (detail.tab === 'entradas') {
      return `Ingreso ${formatNumeroRegistro(detail.data.numeroRegistro)}`
    }
    if (detail.tab === 'salidas') {
      return `Salida ${formatNumeroRegistro(detail.data.numeroRegistro)}`
    }
    if (detail.tab === 'vehiculos') {
      return `Vehículo ${formatNumeroRegistro(detail.data.numeroRegistro)}`
    }
    return `Acta NC — ${esc(detail.data.razonSocialNombre)}`
  }, [detail])

  if (!canView) {
    return (
      <div className="card pad">
        <h1 className="card__title">Inventario</h1>
        <p className="muted">No tienes permiso para ver ninguna sección de inventario.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h1 className="card__title">Inventario</h1>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Guías de despacho, palés, stock de almacén y recepción de mercadería según tu rol.
        </p>
      </div>

      <div className="tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
        {allowedAreas.map((a) => (
          <button
            key={a.id}
            type="button"
            className={areaTab === a.id ? 'btn btn--primary' : 'btn btn--ghost'}
            onClick={() => setAreaTab(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {areaTab === 'ordenes' && canViewOrders ? (
        <OrdersPage embedded />
      ) : areaTab === 'pales' && canViewPales ? (
        <PalesPage embedded />
      ) : areaTab === 'guias' && canViewGuias ? (
        <InventoryGuiasPanel />
      ) : areaTab === 'stock' && canViewStock ? (
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
        {vehiculoIndexErr ? (
          <p className="small" style={{ marginTop: '0.5rem', color: 'var(--danger, #b00020)' }}>
            {vehiculoIndexErr} — el listado puede no mostrar placa/chofer en entradas y salidas.
          </p>
        ) : null}
        {transportCatalogErr ? (
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            {transportCatalogErr} — en salida no se mostrará el vehículo de flota (transporte interno).
          </p>
        ) : null}
        {canViewRm && !canViewTransportCatalog ? (
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
                void loadVehiculoIndex()
                void loadTransportCatalog()
              }}
            >
              Actualizar
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!filteredRows.length}
              onClick={() => exportRmPageCsv(tab, filteredRows, vehiculoById)}
            >
              CSV (filtrado)
            </button>
          </div>
          <div className="pad" style={{ paddingTop: 0 }}>
            <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
              <label className="field">
                <span className="small">Buscar</span>
                <input
                  type="search"
                  value={rmFilters.q}
                  onChange={(e) => setRmFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="N° registro, placa, OC, guía…"
                />
              </label>
              <label className="field">
                <span className="small">Placa / chofer / marca</span>
                <input
                  type="search"
                  value={rmFilters.placaChofer}
                  onChange={(e) => setRmFilters((f) => ({ ...f, placaChofer: e.target.value }))}
                  placeholder="Ej. ABC-123, Juan…"
                  disabled={tab === 'actas'}
                />
              </label>
              <label className="field">
                <span className="small">Desde</span>
                <input
                  type="date"
                  value={rmFilters.fechaDesde}
                  onChange={(e) => setRmFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
                />
              </label>
              <label className="field">
                <span className="small">Hasta</span>
                <input
                  type="date"
                  value={rmFilters.fechaHasta}
                  onChange={(e) => setRmFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
                />
              </label>
              {(tab === 'vehiculos' || tab === 'entradas' || tab === 'salidas') && (
                <label className="field">
                  <span className="small">Tipo registro</span>
                  <select
                    value={rmFilters.tipoRegistro}
                    onChange={(e) => setRmFilters((f) => ({ ...f, tipoRegistro: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="salida">Salida</option>
                  </select>
                </label>
              )}
              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <span className="small" style={{ visibility: 'hidden' }}>.</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setRmFilters({ ...EMPTY_RM_FILTERS })}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
            {listTruncated ? (
              <p className="small muted">Se cargaron como máximo 2000 registros. Ajusta filtros para acotar.</p>
            ) : null}
            <p className="small muted" style={{ margin: 0 }}>
              {filteredRows.length} registro{filteredRows.length !== 1 ? 's' : ''} tras filtros
              {allRows.length !== filteredRows.length ? ` (de ${allRows.length} cargados)` : ''}
            </p>
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
                      <th>N° registro</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Vehículo (RM)</th>
                      <th>OC / Guía</th>
                      <th>Estado</th>
                      <th>Líneas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
                        <td>{formatNumeroRegistro(r.numeroRegistro)}</td>
                        <td>{esc(r.fecha)}</td>
                        <td className="small">{esc(r.hora)}</td>
                        <td className="small">{rmVehiculoLabel(vehiculoById, r.registroVehiculoId)}</td>
                        <td className="small">
                          {esc(r.ocNumero)} / {esc(r.guiaNumero)}
                        </td>
                        <td className="small">{esc(r.recepcionEstado)}</td>
                        <td>{r.lineas ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === 'salidas' ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>N° registro</th>
                      <th>Fecha</th>
                      <th>Hora cab.</th>
                      <th>Vehículo (RM)</th>
                      <th>Estado</th>
                      <th>Líneas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
                        <td>{formatNumeroRegistro(r.numeroRegistro)}</td>
                        <td>{esc(r.fecha)}</td>
                        <td className="small">{esc(r.horaCabecera)}</td>
                        <td className="small">{rmVehiculoLabel(vehiculoById, r.registroVehiculoId)}</td>
                        <td className="small">{esc(r.recepcionEstado)}</td>
                        <td>{r.lineas ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === 'vehiculos' ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>N° registro</th>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Placa</th>
                      <th>Chofer</th>
                      <th>Marca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
                        <td>{formatNumeroRegistro(r.numeroRegistro)}</td>
                        <td>{tipoRegistroLabel(r.tipoRegistro)}</td>
                        <td>{esc(r.fecha)}</td>
                        <td>{esc(r.placa)}</td>
                        <td className="small">{esc(r.chofer)}</td>
                        <td className="small">{esc(r.marca)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === 'actas' ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Proveedor / razón social</th>
                      <th>Decisión</th>
                      <th>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r) => (
                      <tr
                        key={r.id}
                        className={detail?.id === r.id && detail?.tab === tab ? 'inv-row-selected' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(r.id)}
                      >
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
                  {allRows.length ? 'Ningún registro coincide con los filtros.' : 'No hay registros.'}
                </p>
              ) : null}
            </div>
          )}

          <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={clientPage <= 0 || listLoading}
              onClick={() => setClientPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <span className="muted small">
              Página {clientPage + 1} de {clientTotalPages}
              {filteredRows.length
                ? ` · filas ${clientPage * RM_LIST_PAGE_SIZE + 1}–${Math.min((clientPage + 1) * RM_LIST_PAGE_SIZE, filteredRows.length)} de ${filteredRows.length}`
                : ''}
            </span>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={listLoading || clientPage + 1 >= clientTotalPages}
              onClick={() => setClientPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>

      <DetailModal
        open={detail != null}
        title={detailModalTitle}
        subtitle="Recepción de mercadería (RM)"
        onClose={closeDetail}
      >
        {detailErr ? <p style={{ color: 'var(--danger, #b00020)' }}>{detailErr}</p> : null}
        {detailLoading ? <p className="muted">Cargando detalle…</p> : null}

          {detail?.tab === 'entradas' && detail.data ? (
            <div className="pad">
              <dl className="inv-dl">
                <dt>N° registro</dt>
                <dd>{formatNumeroRegistro(detail.data.numeroRegistro)}</dd>
                <dt>Fecha</dt>
                <dd>{esc(detail.data.fecha)}</dd>
                <dt>Hora</dt>
                <dd>{esc(detail.data.hora)}</dd>
                <dt>Vehículo (RM)</dt>
                <dd className="small">
                  {detailVehiculo?.label ?? rmVehiculoLabel(vehiculoById, detail.data.registroVehiculoId)}
                  {detailVehiculo?.tipoRegistro ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      Tipo: {tipoRegistroLabel(detailVehiculo.tipoRegistro)}
                    </span>
                  ) : null}
                </dd>
                <dt>OC</dt>
                <dd>{esc(detail.data.ocNumero)}</dd>
                <dt>Guía</dt>
                <dd>{esc(detail.data.guiaNumero)}</dd>
                <dt>Registrado por</dt>
                <dd className="small">{esc(detail.data.createdByEmail)}</dd>
                <dt>Creado</dt>
                <dd className="small">{formatDateTime(detail.data.createdAt)}</dd>
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
                </dd>
                <dt>Observaciones</dt>
                <dd className="small">{esc(detail.data.observaciones)}</dd>
              </dl>
              <p className="small" style={{ marginTop: '0.75rem' }}>
                Fotos documento
              </p>
              <RmPhotoRow urls={detail.data.documentoPhotoUrls} />
              <h3 className="card__title" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Líneas
              </h3>
              {(detail.data.detalles ?? []).map((d) => (
                <div key={d.id} className="card" style={{ marginTop: '0.75rem', padding: '0.75rem' }}>
                  <p className="small">
                    <strong>{esc(d.material)}</strong> — {esc(d.cantidad)} {esc(d.unidad)}
                    {d.categoriaCodigo ? (
                      <span className="muted"> · {categoriaLabel(d.categoriaCodigo)}</span>
                    ) : null}
                  </p>
                  {d.observaciones ? (
                    <p className="muted small">Obs.: {esc(d.observaciones)}</p>
                  ) : null}
                  <RmPhotoRow urls={d.photoUrls} />
                </div>
              ))}
            </div>
          ) : null}

          {detail?.tab === 'salidas' && detail.data ? (
            <div className="pad">
              <dl className="inv-dl">
                <dt>N° registro</dt>
                <dd>{formatNumeroRegistro(detail.data.numeroRegistro)}</dd>
                <dt>Fecha</dt>
                <dd>{esc(detail.data.fecha)}</dd>
                <dt>Hora cabecera</dt>
                <dd>{esc(detail.data.horaCabecera)}</dd>
                <dt>Vehículo (RM)</dt>
                <dd className="small">
                  {detailVehiculo?.label ?? rmVehiculoLabel(vehiculoById, detail.data.registroVehiculoId)}
                  {detailVehiculo?.tipoRegistro ? (
                    <span className="muted" style={{ display: 'block', marginTop: '0.2rem' }}>
                      Tipo: {tipoRegistroLabel(detailVehiculo.tipoRegistro)}
                    </span>
                  ) : null}
                </dd>
                <dt>Origen</dt>
                <dd>{esc(detail.data.origen)}</dd>
                <dt>Destino</dt>
                <dd>{esc(detail.data.destino)}</dd>
                <dt>N° guía</dt>
                <dd>{esc(detail.data.numeroGuia)}</dd>
                <dt>Orden de compra</dt>
                <dd>{esc(detail.data.ordenCompra)}</dd>
                <dt>Vehículo flota (salida)</dt>
                <dd className="small">{transporteLabel(transportById, detail.data.transporteId)}</dd>
                <dt>Chofer salida</dt>
                <dd className="small">
                  {detail.data.choferSalidaNombre != null && detail.data.choferSalidaNombre !== ''
                    ? esc(detail.data.choferSalidaNombre)
                    : '—'}
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
                </dd>
                <dt>Registrado por</dt>
                <dd className="small">{esc(detail.data.createdByEmail)}</dd>
                <dt>Creado</dt>
                <dd className="small">{formatDateTime(detail.data.createdAt)}</dd>
                <dt>Observaciones</dt>
                <dd className="small">{esc(detail.data.observaciones)}</dd>
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
                    <strong>{esc(d.materialProducto)}</strong> — {esc(d.cantidad)} {esc(d.unidad)}
                    {d.categoriaCodigo ? (
                      <span className="muted"> · {categoriaLabel(d.categoriaCodigo)}</span>
                    ) : null}
                  </p>
                  {d.hora ? (
                    <p className="muted small">Hora línea: {esc(d.hora)}</p>
                  ) : null}
                  {d.observaciones ? (
                    <p className="muted small">Obs.: {esc(d.observaciones)}</p>
                  ) : null}
                  <RmPhotoRow urls={d.photoUrls} />
                </div>
              ))}
            </div>
          ) : null}

          {detail?.tab === 'vehiculos' && detail.data ? (
            <div className="pad">
              <dl className="inv-dl">
                <dt>N° registro</dt>
                <dd>{formatNumeroRegistro(detail.data.numeroRegistro)}</dd>
                <dt>Tipo registro</dt>
                <dd>{tipoRegistroLabel(detail.data.tipoRegistro)}</dd>
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
                Entradas vinculadas
              </h3>
              <ul className="small" style={{ margin: '0.5rem 0 0 1rem' }}>
                {(detail.data.entradas ?? []).length === 0 ? (
                  <li className="muted">Sin entradas vinculadas a este vehículo.</li>
                ) : (
                  (detail.data.entradas ?? []).map((e) => (
                    <li key={e.id}>
                      {formatNumeroRegistro(e.numeroRegistro)} — {esc(e.fecha)} {esc(e.hora)} · OC {esc(e.ocNumero)} · Guía{' '}
                      {esc(e.guiaNumero)}
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
      </DetailModal>
      </>
      )}

    </div>
  )
}

