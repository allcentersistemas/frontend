import { Navigate, Route } from 'react-router-dom'
import { RequireFeature } from '../access/RequireFeature.jsx'
import { canAccessGestionHub } from '../access/permissions'
import { GestionPage } from '../pages/GestionPage.jsx'

/** Rutas del hub Gestión, incl. Cliente portal como subruta dedicada. */
export function gestionRoutes() {
  return (
    <>
      <Route
        path="gestion"
        element={
          <RequireFeature check={canAccessGestionHub}>
            <GestionPage />
          </RequireFeature>
        }
      />
      <Route
        path="gestion/cliente-portal"
        element={
          <RequireFeature check={canAccessGestionHub}>
            <GestionPage initialSection="cliente-portal" />
          </RequireFeature>
        }
      />
      <Route path="gestion/clientes" element={<Navigate to="../cliente-portal" replace relative="path" />} />
    </>
  )
}
