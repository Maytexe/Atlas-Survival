import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '@/pwa'
import { initializeOfflineCore } from '@/services/offline'
import { useSyncStore } from '@/store/sync-store'

void initializeOfflineCore().catch((error: unknown) => {
  useSyncStore.getState().setState('Erro')
  console.error('Falha ao inicializar a camada offline do ATLAS.', error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
