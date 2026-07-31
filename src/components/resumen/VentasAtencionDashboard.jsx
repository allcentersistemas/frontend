import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
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
  Calendar,
  Clock,
  Filter,
  LineChart,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { formatDuration } from '../../utils/durationFormat.js'
import { estadoTagClass, formatEstadoProyecto } from '../../utils/proyectoOptimizacion.js'
import {
  comparativeAverages,
  countByEstado,
  defaultVentasDateRange,
  employeePerformanceRows,
  employeeRowMatchesVendedor,
  ESTADO_KEYS,
  filterVentasProyectos,
  formatVentasPeriodLabel,
  rankProyectosByStage,
  splitPeriods,
  trendCount,
  trendDuration,
  VENTAS_PERIOD_PRESETS,
  VENTAS_STAGE_TABS,
  ventasDateRangeForDays,
  vendedorOptions,
} from '../../utils/ventasDashboardUtils.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const CHART_COLORS = {
  current: '#f59e0b',
  previous: '#94a3b8',
  enviado: '#f87171',
  atencion: '#2dd4bf',
  cotizado: '#38bdf8',
  vendido: '#86efac',
}

const DEFAULT_RANGE = defaultVentasDateRange()

const EMPLOYEE_SORT_COLS = [
  { id: 'label', label: 'Vendedor', type: 'string' },
  { id: 'total', label: 'Proyectos', type: 'number' },
  { id: 'avgAtencionMs', label: 'Captura', type: 'ms' },
  { id: 'avgCotizadoMs', label: 'Cotización', type: 'ms' },
  { id: 'avgVendidoMs', label: 'Cierre', type: 'ms' },
  { id: 'avgCicloTotalMs', label: 'Ciclo total', type: 'ms' },
]

function TrendBadge({ meta, invertGood }) {
  if (!meta) return null
  const good = invertGood ? !meta.up : meta.up
  const Icon = meta.up ? TrendingUp : TrendingDown
  return (
    <span className={`dash-kpi-trend ${good ? 'dash-kpi-trend--up' : 'dash-kpi-trend--down'}`}>
      <Icon size={14} aria-hidden />
      {meta.up ? '+' : '−'}
      {meta.pct.toFixed(1)}% {meta.label}
    </span>
  )
}

function KpiEstadoCard({ estado, count, trend }) {
  return (
    <div className={`dash-ventas-kpi card dash-ventas-kpi--${estado.toLowerCase()}`}>
      <p className="dash-kpi__title">
        <span className={estadoTagClass(estado)}>{formatEstadoProyecto(estado)}</span>
      </p>
      <p className="dash-kpi__value">{count}</p>
      <p className="dash-kpi__hint">proyectos en el período</p>
      {trend ? <TrendBadge meta={trend} /> : null}
    </div>
  )
}

function RankingList({ ranked, stageLabel, fast }) {
  return (
    <>
      <p className="dash-ventas-rank__stage muted small">{stageLabel}</p>
      <ul className="dash-ventas-rank">
        {ranked.length === 0 ? (
          <li className="dash-ventas-rank__empty muted small">Sin proyectos con tiempo registrado.</li>
        ) : (
          ranked.map(({ proyecto, ms }, index) => (
            <li key={proyecto.id} className="dash-ventas-rank__item">
              <span className="dash-ventas-rank__pos" aria-hidden>
                {index + 1}
              </span>
              <div className="dash-ventas-rank__info">
                <span className="dash-ventas-rank__name">{proyecto.nombre || `Proyecto #${proyecto.id}`}</span>
                <span className="dash-ventas-rank__meta">
                  {proyecto.vendedorNombre || 'Sin vendedor'} · {proyecto.cliente || '—'}
                </span>
              </div>
              <span className={`tag ${fast ? 'tag--ok' : 'tag--warn'}`}>{formatDuration(ms)}</span>
            </li>
          ))
        )}
      </ul>
    </>
  )
}

function StageTabBar({ activeId, onChange, ariaLabel }) {
  return (
    <div className="dash-ventas-stage-tabs" role="tablist" aria-label={ariaLabel}>
      {VENTAS_STAGE_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activeId === t.id}
          className={`dash-ventas-stage-tabs__btn ${activeId === t.id ? 'dash-ventas-stage-tabs__btn--on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function compareEmployeeRows(a, b, sortKey, sortDir) {
  const col = EMPLOYEE_SORT_COLS.find((c) => c.id === sortKey)
  const type = col?.type ?? 'ms'
  const av = a[sortKey]
  const bv = b[sortKey]
  let cmp = 0
  if (type === 'string') {
    cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'es')
  } else if (type === 'number') {
    cmp = (av ?? 0) - (bv ?? 0)
  } else {
    if (av == null && bv == null) cmp = 0
    else if (av == null) cmp = 1
    else if (bv == null) cmp = -1
    else cmp = av - bv
  }
  return sortDir === 'asc' ? cmp : -cmp
}

function EmployeePerformanceTable({ employees, vendedorKey }) {
  const [sortKey, setSortKey] = useState('avgCicloTotalMs')
  const [sortDir, setSortDir] = useState('asc')

  const sorted = useMemo(() => {
    const rows = [...employees]
    rows.sort((a, b) => compareEmployeeRows(a, b, sortKey, sortDir))
    return rows
  }, [employees, sortKey, sortDir])

  const onSort = (colId) => {
    if (sortKey === colId) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(colId)
      setSortDir(colId === 'label' ? 'asc' : 'asc')
    }
  }

  if (employees.length === 0) {
    return <p className="muted small">No hay proyectos con vendedor en el período seleccionado.</p>
  }

  return (
    <div className="dash-ventas-employee-table-wrap">
      <table className="dash-ventas-employee-table">
        <thead>
          <tr>
            {EMPLOYEE_SORT_COLS.map((col) => {
              const active = sortKey === col.id
              return (
                <th key={col.id} scope="col">
                  <button
                    type="button"
                    className={`dash-ventas-employee-table__sort ${active ? 'dash-ventas-employee-table__sort--on' : ''}`}
                    onClick={() => onSort(col.id)}
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {col.label}
                    {active ? <span aria-hidden>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span> : null}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((emp) => {
            const highlighted = employeeRowMatchesVendedor(emp, vendedorKey)
            return (
              <tr
                key={emp.key}
                className={highlighted ? 'dash-ventas-employee-table__row--active' : undefined}
              >
                <td className="dash-ventas-employee-table__name">{emp.label}</td>
                <td className="dash-ventas-employee-table__num">{emp.total}</td>
                <td className="dash-ventas-employee-table__num">{formatDuration(emp.avgAtencionMs)}</td>
                <td className="dash-ventas-employee-table__num">{formatDuration(emp.avgCotizadoMs)}</td>
                <td className="dash-ventas-employee-table__num">{formatDuration(emp.avgVendidoMs)}</td>
                <td className="dash-ventas-employee-table__num">{formatDuration(emp.avgCicloTotalMs)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Dashboard de tiempos de atención / ventas (proyectos de optimización).
 */
export function VentasAtencionDashboard({ proyectos = [], basePath, employee }) {
  const [fechaDesde, setFechaDesde] = useState(DEFAULT_RANGE.fechaDesde)
  const [fechaHasta, setFechaHasta] = useState(DEFAULT_RANGE.fechaHasta)
  const [periodPreset, setPeriodPreset] = useState('30')
  const [vendedorKey, setVendedorKey] = useState('')
  const [fastTab, setFastTab] = useState('atencion')
  const [slowTab, setSlowTab] = useState('atencion')

  const compareChartRef = useRef(null)
  const estadoChartRef = useRef(null)
  const compareChartInstance = useRef(null)
  const estadoChartInstance = useRef(null)

  const displayName =
    [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.email || 'Usuario'

  const periodLabel = useMemo(
    () => formatVentasPeriodLabel(fechaDesde, fechaHasta),
    [fechaDesde, fechaHasta],
  )

  const vendedores = useMemo(() => vendedorOptions(proyectos), [proyectos])

  const filtered = useMemo(
    () => filterVentasProyectos(proyectos, { fechaDesde, fechaHasta, vendedorKey }),
    [proyectos, fechaDesde, fechaHasta, vendedorKey],
  )

  const periods = useMemo(
    () => splitPeriods(proyectos, { fechaDesde, fechaHasta, vendedorKey }),
    [proyectos, fechaDesde, fechaHasta, vendedorKey],
  )

  const currentStats = useMemo(() => comparativeAverages(null, periods.current), [periods.current])
  const previousStats = useMemo(() => comparativeAverages(null, periods.previous), [periods.previous])

  const estadoCounts = useMemo(() => countByEstado(filtered), [filtered])

  const estadoTrends = useMemo(() => {
    const t = {}
    for (const key of ESTADO_KEYS) {
      t[key] = trendCount(currentStats.byEstado[key] ?? 0, previousStats.byEstado[key] ?? 0)
    }
    return t
  }, [currentStats, previousStats])

  const avgTrends = useMemo(
    () => ({
      atencion: trendDuration(currentStats.atencion, previousStats.atencion),
      cotizado: trendDuration(currentStats.cotizado, previousStats.cotizado),
      vendido: trendDuration(currentStats.vendido, previousStats.vendido),
      cicloTotal: trendDuration(currentStats.cicloTotal, previousStats.cicloTotal),
    }),
    [currentStats, previousStats],
  )

  const fastRanked = useMemo(
    () => rankProyectosByStage(filtered, fastTab, { fastest: true, limit: 5 }),
    [filtered, fastTab],
  )
  const slowRanked = useMemo(
    () => rankProyectosByStage(filtered, slowTab, { fastest: false, limit: 5 }),
    [filtered, slowTab],
  )

  const employees = useMemo(() => employeePerformanceRows(filtered), [filtered])

  const stageLabel = (id) => VENTAS_STAGE_TABS.find((t) => t.id === id)?.label ?? id

  const applyPreset = (preset) => {
    const range = ventasDateRangeForDays(preset.days)
    setFechaDesde(range.fechaDesde)
    setFechaHasta(range.fechaHasta)
    setPeriodPreset(preset.id)
  }

  const resetFilters = () => {
    const range = defaultVentasDateRange()
    setFechaDesde(range.fechaDesde)
    setFechaHasta(range.fechaHasta)
    setPeriodPreset('30')
    setVendedorKey('')
  }

  useEffect(() => {
    const ctx = compareChartRef.current?.getContext('2d')
    if (!ctx) return
    compareChartInstance.current?.destroy()
    const labels = VENTAS_STAGE_TABS.map((t) => t.label)
    const toHours = (ms) => (ms == null ? null : ms / 3600000)
    compareChartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: periods.currentLabel,
            data: [toHours(currentStats.atencion), toHours(currentStats.cotizado), toHours(currentStats.vendido)],
            backgroundColor: CHART_COLORS.current,
            borderRadius: 8,
          },
          {
            label: periods.previousLabel,
            data: [toHours(previousStats.atencion), toHours(previousStats.cotizado), toHours(previousStats.vendido)],
            backgroundColor: CHART_COLORS.previous,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const ms = ctx.raw == null ? null : ctx.raw * 3600000
                return `${ctx.dataset.label}: ${formatDuration(ms)}`
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Horas (promedio)' },
          },
        },
      },
    })
    return () => compareChartInstance.current?.destroy()
  }, [currentStats, previousStats, periods])

  useEffect(() => {
    const ctx = estadoChartRef.current?.getContext('2d')
    if (!ctx) return
    estadoChartInstance.current?.destroy()
    estadoChartInstance.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels: ESTADO_KEYS.map(formatEstadoProyecto),
        datasets: [
          {
            data: ESTADO_KEYS.map((k) => estadoCounts[k] ?? 0),
            backgroundColor: [
              CHART_COLORS.enviado,
              CHART_COLORS.atencion,
              CHART_COLORS.cotizado,
              CHART_COLORS.vendido,
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    })
    return () => estadoChartInstance.current?.destroy()
  }, [estadoCounts])

  return (
    <div className="dash dash-ventas">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">
            <LineChart size={28} className="dash-header__icon" aria-hidden />
            Ventas · tiempos de atención
          </h1>
          <p className="dash-header__lead">
            Seguimiento de proyectos de optimización para <strong>{displayName}</strong>: tiempos por etapa
            (envío → atención → cotizado → vendido). Los tiempos se muestran en segundos, horas o días según
            corresponda.
          </p>
        </div>
        <div className="dash-ventas-header-badges">
          <div className="dash-date-badge">
            <Calendar size={16} aria-hidden />
            <span>{periodLabel}</span>
          </div>
          <div className="dash-date-badge dash-ventas-count-badge">
            <span>
              {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <div className="dash-ventas-toolbar card">
        <div className="dash-ventas-toolbar__presets">
          <span className="small muted">Período rápido</span>
          <div className="dash-ventas-presets">
            {VENTAS_PERIOD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`dash-ventas-presets__btn ${periodPreset === preset.id ? 'dash-ventas-presets__btn--on' : ''}`}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dash-ventas-toolbar__filters">
          <label className="field dash-ventas-field">
            <span className="small">Desde</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value)
                setPeriodPreset('')
              }}
            />
          </label>
          <label className="field dash-ventas-field">
            <span className="small">Hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value)
                setPeriodPreset('')
              }}
            />
          </label>
          <label className="dash-filter">
            <Filter size={16} aria-hidden />
            <select value={vendedorKey} onChange={(e) => setVendedorKey(e.target.value)}>
              <option value="">Todos los vendedores</option>
              {vendedores.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn--ghost" onClick={resetFilters}>
            Restablecer
          </button>
          <Link to={`${basePath}/proyecto-optimizacion`} className="btn btn--ghost dash-ventas-toolbar__link">
            Ir a proyectos
          </Link>
        </div>
      </div>

      <div className="dash-kpi-grid dash-ventas-kpi-grid">
        {ESTADO_KEYS.map((estado) => (
          <KpiEstadoCard
            key={estado}
            estado={estado}
            count={estadoCounts[estado] ?? 0}
            trend={estadoTrends[estado]}
          />
        ))}
      </div>

      <div className="dash-charts-row">
        <div className="dash-chart card">
          <div className="dash-chart__head">
            <h3 className="dash-chart__title">
              <BarChart3 size={20} aria-hidden />
              Comparativa de tiempos promedio
            </h3>
            <span className="dash-chart__note">Actual vs período anterior · por etapa</span>
          </div>
          <div className="dash-chart__canvas">
            <canvas ref={compareChartRef} aria-label="Comparativa de tiempos promedio" />
          </div>
          <div className="dash-ventas-compare-legend">
            <span className="dash-ventas-legend-item">
              <span className="dash-ventas-legend-swatch dash-ventas-legend-swatch--current" aria-hidden />
              {periods.currentLabel}
            </span>
            <span className="dash-ventas-legend-item">
              <span className="dash-ventas-legend-swatch dash-ventas-legend-swatch--previous" aria-hidden />
              {periods.previousLabel}
            </span>
          </div>
        </div>

        <div className="dash-chart card">
          <div className="dash-chart__head">
            <h3 className="dash-chart__title">
              <Clock size={20} aria-hidden />
              Promedios y distribución
            </h3>
          </div>
          <div className="dash-ventas-avg-grid pad">
            <div className="dash-ventas-avg">
              <span className="small muted">Envío → atención</span>
              <strong>{formatDuration(currentStats.atencion)}</strong>
              {avgTrends.atencion ? <TrendBadge meta={avgTrends.atencion} invertGood /> : null}
            </div>
            <div className="dash-ventas-avg">
              <span className="small muted">Atención → cotizado</span>
              <strong>{formatDuration(currentStats.cotizado)}</strong>
              {avgTrends.cotizado ? <TrendBadge meta={avgTrends.cotizado} invertGood /> : null}
            </div>
            <div className="dash-ventas-avg">
              <span className="small muted">Cotizado → vendido</span>
              <strong>{formatDuration(currentStats.vendido)}</strong>
              {avgTrends.vendido ? <TrendBadge meta={avgTrends.vendido} invertGood /> : null}
            </div>
            <div className="dash-ventas-avg">
              <span className="small muted">Ciclo total</span>
              <strong>{formatDuration(currentStats.cicloTotal)}</strong>
              {avgTrends.cicloTotal ? <TrendBadge meta={avgTrends.cicloTotal} invertGood /> : null}
            </div>
          </div>
          <div className="dash-chart__canvas dash-chart__canvas--compact">
            <canvas ref={estadoChartRef} aria-label="Distribución por estado" />
          </div>
        </div>
      </div>

      <div className="dash-charts-row">
        <div className="dash-chart card">
          <div className="dash-chart__head">
            <h3 className="dash-chart__title">
              <Zap size={20} aria-hidden />
              Más rápidos
            </h3>
          </div>
          <StageTabBar activeId={fastTab} onChange={setFastTab} ariaLabel="Etapa para ranking rápido" />
          <div className="pad" style={{ paddingTop: 0 }}>
            <RankingList ranked={fastRanked} stageLabel={stageLabel(fastTab)} fast />
          </div>
        </div>

        <div className="dash-chart card">
          <div className="dash-chart__head">
            <h3 className="dash-chart__title">
              <Clock size={20} aria-hidden />
              Más lentos
            </h3>
          </div>
          <StageTabBar activeId={slowTab} onChange={setSlowTab} ariaLabel="Etapa para ranking lento" />
          <div className="pad" style={{ paddingTop: 0 }}>
            <RankingList ranked={slowRanked} stageLabel={stageLabel(slowTab)} fast={false} />
          </div>
        </div>
      </div>

      <section className="card pad dash-ventas-employees">
        <h2 className="card__title dash-ventas-employees__title">
          <Users size={22} aria-hidden />
          Rendimiento por vendedor
        </h2>
        <p className="dash-ventas-employees__note muted small">
          Promedios por etapa (solo proyectos con timestamps en ambos extremos)
        </p>
        <EmployeePerformanceTable employees={employees} vendedorKey={vendedorKey} />
      </section>
    </div>
  )
}
