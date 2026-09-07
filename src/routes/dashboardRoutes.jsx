import { Route } from 'react-router-dom'
import { InventarioLegacyRedirect, InventarioGroupRedirect } from '../components/InventarioLegacyRedirect'
import { LegacySegmentRedirect } from '../components/LegacySegmentRedirect'
import { RequireFeature } from '../access/RequireFeature.jsx'
import { canViewProduccionHub, canViewAlmacenHub } from '../access/permissions'
import { OrderAuditPage } from '../pages/OrderAuditPage'
import { PaleAuditPage } from '../pages/PaleAuditPage'
import { PaleEditPage } from '../pages/PaleEditPage'
import { InventoryPage } from '../pages/InventoryPage.jsx'
import { ResumenPage } from '../pages/ResumenPage.jsx'
import { ProfilePage } from '../pages/ProfilePage'
import { gestionRoutes } from './gestionRoutes.jsx'
import { proyectoOptimizacionRoutes } from './proyectoOptimizacionRoutes.jsx'

/** Rutas comunes a los tres shells de dashboard (produccion, admin-produccion, despacho). */
export function dashboardRoutes() {
  return (
    <>
      <Route path="resumen" element={<ResumenPage />} />
      <Route path="ordenes" element={<InventarioLegacyRedirect area="ordenes" />} />
      <Route path="ordenes/auditoria" element={<OrderAuditPage />} />
      <Route path="pales" element={<InventarioLegacyRedirect area="pales" />} />
      <Route path="pales/auditoria" element={<PaleAuditPage />} />
      <Route path="pales/:paleId/editar" element={<PaleEditPage />} />
      {gestionRoutes()}
      <Route path="transporte" element={<LegacySegmentRedirect fromSegment="transporte" toSegment="gestion" />} />
      <Route
        path="produccion"
        element={
          <RequireFeature check={canViewProduccionHub}>
            <InventoryPage group="produccion" />
          </RequireFeature>
        }
      />
      <Route
        path="almacen"
        element={
          <RequireFeature check={canViewAlmacenHub}>
            <InventoryPage group="almacen" />
          </RequireFeature>
        }
      />
      {/* Hub único "Inventario" (legado): reenvía a Producción o Almacén según ?area= */}
      <Route path="inventario" element={<InventarioGroupRedirect />} />
      {proyectoOptimizacionRoutes()}
      <Route path="perfil" element={<ProfilePage />} />
    </>
  )
}
