import { cn } from '../lib/cn'

export function GlassCard({ children, className, padding = true }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-xl shadow-black/30 backdrop-blur-xl',
        padding && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function GlassCardTitle({ children, className }) {
  return <h2 className={cn('text-base font-semibold tracking-tight text-white', className)}>{children}</h2>
}
