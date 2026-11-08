import type { components } from '@/types/api.generated'
import { db, type InventoryItem, type StockBatch } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { persistNextClientTimestamp } from '@/services/clock'
import { RepositoryError } from './errors'
import { parseDecimalInput } from './decimal-input'
import { addMutation, asPayload, createId, recordTimestamps } from './outbox'

type InventoryCreate = components['schemas']['InventoryCreate']
type InventoryUpdate = components['schemas']['InventoryUpdate']

export interface InventoryWithBatches {
  item: InventoryItem
  batches: StockBatch[]
}

export async function createInventoryItem(
  input: InventoryCreate,
  database = db,
): Promise<InventoryItem> {
  const id = input.id ?? createId()
  return database.transaction(
    'rw',
    database.categories,
    database.inventory_items,
    database.meta,
    database.outbox,
    async () => {
      const category = await database.categories.get(input.category_id)
      if (!category || category.deleted_at) {
        throw new RepositoryError(messages.categoryRequired)
      }
      const dailyConsumption =
        input.daily_consumption == null
          ? null
          : parseDecimalInput(input.daily_consumption)
      if (dailyConsumption?.isNegative()) {
        throw new RepositoryError(messages.consumptionCannotBeNegative)
      }
      const clientTs = await persistNextClientTimestamp(database.meta)
      const item: InventoryItem = {
        ...recordTimestamps(clientTs),
        id,
        name: input.name,
        description: input.description ?? null,
        category_id: input.category_id,
        item_kind: input.item_kind,
        unit: input.unit,
        daily_consumption: dailyConsumption?.toFixed(3) ?? null,
        consumption_basis: input.consumption_basis ?? 'HOUSEHOLD',
      }
      await database.inventory_items.add(item)
      await addMutation(
        database,
        'inventory_items',
        'CREATE',
        id,
        asPayload({
          ...input,
          daily_consumption: dailyConsumption?.toFixed(3) ?? null,
        }),
        clientTs,
      )
      return item
    },
  )
}

export async function updateInventoryItem(
  id: string,
  patch: InventoryUpdate,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.categories,
    database.inventory_items,
    database.meta,
    database.outbox,
    async () => {
      const item = await database.inventory_items.get(id)
      if (!item || item.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      if ('category_id' in patch && patch.category_id === null) {
        throw new RepositoryError(messages.categoryRequired)
      }
      if (patch.category_id) {
        const category = await database.categories.get(patch.category_id)
        if (!category || category.deleted_at) {
          throw new RepositoryError(messages.categoryRequired)
        }
      }
      const dailyConsumption =
        patch.daily_consumption == null
          ? patch.daily_consumption
          : parseDecimalInput(patch.daily_consumption)
      if (dailyConsumption && dailyConsumption.isNegative()) {
        throw new RepositoryError(messages.consumptionCannotBeNegative)
      }
      const clientTs = await persistNextClientTimestamp(database.meta)
      const update: Partial<InventoryItem> = {
        updated_at: clientTs,
        client_updated_at: clientTs,
      }
      if (typeof patch.category_id === 'string')
        update.category_id = patch.category_id
      if (typeof patch.consumption_basis === 'string') {
        update.consumption_basis = patch.consumption_basis
      }
      if (patch.daily_consumption !== undefined) {
        update.daily_consumption =
          dailyConsumption === null || dailyConsumption === undefined
            ? null
            : dailyConsumption.toFixed(3)
      }
      if (patch.description !== undefined)
        update.description = patch.description
      if (typeof patch.item_kind === 'string')
        update.item_kind = patch.item_kind
      if (typeof patch.name === 'string') update.name = patch.name
      if (typeof patch.unit === 'string') update.unit = patch.unit
      await database.inventory_items.update(id, update)
      await addMutation(
        database,
        'inventory_items',
        'UPDATE',
        id,
        {
          ...patch,
          ...(patch.daily_consumption === undefined
            ? {}
            : {
                daily_consumption: dailyConsumption?.toFixed(3) ?? null,
              }),
        },
        clientTs,
      )
    },
  )
}

export async function deleteInventoryItem(
  id: string,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.inventory_items,
    database.stock_batches,
    database.meta,
    database.outbox,
    async () => {
      const item = await database.inventory_items.get(id)
      if (!item || item.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const clientTs = await persistNextClientTimestamp(database.meta)
      await database.inventory_items.update(id, {
        deleted_at: clientTs,
        updated_at: clientTs,
        client_updated_at: clientTs,
      })
      await database.stock_batches
        .where('inventory_item_id')
        .equals(id)
        .modify({
          deleted_at: clientTs,
          updated_at: clientTs,
          client_updated_at: clientTs,
        })
      await addMutation(database, 'inventory_items', 'DELETE', id, {}, clientTs)
    },
  )
}

export async function listInventoryWithBatches(
  database = db,
): Promise<InventoryWithBatches[]> {
  const items = await database.inventory_items
    .filter((item) => item.deleted_at === null)
    .toArray()
  const batches = await database.stock_batches
    .filter((batch) => batch.deleted_at === null)
    .toArray()
  const batchesByItem = new Map<string, StockBatch[]>()
  for (const batch of batches) {
    batchesByItem.set(batch.inventory_item_id, [
      ...(batchesByItem.get(batch.inventory_item_id) ?? []),
      batch,
    ])
  }
  return items.map((item) => ({
    item,
    batches: batchesByItem.get(item.id) ?? [],
  }))
}

export async function adjustBatchQuantity(
  batchId: string,
  delta: string,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.stock_batches,
    database.meta,
    database.outbox,
    async () => {
      const batch = await database.stock_batches.get(batchId)
      if (!batch || batch.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const deltaQuantity = parseDecimalInput(delta)
      const quantity = parseDecimalInput(
        parseDecimalInput(batch.quantity).plus(deltaQuantity).toString(),
      )
      if (quantity.isNegative()) {
        throw new RepositoryError(messages.batchAdjustmentNegative)
      }
      const updatedAt = await persistNextClientTimestamp(database.meta)
      await database.stock_batches.update(batchId, {
        quantity: quantity.toFixed(3),
        updated_at: updatedAt,
      })
      await addMutation(
        database,
        'stock_batches',
        'ADJUST',
        batchId,
        { delta: deltaQuantity.toFixed(3) },
        updatedAt,
      )
    },
  )
}
