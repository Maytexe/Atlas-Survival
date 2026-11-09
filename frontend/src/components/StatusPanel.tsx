import { messages } from '@/i18n/pt-BR'

interface StatusPanelProps {
  loading?: boolean
  error?: unknown
  empty?: boolean
  emptyMessage?: string
  children: React.ReactNode
}

export function StatusPanel({
  loading = false,
  error,
  empty = false,
  emptyMessage,
  children,
}: StatusPanelProps) {
  if (loading) {
    return (
      <div className="skeleton" role="status" aria-label={messages.loading}>
        {messages.loading}
      </div>
    )
  }
  if (error) {
    return (
      <div className="notice notice-error" role="alert">
        {messages.loadError}
      </div>
    )
  }
  if (empty) {
    return <p className="empty-state">{emptyMessage ?? messages.emptyData}</p>
  }
  return <>{children}</>
}
