import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useSyncStore } from '@/store/sync-store'

export function useSyncStatus() {
  const status = useSyncStore()
  const counts = useLiveQuery(async () => {
    const [pending, rejected, blocked] = await Promise.all([
      db.outbox.where('status').equals('pending').count(),
      db.outbox.where('status').equals('rejected').count(),
      db.outbox.where('status').equals('blocked').count(),
    ])
    return { pending, rejected, blocked }
  })

  useEffect(() => {
    if (counts) {
      useSyncStore.setState({
        pendingCount: counts.pending,
        rejectedCount: counts.rejected,
        blockedCount: counts.blocked,
      })
    }
  }, [counts])

  return status
}
