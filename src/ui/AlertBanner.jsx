export function AlertBanner({ children, role = 'alert', tone = 'error' }) {
  const cls =
    tone === 'success'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
      : 'border-red-500/25 bg-red-500/10 text-red-200'
  return (
    <div role={role} className={`mb-4 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  )
}
