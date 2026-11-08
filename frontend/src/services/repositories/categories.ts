import type { components } from '@/types/api.generated'
import { db, type Category } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { persistNextClientTimestamp } from '@/services/clock'
import { RepositoryError } from './errors'
import { addMutation, asPayload, createId, recordTimestamps } from './outbox'

type CategoryCreate = components['schemas']['CategoryCreate']
type CategoryUpdate = components['schemas']['CategoryUpdate']

export async function createCategory(
  input: CategoryCreate,
  database = db,
): Promise<Category> {
  const id = input.id ?? createId()
  return database.transaction(
    'rw',
    database.categories,
    database.meta,
    database.outbox,
    async () => {
      const clientTs = await persistNextClientTimestamp(database.meta)
      const category: Category = {
        ...recordTimestamps(clientTs),
        id,
        name: input.name,
        description: input.description ?? null,
      }
      const duplicate = await database.categories
        .filter(
          (existing) =>
            existing.deleted_at === null &&
            existing.name.toLocaleLowerCase('pt-BR') ===
              category.name.toLocaleLowerCase('pt-BR'),
        )
        .first()
      if (duplicate) throw new RepositoryError(messages.duplicateCategory)
      await database.categories.add(category)
      await addMutation(
        database,
        'categories',
        'CREATE',
        id,
        asPayload(input),
        clientTs,
      )
      return category
    },
  )
}

export async function updateCategory(
  id: string,
  patch: CategoryUpdate,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.categories,
    database.meta,
    database.outbox,
    async () => {
      const category = await database.categories.get(id)
      if (!category || category.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const clientTs = await persistNextClientTimestamp(database.meta)
      const updatedName = patch.name
      if (typeof updatedName === 'string') {
        const duplicate = await database.categories
          .filter(
            (existing) =>
              existing.id !== id &&
              existing.deleted_at === null &&
              existing.name.toLocaleLowerCase('pt-BR') ===
                updatedName.toLocaleLowerCase('pt-BR'),
          )
          .first()
        if (duplicate) throw new RepositoryError(messages.duplicateCategory)
      }
      const update: Partial<Category> = {
        updated_at: clientTs,
        client_updated_at: clientTs,
      }
      if (typeof patch.name === 'string') update.name = patch.name
      if (patch.description !== undefined)
        update.description = patch.description
      await database.categories.update(id, update)
      await addMutation(
        database,
        'categories',
        'UPDATE',
        id,
        asPayload(patch),
        clientTs,
      )
    },
  )
}

export async function deleteCategory(id: string, database = db): Promise<void> {
  await database.transaction(
    'rw',
    database.categories,
    database.inventory_items,
    database.meta,
    database.outbox,
    async () => {
      const category = await database.categories.get(id)
      if (!category || category.deleted_at)
        throw new RepositoryError(messages.recordNotFound)
      const activeItems = await database.inventory_items
        .where('category_id')
        .equals(id)
        .filter((item) => item.deleted_at === null)
        .count()
      if (activeItems > 0) {
        throw new RepositoryError(messages.categoryHasActiveItems)
      }
      const clientTs = await persistNextClientTimestamp(database.meta)
      await database.categories.update(id, {
        deleted_at: clientTs,
        updated_at: clientTs,
        client_updated_at: clientTs,
      })
      await addMutation(database, 'categories', 'DELETE', id, {}, clientTs)
    },
  )
}

export async function listCategories(database = db): Promise<Category[]> {
  return database.categories
    .filter((category) => category.deleted_at === null)
    .toArray()
}
