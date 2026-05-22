import { cn } from '../lib/cn'

export function TabBar({ 'aria-label': ariaLabel, children, className }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 backdrop-blur-md dark:border-white/[0.06] dark:bg-slate-950/40',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TabButton({ selected, children, className, ...props }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={cn(
        'rounded-xl px-4 py-2 text-sm font-medium transition',
        selected
          ? 'bg-gradient-to-r from-amber-400/30 to-amber-600/20 text-amber-950 shadow-inner ring-1 ring-amber-400/30 dark:from-amber-400/25 dark:to-amber-600/15 dark:text-amber-100 dark:shadow-amber-500/10 dark:ring-amber-400/25'
          : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
