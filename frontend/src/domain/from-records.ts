import Decimal from 'decimal.js'
import type { Category, HouseholdMember, InventoryItem, StockBatch } from '@/db'
import type { ItemSnapshot } from './types'

export function toItemSnapshots(
  items: readonly InventoryItem[],
  batches: readonly StockBatch[],
  members: readonly HouseholdMember[],
): ItemSnapshot[] {
  const personCount = members.filter(
    (member) => member.member_type === 'PERSON',
  ).length
  const animalCount = members.filter(
    (member) => member.member_type === 'ANIMAL',
  ).length
  const batchesByItem = new Map<string, StockBatch[]>()
  for (const batch of batches) {
    if (batch.deleted_at !== null) continue
    const itemBatches = batchesByItem.get(batch.inventory_item_id) ?? []
    itemBatches.push(batch)
    batchesByItem.set(batch.inventory_item_id, itemBatches)
  }
  return items
    .filter((item) => item.deleted_at === null)
    .map((item) => ({
      id: item.id,
      name: item.name,
      itemKind: item.item_kind,
      unit: item.unit,
      dailyConsumption:
        item.daily_consumption === null
          ? null
          : new Decimal(item.daily_consumption),
      consumptionBasis: item.consumption_basis,
      personCount,
      animalCount,
      batches: (batchesByItem.get(item.id) ?? []).map((batch) => ({
        id: batch.id,
        quantity: new Decimal(batch.quantity),
        expirationDate: batch.expiration_date,
      })),
    }))
}

export function categoryName(
  categories: readonly Category[],
  categoryId: string,
): string {
  return categories.find((category) => category.id === categoryId)?.name ?? ''
}
