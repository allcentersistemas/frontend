import { cn } from '../lib/cn'

export function InlineCode({ children, className }) {
  return (
    <code
      className={cn(
        'rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-100/90',
        className,
      )}
    >
      {children}
    </code>
  )
}
