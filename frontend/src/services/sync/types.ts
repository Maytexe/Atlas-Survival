import type { AtlasDatabase } from '@/db/database'
import type { SyncApi } from '@/services/api'

export type SyncState = 'Online' | 'Offline' | 'Sincronizando' | 'Erro'

export interface SyncSnapshot {
  state: SyncState
  lastSyncAt: string | null
  needsFirstSync: boolean
}

export interface SyncEngineOptions {
  database: AtlasDatabase
  api: SyncApi
  onStateChange?: (snapshot: SyncSnapshot) => void
}
