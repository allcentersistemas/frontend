import { Button } from './Button'
import { cn } from '../lib/cn'

export function PagerBar({ info, page, totalPages, onPrev, onNext, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <span className="text-xs text-slate-500">{info}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" type="button" className="!py-2 text-xs" disabled={page <= 0} onClick={onPrev}>
          Anterior
        </Button>
        <span className="text-xs tabular-nums text-slate-500">
          Página {page + 1} / {Math.max(1, totalPages)}
        </span>
        <Button variant="ghost" type="button" className="!py-2 text-xs" disabled={page >= totalPages - 1} onClick={onNext}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
