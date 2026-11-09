import { Link } from 'react-router-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { calculateGoals } from '@/domain'
import type { ItemSnapshot } from '@/domain/types'
import { InfoTip } from '@/components/InfoTip'
import { messages } from '@/i18n/pt-BR'
import { formatQuantity } from '@/services/format'

interface InventoryGoalStripProps {
  snapshots: readonly ItemSnapshot[]
  today: string
  goalFoodDays: number | null
  goalWaterDays: number | null
}

export function InventoryGoalStrip({
  snapshots,
  today,
  goalFoodDays,
  goalWaterDays,
}: InventoryGoalStripProps) {
  const goals = calculateGoals(snapshots, today, goalFoodDays, goalWaterDays)

  return (
    <section
      className="inventory-goal-strip"
      aria-label={messages.goalsSettings}
    >
      {(['WATER', 'FOOD'] as const).map((kind) => {
        const groups = goals.filter((goal) => goal.item_kind === kind)
        const currentGoal = kind === 'WATER' ? goalWaterDays : goalFoodDays
        const label = kind === 'WATER' ? messages.waterKind : messages.foodKind
        const below = groups.filter((goal) => goal.status === 'BELOW')
        return (
          <div className="inventory-goal-status" key={kind}>
            <strong>{label}</strong>
            <InfoTip label={messages.goal} content={messages.goalInfo} />
            {currentGoal === null ? (
              <span className="muted">{messages.noGoalConfigured}</span>
            ) : groups.length === 0 ? (
              <span className="muted">{messages.goalNoData}</span>
            ) : (
              <div>
                {groups.map((goal) => (
                  <p
                    className={
                      goal.status === 'MET'
                        ? 'status-good'
                        : goal.status === 'BELOW'
                          ? 'status-warning'
                          : 'muted'
                    }
                    key={`${goal.dimension}-${goal.base_unit}`}
                  >
                    {goal.status === 'MET' ? (
                      <CircleCheck size={17} aria-hidden="true" />
                    ) : goal.status === 'BELOW' ? (
                      <CircleAlert size={17} aria-hidden="true" />
                    ) : null}
                    {goal.status === 'MET'
                      ? messages.goalMet.replace('{days}', String(currentGoal))
                      : goal.status === 'BELOW'
                        ? messages.goalBelow
                            .replace(
                              '{missing}',
                              formatQuantity(goal.missing_base, goal.base_unit),
                            )
                            .replace('{days}', String(currentGoal))
                        : messages.goalNoData}
                  </p>
                ))}
                {below.map((goal) =>
                  goal.limiting_item ? (
                    <Link
                      className="button button-secondary button-small"
                      to={`/estoque/${goal.limiting_item}?adicionar=estoque`}
                      key={`${goal.limiting_item}-${goal.base_unit}`}
                    >
                      {messages.addStock}
                    </Link>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
