import { afterEach, describe, expect, it, vi } from 'vitest'
import { AtlasDatabase } from '@/db/database'
import type { Category, HouseholdMember, InventoryItem } from '@/db/schema'
import {
  ApiProblemError,
  type PullResponse,
  type SyncApi,
} from '@/services/api'
import {
  calculateBackoffDelay,
  isRetryableSyncError,
  SyncEngine,
} from './engine'
import { startSyncTriggers } from './triggers'

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
  vi.useRealTimers()
  if (database?.isOpen()) await database.delete()
  vi.unstubAllGlobals()
})

describe('pull e ciclo de vida do sync', () => {
  it('reaplica uma edição pendente após receber a versão do servidor', async () => {
    const local = await createDatabase()
    const remote: HouseholdMember = {
      ...timestamps('member-a'),
      name: 'Nome do servidor',
      member_type: 'PERSON',
      age: null,
      notes: null,
    }
    let page = 0
    const api = createApi({
      pull: async () => {
        page += 1
        if (page === 1) {
          await local.household_members.put({
            ...remote,
            name: 'Edição local',
          })
          await local.outbox.add({
            id: 'pending-edit',
            entity: 'household_members',
            op: 'UPDATE',
            entity_id: remote.id,
            payload: { name: 'Edição local' },
            client_ts: '2025-03-01T10:00:00.001Z',
            attempts: 0,
            status: 'pending',
          })
          return {
            ...emptyPull(10),
            household_members: [remote],
          }
        }
        return emptyPull(10)
      },
    })
    const engine = new SyncEngine({ database: local, api })
    await engine.sync()
    expect((await local.household_members.get(remote.id))?.name).toBe(
      'Edição local',
    )
    expect(await local.outbox.where('status').equals('pending').count()).toBe(1)
    expect((await local.meta.get('cursor'))?.value).toBe(10)
    expect(page).toBe(2)
  })

  it('descarta um CREATE e as entidades e mutações dependentes, depois faz pull completo', async () => {
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
        id: 'root-create',
        entity: 'categories',
        op: 'CREATE',
        entity_id: category.id,
        payload: { name: category.name },
        client_ts: category.client_updated_at,
        attempts: 0,
        status: 'rejected',
      },
      {
        id: 'child-create',
        entity: 'inventory_items',
        op: 'CREATE',
        entity_id: item.id,
        payload: { category_id: category.id },
        client_ts: item.client_updated_at,
        attempts: 0,
        status: 'blocked',
      },
    ])
    const pull = vi.fn(async (cursor: number) => emptyPull(cursor))
    const engine = new SyncEngine({
      database: local,
      api: createApi({ pull }),
    })
    await engine.discard('root-create')
    expect(await local.categories.get(category.id)).toBeUndefined()
    expect(await local.inventory_items.get(item.id)).toBeUndefined()
    expect(await local.outbox.count()).toBe(0)
    expect(pull).toHaveBeenCalledWith(0)
  })

  it('coalesce disparos simultâneos e limita o backoff com jitter', async () => {
    const local = await createDatabase()
    let releaseHealth: (() => void) | undefined
    const health = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseHealth = resolve
        }),
    )
    const engine = new SyncEngine({
      database: local,
      api: createApi({ health }),
    })
    const first = engine.sync()
    const second = engine.sync()
    expect(first).toBe(second)
    await vi.waitFor(() => expect(health).toHaveBeenCalledTimes(1))
    releaseHealth?.()
    await first
    expect(health).toHaveBeenCalledTimes(1)
    expect(calculateBackoffDelay(1, () => 0)).toBe(500)
    expect(calculateBackoffDelay(20, () => 1)).toBe(60_000)
    expect(
      isRetryableSyncError(
        new ApiProblemError(
          {
            type: 'about:blank',
            title: 'Sem conexão',
            status: 0,
            detail: 'Sem conexão.',
          },
          0,
        ),
      ),
    ).toBe(true)
  })

  it('agenda retry com backoff usando timers controláveis', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal(
      'document',
      Object.assign(new EventTarget(), { visibilityState: 'hidden' }),
    )
    const sync = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValueOnce(
        new ApiProblemError(
          {
            type: 'about:blank',
            title: 'Sem conexão',
            status: 0,
            detail: 'Sem conexão.',
          },
          0,
        ),
      )
      .mockResolvedValue(true)
    const stop = startSyncTriggers({ sync }, () => 0)
    await Promise.resolve()
    await Promise.resolve()
    expect(sync).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(499)
    expect(sync).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(sync).toHaveBeenCalledTimes(2)
    stop()
  })
})
