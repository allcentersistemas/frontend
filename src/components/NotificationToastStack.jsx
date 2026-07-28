import { cn } from '../lib/cn'

export function NotificationToastStack({ toasts }) {
  if (!toasts?.length) return null
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-xl border border-amber-400/40 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg',
            'dark:border-amber-400/30 dark:bg-slate-900 dark:text-slate-100',
          )}
          role="status"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
