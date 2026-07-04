import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { InventarioLegacyRedirect } from './components/InventarioLegacyRedirect'
import { LegacySegmentRedirect } from './components/LegacySegmentRedirect'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { ApiCatalogPage } from './pages/ApiCatalogPage'

import { ProfilePage } from './pages/ProfilePage'
import { HomeRedirect } from './pages/HomeRedirect'
import { LoginPage } from './pages/LoginPage'
import { PaleEditPage } from './pages/PaleEditPage'
import { PaleAuditPage } from './pages/PaleAuditPage'
import { OrderAuditPage } from './pages/OrderAuditPage'
import { GestionPage } from './pages/GestionPage'
import { InventoryPage } from './pages/InventoryPage.jsx'
import { ResumenPage } from './pages/ResumenPage.jsx'
import { DashboardHomeRedirect } from './pages/DashboardHomeRedirect.jsx'
import { proyectoOptimizacionRoutes } from './routes/proyectoOptimizacionRoutes.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<RequireAuth role="produccion" />}>
            <Route path="/dashboard/produccion/*" element={<AppShell role="produccion" />}>
              <Route index element={<DashboardHomeRedirect />} />
              <Route path="resumen" element={<ResumenPage />} />
              <Route path="ordenes" element={<InventarioLegacyRedirect area="ordenes" />} />
              <Route path="ordenes/auditoria" element={<OrderAuditPage />} />
              <Route path="pales" element={<InventarioLegacyRedirect area="pales" />} />
              <Route path="pales/auditoria" element={<PaleAuditPage />} />
              <Route path="pales/:paleId/editar" element={<PaleEditPage />} />
              <Route path="gestion" element={<GestionPage />} />
              <Route path="transporte" element={<LegacySegmentRedirect fromSegment="transporte" toSegment="gestion" />} />
              <Route path="inventario" element={<InventoryPage />} />
              {proyectoOptimizacionRoutes()}
              <Route path="perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth role="admin-produccion" />}>
            <Route path="/dashboard/admin-produccion/*" element={<AppShell role="admin-produccion" />}>
              <Route index element={<DashboardHomeRedirect />} />
              <Route path="resumen" element={<ResumenPage />} />
              <Route path="ordenes" element={<InventarioLegacyRedirect area="ordenes" />} />
              <Route path="ordenes/auditoria" element={<OrderAuditPage />} />
              <Route path="pales" element={<InventarioLegacyRedirect area="pales" />} />
              <Route path="pales/auditoria" element={<PaleAuditPage />} />
              <Route path="pales/:paleId/editar" element={<PaleEditPage />} />
              <Route path="gestion" element={<GestionPage />} />
              <Route path="transporte" element={<LegacySegmentRedirect fromSegment="transporte" toSegment="gestion" />} />
              <Route path="api" element={<ApiCatalogPage />} />
              <Route
                path="administracion"
                element={
                  <LegacySegmentRedirect fromSegment="administracion" toSegment="gestion" defaultTab="employees" />
                }
              />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="inventario" element={<InventoryPage />} />
              {proyectoOptimizacionRoutes()}
            </Route>
          </Route>

          <Route element={<RequireAuth role="despacho" />}>
            <Route path="/dashboard/despacho/*" element={<AppShell role="despacho" />}>
              <Route index element={<DashboardHomeRedirect />} />
              <Route path="resumen" element={<ResumenPage />} />
              <Route path="ordenes" element={<InventarioLegacyRedirect area="ordenes" />} />
              <Route path="ordenes/auditoria" element={<OrderAuditPage />} />
              <Route path="pales" element={<InventarioLegacyRedirect area="pales" />} />
              <Route path="pales/auditoria" element={<PaleAuditPage />} />
              <Route path="pales/:paleId/editar" element={<PaleEditPage />} />
              <Route path="gestion" element={<GestionPage />} />
              <Route path="transporte" element={<LegacySegmentRedirect fromSegment="transporte" toSegment="gestion" />} />
              <Route path="inventario" element={<InventoryPage />} />
              {proyectoOptimizacionRoutes()}
              <Route path="perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
