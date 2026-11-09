import { Link } from 'react-router-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import type { AutonomyAggregate, GoalResult } from '@/domain/types'
import type { InventoryItem } from '@/db'
import { InfoTip } from '@/components/InfoTip'
import { messages } from '@/i18n/pt-BR'
import { formatQuantity } from '@/services/format'

interface GoalBandProps {
  kind: 'FOOD' | 'WATER'
  goal?: GoalResult
  autonomy?: AutonomyAggregate
  inventory: readonly InventoryItem[]
  onEdit: () => void
}

export function GoalBand({
  kind,
  goal,
  autonomy,
  inventory,
  onEdit,
}: GoalBandProps) {
  const isWater = kind === 'WATER'
  const goalDays = goal?.goal_days ?? null
  const days = autonomy?.days
  const unit =
    goal?.base_unit ??
    autonomy?.base_unit ??
    (autonomy?.dimension === 'MASS' ? 'g' : 'ml')
  const limitingName = inventory.find(
    (item) => item.id === autonomy?.limiting_item,
  )?.name
  const progress =
    days === undefined
      ? 0
      : goalDays === null
        ? 100
        : Math.min(100, Math.round((days / goalDays) * 100))
  const verdict =
    goal?.status === 'MET' ? (
      <p className="goal-verdict goal-verdict-good">
        <CircleCheck size={19} aria-hidden="true" />
        {messages.goalMet.replace('{days}', String(goalDays))}
      </p>
    ) : goal?.status === 'BELOW' ? (
      <p className="goal-verdict goal-verdict-warning">
        <CircleAlert size={19} aria-hidden="true" />
        {messages.goalBelow
          .replace('{missing}', formatQuantity(goal.missing_base, unit))
          .replace('{days}', String(goalDays))}
      </p>
    ) : goal?.status === 'NO_DATA' ? (
      <p className="goal-verdict">
        <CircleAlert size={19} aria-hidden="true" />
        {messages.goalNoData}
      </p>
    ) : (
      <p className="goal-verdict">{messages.goalMissing}</p>
    )

  return (
    <article
      className={`autonomy-band ${isWater ? 'autonomy-band-water' : 'autonomy-band-food'}`}
    >
      <div>
        <div className="autonomy-band-title">
          <span>{isWater ? messages.waterKind : messages.foodKind}</span>
          <InfoTip label={messages.autonomy} content={messages.autonomyInfo} />
        </div>
        <p>
          <strong
            className={`autonomy-value ${isWater ? 'autonomy-value-water' : 'autonomy-value-food'}`}
          >
            {days === undefined ? messages.emptyData : days}
          </strong>
          {days !== undefined && (
            <span className="autonomy-unit">{messages.days}</span>
          )}
        </p>
        <div className="autonomy-bar" role="img" aria-label={messages.autonomy}>
          <div
            className="autonomy-bar-fill"
            style={{ width: `${progress}%` }}
          />
          {goalDays !== null && goalDays > 0 && (
            <span
              className="autonomy-goal-marker"
              style={{ left: 'calc(100% - 2px)' }}
              aria-hidden="true"
            />
          )}
        </div>
        {autonomy && (
          <div className="autonomy-coverage">
            <span>
              {messages.coverage
                .replace('{covered}', String(autonomy.coverage_count))
                .replace('{total}', String(autonomy.total_items))}
            </span>
            <InfoTip
              label={messages.coverageInfo}
              content={messages.coverageInfo}
            />
          </div>
        )}
        {limitingName && autonomy && (
          <p className="muted">
            {messages.limitingItemWithDays
              .replace('{item}', limitingName)
              .replace('{days}', String(autonomy.days))}
          </p>
        )}
        {goal?.partial_coverage && (
          <p className="muted">
            {messages.goalPartial
              .replace('{covered}', String(goal.coverage_count))
              .replace('{total}', String(goal.total_items))}
          </p>
        )}
        {verdict}
      </div>
      <div className="goal-tools">
        <InfoTip label={messages.goal} content={messages.goalInfo} />
        {goalDays === null ? (
          <button
            className="button button-secondary"
            onClick={onEdit}
            type="button"
          >
            {messages.setGoal}
          </button>
        ) : (
          <button
            className="button button-secondary"
            onClick={onEdit}
            type="button"
          >
            {messages.changeGoal}
          </button>
        )}
        {goal?.status === 'BELOW' && (
          <Link
            className="button button-small"
            to={`/estoque/${goal.limiting_item}?adicionar=estoque`}
          >
            {messages.addStockForGoal}
          </Link>
        )}
      </div>
    </article>
  )
}
