import { create } from 'zustand'
import { db } from '@/db'
import type { SyncSnapshot, SyncState } from '@/services/sync/types'

export interface SyncStoreState extends SyncSnapshot {
  pendingCount: number
  rejectedCount: number
  blockedCount: number
  setSnapshot: (snapshot: SyncSnapshot) => void
  refreshCounts: () => Promise<void>
  setState: (state: SyncState) => void
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  state: 'Offline',
  lastSyncAt: null,
  needsFirstSync: true,
  pendingCount: 0,
  rejectedCount: 0,
  blockedCount: 0,
  setSnapshot: (snapshot) => set(snapshot),
  setState: (state) => set({ state }),
  refreshCounts: async () => {
    const [pendingCount, rejectedCount, blockedCount, lastSync, cursor] =
      await Promise.all([
        db.outbox.where('status').equals('pending').count(),
        db.outbox.where('status').equals('rejected').count(),
        db.outbox.where('status').equals('blocked').count(),
        db.meta.get('last_sync_at'),
        db.meta.get('cursor'),
      ])
    const tables = [
      db.household_members,
      db.categories,
      db.inventory_items,
      db.stock_batches,
    ]
    const counts = await Promise.all(tables.map((table) => table.count()))
    set({
      pendingCount,
      rejectedCount,
      blockedCount,
      lastSyncAt: typeof lastSync?.value === 'string' ? lastSync.value : null,
      needsFirstSync:
        counts.every((count) => count === 0) && cursor === undefined,
    })
  },
}))
