import { useEffect, useState } from 'react'
import { updateServiceWorker } from '@/pwa'
import { messages } from '@/i18n/pt-BR'

export function PwaUpdateNotice() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    const show = () => setAvailable(true)
    window.addEventListener('atlas:pwa-update-ready', show)
    return () => window.removeEventListener('atlas:pwa-update-ready', show)
  }, [])
  if (!available) return null
  return (
    <div className="notice notice-info" role="status">
      <span>{messages.updateReady}</span>
      <button
        className="button button-small"
        type="button"
        onClick={() => void updateServiceWorker(true)}
      >
        {messages.updateNow}
      </button>
    </div>
  )
}
