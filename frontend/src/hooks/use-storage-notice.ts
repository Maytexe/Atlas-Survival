import { useLiveQuery } from 'dexie-react-hooks'
import { wasStorageNoticeDismissed } from '@/services/preferences'

export function useStorageNoticeDismissed(): boolean | undefined {
  return useLiveQuery(wasStorageNoticeDismissed, [])
}
