import type { components } from '@/types/api.generated'
import { db, type StockBatch } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { persistNextClientTimestamp } from '@/services/clock'
import { RepositoryError } from './errors'
import { parseDecimalInput } from './decimal-input'
import { addMutation, asPayload, createId, recordTimestamps } from './outbox'

type BatchCreate = components['schemas']['BatchCreate']
type BatchUpdate = components['schemas']['BatchUpdate']

export async function createBatch(
  inventoryItemId: string,
  input: BatchCreate,
  database = db,
): Promise<StockBatch> {
  const id = input.id ?? createId()
  return database.transaction(
    'rw',
    database.inventory_items,
    database.stock_batches,
    database.meta,
    database.outbox,
    async () => {
      const item = await database.inventory_items.get(inventoryItemId)
      if (!item || item.deleted_at) {
        throw new RepositoryError(messages.inventoryItemRequired)
      }
      const quantity = parseDecimalInput(input.quantity)
      if (quantity.isNegative()) {
        throw new RepositoryError(messages.quantityCannotBeNegative)
      }
      const clientTs = await persistNextClientTimestamp(database.meta)
      const batch: StockBatch = {
        ...recordTimestamps(clientTs),
        id,
        inventory_item_id: inventoryItemId,
        quantity: quantity.toFixed(3),
        expiration_date: input.expiration_date ?? null,
        batch_number: input.batch_number ?? null,
        storage_location: input.storage_location ?? null,
      }
      await database.stock_batches.add(batch)
      await addMutation(
        database,
        'stock_batches',
        'CREATE',
        id,
        {
          ...input,
          quantity: quantity.toFixed(3),
          inventory_item_id: inventoryItemId,
        },
        clientTs,
      )
      return batch
    },
  )
}

export async function updateBatch(
  id: string,
  patch: BatchUpdate,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.stock_batches,
    database.meta,
    database.outbox,
    async () => {
      const batch = await database.stock_batches.get(id)
      if (!batch || batch.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const clientTs = await persistNextClientTimestamp(database.meta)
      const update: Partial<StockBatch> = {
        updated_at: clientTs,
        client_updated_at: clientTs,
      }
      if (patch.batch_number !== undefined)
        update.batch_number = patch.batch_number
      if (patch.expiration_date !== undefined)
        update.expiration_date = patch.expiration_date
      if (patch.quantity !== undefined && patch.quantity !== null) {
        const quantity = parseDecimalInput(patch.quantity)
        if (quantity.isNegative()) {
          throw new RepositoryError(messages.quantityCannotBeNegative)
        }
        update.quantity = quantity.toFixed(3)
      }
      if (patch.storage_location !== undefined) {
        update.storage_location = patch.storage_location
      }
      await database.stock_batches.update(id, update)
      await addMutation(
        database,
        'stock_batches',
        'UPDATE',
        id,
        asPayload({
          ...patch,
          ...(patch.quantity === undefined || patch.quantity === null
            ? {}
            : { quantity: parseDecimalInput(patch.quantity).toFixed(3) }),
        }),
        clientTs,
      )
    },
  )
}

export async function deleteBatch(id: string, database = db): Promise<void> {
  await database.transaction(
    'rw',
    database.stock_batches,
    database.meta,
    database.outbox,
    async () => {
      const batch = await database.stock_batches.get(id)
      if (!batch || batch.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const clientTs = await persistNextClientTimestamp(database.meta)
      await database.stock_batches.update(id, {
        deleted_at: clientTs,
        updated_at: clientTs,
        client_updated_at: clientTs,
      })
      await addMutation(database, 'stock_batches', 'DELETE', id, {}, clientTs)
    },
  )
}

export async function listBatchesByExpiration(
  inventoryItemId: string,
  database = db,
): Promise<StockBatch[]> {
  const batches = await database.stock_batches
    .where('inventory_item_id')
    .equals(inventoryItemId)
    .filter((batch) => batch.deleted_at === null)
    .toArray()
  return batches.sort(
    (first, second) =>
      (first.expiration_date ?? '9999-12-31').localeCompare(
        second.expiration_date ?? '9999-12-31',
      ) || first.id.localeCompare(second.id),
  )
}
