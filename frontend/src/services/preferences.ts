import { db } from '@/db'

export type ThemePreference = 'system' | 'light' | 'dark' | 'red-night'

export interface AppSettings {
  theme: ThemePreference
  lowStockDays: number
  timeZone: string
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  lowStockDays: 7,
  timeZone: import.meta.env.VITE_TIMEZONE || 'America/Sao_Paulo',
}

export async function readSettings(): Promise<AppSettings> {
  const stored = await db.meta.get('settings')
  if (typeof stored?.value !== 'object' || stored.value === null) {
    return DEFAULT_SETTINGS
  }
  const value = stored.value as Partial<AppSettings>
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
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.meta.put({ key: 'settings', value: settings })
}

export async function isStoragePersisted(): Promise<boolean | null> {
  const value = await db.meta.get('storage_persisted')
  return typeof value?.value === 'boolean' ? value.value : null
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone }).format()
    return true
  } catch {
    return false
  }
}
