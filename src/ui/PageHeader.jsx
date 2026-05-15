import { cn } from '../lib/cn'

export function PageHeader({ title, children, className }) {
  return (
    <header
      className={cn(
        'mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-8',
        className,
      )}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      {children ? <div className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-[0.95rem]">{children}</div> : null}
    </header>
  )
}
