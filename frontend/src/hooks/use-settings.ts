import { useLiveQuery } from 'dexie-react-hooks'
import { readSettings } from '@/services/preferences'

export function useSettings() {
  const result = useLiveQuery(async () => {
    try {
      return { settings: await readSettings(), error: null }
    } catch (error) {
      return { settings: null, error }
    }
  }, [])
  return {
    settings: result?.settings ?? null,
    error: result?.error ?? null,
    loading: result === undefined,
  }
}
