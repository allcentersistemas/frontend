import { useEffect } from 'react'

/**
 * Panel de detalle a pantalla casi completa (sustituye la columna derecha estrecha `.split`).
 */
export function DetailModal({ open, title, subtitle, onClose, children, wide = false, tall = false }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="detail-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`detail-modal${wide ? ' detail-modal--wide' : ''}${tall ? ' detail-modal--tall' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-modal__head">
          <div className="detail-modal__titles">
            <h2 id="detail-modal-title" className="detail-modal__title">
              {title}
            </h2>
            {subtitle ? <p className="detail-modal__subtitle muted small">{subtitle}</p> : null}
          </div>
          <button type="button" className="btn btn--ghost detail-modal__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="detail-modal__body">{children}</div>
      </div>
    </div>
  )
}
