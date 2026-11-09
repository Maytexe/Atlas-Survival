import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

export function useLocalData() {
  const result = useLiveQuery(async () => {
    try {
      const [members, categories, items, batches] = await Promise.all([
        db.household_members
          .filter((member) => member.deleted_at === null)
          .toArray(),
        db.categories
          .filter((category) => category.deleted_at === null)
          .toArray(),
        db.inventory_items.filter((item) => item.deleted_at === null).toArray(),
        db.stock_batches.filter((batch) => batch.deleted_at === null).toArray(),
      ])
      return { data: { members, categories, items, batches }, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }, [])
  return {
    data: result?.data ?? null,
    error: result?.error ?? null,
    loading: result === undefined,
  }
}

export function useInventoryItem(id: string | undefined) {
  const result = useLiveQuery(async () => {
    if (!id) return { data: null, error: null }
    try {
      const item = await db.inventory_items.get(id)
      if (!item || item.deleted_at !== null) {
        return { data: null, error: null }
      }
      const batches = await db.stock_batches
        .where('inventory_item_id')
        .equals(id)
        .filter((batch) => batch.deleted_at === null)
        .toArray()
      return {
        data: {
          item,
          batches: batches.sort(
            (first, second) =>
              (first.expiration_date ?? '9999-12-31').localeCompare(
                second.expiration_date ?? '9999-12-31',
              ) || first.id.localeCompare(second.id),
          ),
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  }, [id])
  return {
    data: result?.data ?? null,
    error: result?.error ?? null,
    loading: result === undefined,
  }
}
