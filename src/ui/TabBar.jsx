import { cn } from '../lib/cn'

export function TabBar({ 'aria-label': ariaLabel, children, className }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'mb-6 flex flex-wrap gap-2 rounded-2xl border border-white/[0.06] bg-slate-950/40 p-1.5 backdrop-blur-md',
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
          ? 'bg-gradient-to-r from-amber-400/25 to-amber-600/15 text-amber-100 shadow-inner shadow-amber-500/10 ring-1 ring-amber-400/25'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
