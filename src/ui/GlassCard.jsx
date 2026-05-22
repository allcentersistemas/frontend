import { cn } from '../lib/cn'

export function GlassCard({ children, className, padding = true }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/40 backdrop-blur-xl',
        'dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/30',
        padding && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function GlassCardTitle({ children, className }) {
  return (
    <h2 className={cn('text-base font-semibold tracking-tight text-slate-900 dark:text-white', className)}>
      {children}
    </h2>
  )
}
