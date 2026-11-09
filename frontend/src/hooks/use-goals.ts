import { calculateGoals } from '@/domain'
import type { ItemSnapshot } from '@/domain/types'
import { messages } from '@/i18n/pt-BR'
import { saveSettings, type AppSettings } from '@/services/preferences'
import { useSettings } from './use-settings'

export function useGoals() {
  const { settings, error, loading } = useSettings()

  const saveGoals = async (
    goalFoodDays: number | null,
    goalWaterDays: number | null,
    currentSettings: AppSettings,
  ) => {
    if (!isValidGoal(goalFoodDays) || !isValidGoal(goalWaterDays)) {
      throw new Error(messages.goalDaysInvalid)
    }
    await saveSettings({ ...currentSettings, goalFoodDays, goalWaterDays })
  }

  const selectGoals = (items: readonly ItemSnapshot[], today: string) =>
    calculateGoals(
      items,
      today,
      settings?.goalFoodDays ?? null,
      settings?.goalWaterDays ?? null,
    )

  return {
    goalFoodDays: settings?.goalFoodDays ?? null,
    goalWaterDays: settings?.goalWaterDays ?? null,
    settings,
    error,
    loading,
    saveGoals,
    selectGoals,
  }
}

function isValidGoal(value: number | null): boolean {
  return (
    value === null || (Number.isInteger(value) && value >= 1 && value <= 365)
  )
}
