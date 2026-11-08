import { db } from '@/db'
import { startSyncTriggers } from './sync/triggers'

export async function initializeOfflineCore(): Promise<() => void> {
  const persisted = await db.meta.get('storage_persisted')
  if (persisted === undefined) {
    const storagePersisted =
      typeof navigator !== 'undefined' && navigator.storage?.persist
        ? await navigator.storage.persist()
        : false
    await db.meta.put({
      key: 'storage_persisted',
      value: storagePersisted,
    })
  }
  const stopTriggers = startSyncTriggers()
  return stopTriggers
}
