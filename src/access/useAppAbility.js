import { useContext } from 'react'
import { AbilityContext } from './AbilityContext'

export function useAppAbility() {
  return useContext(AbilityContext)
}
