import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ModulePage } from '../components/module/ModuleChrome.jsx'

/** Redirige al listado de palés en Inventario con el modal de edición abierto. */
export function PaleEditPage() {
  const { paleId } = useParams()
  const navigate = useNavigate()
  const { allowedDashboard } = useAuth()

  useEffect(() => {
    const id = String(paleId ?? '').trim()
    const base = allowedDashboard ? `/dashboard/${allowedDashboard}` : ''
    if (id) {
      navigate(`${base}/inventario?area=pales&id=${encodeURIComponent(id)}&mode=edit`, { replace: true })
    } else {
      navigate(`${base}/inventario?area=pales`, { replace: true })
    }
  }, [navigate, paleId, allowedDashboard])

  return (
    <ModulePage>
      <p className="muted pad">Abriendo pale…</p>
    </ModulePage>
  )
}
