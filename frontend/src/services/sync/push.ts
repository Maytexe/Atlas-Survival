import type { AtlasDatabase } from '@/db/database'
import type { OutboxEntry } from '@/db/schema'
import type { SyncApi, SyncMutation } from '@/services/api'
import { messages } from '@/i18n/pt-BR'

const PUSH_BATCH_SIZE = 50

export async function pushPending(
  database: AtlasDatabase,
  api: SyncApi,
): Promise<boolean> {
  let needsFullPull = false
  const failedEntities = await rejectedEntityIds(database)
  const failedCreates = await rejectedCreateIds(database)
  while (true) {
    const pending = await database.outbox
      .where('status')
      .equals('pending')
      .sortBy('seq')
    if (pending.length === 0) break
    const batch = await selectBatch(
      database,
      pending,
      failedEntities,
      failedCreates,
    )
    if (batch.length === 0) break
    const requestBatch: SyncMutation[] = batch.map((entry) => ({
      id: entry.id,
      entity: entry.entity,
      op: entry.op,
      entity_id: entry.entity_id,
      client_ts: entry.client_ts,
      attempts: entry.attempts + 1,
      ...(entry.payload === undefined ? {} : { payload: entry.payload }),
    }))
    for (const [index, entry] of requestBatch.entries()) {
      const localEntry = batch[index]
      if (!localEntry || localEntry.seq === undefined)
        throw new Error(messages.missingOutboxSequence)
      await database.outbox.update(localEntry.seq, { attempts: entry.attempts })
    }
    const results = await api.push(requestBatch)
    if (results.length !== batch.length) {
      throw new Error(messages.invalidSyncResponse)
    }
    for (let index = 0; index < batch.length; index += 1) {
      const mutation = batch[index]
      const result = results[index]
      if (!mutation || !result || result.mutation_id !== mutation.id) {
        throw new Error(messages.mismatchedSyncResponse)
      }
      if (result.status === 'applied' || result.status === 'duplicate') {
        await removeOutboxEntry(database, mutation)
      } else if (result.status === 'stale') {
        await removeOutboxEntry(database, mutation)
        needsFullPull = true
        await recordStaleWarning(database, mutation)
      } else if (result.status === 'rejected') {
        if (mutation.seq === undefined) {
          throw new Error(messages.missingOutboxSequence)
        }
        await database.outbox.update(mutation.seq, {
          status: 'rejected',
          problem: result.problem,
        })
        failedEntities.add(mutation.entity_id)
        if (mutation.op === 'CREATE') failedCreates.add(mutation.entity_id)
      }
    }
  }
  return needsFullPull
}

async function selectBatch(
  database: AtlasDatabase,
  pending: OutboxEntry[],
  failedEntities: Set<string>,
  failedCreates: Set<string>,
): Promise<OutboxEntry[]> {
  const selected: OutboxEntry[] = []
  const inFlightCreates = new Set(
    pending
      .filter((entry) => entry.op === 'CREATE')
      .map((entry) => entry.entity_id),
  )
  for (const entry of pending) {
    if (dependsOnFailure(entry, failedEntities, failedCreates)) {
      if (entry.seq === undefined)
        throw new Error(messages.missingOutboxSequence)
      await database.outbox.update(entry.seq, {
        status: 'blocked',
        problem: {
          type: 'about:blank',
          title: 'Mutação bloqueada',
          status: 409,
          detail: messages.syncError,
        },
      })
      failedEntities.add(entry.entity_id)
      if (entry.op === 'CREATE') failedCreates.add(entry.entity_id)
      continue
    }
    if (dependsOnUnresolvedCreate(entry, inFlightCreates)) continue
    selected.push(entry)
    if (selected.length >= PUSH_BATCH_SIZE) break
  }
  return selected
}

function dependsOnFailure(
  entry: OutboxEntry,
  failedEntities: Set<string>,
  failedCreates: Set<string>,
): boolean {
  return (
    failedEntities.has(entry.entity_id) ||
    foreignKeys(entry).some((id) => failedCreates.has(id))
  )
}

function dependsOnUnresolvedCreate(
  entry: OutboxEntry,
  inFlightCreates: Set<string>,
): boolean {
  return (
    (entry.op !== 'CREATE' && inFlightCreates.has(entry.entity_id)) ||
    foreignKeys(entry).some((id) => inFlightCreates.has(id))
  )
}

function foreignKeys(entry: OutboxEntry): string[] {
  return ['category_id', 'inventory_item_id'].flatMap((key) => {
    const value = (entry.payload ?? {})[key]
    return typeof value === 'string' ? [value] : []
  })
}

async function rejectedCreateIds(
  database: AtlasDatabase,
): Promise<Set<string>> {
  const rejected = await database.outbox
    .where('status')
    .anyOf('rejected', 'blocked')
    .filter((entry) => entry.op === 'CREATE')
    .toArray()
  return new Set(rejected.map((entry) => entry.entity_id))
}

async function rejectedEntityIds(
  database: AtlasDatabase,
): Promise<Set<string>> {
  const rejected = await database.outbox
    .where('status')
    .anyOf('rejected', 'blocked')
    .toArray()
  return new Set(rejected.map((entry) => entry.entity_id))
}

async function removeOutboxEntry(
  database: AtlasDatabase,
  entry: OutboxEntry,
): Promise<void> {
  if (entry.seq === undefined) throw new Error(messages.missingOutboxSequence)
  await database.outbox.delete(entry.seq)
}

async function recordStaleWarning(
  database: AtlasDatabase,
  entry: OutboxEntry,
): Promise<void> {
  const stored = await database.meta.get('sync_warnings')
  const warnings = Array.isArray(stored?.value) ? stored.value : []
  await database.meta.put({
    key: 'sync_warnings',
    value: [
      ...warnings,
      {
        type: 'stale',
        entity: entry.entity,
        entity_id: entry.entity_id,
        detail: messages.staleMutation,
        recorded_at: new Date().toISOString(),
      },
    ],
  })
}
