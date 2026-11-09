import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

export function useOutbox() {
  const result = useLiveQuery(async () => {
    try {
      const entries = await db.outbox.orderBy('seq').toArray()
      return { entries, error: null }
    } catch (error) {
      return { entries: null, error }
    }
  }, [])
  return {
    entries: result?.entries ?? null,
    error: result?.error ?? null,
    loading: result === undefined,
  }
}
