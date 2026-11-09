import { Link } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { AvailabilityList } from '@/components/AvailabilityList'
import { InfoTip } from '@/components/InfoTip'
import type { Category, HouseholdMember, InventoryItem, StockBatch } from '@/db'
import type { AlertResult, DashboardResult } from '@/domain/types'
import { calculateExpiry } from '@/domain'
import { messages } from '@/i18n/pt-BR'
import { useLastBackup } from '@/hooks/use-last-backup'
import {
  formatDate,
  formatDateTime,
  formatQuantity,
  formatRelativeExpiry,
} from '@/services/format'

interface DashboardDetailsProps {
  data: {
    members: HouseholdMember[]
    categories: Category[]
    items: InventoryItem[]
    batches: StockBatch[]
  }
  dashboard: DashboardResult
  alerts: AlertResult[]
  today: string
  timeZone: string
}

const alertMessages = {
  EXPIRED: messages.alertExpired,
  OUT_OF_STOCK: messages.alertOutOfStock,
  EXPIRING_SOON: messages.alertExpiringSoon,
  LOW_STOCK: messages.alertLowStock,
  NO_CONSUMPTION_DATA: messages.alertNoConsumption,
  BELOW_GOAL: messages.alertBelowGoal,
} as const

export function DashboardDetails({
  data,
  dashboard,
  alerts,
  today,
  timeZone,
}: DashboardDetailsProps) {
  const lastBackup = useLastBackup()
  const goals = dashboard.goals
  const timeline = data.batches
    .filter((batch) => {
      if (!batch.expiration_date) return false
      const expiry = calculateExpiry(batch.expiration_date, today)
      return expiry.expiring_soon && !expiry.expired
    })
    .sort((first, second) =>
      (first.expiration_date ?? '').localeCompare(second.expiration_date ?? ''),
    )
    .slice(0, 5)

  return (
    <>
      <div className="dashboard-sections">
        <section className="panel panel-wide">
          <h2 className="section-title-with-info">
            {messages.whatMissingForGoal}
            <InfoTip label={messages.goal} content={messages.goalInfo} />
          </h2>
          {goals.some((goal) => goal.status === 'BELOW') ? (
            <ul className="goal-missing-list">
              {goals
                .filter((goal) => goal.status === 'BELOW')
                .map((goal) => (
                  <li
                    className="goal-missing-row"
                    key={`${goal.item_kind}-${goal.dimension}-${goal.base_unit}`}
                  >
                    <span>
                      {goal.item_kind === 'WATER'
                        ? messages.waterKind
                        : messages.foodKind}
                      :{' '}
                      {messages.missingAmount.replace(
                        '{quantity}',
                        formatQuantity(goal.missing_base, goal.base_unit),
                      )}
                    </span>
                    {goal.limiting_item && (
                      <Link
                        className="button button-secondary button-small"
                        to={`/estoque/${goal.limiting_item}?adicionar=estoque`}
                      >
                        {messages.addStock}
                      </Link>
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="muted">{messages.noGoalMissing}</p>
          )}
        </section>

        <section className="panel">
          <h2>{messages.needsAttention}</h2>
          {alerts.length === 0 ? (
            <p className="muted">{messages.noAlerts}</p>
          ) : (
            <div className="dashboard-alerts">
              {alerts.slice(0, 5).map((alert, index) => {
                const item = data.items.find(
                  (candidate) => candidate.id === alert.item_id,
                )
                const goal = goals.find(
                  (candidate) =>
                    candidate.status === 'BELOW' &&
                    candidate.limiting_item === alert.item_id,
                )
                const label =
                  alert.type === 'BELOW_GOAL' && goal
                    ? messages.alertGoalBelowKind
                        .replace(
                          '{kind}',
                          goal.item_kind === 'WATER'
                            ? messages.waterKind.toLowerCase()
                            : messages.foodKind.toLowerCase(),
                        )
                        .replace(
                          '{missing}',
                          formatQuantity(goal.missing_base, goal.base_unit),
                        )
                        .replace('{days}', String(goal.goal_days))
                    : alert.type === 'BELOW_GOAL'
                      ? messages.alertGoalBelowFallback
                      : alertMessages[alert.type]
                return (
                  <div
                    className={`dashboard-alert severity-${alert.severity.toLowerCase()}`}
                    key={`${alert.item_id}-${alert.type}-${index}`}
                  >
                    <CircleAlert size={20} aria-hidden="true" />
                    <span>
                      {label}
                      {item ? ` · ${item.name}` : ''}
                    </span>
                    <Link
                      className="button button-secondary button-small"
                      to={
                        alert.type === 'BELOW_GOAL'
                          ? `/estoque/${alert.item_id}?adicionar=estoque`
                          : `/estoque/${alert.item_id}#consumo`
                      }
                    >
                      {alert.type === 'BELOW_GOAL'
                        ? messages.addStock
                        : messages.recordConsumption}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <h2>{messages.expiryTimeline}</h2>
          {timeline.length === 0 ? (
            <p className="muted">{messages.noExpiringStock}</p>
          ) : (
            <ul className="expiry-timeline">
              {timeline.map((batch) => {
                const item = data.items.find(
                  (candidate) => candidate.id === batch.inventory_item_id,
                )
                if (!batch.expiration_date) return null
                return (
                  <li key={batch.id}>
                    <span className="timeline-date">
                      {`${formatDate(batch.expiration_date, timeZone)} · ${formatRelativeExpiry(batch.expiration_date, today)}`}
                    </span>
                    <Link to={`/estoque/${batch.inventory_item_id}`}>
                      {item?.name ?? messages.notFound}
                    </Link>
                    <span>
                      {formatQuantity(batch.quantity, item?.unit ?? '')}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="panel panel-wide">
          <h2>{messages.availableNow}</h2>
          <div className="dashboard-sections">
            <AvailabilityList
              availability={Object.fromEntries(
                Object.entries(dashboard.availability).filter(([key]) =>
                  key.startsWith('WATER:'),
                ),
              )}
            />
            <AvailabilityList
              availability={Object.fromEntries(
                Object.entries(dashboard.availability).filter(([key]) =>
                  key.startsWith('FOOD:'),
                ),
              )}
            />
          </div>
        </section>
      </div>
      <p className="last-backup">
        <Link to="/configuracoes">
          {messages.lastBackup}:{' '}
          {lastBackup
            ? formatDateTime(lastBackup, timeZone)
            : messages.neverBackup}
        </Link>
        {' · '}
        {messages.backupReminder}
      </p>
    </>
  )
}
