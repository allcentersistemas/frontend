import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import {
  BarChart3,
  Boxes,
  Calendar,
  ChartLine,
  Filter,
  Package,
  Search,
  Truck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#64748b']

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatDateLong(d = new Date()) {
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function monthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  if (!key) return '—'
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
}

function countInRange(items, getDate, daysStart, daysEnd) {
  const now = Date.now()
  const startMs = now - daysStart * 86400000
  const endMs = now - daysEnd * 86400000
  return items.filter((item) => {
    const raw = getDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= endMs && t < startMs
  }).length
}

function trendMeta(current, previous) {
  if (previous === 0) {
    return current > 0
      ? { pct: 100, up: true, label: 'nuevo período' }
      : { pct: 0, up: true, label: 'sin cambio' }
  }
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(pct), up: pct >= 0, label: 'vs 30 días anteriores' }
}

function TrendBadge({ meta }) {
  if (!meta) return null
  const Icon = meta.up ? TrendingUp : TrendingDown
  return (
    <span className={`dash-kpi-trend ${meta.up ? 'dash-kpi-trend--up' : 'dash-kpi-trend--down'}`}>
      <Icon size={14} aria-hidden />
      {meta.up ? '+' : '−'}
      {meta.pct.toFixed(1)}% {meta.label}
    </span>
  )
}

function KpiCard({ icon: Icon, title, value, hint, trend }) {
  return (
    <div className="dash-kpi card">
      <p className="dash-kpi__title">
        <Icon size={16} aria-hidden />
        {title}
      </p>
      <p className="dash-kpi__value">{value}</p>
      {hint ? <p className="dash-kpi__hint">{hint}</p> : null}
      {trend ? <TrendBadge meta={trend} /> : null}
    </div>
  )
}

function ChartPanel({ title, icon: Icon, note, children }) {
  return (
    <div className="dash-chart card">
      <div className="dash-chart__head">
        <h3 className="dash-chart__title">
          {Icon ? <Icon size={20} aria-hidden /> : null}
          {title}
        </h3>
        {note ? <span className="dash-chart__note">{note}</span> : null}
      </div>
      <div className="dash-chart__canvas">{children}</div>
    </div>
  )
}

function statusPill(estado) {
  const e = String(estado ?? '').toUpperCase()
  if (e === 'ESCANEADO') return 'tag tag--ok'
  if (e === 'CERRADO') return 'tag'
  if (e === 'PENDIENTE') return 'tag'
  return 'tag'
}

/**
 * Dashboard ejecutivo AllCenter — datos reales de palés, guías y producción Biesse.
 */
export function ResumenDashboard({ pallets = [], guias = [], scanStats = null, employee, basePath, roleNames = [] }) {
  const [search, setSearch] = useState('')
  const [estadoEnvioFilter, setEstadoEnvioFilter] = useState('all')
  const [enGuiaFilter, setEnGuiaFilter] = useState('all')

  const paleChartRef = useRef(null)
  const guiaChartRef = useRef(null)
  const paleChartInstance = useRef(null)
  const guiaChartInstance = useRef(null)

  const displayName =
    [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.email || 'Administrador'

  const metrics = useMemo(() => {
    const list = pallets
    const enGuia = list.filter((p) => p.enGuia).length
    const escaneados = list.filter((p) => String(p.estadoEnvio ?? '').toUpperCase() === 'ESCANEADO').length
    const disponibles = list.filter(
      (p) => String(p.estadoEnvio ?? '').toUpperCase() === 'ESCANEADO' && !p.enGuia,
    ).length
    const cerrados = list.filter((p) => String(p.estado ?? '').toUpperCase() === 'CERRADO').length

    const guiaList = guias
    const guiasCreadas = guiaList.filter((g) => String(g.estado ?? '').toUpperCase() === 'CREADA').length
    const guiasEnCamino = guiaList.filter((g) => String(g.estado ?? '').toUpperCase() === 'EN_CAMINO').length

    const pale30 = countInRange(list, (p) => p.fechaCreacion, 30, 0)
    const palePrev30 = countInRange(list, (p) => p.fechaCreacion, 60, 30)
    const guia30 = countInRange(guiaList, (g) => g.fechaCreacion, 30, 0)
    const guiaPrev30 = countInRange(guiaList, (g) => g.fechaCreacion, 60, 30)

    return {
      totalPales: list.length,
      enGuia,
      escaneados,
      disponibles,
      cerrados,
      totalGuias: guiaList.length,
      guiasCreadas,
      guiasEnCamino,
      scanPct: toNum(scanStats?.completion_percent),
      scannedParts: toNum(scanStats?.scanned_parts),
      pendingParts: toNum(scanStats?.pending_parts),
      totalOrders: toNum(scanStats?.total_orders),
      paleTrend: trendMeta(pale30, palePrev30),
      guiaTrend: trendMeta(guia30, guiaPrev30),
    }
  }, [pallets, guias, scanStats])

  const filteredPales = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return pallets.filter((p) => {
      const envio = String(p.estadoEnvio ?? '').toUpperCase()
      if (estadoEnvioFilter !== 'all' && envio !== estadoEnvioFilter) return false
      if (enGuiaFilter === 'yes' && !p.enGuia) return false
      if (enGuiaFilter === 'no' && p.enGuia) return false
      if (!needle) return true
      const haystack = [p.codigo, p.estado, p.estadoEnvio, p.ordenesResumen, p.guiaNumero, String(p.id ?? '')]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [pallets, search, estadoEnvioFilter, enGuiaFilter])

  const chartPaleByEnvio = useMemo(() => {
    const counts = {}
    for (const p of filteredPales) {
      const key = String(p.estadoEnvio ?? 'Sin estado').trim() || 'Sin estado'
      counts[key] = (counts[key] ?? 0) + 1
    }
    const labels = Object.keys(counts).sort()
    return { labels, data: labels.map((l) => counts[l]) }
  }, [filteredPales])

  const chartGuiaByMonth = useMemo(() => {
    const counts = new Map()
    for (const g of guias) {
      const key = monthKey(g.fechaCreacion)
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const sorted = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8)
    return {
      labels: sorted.map(([k]) => monthLabel(k)),
      data: sorted.map(([, v]) => v),
    }
  }, [guias])

  useEffect(() => {
    if (!paleChartRef.current) return undefined
    paleChartInstance.current?.destroy()
    const ctx = paleChartRef.current.getContext('2d')
    if (!ctx) return undefined
    paleChartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: chartPaleByEnvio.labels,
        datasets: [
          {
            label: 'Palés',
            data: chartPaleByEnvio.data,
            backgroundColor: CHART_COLORS,
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { intersect: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    })
    return () => {
      paleChartInstance.current?.destroy()
      paleChartInstance.current = null
    }
  }, [chartPaleByEnvio])

  useEffect(() => {
    if (!guiaChartRef.current) return undefined
    guiaChartInstance.current?.destroy()
    const ctx = guiaChartRef.current.getContext('2d')
    if (!ctx) return undefined
    guiaChartInstance.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: chartGuiaByMonth.labels,
        datasets: [
          {
            label: 'Guías creadas',
            data: chartGuiaByMonth.data,
            borderColor: '#d97706',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#b45309',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    })
    return () => {
      guiaChartInstance.current?.destroy()
      guiaChartInstance.current = null
    }
  }, [chartGuiaByMonth])

  const tableRows = useMemo(
    () =>
      [...filteredPales]
        .sort((a, b) => new Date(b.fechaCreacion ?? 0) - new Date(a.fechaCreacion ?? 0))
        .slice(0, 40),
    [filteredPales],
  )

  const estadoEnvioOptions = useMemo(() => {
    const set = new Set(pallets.map((p) => String(p.estadoEnvio ?? '').trim()).filter(Boolean))
    return [...set].sort()
  }, [pallets])

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">
            <BarChart3 size={28} className="dash-header__icon" aria-hidden />
            Resumen AllCenter
          </h1>
          <p className="dash-header__lead">
            Panel ejecutivo para <strong>{displayName}</strong>. Inventario vía palés y piezas; filtros en
            tiempo real.
          </p>
          <div className="dash-roles">
            {roleNames.map((name) => (
              <span key={name} className="tag">
                {name}
              </span>
            ))}
          </div>
        </div>
        <div className="dash-date-badge">
          <Calendar size={16} aria-hidden />
          <span>{formatDateLong()}</span>
          <span className="dash-date-badge__sep">·</span>
          <span>Operación en vivo</span>
        </div>
      </header>

      <div className="dash-kpi-grid">
        <KpiCard
          icon={Package}
          title="Palés registrados"
          value={metrics.totalPales.toLocaleString('es-CL')}
          hint={`${metrics.cerrados} cerrados`}
          trend={metrics.paleTrend}
        />
        <KpiCard
          icon={Truck}
          title="Disponibles para guía"
          value={metrics.disponibles.toLocaleString('es-CL')}
          hint={`${metrics.escaneados} escaneados`}
        />
        <KpiCard
          icon={Boxes}
          title="En guía de despacho"
          value={metrics.enGuia.toLocaleString('es-CL')}
          hint={`${metrics.totalGuias} guías totales`}
          trend={metrics.guiaTrend}
        />
        <KpiCard
          icon={ChartLine}
          title="Avance escaneo Biesse"
          value={`${metrics.scanPct.toFixed(1)}%`}
          hint={`${metrics.scannedParts} / ${metrics.scannedParts + metrics.pendingParts} partes`}
        />
      </div>

      <div className="dash-charts-row">
        <ChartPanel title="Palés por estado de envío" icon={BarChart3} note="Según filtros activos">
          <canvas ref={paleChartRef} aria-label="Gráfico de palés por estado de envío" />
        </ChartPanel>
        <ChartPanel title="Guías creadas por mes" icon={ChartLine} note="Últimos meses">
          <canvas ref={guiaChartRef} aria-label="Gráfico de guías por mes" />
        </ChartPanel>
      </div>

      <section className="dash-table-section card">
        <div className="dash-table-toolbar">
          <label className="dash-search">
            <Search size={18} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar código, orden o guía…"
            />
          </label>
          <label className="dash-filter">
            <Filter size={16} aria-hidden />
            <select value={estadoEnvioFilter} onChange={(e) => setEstadoEnvioFilter(e.target.value)}>
              <option value="all">Todos los estados envío</option>
              {estadoEnvioOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="dash-filter">
            <select value={enGuiaFilter} onChange={(e) => setEnGuiaFilter(e.target.value)}>
              <option value="all">En guía: todos</option>
              <option value="yes">Solo en guía</option>
              <option value="no">Sin guía</option>
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Código</th>
                <th>Estado</th>
                <th>Envío</th>
                <th>Piezas</th>
                <th>En guía</th>
                <th>Guía</th>
                <th>Creación</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted pad">
                    No hay palés que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                tableRows.map((p) => (
                  <tr key={p.id ?? p.codigo}>
                    <td>
                      <Link to={`${basePath}/inventario?area=pales`} className="linkish">
                        {p.codigo}
                      </Link>
                    </td>
                    <td>
                      <span className="tag">{p.estado ?? '—'}</span>
                    </td>
                    <td>
                      <span className={statusPill(p.estadoEnvio)}>{p.estadoEnvio ?? '—'}</span>
                    </td>
                    <td>{p.cantidadPiezas ?? 0}</td>
                    <td>{p.enGuia ? 'Sí' : 'No'}</td>
                    <td className="small">{p.guiaNumero ?? '—'}</td>
                    <td className="small">
                      {p.fechaCreacion
                        ? new Date(p.fechaCreacion).toLocaleString('es-CL', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="dash-table-footer muted small">
          Mostrando {tableRows.length} de {filteredPales.length} palés filtrados ·{' '}
          <Link to={`${basePath}/inventario?area=pales`} className="linkish">
            Ver todos los palés
          </Link>
          {' · '}
          <Link to={`${basePath}/inventario?area=guias`} className="linkish">
            Guías de despacho
          </Link>
        </p>
      </section>

      {scanStats ? (
        <section className="resumen-section">
          <h2 className="resumen-section__title">Producción (Biesse)</h2>
          <div className="resumen-grid">
            <div className="resumen-stat card pad">
              <p className="resumen-stat__label">Órdenes totales</p>
              <p className="resumen-stat__value">{metrics.totalOrders}</p>
            </div>
            <div className="resumen-stat card pad">
              <p className="resumen-stat__label">Partes pendientes</p>
              <p className="resumen-stat__value">{metrics.pendingParts}</p>
            </div>
            <div className="resumen-stat card pad">
              <p className="resumen-stat__label">Guías en camino</p>
              <p className="resumen-stat__value">{metrics.guiasEnCamino}</p>
            </div>
            <div className="resumen-stat card pad">
              <p className="resumen-stat__label">Guías creadas</p>
              <p className="resumen-stat__value">{metrics.guiasCreadas}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
