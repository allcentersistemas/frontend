import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { FEATURE } from '../access/permissionCatalog'
import { canViewGestion, defaultInventoryPath } from '../access/permissions'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
import { canViewBackupMenu, roleNamesFromEmployee } from '../auth/roles'
import { AdminToolsPage } from './AdminToolsPage'
import { GestionAuditoriaPanel } from './GestionAuditoriaPanel.jsx'
import { GestionBackupPanel } from './GestionBackupPanel.jsx'
import { GestionClientesPanel } from './GestionClientesPanel.jsx'
import { GestionFlotaPanel } from './GestionFlotaPanel'
import { GestionProyectosPanel } from './GestionProyectosPanel.jsx'
import { ModulePage, ModuleTabs } from '../components/module/ModuleChrome.jsx'

const ADMIN_PANELS = new Set(['employees', 'roles', 'ubicaciones'])

function resolveGestionTab(raw, allowedIds) {
  if (raw === 'audit') raw = 'auditoria'
  const valid = ['vehiculos', 'auditoria', 'employees', 'roles', 'ubicaciones', 'clientes', 'proyectos', 'backups']
  if (raw && valid.includes(raw) && allowedIds.includes(raw)) return raw
  return allowedIds[0] ?? 'auditoria'
}

export function GestionPage() {
  const { allowedDashboard, employee } = useAuth()
  const ability = useAppAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [vehiculoToEdit, setVehiculoToEdit] = useState(null)

  const base = allowedDashboard ? `/dashboard/${allowedDashboard}` : '/dashboard/admin-produccion'
  const roleNames = useMemo(() => roleNamesFromEmployee(employee), [employee])

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
        { id: 'clientes', label: 'Clientes portal', feature: FEATURE.EMPLOYEE_ADMIN },
        { id: 'proyectos', label: 'Proyectos', feature: FEATURE.EMPLOYEE_ADMIN },
        { id: 'roles', label: 'Roles', feature: FEATURE.EMPLOYEE_ADMIN },
        { id: 'ubicaciones', label: 'Sucursales / ubicaciones', feature: FEATURE.EMPLOYEE_ADMIN },
        { id: 'backups', label: 'Backups', masterOnly: true },
      ].filter((t) => {
        if (t.masterOnly) return canViewBackupMenu(roleNames)
        if (ability.can('manage', 'all')) return true
        if (t.features?.length) return t.features.some((f) => ability.can('view', f))
        return ability.can('view', t.feature)
      }),
    [ability, roleNames],
  )

  const allowedIds = useMemo(() => tabs.map((t) => t.id), [tabs])
  const section = resolveGestionTab(searchParams.get('tab'), allowedIds)
  const isAdminPanel = ADMIN_PANELS.has(section)

  const inventarioGuiasHref = `${base}/inventario?area=guias`

  const selectSection = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', next)
          if (next !== 'vehiculos') {
            p.delete('vehiculo')
          }
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    const fromUrl = resolveGestionTab(searchParams.get('tab'), allowedIds)
    if (fromUrl !== section) {
      selectSection(fromUrl)
    }
    const rawVeh = searchParams.get('vehiculo')
    if (rawVeh) {
      const id = Number(rawVeh)
      if (Number.isFinite(id) && id > 0) {
        setVehiculoToEdit(id)
        if (fromUrl !== 'vehiculos' && allowedIds.includes('vehiculos')) {
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
  }, [searchParams, selectSection, setSearchParams, allowedIds, section])

  if (!canViewGestion(employee)) {
    return <Navigate to={defaultInventoryPath(base, employee)} replace />
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
      ) : section === 'clientes' ? (
        <GestionClientesPanel />
      ) : section === 'proyectos' ? (
        <GestionProyectosPanel />
      ) : section === 'backups' ? (
        <GestionBackupPanel />
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
