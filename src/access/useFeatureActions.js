import { useMemo } from 'react'
import { useAppAbility } from './useAppAbility'
import { ACTION } from './rolePermissions'

/** Atajos CASL para botones de tabla (crear / leer / editar / cancelar / eliminar / imprimir). */
export function useFeatureActions(feature) {
  const ability = useAppAbility()
  return useMemo(() => {
    const manageAll = ability.can(ACTION.MANAGE, 'all')
    const can = (action) => manageAll || ability.can(action, feature)
    return {
      canView: can(ACTION.VIEW),
      canCreate: can(ACTION.CREATE),
      canUpdate: can(ACTION.UPDATE),
      canCancel: can(ACTION.CANCEL),
      canDelete: can(ACTION.DELETE),
      canPrint: can(ACTION.PRINT),
      canAudit: can(ACTION.AUDIT),
      manageAll,
    }
  }, [ability, feature])
}
