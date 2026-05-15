export function EmptyState({ title, hint }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
