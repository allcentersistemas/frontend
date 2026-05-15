import { useAppAbility } from '../access/useAppAbility'

export function CanButton({ I = 'view', a, fallback = null, children, ...buttonProps }) {
  const ability = useAppAbility()
  if (!ability.can(I, a) && !ability.can('manage', 'all')) {
    return fallback
  }

  return (
    <button type="button" {...buttonProps}>
      {children}
    </button>
  )
}
