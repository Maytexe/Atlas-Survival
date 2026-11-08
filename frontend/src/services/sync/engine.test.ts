import { afterEach, describe, expect, it, vi } from 'vitest'
import { AtlasDatabase } from '@/db/database'
import type { Category, InventoryItem } from '@/db/schema'
import type { PullResponse, SyncApi, SyncMutation } from '@/services/api'
import { SyncEngine } from './engine'

let database: AtlasDatabase

function emptyPull(cursor: number): PullResponse {
  return {
    categories: [],
    household_members: [],
    inventory_items: [],
    stock_batches: [],
    cursor,
  }
}

function createApi(overrides: Partial<SyncApi> = {}): SyncApi {
  return {
    health: async () => {},
    push: async () => [],
    pull: async (cursor) => emptyPull(cursor),
    ...overrides,
  }
}

async function createDatabase(): Promise<AtlasDatabase> {
  database = new AtlasDatabase(`atlas-sync-test-${crypto.randomUUID()}`)
  await database.open()
  return database
}

function timestamps(id: string) {
  const timestamp = '2025-03-01T10:00:00.000Z'
  return {
    id,
    created_at: timestamp,
    updated_at: timestamp,
    client_updated_at: timestamp,
    change_seq: 1,
    deleted_at: null,
  }
}

afterEach(async () => {
  if (database?.isOpen()) await database.delete()
})

describe('motor de sincronização', () => {
  it('remove mutações aplicadas e duplicadas do outbox', async () => {
    const local = await createDatabase()
    const clientTs = '2025-03-01T10:00:00.000Z'
    await local.outbox.bulkAdd([
      {
        id: 'm1',
        entity: 'household_members',
        op: 'CREATE',
        entity_id: 'p1',
        payload: { name: 'Pessoa', member_type: 'PERSON' },
        client_ts: clientTs,
        attempts: 0,
        status: 'pending',
      },
      {
        id: 'm2',
        entity: 'household_members',
        op: 'CREATE',
        entity_id: 'p2',
        payload: { name: 'Pessoa 2', member_type: 'PERSON' },
        client_ts: clientTs,
        attempts: 0,
        status: 'pending',
      },
    ])
    const push = vi.fn(async (mutations: SyncMutation[]) =>
      mutations.map((mutation, index) => ({
        mutation_id: mutation.id,
        status: index === 0 ? ('applied' as const) : ('duplicate' as const),
      })),
    )
    const engine = new SyncEngine({
      database: local,
      api: createApi({
        push,
      }),
    })
    expect(await engine.sync()).toBe(true)
    expect(await local.outbox.count()).toBe(0)
    expect(engine.getSnapshot().state).toBe('Online')
    const sentMutation = push.mock.calls[0]?.[0][0]
    expect(sentMutation).toMatchObject({ id: 'm1', attempts: 1 })
    expect(sentMutation).not.toHaveProperty('seq')
    expect(sentMutation).not.toHaveProperty('status')
  })

  it('mantém a mutação pendente e contabiliza a tentativa quando a rede falha', async () => {
    const local = await createDatabase()
    await local.outbox.add({
      id: 'retry-mutation',
      entity: 'household_members',
      op: 'CREATE',
      entity_id: 'p1',
      payload: { name: 'Pessoa', member_type: 'PERSON' },
      client_ts: '2025-03-01T10:00:00.000Z',
      attempts: 0,
      status: 'pending',
    })
    const engine = new SyncEngine({
      database: local,
      api: createApi({
        push: async () => {
          throw new Error('rede indisponível')
        },
      }),
    })
    await expect(engine.sync()).rejects.toThrow('rede indisponível')
    const mutation = await local.outbox.toCollection().first()
    expect(mutation?.status).toBe('pending')
    expect(mutation?.attempts).toBe(1)
  })

  it('marca como bloqueadas as dependências de um CREATE rejeitado', async () => {
    const local = await createDatabase()
    const category = {
      ...timestamps('category-a'),
      name: 'Alimentos',
      description: null,
    } satisfies Category
    const item = {
      ...timestamps('item-a'),
      name: 'Arroz',
      description: null,
      category_id: category.id,
      item_kind: 'FOOD',
      unit: 'kg',
      daily_consumption: null,
      consumption_basis: 'HOUSEHOLD',
    } satisfies InventoryItem
    await local.categories.add(category)
    await local.inventory_items.add(item)
    await local.outbox.bulkAdd([
      {
        id: 'create-category',
        entity: 'categories',
        op: 'CREATE',
        entity_id: category.id,
        payload: { name: category.name },
        client_ts: category.client_updated_at,
        attempts: 0,
        status: 'pending',
      },
      {
        id: 'create-item',
        entity: 'inventory_items',
        op: 'CREATE',
        entity_id: item.id,
        payload: { name: item.name, category_id: category.id },
        client_ts: item.client_updated_at,
        attempts: 0,
        status: 'pending',
      },
      {
        id: 'create-batch',
        entity: 'stock_batches',
        op: 'CREATE',
        entity_id: 'batch-a',
        payload: { inventory_item_id: item.id, quantity: '2.000' },
        client_ts: item.client_updated_at,
        attempts: 0,
        status: 'pending',
      },
      {
        id: 'update-category',
        entity: 'categories',
        op: 'UPDATE',
        entity_id: category.id,
        payload: { name: 'Mantimentos' },
        client_ts: '2025-03-01T10:00:00.001Z',
        attempts: 0,
        status: 'pending',
      },
    ])
    const push = vi.fn(async (mutations: SyncMutation[]) =>
      mutations.map((mutation) => ({
        mutation_id: mutation.id,
        status: 'rejected' as const,
        problem: {
          type: 'about:blank',
          title: 'Conflito',
          status: 409,
          detail: 'Nome já existe.',
        },
      })),
    )
    const engine = new SyncEngine({ database: local, api: createApi({ push }) })
    await engine.sync()
    expect(push).toHaveBeenCalledTimes(1)
    expect(push.mock.calls[0]?.[0]).toHaveLength(1)
    expect(await local.outbox.where('status').equals('rejected').count()).toBe(
      1,
    )
    expect(await local.outbox.where('status').equals('blocked').count()).toBe(3)
  })

  it('registra aviso para stale e solicita pull completo pelo cursor zero', async () => {
    const local = await createDatabase()
    await local.outbox.add({
      id: 'stale-mutation',
      entity: 'household_members',
      op: 'UPDATE',
      entity_id: 'member-a',
      payload: { name: 'Nome local' },
      client_ts: '2025-03-01T10:00:00.000Z',
      attempts: 0,
      status: 'pending',
    })
    await local.meta.put({ key: 'cursor', value: 42 })
    const pull = vi.fn(async (cursor: number) => emptyPull(cursor))
    const engine = new SyncEngine({
      database: local,
      api: createApi({
        push: async ([mutation]) => [
          { mutation_id: mutation!.id, status: 'stale' },
        ],
        pull,
      }),
    })
    await engine.sync()
    expect(pull).toHaveBeenCalledWith(0)
    expect(await local.outbox.count()).toBe(0)
    expect((await local.meta.get('sync_warnings'))?.value).toMatchObject([
      { type: 'stale', entity_id: 'member-a' },
    ])
  })
})
