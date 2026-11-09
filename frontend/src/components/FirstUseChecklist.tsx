import { CircleCheck, CircleDashed } from 'lucide-react'
import { messages } from '@/i18n/pt-BR'

interface FirstUseChecklistProps {
  hasMembers: boolean
  hasCategories: boolean
  hasItems: boolean
  hasConsumption: boolean
  hasGoal: boolean
  creatingCategories: boolean
  error: string
  onCreateCategories: () => void
}

export function FirstUseChecklist({
  hasMembers,
  hasCategories,
  hasItems,
  hasConsumption,
  hasGoal,
  creatingCategories,
  error,
  onCreateCategories,
}: FirstUseChecklistProps) {
  const checks = [
    [messages.checklistMembers, hasMembers],
    [messages.checklistCategories, hasCategories],
    [messages.checklistFirstItem, hasItems],
    [messages.checklistConsumption, hasConsumption],
    [messages.checklistGoal, hasGoal],
  ] as const
  if (checks.every(([, complete]) => complete)) return null

  return (
    <section className="panel home-checklist" aria-labelledby="first-use-title">
      <div>
        <h2 id="first-use-title">{messages.homeStart}</h2>
        <p className="muted">{messages.homeChecklist}</p>
      </div>
      <ul className="checklist-list">
        {checks.map(([label, complete]) => {
          const Icon = complete ? CircleCheck : CircleDashed
          return (
            <li className="checklist-row" key={label}>
              <Icon
                size={20}
                aria-hidden="true"
                className={complete ? 'status-good' : 'muted'}
              />
              <span>{label}</span>
              {complete && (
                <span className="sr-only">{messages.checklistDone}</span>
              )}
            </li>
          )
        })}
      </ul>
      {!hasCategories && (
        <div>
          <button
            className="button button-secondary"
            type="button"
            onClick={onCreateCategories}
            disabled={creatingCategories}
          >
            {creatingCategories
              ? messages.loading
              : messages.createSuggestedCategories}
          </button>
          <p className="muted suggested-category-list">
            {messages.suggestedCategories.join(' · ')}
          </p>
        </div>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
