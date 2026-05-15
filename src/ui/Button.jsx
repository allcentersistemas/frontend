import { cn } from '../lib/cn'

const variants = {
  primary:
    'rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-400/35 hover:brightness-105 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
  ghost:
    'rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 backdrop-blur-sm transition hover:border-amber-400/25 hover:bg-amber-400/5 hover:text-white disabled:opacity-45',
  neutral:
    'rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-45',
  danger:
    'rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-45',
}

export function Button({ variant = 'primary', className, type = 'button', ...props }) {
  return <button type={type} className={cn(variants[variant] ?? variants.primary, className)} {...props} />
}
