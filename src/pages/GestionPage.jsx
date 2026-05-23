import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { useAppAbility } from '../access/useAppAbility'
import { useAuth } from '../auth/AuthContext'
import { AdminToolsPage } from './AdminToolsPage'
import { GestionFlotaPanel } from './GestionFlotaPanel'
import { ModuleHeader, ModulePage, ModuleTabs } from '../components/module/ModuleChrome.jsx'

const ADMIN_PANELS = new Set(['employees', 'roles', 'ubicaciones', 'audit'])

function resolveGestionTab(raw) {
  const valid = ['vehiculos', 'auditoria', 'employees', 'roles', 'ubicaciones', 'audit']
  if (raw && valid.includes(raw)) {
    return raw
  }
  return 'vehiculos'
}

export function GestionPage() {
  const { allowedDashboard } = useAuth()
  const ability = useAppAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [vehiculoToEdit, setVehiculoToEdit] = useState(null)

  const section = resolveGestionTab(searchParams.get('tab'))
  const isAdminPanel = ADMIN_PANELS.has(section)

  const inventarioGuiasHref = allowedDashboard
    ? `/dashboard/${allowedDashboard}/inventario?area=guias`
    : '/inventario?area=guias'

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
    const fromUrl = resolveGestionTab(searchParams.get('tab'))
    const rawVeh = searchParams.get('vehiculo')
    if (rawVeh) {
      const id = Number(rawVeh)
      if (Number.isFinite(id) && id > 0) {
        setVehiculoToEdit(id)
        if (fromUrl !== 'vehiculos') {
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
  }, [searchParams, selectSection, setSearchParams])

  const tabs = [
    { id: 'vehiculos', label: 'Vehículos', feature: FEATURE.TRANSPORT_VEHICLES },
    { id: 'auditoria', label: 'Auditoría flota', feature: FEATURE.TRANSPORT_AUDIT },
    { id: 'employees', label: 'Empleados', feature: FEATURE.EMPLOYEE_ADMIN },
    { id: 'roles', label: 'Roles', feature: FEATURE.EMPLOYEE_ADMIN },
    { id: 'ubicaciones', label: 'Sucursales / ubicaciones', feature: FEATURE.EMPLOYEE_ADMIN },
    { id: 'audit', label: 'Auditoría sistema', feature: FEATURE.EMPLOYEE_ADMIN },
  ].filter((t) => ability.can('view', t.feature) || ability.can('manage', 'all'))

  return (
    <ModulePage>
      <ModuleHeader
        title="Gestión"
        lead={
          <>
            Flota, personal y catálogos del sistema. Las <strong>guías de despacho</strong> están en{' '}
            <Link to={inventarioGuiasHref}>Inventario → Guías de despacho</Link>.
          </>
        }
      />

      <ModuleTabs
        ariaLabel="Gestión"
        activeId={section}
        onChange={selectSection}
        tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
      />

      {isAdminPanel ? (
        <AdminToolsPage embedded panel={section} onPanelChange={selectSection} />
      ) : (
        <GestionFlotaPanel
          tab={section}
          initialVehiculoId={vehiculoToEdit}
          onVehiculoConsumed={() => setVehiculoToEdit(null)}
        />
      )}
    </ModulePage>
  )
}
