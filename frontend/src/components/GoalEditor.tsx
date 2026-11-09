import { useState } from 'react'
import { SidePanel } from '@/components/SidePanel'
import { messages } from '@/i18n/pt-BR'

interface GoalEditorProps {
  kind: 'FOOD' | 'WATER'
  current: number | null
  onClose: () => void
  onSave: (value: number | null) => Promise<void>
}

export function GoalEditor({
  kind,
  current,
  onClose,
  onSave,
}: GoalEditorProps) {
  const [value, setValue] = useState(current === null ? '' : String(current))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const label = kind === 'WATER' ? messages.waterKind : messages.foodKind

  const save = async (goal: number | null) => {
    setError('')
    if (goal !== null && (!Number.isInteger(goal) || goal < 1 || goal > 365)) {
      setError(messages.goalDaysInvalid)
      return
    }
    setSaving(true)
    try {
      await onSave(goal)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.unknownError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidePanel
      title={`${current === null ? messages.setGoal : messages.changeGoal}: ${label.toLowerCase()}`}
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault()
          void save(value === '' ? null : Number(value))
        }}
      >
        <label>
          {messages.goalDays}
          <input
            type="number"
            min="1"
            max="365"
            step="1"
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby="goal-range"
          />
        </label>
        <p id="goal-range" className="muted">
          {messages.goalDaysInvalid}
        </p>
        <div className="goal-shortcuts" aria-label={messages.quickGoal3}>
          {[3, 7, 14].map((days) => (
            <button
              className="button button-secondary"
              type="button"
              key={days}
              onClick={() => setValue(String(days))}
            >
              {days} {messages.days}
            </button>
          ))}
        </div>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? messages.loading : messages.updateGoal}
          </button>
          {current !== null && (
            <button
              className="button button-danger"
              type="button"
              onClick={() => void save(null)}
              disabled={saving}
            >
              {messages.removeGoal}
            </button>
          )}
        </div>
      </form>
    </SidePanel>
  )
}
