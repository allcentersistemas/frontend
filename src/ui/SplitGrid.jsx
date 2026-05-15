import { cn } from '../lib/cn'

export function SplitGrid({ children, className }) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start',
        className,
      )}
    >
      {children}
    </div>
  )
}
