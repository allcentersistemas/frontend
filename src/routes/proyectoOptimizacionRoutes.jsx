import { Route } from 'react-router-dom'
import { RequireFeature } from '../access/RequireFeature.jsx'
import { canAccessFeature } from '../access/permissions'
import { FEATURE } from '../access/permissionCatalog'
import { LegacySegmentRedirect } from '../components/LegacySegmentRedirect'
import { ProyectoOptimizacionPage } from '../pages/ProyectoOptimizacionPage.jsx'

const canViewProjects = (employee) => canAccessFeature(employee, FEATURE.PROJECT_LIST)

/** Ruta principal del módulo + redirect legacy /proyectos → /proyecto-optimizacion */
export function proyectoOptimizacionRoutes() {
  return (
    <>
      <Route
        path="proyecto-optimizacion"
        element={
          <RequireFeature check={canViewProjects}>
            <ProyectoOptimizacionPage />
          </RequireFeature>
        }
      />
      <Route
        path="proyectos"
        element={
          <LegacySegmentRedirect fromSegment="proyectos" toSegment="proyecto-optimizacion" />
        }
      />
    </>
  )
}
