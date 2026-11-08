import type { AtlasDatabase } from '@/db/database'
import type { EntityName, MutationOperation, OutboxEntry } from '@/db/schema'
import { persistNextClientTimestamp } from '@/services/clock'

export function createId(): string {
  return crypto.randomUUID()
}

export async function addMutation(
  database: AtlasDatabase,
  entity: EntityName,
  op: MutationOperation,
  entityId: string,
  payload: Record<string, unknown>,
  clientTs?: string,
): Promise<void> {
  const timestamp =
    clientTs ?? (await persistNextClientTimestamp(database.meta))
  const mutation: OutboxEntry = {
    id: createId(),
    entity,
    op,
    entity_id: entityId,
    payload,
    client_ts: timestamp,
    attempts: 0,
    status: 'pending',
  }
  await database.outbox.add(mutation)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('atlas:mutation'))
  }
}

export function recordTimestamps(clientTs: string) {
  return {
    created_at: clientTs,
    updated_at: clientTs,
    client_updated_at: clientTs,
    deleted_at: null,
    change_seq: 0,
  }
}

export function asPayload(value: object): Record<string, unknown> {
  return { ...value }
}
