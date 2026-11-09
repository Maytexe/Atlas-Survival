import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { useStorageStatus } from '@/hooks/use-storage-status'
import { useStorageNoticeDismissed } from '@/hooks/use-storage-notice'
import { messages } from '@/i18n/pt-BR'
import { dismissStorageNotice } from '@/services/preferences'

export function StorageNotice() {
  const persisted = useStorageStatus()
  const dismissed = useStorageNoticeDismissed()
  const [error, setError] = useState('')
  if (persisted !== false || dismissed) return null
  const dismiss = async () => {
    try {
      await dismissStorageNotice()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.unknownError)
    }
  }
  return (
    <div className="notice notice-warning storage-notice" role="status">
      <Info size={20} aria-hidden="true" />
      <span>{messages.storageReminder}</span>
      {error && <span role="alert">{error}</span>}
      <button
        className="icon-button"
        type="button"
        onClick={() => void dismiss()}
        aria-label={messages.dismissNotice}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  )
}
