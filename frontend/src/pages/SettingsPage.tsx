import { useEffect, useState } from 'react'
import { z } from 'zod'
import { BackupPanel } from '@/components/BackupPanel'
import { InfoTip } from '@/components/InfoTip'
import { InlineError } from '@/components/InlineError'
import { PageHeading } from '@/components/PageHeading'
import { useGoals } from '@/hooks/use-goals'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { type AppSettings } from '@/services/preferences'

const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark', 'red-night']),
  lowStockDays: z.number().finite().min(0).max(3650),
  goalFoodDays: z.number().int().min(1).max(365).nullable(),
  goalWaterDays: z.number().int().min(1).max(365).nullable(),
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
  const { saveGoals } = useGoals()
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [feedback, setFeedback] = useState('')
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
      const invalidGoal = result.error.issues.some(
        (issue) =>
          issue.path[0] === 'goalFoodDays' || issue.path[0] === 'goalWaterDays',
      )
      setError(
        new Error(
          invalidGoal ? messages.goalDaysInvalid : messages.formLowStockInvalid,
        ),
      )
      return
    }
    try {
      await saveGoals(
        result.data.goalFoodDays,
        result.data.goalWaterDays,
        result.data,
      )
      setFeedback(messages.settingsSaved)
    } catch (cause) {
      setError(cause)
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
              <span className="settings-hint">
                {messages.lowStockWarning}
                <InfoTip
                  label={messages.lowStockWarning}
                  content={messages.lowStockInfo}
                />
              </span>
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
          </section>
          <section className="panel form-grid goal-settings-section">
            <h2>{messages.goalsSettings}</h2>
            <label>
              <span className="settings-hint">
                {messages.goalWaterDays}
                <InfoTip label={messages.goal} content={messages.goalInfo} />
              </span>
              <input
                type="number"
                min="1"
                max="365"
                step="1"
                inputMode="numeric"
                placeholder={messages.noGoalConfigured}
                value={settings.goalWaterDays ?? ''}
                onChange={(event) =>
                  update({
                    goalWaterDays:
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              <span className="settings-hint">
                {messages.goalFoodDays}
                <InfoTip label={messages.goal} content={messages.goalInfo} />
              </span>
              <input
                type="number"
                min="1"
                max="365"
                step="1"
                inputMode="numeric"
                placeholder={messages.noGoalConfigured}
                value={settings.goalFoodDays ?? ''}
                onChange={(event) =>
                  update({
                    goalFoodDays:
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>
            <p className="muted">{messages.goalFieldHint}</p>
          </section>
          <section className="panel form-grid">
            <h2>{messages.timeZone}</h2>
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
          <BackupPanel timeZone={settings.timeZone} />
        </>
      )}
    </>
  )
}
