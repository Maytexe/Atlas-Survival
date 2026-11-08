import Dexie, { type Table } from 'dexie'
import type {
  Category,
  HouseholdMember,
  InventoryItem,
  MetaRecord,
  OutboxEntry,
  StockBatch,
} from './schema'

export class AtlasDatabase extends Dexie {
  household_members!: Table<HouseholdMember, string>
  categories!: Table<Category, string>
  inventory_items!: Table<InventoryItem, string>
  stock_batches!: Table<StockBatch, string>
  outbox!: Table<OutboxEntry, number>
  meta!: Table<MetaRecord, string>

  constructor(name = 'atlas') {
    super(name)
    this.version(1).stores({
      household_members: '&id, deleted_at',
      categories: '&id, deleted_at',
      inventory_items: '&id, category_id, name, deleted_at',
      stock_batches: '&id, inventory_item_id, expiration_date, deleted_at',
      outbox: '++seq, status, entity, entity_id, id',
      meta: '&key',
    })
  }
}

export const db = new AtlasDatabase()
