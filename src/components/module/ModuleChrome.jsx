/** Layout compartido al estilo Inventario (clases semánticas en index.css). */

export function ModulePage({ children, className = '' }) {
  return <div className={`page ${className}`.trim()}>{children}</div>
}

export function ModuleHeader({ title, lead, children }) {
  return (
    <div className="card pad" style={{ marginBottom: '1rem' }}>
      {title ? <h1 className="card__title">{title}</h1> : null}
      {lead ? (
        <p className="muted small" style={{ marginTop: title ? '0.35rem' : 0 }}>
          {lead}
        </p>
      ) : null}
      {children}
    </div>
  )
}

export function ModuleTabs({ tabs, activeId, onChange, ariaLabel }) {
  return (
    <div
      className="tabs"
      role="tablist"
      aria-label={ariaLabel}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activeId === t.id}
          className={activeId === t.id ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function ModuleSplit({ children }) {
  return <div className="split">{children}</div>
}

export function ModuleListCard({
  title,
  actions,
  toolbar,
  footer,
  children,
  error,
  loading,
  loadingText = 'Cargando…',
}) {
  return (
    <div className="card">
      {(title || actions) && (
        <div
          className="pad"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          {title ? (
            <h2 className="card__title" style={{ margin: 0 }}>
              {title}
            </h2>
          ) : null}
          {actions}
        </div>
      )}
      {toolbar ? (
        <div className="pad" style={{ paddingTop: title || actions ? 0 : undefined }}>
          {toolbar}
        </div>
      ) : null}
      {error ? <p className="pad form-error">{error}</p> : null}
      {loading ? <p className="muted pad">{loadingText}</p> : children}
      {footer}
    </div>
  )
}

export function ModuleDetailCard({ title, children }) {
  return (
    <div className="card detail-panel">
      {title ? <h2 className="card__title pad">{title}</h2> : null}
      {children}
    </div>
  )
}

export function ModuleFilterGrid({ children }) {
  return <div className="form-row-2">{children}</div>
}

export function ModulePagination({ page, totalPages, info, onPrev, onNext, disabled }) {
  return (
    <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button type="button" className="btn btn--ghost" disabled={disabled || page <= 0} onClick={onPrev}>
        Anterior
      </button>
      <span className="muted small">{info}</span>
      <button
        type="button"
        className="btn btn--ghost"
        disabled={disabled || page + 1 >= totalPages}
        onClick={onNext}
      >
        Siguiente
      </button>
    </div>
  )
}

export function ModuleInfoCard({ children }) {
  return (
    <div className="card pad" style={{ marginBottom: '1rem' }}>
      {children}
    </div>
  )
}
