import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import * as biesseApi from '../api/biesseApi'
import * as systemApi from '../api/systemApi'
import { useAuth } from '../auth/AuthContext'
import { ResumenDashboard } from '../components/resumen/ResumenDashboard'
import { isSystemAdmin, roleDisplayName } from '../utils/adminAccess'
import { ModulePage } from '../components/module/ModuleChrome.jsx'

export function ResumenPage() {
  const { role } = useParams()
  const { employee } = useAuth()
  const base = `/dashboard/${role ?? 'admin-produccion'}`

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [pallets, setPallets] = useState([])
  const [guias, setGuias] = useState([])
  const [scanStats, setScanStats] = useState(null)

  const admin = isSystemAdmin(employee)

  const roleNames = useMemo(
    () => (employee?.roles ?? []).map((r) => roleDisplayName(r.name)),
    [employee?.roles],
  )

  useEffect(() => {
    if (!admin) return
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
  }, [admin])

  if (!admin) {
    return <Navigate to={`${base}/ordenes`} replace />
  }

  return (
    <ModulePage>
      {err ? (
        <p className="form-error pad" role="alert">
          {err}
        </p>
      ) : null}
      {loading ? (
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
    </ModulePage>
  )
}
