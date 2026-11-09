import { useLiveQuery } from 'dexie-react-hooks'
import { readLastBackupAt } from '@/services/preferences'

export function useLastBackup(): string | null | undefined {
  return useLiveQuery(readLastBackupAt, [])
}
