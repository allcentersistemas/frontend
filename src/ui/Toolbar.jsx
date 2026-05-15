import { cn } from '../lib/cn'

export function Toolbar({ children, className }) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-lg shadow-black/25 backdrop-blur-xl sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-4">{children}</div>
    </div>
  )
}
