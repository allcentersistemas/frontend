import { useEffect, useState } from 'react'
import { fetchSystemMediaBlob } from '../api/http'

/**
 * Muestra una foto RM vía fetch autenticado (el endpoint exige JWT).
 */
export function RmAuthPhoto({ apiUrl, className = '' }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null

    ;(async () => {
      try {
        const blob = await fetchSystemMediaBlob(apiUrl)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
        setError(false)
      } catch {
        if (!cancelled) {
          setError(true)
          setSrc(null)
        }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [apiUrl])

  if (error) {
    return (
      <span className="muted small">
        Foto no disponible (puede haberse perdido al actualizar el servidor). Vuelva a registrarla desde la app.
      </span>
    )
  }
  if (!src) {
    return <span className="muted small">Cargando foto…</span>
  }

  return (
    <a href={src} target="_blank" rel="noreferrer">
      <img
        src={src}
        alt=""
        className={className || 'inv-photo-thumb'}
        loading="lazy"
      />
    </a>
  )
}

export function RmPhotoRow({ urls }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : []
  if (!list.length) {
    return <p className="muted small">Sin fotos.</p>
  }
  return (
    <div className="inv-photo-row">
      {list.map((u) => (
        <RmAuthPhoto key={u} apiUrl={u} />
      ))}
    </div>
  )
}
