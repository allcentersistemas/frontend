import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * @param {{
 *   value: string,
 *   onChange: (value: string) => void,
 *   options: Array<{ id: number|string, label: string, hint?: string }>,
 *   placeholder?: string,
 *   emptyLabel?: string,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar…',
  emptyLabel,
  disabled = false,
  className = '',
}) {
  const rootRef = useRef(null)
  const panelDomId = useId().replace(/:/g, '')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [panelRect, setPanelRect] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => {
      const hay = `${opt.label || ''} ${opt.hint || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [options, search])

  const selectedLabel = useMemo(() => {
    if (!value) return emptyLabel ?? placeholder
    const hit = options.find((o) => String(o.id) === String(value))
    return hit?.label || placeholder
  }, [options, value, placeholder, emptyLabel])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      if (!rootRef.current) return
      const rect = rootRef.current.getBoundingClientRect()
      const maxH = Math.min(280, window.innerHeight - rect.bottom - 12)
      setPanelRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
        maxHeight: maxH > 120 ? maxH : 280,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    function onDocClick(e) {
      const panel = document.getElementById(panelDomId)
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target) &&
        !(panel && panel.contains(e.target))
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onDocClick)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [open, panelDomId])

  function pick(next) {
    onChange(next)
    setOpen(false)
    setSearch('')
  }

  const panel =
    open && panelRect
      ? createPortal(
          <div
            id={panelDomId}
            className="searchable-select__panel searchable-select__panel--portal"
            role="listbox"
            style={{
              position: 'fixed',
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
              maxHeight: panelRect.maxHeight,
            }}
          >
            <input
              type="search"
              className="searchable-select__search"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <ul className="searchable-select__list">
              {emptyLabel ? (
                <li>
                  <button
                    type="button"
                    className={`searchable-select__option${!value ? ' searchable-select__option--active' : ''}`}
                    onClick={() => pick('')}
                  >
                    {emptyLabel}
                  </button>
                </li>
              ) : null}
              {filtered.length === 0 ? (
                <li className="searchable-select__empty">Sin resultados</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className={`searchable-select__option${
                        String(value) === String(opt.id) ? ' searchable-select__option--active' : ''
                      }`}
                      onClick={() => pick(String(opt.id))}
                    >
                      <span className="truncate">{opt.label}</span>
                      {opt.hint ? <span className="searchable-select__hint">{opt.hint}</span> : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div ref={rootRef} className={`searchable-select ${className}`.trim()}>
        <button
          type="button"
          className="searchable-select__trigger"
          disabled={disabled || !options.length}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="truncate">{options.length ? selectedLabel : 'Sin opciones'}</span>
          <span className="searchable-select__chev" aria-hidden>
            ▾
          </span>
        </button>
      </div>
      {panel}
    </>
  )
}
