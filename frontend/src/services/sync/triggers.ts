import { syncEngine } from './instance'
import { isRetryableSyncError, calculateBackoffDelay } from './engine'
import type { SyncEngine } from './engine'

export function startSyncTriggers(
  engine: Pick<SyncEngine, 'sync'> = syncEngine,
  random: () => number = Math.random,
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let failures = 0
  let stopped = false

  const run = async () => {
    if (stopped) return
    try {
      const online = await engine.sync()
      if (online) {
        failures = 0
        if (retryTimer) clearTimeout(retryTimer)
        retryTimer = undefined
      } else {
        scheduleRetry()
      }
    } catch (error) {
      if (isRetryableSyncError(error)) scheduleRetry()
    }
  }

  const scheduleRetry = () => {
    if (stopped || retryTimer) return
    failures += 1
    retryTimer = setTimeout(
      () => {
        retryTimer = undefined
        void run()
      },
      calculateBackoffDelay(failures, random),
    )
  }

  const onMutation = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void run(), 1_000)
  }
  const onOnline = () => void run()
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void run()
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('atlas:mutation', onMutation)
  document.addEventListener('visibilitychange', onVisibilityChange)
  void run()

  return () => {
    stopped = true
    if (debounceTimer) clearTimeout(debounceTimer)
    if (retryTimer) clearTimeout(retryTimer)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('atlas:mutation', onMutation)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
