import { useSyncStatus } from '@/hooks/useSyncStatus'
import { messages } from '@/i18n/pt-BR'

export function FirstSyncNotice() {
  const { needsFirstSync, state } = useSyncStatus()
  if (!needsFirstSync || state !== 'Offline') return null
  return (
    <div className="notice notice-warning">{messages.firstOfflineNotice}</div>
  )
}
