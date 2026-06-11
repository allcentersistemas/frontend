import { Route } from 'react-router-dom'
import { LegacySegmentRedirect } from '../components/LegacySegmentRedirect'
import { ProyectoOptimizacionPage } from '../pages/ProyectoOptimizacionPage.jsx'

/** Ruta principal del módulo + redirect legacy /proyectos → /proyecto-optimizacion */
export function proyectoOptimizacionRoutes() {
  return (
    <>
      <Route path="proyecto-optimizacion" element={<ProyectoOptimizacionPage />} />
      <Route
        path="proyectos"
        element={
          <LegacySegmentRedirect fromSegment="proyectos" toSegment="proyecto-optimizacion" />
        }
      />
    </>
  )
}
