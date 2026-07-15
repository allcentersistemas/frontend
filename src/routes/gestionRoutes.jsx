import { Navigate, Route } from 'react-router-dom'
import { GestionPage } from '../pages/GestionPage.jsx'

/** Rutas del hub Gestión, incl. Cliente portal como subruta dedicada. */
export function gestionRoutes() {
  return (
    <>
      <Route path="gestion" element={<GestionPage />} />
      <Route path="gestion/cliente-portal" element={<GestionPage initialSection="cliente-portal" />} />
      <Route path="gestion/clientes" element={<Navigate to="../cliente-portal" replace relative="path" />} />
    </>
  )
}
