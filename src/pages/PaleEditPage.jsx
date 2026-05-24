import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ModulePage } from '../components/module/ModuleChrome.jsx'

/** Redirige al listado de pales con el modal de detalle/edición abierto. */
export function PaleEditPage() {
  const { paleId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const id = String(paleId ?? '').trim()
    if (id) {
      navigate(`/pales?id=${encodeURIComponent(id)}`, { replace: true })
    } else {
      navigate('/pales', { replace: true })
    }
  }, [navigate, paleId])

  return (
    <ModulePage>
      <p className="muted pad">Abriendo pale…</p>
    </ModulePage>
  )
}
