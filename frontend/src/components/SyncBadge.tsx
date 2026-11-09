import { useEffect, useState } from 'react'
import { AlertCircle, CircleCheck, CloudOff, LoaderCircle } from 'lucide-react'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { messages } from '@/i18n/pt-BR'

const stateLabels = {
  Online: messages.syncOnline,
  Offline: messages.syncOffline,
  Sincronizando: messages.syncRunning,
  Erro: messages.syncFailed,
} as const

const stateIcons = {
  Online: CircleCheck,
  Offline: CloudOff,
  Sincronizando: LoaderCircle,
  Erro: AlertCircle,
} as const

function timeAgo(value: string | null, now: number): string {
  if (!value) return messages.neverSynced
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60_000))
  if (minutes === 0) return messages.timeJustNow
  if (minutes === 1) return messages.timeMinute
  if (minutes < 60)
    return messages.timeMinutes.replace('{count}', String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return messages.timeHour
  if (hours < 24) return messages.timeHours.replace('{count}', String(hours))
  const days = Math.floor(hours / 24)
  if (days === 1) return messages.timeDay
  return messages.timeDays.replace('{count}', String(days))
}

export function SyncBadge() {
  const [now, setNow] = useState(0)
  const { state, pendingCount, rejectedCount, blockedCount, lastSyncAt } =
    useSyncStatus()
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0)
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [])
  const failures = rejectedCount + blockedCount
  const label =
    state === 'Sincronizando' && pendingCount > 0
      ? `${stateLabels[state]} (${pendingCount})`
      : stateLabels[state]
  const StateIcon = stateIcons[state]

  return (
    <div
      className={`sync-badge sync-${state.toLowerCase()}`}
      role="status"
      aria-live="polite"
      aria-label={messages.syncStatusLabel}
    >
      <span className="sync-icon" aria-hidden="true">
        <StateIcon size={20} />
      </span>
      <span className="sync-label">{label}</span>
      <span className="sync-detail">
        {pendingCount} {messages.pendingCount}
        {failures > 0
          ? ` · ${failures} ${messages.erroredHeading.toLowerCase()}`
          : ''}
      </span>
      <span className="sync-time">
        {messages.lastSyncPrefix}:{' '}
        {now === 0 ? messages.timeJustNow : timeAgo(lastSyncAt, now)}
      </span>
    </div>
  )
}
