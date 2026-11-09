import { useEffect, useState } from 'react'
import { z } from 'zod'
import { PageHeading } from '@/components/PageHeading'
import { InlineError } from '@/components/InlineError'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { exportBackup, importBackup, validateBackup } from '@/services/backup'
import { saveSettings, type AppSettings } from '@/services/preferences'

const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark', 'red-night']),
  lowStockDays: z.number().finite().min(0).max(3650),
  timeZone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: value })
      return true
    } catch {
      return false
    }
  }),
})

export function SettingsPage() {
  const { settings: storedSettings, error: settingsError } = useSettings()
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [feedback, setFeedback] = useState('')
  const [backupCounts, setBackupCounts] = useState<{
    members: number
    categories: number
    items: number
    batches: number
  } | null>(null)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const settings = draftSettings ?? storedSettings

  useEffect(() => {
    const root = document.documentElement
    const theme = settings?.theme ?? 'system'
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [settings?.theme])

  const update = (patch: Partial<AppSettings>) => {
    if (settings) setDraftSettings({ ...settings, ...patch })
  }

  const save = async () => {
    if (!settings) return
    setError(null)
    setFeedback('')
    const result = settingsSchema.safeParse(settings)
    if (!result.success) {
      setError(new Error(messages.formLowStockInvalid))
      return
    }
    try {
      await saveSettings(result.data)
      setFeedback(messages.settingsSaved)
    } catch (cause) {
      setError(cause)
    }
  }

  const downloadBackup = async () => {
    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setFeedback(messages.backupExported)
    } catch (cause) {
      setError(cause)
    }
  }

  const selectBackup = async (file: File | null) => {
    setBackupFile(file)
    setBackupCounts(null)
    if (!file) return
    setError(null)
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const backup = validateBackup(parsed)
      setBackupCounts({
        members: backup.household_members.length,
        categories: backup.categories.length,
        items: backup.inventory_items.length,
        batches: backup.stock_batches.length,
      })
    } catch {
      setError(new Error(messages.invalidBackup))
    }
  }

  const doImport = async () => {
    if (!backupFile || !backupCounts || !window.confirm(messages.confirmImport))
      return
    setImporting(true)
    setError(null)
    try {
      await importBackup(JSON.parse(await backupFile.text()) as unknown)
      setFeedback(messages.backupImported)
      setBackupFile(null)
      setBackupCounts(null)
    } catch (cause) {
      setError(cause)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <PageHeading title={messages.settingsTitle} />
      <InlineError error={settingsError ?? error} />
      {feedback && (
        <p className="notice notice-info" role="status">
          {feedback}
        </p>
      )}
      {settings && (
        <>
          <section className="panel form-grid">
            <h2>{messages.theme}</h2>
            <label>
              {messages.theme}
              <select
                value={settings.theme}
                onChange={(event) =>
                  update({ theme: event.target.value as AppSettings['theme'] })
                }
              >
                <option value="system">{messages.themeSystem}</option>
                <option value="light">{messages.themeLight}</option>
                <option value="dark">{messages.themeDark}</option>
                <option value="red-night">{messages.themeRedNight}</option>
              </select>
            </label>
            <label>
              {messages.lowStockDays}
              <input
                type="number"
                min="0"
                max="3650"
                step="1"
                inputMode="numeric"
                value={settings.lowStockDays}
                onChange={(event) =>
                  update({ lowStockDays: Number(event.target.value) })
                }
              />
            </label>
            <label>
              {messages.timeZone}
              <input
                list="known-time-zones"
                value={settings.timeZone}
                onChange={(event) => update({ timeZone: event.target.value })}
              />
              <datalist id="known-time-zones">
                <option value="America/Sao_Paulo" />
                <option value="America/Manaus" />
                <option value="America/Rio_Branco" />
                <option value="UTC" />
              </datalist>
            </label>
            <button
              className="button"
              type="button"
              onClick={() => void save()}
            >
              {messages.save}
            </button>
          </section>
          <section className="panel form-grid backup-panel">
            <h2>{messages.about}</h2>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void downloadBackup()}
            >
              {messages.exportBackup}
            </button>
            <label>
              {messages.importBackup}
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  void selectBackup(event.target.files?.[0] ?? null)
                }
                aria-label={messages.chooseBackup}
              />
            </label>
            {backupCounts && (
              <div>
                <p>
                  {messages.backupCounts
                    .replace('{members}', String(backupCounts.members))
                    .replace('{categories}', String(backupCounts.categories))
                    .replace('{items}', String(backupCounts.items))
                    .replace('{batches}', String(backupCounts.batches))}
                </p>
                <button
                  className="button"
                  type="button"
                  onClick={() => void doImport()}
                  disabled={importing}
                >
                  {importing ? messages.loading : messages.importBackup}
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
