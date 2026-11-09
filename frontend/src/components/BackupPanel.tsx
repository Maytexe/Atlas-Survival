import { useState } from 'react'
import { InlineError } from '@/components/InlineError'
import { useLastBackup } from '@/hooks/use-last-backup'
import { messages } from '@/i18n/pt-BR'
import { exportBackup, importBackup, validateBackup } from '@/services/backup'
import { formatDateTime } from '@/services/format'

interface BackupPanelProps {
  timeZone: string
}

export function BackupPanel({ timeZone }: BackupPanelProps) {
  const lastBackup = useLastBackup()
  const [error, setError] = useState<unknown>(null)
  const [feedback, setFeedback] = useState('')
  const [counts, setCounts] = useState<{
    members: number
    categories: number
    items: number
    batches: number
  } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [working, setWorking] = useState(false)

  const download = async () => {
    setError(null)
    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `atlas-backup-${backup.exported_at.slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setFeedback(messages.backupExported)
    } catch (cause) {
      setError(cause)
    }
  }

  const selectFile = async (selected: File | null) => {
    setFile(selected)
    setCounts(null)
    setError(null)
    if (!selected) return
    try {
      const backup = validateBackup(
        JSON.parse(await selected.text()) as unknown,
      )
      setCounts({
        members: backup.household_members.length,
        categories: backup.categories.length,
        items: backup.inventory_items.length,
        batches: backup.stock_batches.length,
      })
    } catch {
      setError(new Error(messages.invalidBackup))
    }
  }

  const importFile = async () => {
    if (!file || !counts || !window.confirm(messages.confirmImport)) return
    setWorking(true)
    setError(null)
    try {
      await importBackup(JSON.parse(await file.text()) as unknown)
      setFeedback(messages.backupImported)
      setFile(null)
      setCounts(null)
    } catch (cause) {
      setError(cause)
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="panel form-grid backup-panel">
      <h2>{messages.about}</h2>
      <p className="last-backup">
        {messages.lastBackup}:{' '}
        {lastBackup
          ? formatDateTime(lastBackup, timeZone)
          : messages.neverBackup}
      </p>
      {feedback && (
        <p className="notice notice-info" role="status">
          {feedback}
        </p>
      )}
      <InlineError error={error} />
      <button
        className="button button-secondary"
        type="button"
        onClick={() => void download()}
      >
        {messages.exportBackup}
      </button>
      <label>
        {messages.importBackup}
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
          aria-label={messages.chooseBackup}
        />
      </label>
      {counts && (
        <div>
          <p>
            {messages.backupCounts
              .replace('{members}', String(counts.members))
              .replace('{categories}', String(counts.categories))
              .replace('{items}', String(counts.items))
              .replace('{batches}', String(counts.batches))}
          </p>
          <button
            className="button"
            type="button"
            onClick={() => void importFile()}
            disabled={working}
          >
            {working ? messages.loading : messages.importBackup}
          </button>
        </div>
      )}
    </section>
  )
}
