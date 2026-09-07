import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ACTION } from '../access/rolePermissions'
import { useAppAbility } from '../access/useAppAbility'
import { ModuleHeader, ModuleTabs } from '../components/module/ModuleChrome.jsx'
import { OrdersPage } from './OrdersPage'
import { BiesseMonitorPanel } from './BiesseMonitorPanel.jsx'
import { PalesPage } from './PalesPage'
import { INVENTORY_AREAS } from './inventoryAreas.js'

const AREAS = INVENTORY_AREAS.filter((a) => a.group === 'produccion')

function canViewArea(ability, feature) {
  return ability.can(ACTION.VIEW, feature) || ability.can(ACTION.MANAGE, 'all')
}

function resolveAreaTab(raw, allowedIds) {
  if (raw && allowedIds.includes(raw)) return raw
  return allowedIds[0] ?? null
}

export function ProduccionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAppAbility()
  const allowedAreas = useMemo(() => AREAS.filter((a) => canViewArea(ability, a.feature)), [ability])
  const allowedIds = useMemo(() => allowedAreas.map((a) => a.id), [allowedAreas])

  const areaTab = useMemo(
    () => resolveAreaTab(searchParams.get('area'), allowedIds),
    [searchParams, allowedIds],
  )

  const setAreaTab = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('area', next)
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

  if (!allowedAreas.length) {
    return (
      <div className="card pad">
        <h1 className="card__title">Producción</h1>
        <p className="muted">No tienes permiso para ver ninguna sección de producción.</p>
      </div>
    )
  }

  return (
    <div>
      <ModuleHeader title="Producción" lead="Órdenes Biesse, monitor de seccionadores y palés según tu rol." />
      <ModuleTabs tabs={allowedAreas} activeId={areaTab} onChange={setAreaTab} ariaLabel="Áreas de producción" />
      {areaTab === 'ordenes' ? <OrdersPage embedded /> : null}
      {areaTab === 'monitor' ? <BiesseMonitorPanel /> : null}
      {areaTab === 'pales' ? <PalesPage embedded /> : null}
    </div>
  )
}
