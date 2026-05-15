import { cn } from '../lib/cn'

const tones = {
  default: 'border-white/10 bg-white/[0.06] text-slate-200',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  danger: 'border-red-500/30 bg-red-500/10 text-red-200',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-100',
}

export function Badge({ tone = 'default', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium tabular-nums',
        tones[tone] ?? tones.default,
        className,
      )}
    >
      {children}
    </span>
  )
}
