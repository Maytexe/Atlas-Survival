import { z } from 'zod'
import { db } from '@/db'
import {
  createBatch,
  createCategory,
  createInventoryItem,
  createMember,
  updateBatch,
  updateCategory,
  updateInventoryItem,
  updateMember,
} from './repositories'

const timestampSchema = z.string().datetime()
const memberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  member_type: z.enum(['PERSON', 'ANIMAL']),
  age: z.number().int().nonnegative().nullable(),
  notes: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  client_updated_at: timestampSchema,
  change_seq: z.number(),
  deleted_at: timestampSchema.nullable(),
})
const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  client_updated_at: timestampSchema,
  change_seq: z.number(),
  deleted_at: timestampSchema.nullable(),
})
const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  category_id: z.string().uuid(),
  item_kind: z.enum(['FOOD', 'WATER', 'OTHER']),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'unidade', 'pacote', 'lata', 'garrafa']),
  daily_consumption: z
    .string()
    .regex(/^\d+(?:\.\d{1,3})?$/)
    .nullable(),
  consumption_basis: z.enum(['HOUSEHOLD', 'PER_PERSON', 'PER_ANIMAL']),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  client_updated_at: timestampSchema,
  change_seq: z.number(),
  deleted_at: timestampSchema.nullable(),
})
const batchSchema = z.object({
  id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  quantity: z.string().regex(/^\d+(?:\.\d{1,3})?$/),
  expiration_date: z.string().date().nullable(),
  batch_number: z.string().nullable(),
  storage_location: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  client_updated_at: timestampSchema,
  change_seq: z.number(),
  deleted_at: timestampSchema.nullable(),
})

export const backupSchema = z.object({
  version: z.literal(1),
  exported_at: timestampSchema,
  household_members: z.array(memberSchema),
  categories: z.array(categorySchema),
  inventory_items: z.array(itemSchema),
  stock_batches: z.array(batchSchema),
})

export type AtlasBackup = z.infer<typeof backupSchema>

export function validateBackup(input: unknown): AtlasBackup {
  return backupSchema.parse(input)
}

export async function exportBackup(): Promise<AtlasBackup> {
  const [household_members, categories, inventory_items, stock_batches] =
    await Promise.all([
      db.household_members
        .filter((record) => record.deleted_at === null)
        .toArray(),
      db.categories.filter((record) => record.deleted_at === null).toArray(),
      db.inventory_items
        .filter((record) => record.deleted_at === null)
        .toArray(),
      db.stock_batches.filter((record) => record.deleted_at === null).toArray(),
    ])
  return backupSchema.parse({
    version: 1,
    exported_at: new Date().toISOString(),
    household_members,
    categories,
    inventory_items,
    stock_batches,
  })
}

export async function importBackup(input: unknown): Promise<AtlasBackup> {
  const backup = validateBackup(input)
  const existingMembers = new Set(
    (await db.household_members.toCollection().primaryKeys()).map(String),
  )
  const existingCategories = new Set(
    (await db.categories.toCollection().primaryKeys()).map(String),
  )
  const existingItems = new Set(
    (await db.inventory_items.toCollection().primaryKeys()).map(String),
  )
  const existingBatches = new Set(
    (await db.stock_batches.toCollection().primaryKeys()).map(String),
  )

  for (const category of backup.categories) {
    if (category.deleted_at) continue
    const input = {
      id: category.id,
      name: category.name,
      description: category.description,
    }
    if (existingCategories.has(category.id)) {
      await updateCategory(category.id, input)
    } else {
      await createCategory(input)
      existingCategories.add(category.id)
    }
  }
  for (const member of backup.household_members) {
    if (member.deleted_at) continue
    const input = {
      name: member.name,
      member_type: member.member_type,
      age: member.age,
      notes: member.notes,
    }
    if (existingMembers.has(member.id)) {
      await updateMember(member.id, input)
    } else {
      await createMember({ id: member.id, ...input })
      existingMembers.add(member.id)
    }
  }
  for (const item of backup.inventory_items) {
    if (item.deleted_at) continue
    const input = {
      name: item.name,
      description: item.description,
      category_id: item.category_id,
      item_kind: item.item_kind,
      unit: item.unit,
      daily_consumption: item.daily_consumption,
      consumption_basis: item.consumption_basis,
    }
    if (existingItems.has(item.id)) {
      await updateInventoryItem(item.id, input)
    } else {
      await createInventoryItem({ id: item.id, ...input })
      existingItems.add(item.id)
    }
  }
  for (const batch of backup.stock_batches) {
    if (batch.deleted_at) continue
    const input = {
      quantity: batch.quantity,
      expiration_date: batch.expiration_date,
      batch_number: batch.batch_number,
      storage_location: batch.storage_location,
    }
    if (existingBatches.has(batch.id)) {
      await updateBatch(batch.id, input)
    } else {
      await createBatch(batch.inventory_item_id, {
        id: batch.id,
        ...input,
      })
      existingBatches.add(batch.id)
    }
  }
  return backup
}
