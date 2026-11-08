import type { AtlasDatabase } from '@/db/database'
import type { EntityName, OutboxEntry } from '@/db/schema'
import { ApiProblemError, type SyncApi } from '@/services/api'
import { messages } from '@/i18n/pt-BR'
import { applyPullPage } from './rebase'
import type { SyncEngineOptions, SyncSnapshot } from './types'
import { pushPending } from './push'
import { acquireIndexedDbLock } from './lock'

export class SyncEngine {
  private readonly database: AtlasDatabase
  private readonly api: SyncApi
  private readonly onStateChange?: SyncEngineOptions['onStateChange']
  private running: Promise<boolean> | null = null
  private state: SyncSnapshot = {
    state: 'Offline',
    lastSyncAt: null,
    needsFirstSync: true,
  }

  constructor(options: SyncEngineOptions) {
    this.database = options.database
    this.api = options.api
    this.onStateChange = options.onStateChange
  }

  sync(): Promise<boolean> {
    if (this.running) return this.running
    this.running = this.withCrossTabLock(() => this.runCycle()).finally(() => {
      this.running = null
    })
    return this.running
  }

  async discard(mutationId: string): Promise<void> {
    const completed = await this.withCrossTabLock(async () => {
      let discarded: OutboxEntry | undefined
      await this.database.transaction(
        'rw',
        [
          this.database.outbox,
          this.database.household_members,
          this.database.categories,
          this.database.inventory_items,
          this.database.stock_batches,
          this.database.meta,
        ],
        async () => {
          const entry = await this.database.outbox
            .where('id')
            .equals(mutationId)
            .first()
          if (
            !entry ||
            (entry.status !== 'rejected' && entry.status !== 'blocked')
          ) {
            throw new Error(messages.mutationNotDiscardable)
          }
          discarded = entry
          await this.removeOutboxEntry(entry)
          if (entry.op === 'CREATE') {
            await this.deleteEntity(entry.entity, entry.entity_id)
            await this.removeDependentMutations(entry.entity_id)
          }
        },
      )
      if (!discarded) throw new Error(messages.mutationNotDiscardable)
      await this.pull(true)
      return true
    })
    if (!completed) throw new Error(messages.syncLockTimeout)
  }

  private async withCrossTabLock(
    task: () => Promise<boolean>,
  ): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request('atlas-sync', task)
    }
    const owner = crypto.randomUUID()
    const acquired = await acquireIndexedDbLock(this.database, owner)
    if (!acquired) {
      await this.updateSnapshot({ state: 'Offline' })
      return false
    }
    try {
      return await task()
    } finally {
      await this.database.transaction('rw', this.database.meta, async () => {
        const lock = await this.database.meta.get('sync_lock')
        if (typeof lock?.value === 'object' && lock.value !== null) {
          const value = lock.value as { owner?: unknown }
          if (value.owner === owner)
            await this.database.meta.delete('sync_lock')
        }
      })
    }
  }

  private async runCycle(): Promise<boolean> {
    await this.updateSnapshot({ state: 'Sincronizando' })
    try {
      await this.api.health()
    } catch (error) {
      if (error instanceof ApiProblemError && error.status === 0) {
        await this.updateSnapshot({ state: 'Offline' })
        return false
      }
      await this.updateSnapshot({ state: 'Erro' })
      throw error
    }
    try {
      const needsFullPull = await pushPending(this.database, this.api)
      await this.pull(needsFullPull)
      const lastSyncAt = new Date().toISOString()
      await this.database.meta.put({ key: 'last_sync_at', value: lastSyncAt })
      await this.updateSnapshot({ state: 'Online', lastSyncAt })
      return true
    } catch (error) {
      await this.updateSnapshot({ state: 'Erro' })
      throw error
    }
  }

  private async pull(full: boolean): Promise<void> {
    const current = await this.database.meta.get('cursor')
    let cursor = full
      ? 0
      : typeof current?.value === 'number'
        ? current.value
        : 0
    while (true) {
      const response = await this.api.pull(cursor)
      await this.database.transaction(
        'rw',
        [
          this.database.household_members,
          this.database.categories,
          this.database.inventory_items,
          this.database.stock_batches,
          this.database.outbox,
          this.database.meta,
        ],
        async () => applyPullPage(this.database, response),
      )
      cursor = response.cursor
      if (
        response.household_members.length === 0 &&
        response.categories.length === 0 &&
        response.inventory_items.length === 0 &&
        response.stock_batches.length === 0
      ) {
        break
      }
    }
  }

  private async removeDependentMutations(entityId: string): Promise<void> {
    const entries = await this.database.outbox.toArray()
    const entityIds = new Set([entityId])
    let changed = true
    while (changed) {
      changed = false
      for (const entry of entries) {
        if (entry.op !== 'CREATE' || entityIds.has(entry.entity_id)) continue
        if (this.foreignKeys(entry).some((id) => entityIds.has(id))) {
          entityIds.add(entry.entity_id)
          changed = true
        }
      }
    }
    for (const entry of entries) {
      if (entityIds.has(entry.entity_id)) {
        if (entry.seq !== undefined)
          await this.database.outbox.delete(entry.seq)
        await this.deleteEntity(entry.entity, entry.entity_id)
      }
    }
  }

  private async deleteEntity(entity: EntityName, id: string): Promise<void> {
    switch (entity) {
      case 'household_members':
        await this.database.household_members.delete(id)
        break
      case 'categories':
        await this.database.categories.delete(id)
        break
      case 'inventory_items':
        await this.database.inventory_items.delete(id)
        break
      case 'stock_batches':
        await this.database.stock_batches.delete(id)
        break
    }
  }

  private foreignKeys(entry: OutboxEntry): string[] {
    return ['category_id', 'inventory_item_id'].flatMap((key) => {
      const value = (entry.payload ?? {})[key]
      return typeof value === 'string' ? [value] : []
    })
  }

  private async removeOutboxEntry(entry: OutboxEntry): Promise<void> {
    if (entry.seq === undefined) {
      throw new Error(messages.missingOutboxSequence)
    }
    await this.database.outbox.delete(entry.seq)
  }

  private async updateSnapshot(update: Partial<SyncSnapshot>): Promise<void> {
    const lastSync = await this.database.meta.get('last_sync_at')
    const tables = [
      this.database.household_members,
      this.database.categories,
      this.database.inventory_items,
      this.database.stock_batches,
    ]
    const counts = await Promise.all(tables.map((table) => table.count()))
    const hasLocalData = counts.some((count) => count > 0)
    this.state = {
      ...this.state,
      ...update,
      lastSyncAt:
        update.lastSyncAt ??
        (typeof lastSync?.value === 'string'
          ? lastSync.value
          : this.state.lastSyncAt),
      needsFirstSync: !hasLocalData && !lastSync,
    }
    this.onStateChange?.(this.state)
  }

  getSnapshot(): SyncSnapshot {
    return this.state
  }
}

export function calculateBackoffDelay(
  attempt: number,
  random: () => number = Math.random,
): number {
  const base = Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1))
  return Math.min(60_000, Math.round(base * (0.5 + random())))
}

export function isRetryableSyncError(error: unknown): boolean {
  return (
    error instanceof ApiProblemError &&
    (error.status === 0 || error.status >= 500)
  )
}
