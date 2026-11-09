import { Link } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { calculateAlerts } from '@/domain'
import { toItemSnapshots } from '@/domain/from-records'
import { useGoals } from '@/hooks/use-goals'
import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import {
  formatDate,
  formatQuantity,
  formatRelativeExpiry,
} from '@/services/format'

const alertMessages = {
  EXPIRED: messages.alertExpired,
  OUT_OF_STOCK: messages.alertOutOfStock,
  EXPIRING_SOON: messages.alertExpiringSoon,
  LOW_STOCK: messages.alertLowStock,
  NO_CONSUMPTION_DATA: messages.alertNoConsumption,
  BELOW_GOAL: messages.alertBelowGoal,
} as const

const severities = [
  ['CRITICAL', messages.severityCritical],
  ['WARNING', messages.severityWarning],
  ['INFO', messages.severityInfo],
] as const

export function AlertsPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const { selectGoals } = useGoals()
  const today = getToday(new Date(), settings?.timeZone)
  const snapshots = data
    ? toItemSnapshots(data.items, data.batches, data.members)
    : []
  const goals = selectGoals(snapshots, today)
  const alerts = data
    ? calculateAlerts(
        snapshots,
        today,
        settings?.lowStockDays ?? 7,
        settings?.goalFoodDays ?? null,
        settings?.goalWaterDays ?? null,
      )
    : []

  return (
    <>
      <PageHeading title={messages.alerts} />
      <StatusPanel
        loading={loading}
        error={error}
        empty={!loading && !error && alerts.length === 0}
        emptyMessage={messages.noAlerts}
      >
        {alerts.length > 0 && (
          <div className="alert-groups">
            {severities.map(([severity, label]) => {
              const group = alerts.filter(
                (alert) => alert.severity === severity,
              )
              if (!group.length) return null
              return (
                <section className="alert-group" key={severity}>
                  <h2
                    className={`alert-group-heading severity-${severity.toLowerCase()}`}
                  >
                    {label} <span>({group.length})</span>
                  </h2>
                  <div className="alert-list">
                    {group.map((alert, index) => {
                      const goal =
                        alert.type === 'BELOW_GOAL'
                          ? goals.find(
                              (candidate) =>
                                candidate.status === 'BELOW' &&
                                candidate.limiting_item === alert.item_id,
                            )
                          : undefined
                      const item = data?.items.find(
                        (candidate) => candidate.id === alert.item_id,
                      )
                      const labelText =
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
                                formatQuantity(
                                  goal.missing_base,
                                  goal.base_unit,
                                ),
                              )
                              .replace('{days}', String(goal.goal_days))
                          : alert.type === 'BELOW_GOAL'
                            ? messages.alertGoalBelowFallback
                            : alertMessages[alert.type]
                      return (
                        <article
                          className={`panel alert-row severity-${severity.toLowerCase()}`}
                          key={`${alert.item_id}-${alert.batch_id ?? alert.type}-${index}`}
                        >
                          <CircleAlert size={20} aria-hidden="true" />
                          <div className="alert-content">
                            <strong>{labelText}</strong>
                            {item && (
                              <Link to={`/estoque/${item.id}`}>
                                {messages.viewItem}: {item.name}
                              </Link>
                            )}
                            {alert.date && (
                              <time dateTime={alert.date}>
                                {`${formatDate(alert.date, settings?.timeZone)} · ${formatRelativeExpiry(alert.date, today)}`}
                              </time>
                            )}
                          </div>
                          {item && (
                            <Link
                              className="button button-secondary button-small"
                              to={
                                alert.type === 'BELOW_GOAL'
                                  ? `/estoque/${item.id}?adicionar=estoque`
                                  : `/estoque/${item.id}#consumo`
                              }
                            >
                              {alert.type === 'BELOW_GOAL'
                                ? messages.addStock
                                : messages.alertActionConsumption}
                            </Link>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </StatusPanel>
    </>
  )
}
