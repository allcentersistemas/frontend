import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FEATURE } from '../access/permissionCatalog'
import { useAppAbility } from '../access/useAppAbility'
import { OrderAuditPanel } from '../components/OrderAuditPanel.jsx'
import { PaleAuditPanel } from '../components/PaleAuditPanel.jsx'
import { StickerAuditPanel } from '../components/StickerAuditPanel.jsx'
import { TransportAuditPanel } from '../components/TransportAuditPanel.jsx'
import { UnifiedAuditPanel } from '../components/UnifiedAuditPanel.jsx'
import { ModuleTabs } from '../components/module/ModuleChrome.jsx'

const AUDIT_VIEWS = [
  { id: 'todas', label: 'Todas las fuentes', feature: FEATURE.EMPLOYEE_ADMIN },
  { id: 'ordenes', label: 'Órdenes Biesse', feature: FEATURE.BIESSE_AUDIT },
  { id: 'stickers', label: 'Impresión stickers', feature: FEATURE.BIESSE_STICKER_AUDIT },
  { id: 'pales', label: 'Palés', feature: FEATURE.PALES_AUDIT },
  { id: 'flota', label: 'Flota', feature: FEATURE.TRANSPORT_AUDIT },
]

function resolveAuditView(raw, allowedIds) {
  if (raw && allowedIds.includes(raw)) return raw
  return allowedIds[0] ?? 'todas'
}

export function GestionAuditoriaPanel() {
  const ability = useAppAbility()
  const [searchParams, setSearchParams] = useSearchParams()

  const allowedViews = useMemo(
    () =>
      AUDIT_VIEWS.filter(
        (v) => ability.can('view', v.feature) || ability.can('manage', 'all'),
      ),
    [ability],
  )

  const allowedIds = useMemo(() => allowedViews.map((v) => v.id), [allowedViews])
  const view = resolveAuditView(searchParams.get('audit'), allowedIds)

  const selectView = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', 'auditoria')
          if (next === 'todas') {
            p.delete('audit')
          } else {
            p.set('audit', next)
          }
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  if (!allowedViews.length) {
    return <p className="muted pad">No tienes permiso para ver auditoría.</p>
  }

  return (
    <>
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Trazabilidad centralizada: órdenes, stickers, palés, flota y cambios de sistema.
      </p>
      <ModuleTabs
        ariaLabel="Auditoría"
        activeId={view}
        onChange={selectView}
        tabs={allowedViews.map((v) => ({ id: v.id, label: v.label }))}
      />
      {view === 'ordenes' ? <OrderAuditPanel /> : null}
      {view === 'stickers' ? <StickerAuditPanel /> : null}
      {view === 'pales' ? <PaleAuditPanel /> : null}
      {view === 'flota' ? <TransportAuditPanel /> : null}
      {view === 'todas' ? <UnifiedAuditPanel /> : null}
    </>
  )
}
