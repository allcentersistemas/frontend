import { cn } from '../lib/cn'
import { labelClass } from './fields'

export function FormField({ label, children, className, id }) {
  const labelId = id ? `${id}-label` : undefined
  return (
    <label className={cn('flex min-w-[140px] flex-1 flex-col gap-2', className)} id={labelId}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}
