import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import * as biesseApi from '../api/biesseApi'
import * as systemApi from '../api/systemApi'
import { ACTION } from '../access/rolePermissions'
import { FEATURE } from '../access/permissionCatalog'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
import { ResumenDashboard } from '../components/resumen/ResumenDashboard'
import { roleDisplayName } from '../utils/adminAccess'
import { ModulePage } from '../components/module/ModuleChrome.jsx'

export function ResumenPage() {
  const { role } = useParams()
  const { employee } = useAuth()
  const ability = useAppAbility()
  const base = `/dashboard/${role ?? 'admin-produccion'}`

  const canViewResumen =
    ability.can(ACTION.VIEW, FEATURE.DASHBOARD_RESUMEN) || ability.can(ACTION.MANAGE, 'all')

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [pallets, setPallets] = useState([])
  const [guias, setGuias] = useState([])
  const [scanStats, setScanStats] = useState(null)

  const roleNames = useMemo(
    () => (employee?.roles ?? []).map((r) => roleDisplayName(r.name)),
    [employee?.roles],
  )

  useEffect(() => {
    if (!canViewResumen) return
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
  }, [canViewResumen])

  if (!canViewResumen) {
    return <Navigate to={`${base}/inventario?area=ordenes`} replace />
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
