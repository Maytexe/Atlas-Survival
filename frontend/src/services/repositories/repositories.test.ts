import { afterEach, describe, expect, it, vi } from 'vitest'
import { AtlasDatabase } from '@/db/database'
import {
  adjustBatchQuantity,
  createBatch,
  createCategory,
  createInventoryItem,
  createMember,
  deleteCategory,
  deleteInventoryItem,
  listBatchesByExpiration,
} from './index'

let database: AtlasDatabase

async function createDatabase(): Promise<AtlasDatabase> {
  database = new AtlasDatabase(`atlas-test-${crypto.randomUUID()}`)
  await database.open()
  return database
}

afterEach(async () => {
  if (database?.isOpen()) await database.delete()
})

describe('repositórios offline', () => {
  it('grava a entidade e sua mutação atomicamente', async () => {
    const local = await createDatabase()
    const addOutbox = vi
      .spyOn(local.outbox, 'add')
      .mockRejectedValue(new Error('falha simulada ao gravar o outbox'))
    await expect(
      createMember({ name: 'Pessoa', member_type: 'PERSON' }, local),
    ).rejects.toThrow('falha simulada ao gravar o outbox')
    expect(await local.household_members.count()).toBe(0)
    expect(await local.outbox.count()).toBe(0)
    addOutbox.mockRestore()
    await expect(
      createInventoryItem(
        {
          name: 'Água',
          category_id: 'categoria-inexistente',
          item_kind: 'WATER',
          unit: 'L',
          consumption_basis: 'HOUSEHOLD',
        },
        local,
      ),
    ).rejects.toThrow('O item precisa de uma categoria ativa.')
    expect(await local.inventory_items.count()).toBe(0)
    expect(await local.outbox.count()).toBe(0)
  })

  it('valida a integridade local e bloqueia a exclusão de categoria em uso', async () => {
    const local = await createDatabase()
    const category = await createCategory({ name: 'Alimentos' }, local)
    await expect(
      createInventoryItem(
        {
          name: 'Arroz',
          category_id: category.id,
          item_kind: 'FOOD',
          unit: 'kg',
          consumption_basis: 'HOUSEHOLD',
        },
        local,
      ),
    ).resolves.toBeDefined()
    await expect(deleteCategory(category.id, local)).rejects.toThrow(
      'Não é possível excluir uma categoria que possui itens ativos.',
    )
    await expect(
      createBatch('item-inexistente', { quantity: '2' }, local),
    ).rejects.toThrow('O lote precisa de um item ativo.')
  })

  it('impede nomes de categoria duplicados sem diferenciar maiúsculas', async () => {
    const local = await createDatabase()
    await createCategory({ name: 'Alimentos' }, local)
    await expect(createCategory({ name: 'ALIMENTOS' }, local)).rejects.toThrow(
      'Já existe uma categoria ativa com esse nome.',
    )
    expect(await local.categories.count()).toBe(1)
  })

  it('aplica tombstones em cascata e não inclui tombstones nas consultas FEFO', async () => {
    const local = await createDatabase()
    const category = await createCategory({ name: 'Estoque' }, local)
    const item = await createInventoryItem(
      {
        name: 'Água',
        category_id: category.id,
        item_kind: 'WATER',
        unit: 'L',
        consumption_basis: 'HOUSEHOLD',
      },
      local,
    )
    const first = await createBatch(
      item.id,
      { quantity: '2', expiration_date: '2025-01-01' },
      local,
    )
    const second = await createBatch(
      item.id,
      { quantity: '3', expiration_date: null },
      local,
    )
    expect(
      (await listBatchesByExpiration(item.id, local)).map((batch) => batch.id),
    ).toEqual([first.id, second.id])
    await deleteInventoryItem(item.id, local)
    expect(
      (await local.inventory_items.get(item.id))?.deleted_at,
    ).not.toBeNull()
    expect((await local.stock_batches.get(first.id))?.deleted_at).not.toBeNull()
    expect(await listBatchesByExpiration(item.id, local)).toEqual([])
  })

  it('rejeita ADJUST negativo e mantém quantidades decimais exatas', async () => {
    const local = await createDatabase()
    const category = await createCategory({ name: 'Água' }, local)
    const item = await createInventoryItem(
      {
        name: 'Água potável',
        category_id: category.id,
        item_kind: 'WATER',
        unit: 'L',
        consumption_basis: 'HOUSEHOLD',
      },
      local,
    )
    const batch = await createBatch(item.id, { quantity: '1.250' }, local)
    const originalClientTimestamp = batch.client_updated_at
    await expect(
      adjustBatchQuantity(batch.id, '-1.251', local),
    ).rejects.toThrow('O ajuste não pode deixar a quantidade negativa.')
    await adjustBatchQuantity(batch.id, '-0.125', local)
    const adjusted = await local.stock_batches.get(batch.id)
    expect(adjusted?.quantity).toBe('1.125')
    expect(adjusted?.client_updated_at).toBe(originalClientTimestamp)
    await expect(adjustBatchQuantity(batch.id, 'NaN', local)).rejects.toThrow(
      'Informe um valor decimal válido com até três casas decimais.',
    )
    const mutations = await local.outbox.orderBy('seq').toArray()
    expect(mutations.map((entry) => entry.seq)).toEqual(
      [...mutations.map((entry) => entry.seq)].sort(
        (first, second) => (first ?? 0) - (second ?? 0),
      ),
    )
    await createMember({ name: 'Pessoa', member_type: 'PERSON' }, local)
    expect(await local.outbox.where('status').equals('pending').count()).toBe(5)
  })
})
