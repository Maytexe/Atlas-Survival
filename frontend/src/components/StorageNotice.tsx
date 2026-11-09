import { useStorageStatus } from '@/hooks/use-storage-status'
import { messages } from '@/i18n/pt-BR'

export function StorageNotice() {
  const persisted = useStorageStatus()
  if (persisted !== false) return null
  return (
    <div className="notice notice-warning">{messages.storageDeniedNotice}</div>
  )
}
