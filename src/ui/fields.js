/** Clases Tailwind reutilizables para controles de formulario (tema oscuro premium). */
export const inputClass =
  'w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition ' +
  'placeholder:text-slate-500 ' +
  'hover:border-amber-400/20 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

export const selectClass = inputClass + ' cursor-pointer'

export const labelClass = 'text-xs font-medium uppercase tracking-wide text-slate-400'

export const linkButtonClass =
  'text-left font-medium text-amber-300/90 underline decoration-amber-400/30 underline-offset-2 transition hover:text-amber-200 hover:decoration-amber-300/60'
