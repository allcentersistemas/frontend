import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import * as biesseApi from '../api/biesseApi'
import * as systemApi from '../api/systemApi'
import {
  canViewResumen,
  canViewResumenPage,
  canViewVentasResumen,
  defaultDashboardPath,
} from '../access/permissions'
import { useAuth } from '../auth/AuthContext'
import { ResumenDashboard } from '../components/resumen/ResumenDashboard'
import { VentasAtencionDashboard } from '../components/resumen/VentasAtencionDashboard'
import { ModulePage, ModuleTabs } from '../components/module/ModuleChrome.jsx'
import { roleDisplayName } from '../utils/adminAccess'

function buildResumenTabs(showOperacion, showVentas) {
  const tabs = []
  if (showOperacion) tabs.push({ id: 'operacion', label: 'Operación' })
  if (showVentas) tabs.push({ id: 'ventas', label: 'Ventas' })
  return tabs
}

export function ResumenPage() {
  const { role } = useParams()
  const { employee, allowedDashboard } = useAuth()
  const base = `/dashboard/${role ?? allowedDashboard ?? 'admin-produccion'}`
  const showOperacion = canViewResumen(employee)
  const showVentas = canViewVentasResumen(employee)
  const showPage = canViewResumenPage(employee)

  const resumenTabs = useMemo(() => buildResumenTabs(showOperacion, showVentas), [showOperacion, showVentas])
  const [activeTab, setActiveTab] = useState(() => resumenTabs[0]?.id ?? 'operacion')
  const [loading, setLoading] = useState(true)
  const [ventasLoading, setVentasLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [ventasErr, setVentasErr] = useState(null)
  const [pallets, setPallets] = useState([])
  const [guias, setGuias] = useState([])
  const [scanStats, setScanStats] = useState(null)
  const [proyectos, setProyectos] = useState([])

  const roleNames = useMemo(
    () => (employee?.roles ?? []).map((r) => roleDisplayName(r.name)),
    [employee?.roles],
  )

  useEffect(() => {
    if (!resumenTabs.some((t) => t.id === activeTab)) {
      setActiveTab(resumenTabs[0]?.id ?? 'operacion')
    }
  }, [activeTab, resumenTabs])

  useEffect(() => {
    if (!showPage || !showOperacion) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const [pList, gList, stats] = await Promise.all([
          systemApi.listPallets(),
          systemApi.listGuias(),
          biesseApi.generalScanStats().catch(() => null),
        ])
        if (!cancelled) {
          setPallets(Array.isArray(pList) ? pList : [])
          setGuias(Array.isArray(gList) ? gList : [])
          setScanStats(stats && typeof stats === 'object' ? stats : null)
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'No se pudo cargar el resumen')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showPage, showOperacion])

  useEffect(() => {
    if (!showPage || !showVentas || activeTab !== 'ventas') return
    let cancelled = false
    ;(async () => {
      setVentasLoading(true)
      setVentasErr(null)
      try {
        const list = await systemApi.listProyectosOptimizacion({ scope: 'todos' })
        if (!cancelled) setProyectos(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) {
          setVentasErr(e instanceof Error ? e.message : 'No se pudieron cargar los proyectos')
        }
      } finally {
        if (!cancelled) setVentasLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showPage, showVentas, activeTab])

  if (!showPage) {
    return (
      <Navigate
        to={defaultDashboardPath(allowedDashboard ?? role ?? 'admin-produccion', employee)}
        replace
      />
    )
  }

  const operacionBusy = loading && activeTab === 'operacion'
  const ventasBusy = ventasLoading && activeTab === 'ventas'

  return (
    <ModulePage>
      {resumenTabs.length > 1 ? (
        <div className="dash" style={{ paddingTop: '1rem' }}>
          <ModuleTabs
            tabs={resumenTabs}
            activeId={activeTab}
            onChange={setActiveTab}
            ariaLabel="Secciones del resumen"
          />
        </div>
      ) : null}

      {activeTab === 'operacion' && showOperacion ? (
        <>
          {err ? (
            <p className="form-error pad" role="alert">
              {err}
            </p>
          ) : null}
          {operacionBusy ? (
            <div className="app-loading" style={{ minHeight: '40vh' }}>
              <div className="app-loading__spinner" aria-hidden />
              <p className="text-sm">Cargando panel de resumen…</p>
            </div>
          ) : (
            <ResumenDashboard
              pallets={pallets}
              guias={guias}
              scanStats={scanStats}
              employee={employee}
              basePath={base}
              roleNames={roleNames}
            />
          )}
        </>
      ) : null}

      {activeTab === 'ventas' && showVentas ? (
        <>
          {ventasErr ? (
            <p className="form-error pad" role="alert">
              {ventasErr}
            </p>
          ) : null}
          {ventasBusy ? (
            <div className="app-loading" style={{ minHeight: '40vh' }}>
              <div className="app-loading__spinner" aria-hidden />
              <p className="text-sm">Cargando datos de ventas…</p>
            </div>
          ) : (
            <VentasAtencionDashboard proyectos={proyectos} basePath={base} employee={employee} />
          )}
        </>
      ) : null}
    </ModulePage>
  )
}
