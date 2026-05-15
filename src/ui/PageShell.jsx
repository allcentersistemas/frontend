import { cn } from '../lib/cn'

export function PageShell({ children, className }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1280px] min-w-0 px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-10',
        className,
      )}
    >
      {children}
    </div>
  )
}
