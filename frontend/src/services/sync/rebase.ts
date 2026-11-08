import Decimal from 'decimal.js'
import type { Table } from 'dexie'
import type { AtlasDatabase } from '@/db/database'
import type {
  Category,
  EntityName,
  HouseholdMember,
  InventoryItem,
  OutboxEntry,
  StockBatch,
} from '@/db/schema'
import type { PullResponse } from '@/services/api'

type SyncRecord = HouseholdMember | Category | InventoryItem | StockBatch

function applyMutation(record: SyncRecord, mutation: OutboxEntry): SyncRecord {
  if (mutation.op === 'DELETE') {
    return { ...record, deleted_at: mutation.client_ts }
  }
  if (mutation.op === 'ADJUST' && 'quantity' in record) {
    const delta = (mutation.payload ?? {}).delta
    if (typeof delta !== 'string' && typeof delta !== 'number') return record
    return {
      ...record,
      quantity: new Decimal(record.quantity).plus(String(delta)).toFixed(3),
    }
  }
  if (mutation.op === 'UPDATE' || mutation.op === 'CREATE') {
    return {
      ...record,
      ...(mutation.payload ?? {}),
      id: record.id,
      client_updated_at: mutation.client_ts,
    }
  }
  return record
}

async function applyEntity<T extends SyncRecord>(
  database: AtlasDatabase,
  entity: EntityName,
  table: Table<T, string>,
  records: readonly T[],
): Promise<void> {
  for (const remoteRecord of records) {
    if (remoteRecord.deleted_at !== null) {
      await table.delete(remoteRecord.id)
      continue
    }
    const pending = await database.outbox
      .where('entity_id')
      .equals(remoteRecord.id)
      .filter((entry) => entry.entity === entity && entry.status === 'pending')
      .sortBy('seq')
    const rebased = pending.reduce<SyncRecord>(
      (record, mutation) => applyMutation(record, mutation),
      remoteRecord,
    )
    await table.put(rebased as T)
  }
}

export async function applyPullPage(
  database: AtlasDatabase,
  response: PullResponse,
): Promise<void> {
  await applyEntity(
    database,
    'household_members',
    database.household_members,
    response.household_members,
  )
  await applyEntity(
    database,
    'categories',
    database.categories,
    response.categories,
  )
  await applyEntity(
    database,
    'inventory_items',
    database.inventory_items,
    response.inventory_items,
  )
  await applyEntity(
    database,
    'stock_batches',
    database.stock_batches,
    response.stock_batches,
  )
  await database.meta.put({ key: 'cursor', value: response.cursor })
}
