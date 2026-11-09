import { db } from '@/db'
import { messages } from '@/i18n/pt-BR'

export type ThemePreference = 'system' | 'light' | 'dark' | 'red-night'

export interface AppSettings {
  theme: ThemePreference
  lowStockDays: number
  timeZone: string
  goalFoodDays: number | null
  goalWaterDays: number | null
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  lowStockDays: 7,
  timeZone: import.meta.env.VITE_TIMEZONE || 'America/Sao_Paulo',
  goalFoodDays: null,
  goalWaterDays: null,
}

export async function readSettings(): Promise<AppSettings> {
  const stored = await db.meta.get('settings')
  if (typeof stored?.value !== 'object' || stored.value === null) {
    return DEFAULT_SETTINGS
  }
  const value = stored.value as Partial<AppSettings>
  const goalFoodDays = value.goalFoodDays
  const goalWaterDays = value.goalWaterDays
  return {
    theme:
      value.theme === 'light' ||
      value.theme === 'dark' ||
      value.theme === 'red-night'
        ? value.theme
        : 'system',
    lowStockDays:
      typeof value.lowStockDays === 'number' &&
      Number.isFinite(value.lowStockDays) &&
      value.lowStockDays >= 0
        ? value.lowStockDays
        : DEFAULT_SETTINGS.lowStockDays,
    timeZone:
      typeof value.timeZone === 'string' && isValidTimeZone(value.timeZone)
        ? value.timeZone
        : DEFAULT_SETTINGS.timeZone,
    goalFoodDays: validGoalDays(goalFoodDays) ? goalFoodDays : null,
    goalWaterDays: validGoalDays(goalWaterDays) ? goalWaterDays : null,
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (
    !validGoalDays(settings.goalFoodDays) ||
    !validGoalDays(settings.goalWaterDays)
  ) {
    throw new Error(messages.goalDaysInvalid)
  }
  await db.meta.put({ key: 'settings', value: settings })
}

export async function isStoragePersisted(): Promise<boolean | null> {
  const value = await db.meta.get('storage_persisted')
  return typeof value?.value === 'boolean' ? value.value : null
}

export async function wasStorageNoticeDismissed(): Promise<boolean> {
  const record = await db.meta.get('storage_notice_dismissed')
  return record?.value === true
}

export async function dismissStorageNotice(): Promise<void> {
  await db.meta.put({ key: 'storage_notice_dismissed', value: true })
}

export async function readLastBackupAt(): Promise<string | null> {
  const record = await db.meta.get('last_backup_at')
  return typeof record?.value === 'string' ? record.value : null
}

export async function saveLastBackupAt(value: string): Promise<void> {
  await db.meta.put({ key: 'last_backup_at', value })
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone }).format()
    return true
  } catch {
    return false
  }
}

function validGoalDays(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 365)
  )
}
