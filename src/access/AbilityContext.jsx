import { createContext, useMemo } from 'react'
import { createContextualCan } from '@casl/react'
import { buildAbilityFor } from './ability'

/* eslint-disable-next-line react-refresh/only-export-components */
export const AbilityContext = createContext(buildAbilityFor(null))
/* eslint-disable-next-line react-refresh/only-export-components */
export const Can = createContextualCan(AbilityContext.Consumer)

export function AbilityProvider({ employee, children }) {
  const ability = useMemo(() => buildAbilityFor(employee), [employee])
  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
}
