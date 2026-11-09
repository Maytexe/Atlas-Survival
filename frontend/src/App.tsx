import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { AlertsPage } from '@/pages/AlertsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmergencySheetPage } from '@/pages/EmergencySheetPage'
import { InventoryDetailPage } from '@/pages/InventoryDetailPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { PeoplePage } from '@/pages/PeoplePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SyncPage } from '@/pages/SyncPage'
import { messages } from '@/i18n/pt-BR'

function NotFoundPage() {
  return (
    <section className="panel empty-state">
      <h1>{messages.notFound}</h1>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="estoque" element={<InventoryPage />} />
          <Route path="estoque/:id" element={<InventoryDetailPage />} />
          <Route path="pessoas" element={<PeoplePage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="alertas" element={<AlertsPage />} />
          <Route path="sincronizacao" element={<SyncPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="ficha" element={<EmergencySheetPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
