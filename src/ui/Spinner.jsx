export function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div className="flex items-center justify-center py-10" role="status" aria-live="polite" aria-label="Cargando">
      <div
        className={`${className} animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400`}
      />
    </div>
  )
}
