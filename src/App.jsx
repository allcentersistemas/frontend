import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { AdminToolsPage } from './pages/AdminToolsPage'
import { ApiCatalogPage } from './pages/ApiCatalogPage'

import { ProfilePage } from './pages/ProfilePage'
import { HomeRedirect } from './pages/HomeRedirect'
import { LoginPage } from './pages/LoginPage'
import { PaleEditPage } from './pages/PaleEditPage'
import { PaleAuditPage } from './pages/PaleAuditPage'
import { OrderAuditPage } from './pages/OrderAuditPage'
import { OrdersPage } from './pages/OrdersPage'
import { PalesPage } from './pages/PalesPage'
import { TransportPage } from './pages/TransportPage'
import { InventoryPage } from './pages/InventoryPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<RequireAuth role="produccion" />}>
            <Route path="/dashboard/produccion" element={<AppShell role="produccion" />}>
              <Route path="ordenes" element={<OrdersPage />} />
              <Route path="ordenes/auditoria" element={<OrderAuditPage />} />
              <Route path="pales" element={<PalesPage />} />
              <Route path="pales/auditoria" element={<PaleAuditPage />} />
              <Route path="pales/:paleId/editar" element={<PaleEditPage />} />
              <Route path="transporte" element={<TransportPage />} />
              <Route path="inventario" element={<InventoryPage />} />
              <Route path="perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth role="admin-produccion" />}>
            <Route path="/dashboard/admin-produccion" element={<AppShell role="admin-produccion" />}>
              <Route path="ordenes" element={<OrdersPage />} />
              <Route path="ordenes/auditoria" element={<OrderAuditPage />} />
              <Route path="pales" element={<PalesPage />} />
              <Route path="pales/auditoria" element={<PaleAuditPage />} />
              <Route path="pales/:paleId/editar" element={<PaleEditPage />} />
              <Route path="transporte" element={<TransportPage />} />
              <Route path="api" element={<ApiCatalogPage />} />
              <Route path="gestion" element={<AdminToolsPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="inventario" element={<InventoryPage />} />

            </Route>
          </Route>

          <Route element={<RequireAuth role="despacho" />}>
            <Route path="/dashboard/despacho" element={<AppShell role="despacho" />}>
              <Route path="ordenes" element={<OrdersPage />} />
              <Route path="ordenes/auditoria" element={<OrderAuditPage />} />
              <Route path="pales" element={<PalesPage />} />
              <Route path="pales/auditoria" element={<PaleAuditPage />} />
              <Route path="pales/:paleId/editar" element={<PaleEditPage />} />
              <Route path="transporte" element={<TransportPage />} />
              <Route path="inventario" element={<InventoryPage />} />
              <Route path="perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
