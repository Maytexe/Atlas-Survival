import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { messages } from '@/i18n/pt-BR'
import { exportBackup } from '@/services/backup'
import { useGoals } from './use-goals'

describe('useGoals', () => {
  beforeEach(async () => {
    await Promise.all([
      db.meta.clear(),
      db.household_members.clear(),
      db.categories.clear(),
      db.inventory_items.clear(),
      db.stock_batches.clear(),
    ])
  })

  it('persiste metas opcionais junto das demais configurações', async () => {
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.settings).not.toBeNull())

    await act(async () => {
      await result.current.saveGoals(3, null, result.current.settings!)
    })

    await waitFor(() => expect(result.current.goalFoodDays).toBe(3))
    expect(result.current.goalWaterDays).toBeNull()
    expect((await exportBackup()).goals).toEqual({
      goal_food_days: 3,
      goal_water_days: null,
    })
  })

  it('rejeita metas fora do intervalo permitido', async () => {
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.settings).not.toBeNull())

    await expect(
      result.current.saveGoals(366, null, result.current.settings!),
    ).rejects.toThrow(messages.goalDaysInvalid)
  })
})
