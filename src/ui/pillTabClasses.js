import { cn } from '../lib/cn'

export function pillTabClasses(active) {
  return cn(
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition no-underline',
    active
      ? 'bg-gradient-to-r from-amber-400/25 to-amber-600/15 text-amber-100 ring-1 ring-amber-400/25'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
  )
}
