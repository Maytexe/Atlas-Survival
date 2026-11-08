import type { AtlasDatabase } from '@/db/database'

export async function acquireIndexedDbLock(
  database: AtlasDatabase,
  owner: string,
): Promise<boolean> {
  const deadline = Date.now() + 300_000
  while (Date.now() < deadline) {
    const acquired = await database.transaction(
      'rw',
      database.meta,
      async () => {
        const lock = await database.meta.get('sync_lock')
        const value =
          typeof lock?.value === 'object' && lock.value !== null
            ? (lock.value as { owner?: unknown; expires?: unknown })
            : null
        if (
          value &&
          typeof value.expires === 'number' &&
          value.expires > Date.now()
        ) {
          return false
        }
        await database.meta.put({
          key: 'sync_lock',
          value: { owner, expires: Date.now() + 300_000 },
        })
        return true
      },
    )
    if (acquired) return true
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}
