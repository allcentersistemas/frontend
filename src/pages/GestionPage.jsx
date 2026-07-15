import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FEATURE } from '../access/permissionCatalog'
import { canAccessGestionHub, defaultDashboardPath } from '../access/permissions'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
import { canViewBackupMenu, canViewGestionMenu, roleNamesFromEmployee } from '../auth/roles'
import { AdminToolsPage } from './AdminToolsPage'
import { GestionAuditoriaPanel } from './GestionAuditoriaPanel.jsx'
import { GestionBackupPanel } from './GestionBackupPanel.jsx'
import { GestionConfigPanel } from './GestionConfigPanel.jsx'
import { GestionClientesPanel } from './GestionClientesPanel.jsx'
import { GestionFlotaPanel } from './GestionFlotaPanel'
import { GestionProyectosPanel } from './GestionProyectosPanel.jsx'
import { ModulePage, ModuleTabs } from '../components/module/ModuleChrome.jsx'

const ADMIN_PANELS = new Set(['employees', 'roles', 'ubicaciones'])
const CLIENTE_PORTAL_TAB = 'cliente-portal'

function normalizeGestionTab(raw) {
  if (raw === 'audit') return 'auditoria'
  if (raw === 'clientes') return CLIENTE_PORTAL_TAB
  return raw
}

function resolveGestionTab(raw, allowedIds) {
  const tab = normalizeGestionTab(raw)
  const valid = [
    'vehiculos',
    'auditoria',
    'employees',
    'roles',
    'ubicaciones',
    CLIENTE_PORTAL_TAB,
    'proyectos',
    'backups',
    'configuracion',
  ]
  if (tab && valid.includes(tab) && allowedIds.includes(tab)) return tab
  return allowedIds[0] ?? 'auditoria'
}

export function GestionPage({ initialSection } = {}) {
  const { allowedDashboard, employee } = useAuth()
  const ability = useAppAbility()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [vehiculoToEdit, setVehiculoToEdit] = useState(null)

  const base = allowedDashboard ? `/dashboard/${allowedDashboard}` : '/dashboard/admin-produccion'
  const roleNames = useMemo(() => roleNamesFromEmployee(employee), [employee])
  const onClientePortalPath = location.pathname.endsWith('/cliente-portal')

  const tabs = useMemo(
    () =>
      [
        { id: 'vehiculos', label: 'Vehículos', feature: FEATURE.TRANSPORT_VEHICLES },
        {
          id: 'auditoria',
          label: 'Auditoría',
          features: [
            FEATURE.BIESSE_AUDIT,
            FEATURE.PALES_AUDIT,
            FEATURE.TRANSPORT_AUDIT,
            FEATURE.BIESSE_STICKER_AUDIT,
            FEATURE.EMPLOYEE_ADMIN,
          ],
        },
        { id: 'employees', label: 'Empleados', feature: FEATURE.EMPLOYEE_ADMIN },
        { id: CLIENTE_PORTAL_TAB, label: 'Cliente portal', feature: FEATURE.GESTION_CLIENTES_PORTAL },
        { id: 'proyectos', label: 'Proyectos', feature: FEATURE.GESTION_PROYECTOS },
        { id: 'roles', label: 'Roles', feature: FEATURE.EMPLOYEE_ADMIN },
        { id: 'ubicaciones', label: 'Sucursales / ubicaciones', feature: FEATURE.EMPLOYEE_ADMIN },
        { id: 'backups', label: 'Backups', masterOnly: true },
        { id: 'configuracion', label: 'Configuración', gestionOnly: true },
      ].filter((t) => {
        if (t.masterOnly) return canViewBackupMenu(roleNames)
        if (t.gestionOnly) return canViewGestionMenu(roleNames)
        if (ability.can('manage', 'all')) return true
        if (t.features?.length) return t.features.some((f) => ability.can('view', f))
        return ability.can('view', t.feature)
      }),
    [ability, roleNames],
  )

  const allowedIds = useMemo(() => tabs.map((t) => t.id), [tabs])
  const forcedSection =
    initialSection === CLIENTE_PORTAL_TAB || onClientePortalPath ? CLIENTE_PORTAL_TAB : null
  const section =
    forcedSection && allowedIds.includes(forcedSection)
      ? forcedSection
      : resolveGestionTab(searchParams.get('tab'), allowedIds)
  const isAdminPanel = ADMIN_PANELS.has(section)

  const inventarioGuiasHref = `${base}/inventario?area=guias`
  const clientePortalHref = `${base}/gestion/cliente-portal`

  const selectSection = useCallback(
    (next) => {
      if (next === CLIENTE_PORTAL_TAB) {
        const cliente = searchParams.get('cliente')
        const q = cliente ? `?cliente=${cliente}` : ''
        navigate(`${clientePortalHref}${q}`, { replace: true })
        return
      }
      if (onClientePortalPath) {
        const p = new URLSearchParams()
        p.set('tab', next)
        navigate(`${base}/gestion?${p}`)
        return
      }
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', next)
          if (next !== 'vehiculos') {
            p.delete('vehiculo')
          }
          if (next !== CLIENTE_PORTAL_TAB) {
            p.delete('cliente')
          }
          return p
        },
        { replace: true },
      )
    },
    [base, clientePortalHref, navigate, onClientePortalPath, searchParams, setSearchParams],
  )

  useEffect(() => {
    const tab = normalizeGestionTab(searchParams.get('tab'))
    if ((tab === CLIENTE_PORTAL_TAB || searchParams.get('tab') === 'clientes') && !onClientePortalPath) {
      const cliente = searchParams.get('cliente')
      const q = cliente ? `?cliente=${cliente}` : ''
      navigate(`${clientePortalHref}${q}`, { replace: true })
      return
    }

    if (!onClientePortalPath) {
      const fromUrl = resolveGestionTab(searchParams.get('tab'), allowedIds)
      if (fromUrl !== section) {
        selectSection(fromUrl)
      }
    }

    const rawVeh = searchParams.get('vehiculo')
    if (rawVeh) {
      const id = Number(rawVeh)
      if (Number.isFinite(id) && id > 0) {
        setVehiculoToEdit(id)
        if (section !== 'vehiculos' && allowedIds.includes('vehiculos')) {
          selectSection('vehiculos')
        }
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev)
            p.delete('vehiculo')
            p.set('tab', 'vehiculos')
            return p
          },
          { replace: true },
        )
      }
    }
  }, [
    searchParams,
    selectSection,
    setSearchParams,
    allowedIds,
    section,
    onClientePortalPath,
    navigate,
    clientePortalHref,
  ])

  if (!canAccessGestionHub(employee)) {
    return <Navigate to={defaultDashboardPath(allowedDashboard, employee)} replace />
  }

  return (
    <ModulePage>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h1 className="card__title">Gestión</h1>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Flota, personal, <strong>auditoría centralizada</strong> y catálogos. Las <strong>guías de despacho</strong> están en{' '}
          <Link to={inventarioGuiasHref} className="linkish">
            Inventario → Guías de despacho
          </Link>
          . Los usuarios del portal cliente se administran en{' '}
          <Link to={clientePortalHref} className="linkish">
            Cliente portal
          </Link>
          .
        </p>
      </div>

      <ModuleTabs
        ariaLabel="Gestión"
        activeId={section}
        onChange={selectSection}
        tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
      />

      {section === 'auditoria' ? (
        <GestionAuditoriaPanel />
      ) : section === CLIENTE_PORTAL_TAB ? (
        <GestionClientesPanel />
      ) : section === 'proyectos' ? (
        <GestionProyectosPanel />
      ) : section === 'backups' ? (
        <GestionBackupPanel />
      ) : section === 'configuracion' ? (
        <GestionConfigPanel />
      ) : isAdminPanel ? (
        <AdminToolsPage embedded panel={section} onPanelChange={selectSection} />
      ) : (
        <GestionFlotaPanel
          initialVehiculoId={vehiculoToEdit}
          onVehiculoConsumed={() => setVehiculoToEdit(null)}
        />
      )}
    </ModulePage>
  )
}
