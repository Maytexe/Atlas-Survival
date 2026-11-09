import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

export function useStorageStatus(): boolean | null | undefined {
  return useLiveQuery(async () => {
    const record = await db.meta.get('storage_persisted')
    return typeof record?.value === 'boolean' ? record.value : null
  }, [])
}
