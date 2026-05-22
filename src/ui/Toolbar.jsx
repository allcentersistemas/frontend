import { cn } from '../lib/cn'

export function Toolbar({ children, className }) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-md backdrop-blur-xl sm:p-5 dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-lg dark:shadow-black/25',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-4">{children}</div>
    </div>
  )
}
