import { useState } from 'react'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { useOutbox } from '@/hooks/use-outbox'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { messages } from '@/i18n/pt-BR'
import { syncEngine } from '@/services/sync/instance'
import type { MutationOperation, EntityName } from '@/db'

const stateLabels = {
  Online: messages.syncOnline,
  Offline: messages.syncOffline,
  Sincronizando: messages.syncRunning,
  Erro: messages.syncFailed,
} as const

const entityLabels: Record<EntityName, string> = {
  household_members: messages.people,
  categories: messages.categories,
  inventory_items: messages.inventory,
  stock_batches: messages.batches,
}

const operationLabels: Record<MutationOperation, string> = {
  CREATE: messages.operationCreate,
  UPDATE: messages.operationUpdate,
  DELETE: messages.operationDelete,
  ADJUST: messages.operationAdjust,
}

export function SyncPage() {
  const { entries, error, loading } = useOutbox()
  const { state, pendingCount, rejectedCount, blockedCount } = useSyncStatus()
  const [actionError, setActionError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [working, setWorking] = useState(false)

  const syncNow = async () => {
    setWorking(true)
    setActionError('')
    try {
      await syncEngine.sync()
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : messages.unknownError,
      )
    } finally {
      setWorking(false)
    }
  }

  const retry = async () => {
    setWorking(true)
    setActionError('')
    try {
      await syncEngine.retryErrors()
      setFeedback(messages.retryQueued)
      await syncEngine.sync()
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : messages.unknownError,
      )
    } finally {
      setWorking(false)
    }
  }

  const discard = async (id: string) => {
    if (!window.confirm(messages.confirmDelete)) return
    setWorking(true)
    setActionError('')
    try {
      await syncEngine.discard(id)
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : messages.unknownError,
      )
    } finally {
      setWorking(false)
    }
  }

  const pending = entries?.filter((entry) => entry.status === 'pending') ?? []
  const failed =
    entries?.filter(
      (entry) => entry.status === 'rejected' || entry.status === 'blocked',
    ) ?? []

  return (
    <>
      <PageHeading
        title={messages.synchronization}
        action={
          <button
            className="button"
            type="button"
            onClick={() => void syncNow()}
            disabled={working}
          >
            {working ? messages.syncRunning : messages.syncNow}
          </button>
        }
      />
      <p className="muted">
        {stateLabels[state]} · {pendingCount} {messages.pendingCount}
      </p>
      {actionError && (
        <p className="notice notice-error" role="alert">
          {actionError}
        </p>
      )}
      {feedback && (
        <p className="notice notice-info" role="status">
          {feedback}
        </p>
      )}
      <section className="panel">
        <h2>
          {messages.pendingHeading} ({pendingCount})
        </h2>
        <StatusPanel
          loading={loading}
          error={error}
          empty={!loading && !error && pending.length === 0}
          emptyMessage={messages.noPending}
        >
          <ul className="mutation-list">
            {pending.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {operationLabels[entry.op]} · {entityLabels[entry.entity]}
                </strong>
              </li>
            ))}
          </ul>
        </StatusPanel>
      </section>
      <section className="panel error-queue">
        <div className="section-heading">
          <h2>
            {messages.erroredHeading} ({rejectedCount + blockedCount})
          </h2>
        </div>
        <StatusPanel
          empty={failed.length === 0}
          emptyMessage={messages.noPending}
        >
          <ul className="mutation-list">
            {failed.map((entry) => (
              <li className="mutation-error" key={entry.id}>
                <div>
                  <strong>
                    {operationLabels[entry.op]} · {entityLabels[entry.entity]}
                  </strong>
                  <p role="alert">
                    {entry.status === 'blocked'
                      ? messages.mutationBlocked
                      : (entry.problem?.detail ?? messages.unknownError)}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    onClick={() => void retry()}
                    disabled={working}
                  >
                    {messages.retry}
                  </button>
                  <button
                    className="button button-danger button-small"
                    type="button"
                    onClick={() => void discard(entry.id)}
                    disabled={working}
                  >
                    {messages.discard}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </StatusPanel>
      </section>
    </>
  )
}
