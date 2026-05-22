import { cn } from '../lib/cn'

export function TableScroll({ children, className }) {
  return (
    <div
      className={cn(
        '-mx-1 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/[0.06]',
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Table({ children, className }) {
  return <table className={cn('w-full min-w-[520px] border-collapse text-left text-sm', className)}>{children}</table>
}

export function Thead({ children }) {
  return (
    <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50/95 shadow-sm backdrop-blur-md dark:border-white/[0.06] dark:bg-slate-950/95 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
      {children}
    </thead>
  )
}

export function Th({ children, className }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-500',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Tr({ children, selected, className, ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-slate-100 transition-colors last:border-0 dark:border-white/[0.05]',
        selected ? 'bg-amber-400/15 dark:bg-amber-400/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className, ...props }) {
  return (
    <td className={cn('px-4 py-3 align-middle text-slate-800 dark:text-slate-200', className)} {...props}>
      {children}
    </td>
  )
}
