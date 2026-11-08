import { db } from '@/db'
import { syncApi } from '@/services/api'
import { useSyncStore } from '@/store/sync-store'
import { SyncEngine } from './engine'

export const syncEngine = new SyncEngine({
  database: db,
  api: syncApi,
  onStateChange: (snapshot) => {
    useSyncStore.getState().setSnapshot(snapshot)
    void useSyncStore.getState().refreshCounts()
  },
})
