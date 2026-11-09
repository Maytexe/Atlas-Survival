import { useMemo } from 'react'
import Decimal from 'decimal.js'
import { AlertCircle, PawPrint, Printer, UserRound } from 'lucide-react'
import { AutonomyList } from '@/components/AutonomyList'
import { StatusPanel } from '@/components/StatusPanel'
import {
  calculateAlerts,
  calculateDashboard,
  calculateExpiry,
  calculateStockAvailability,
} from '@/domain'
import { toItemSnapshots } from '@/domain/from-records'
import { useGoals } from '@/hooks/use-goals'
import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import {
  formatAge,
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

export function EmergencySheetPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const { goalFoodDays, goalWaterDays } = useGoals()
  const today = getToday(new Date(), settings?.timeZone)
  const snapshots = useMemo(
    () => (data ? toItemSnapshots(data.items, data.batches, data.members) : []),
    [data],
  )
  const dashboard = calculateDashboard(
    snapshots,
    today,
    goalFoodDays,
    goalWaterDays,
  )
  const alerts = calculateAlerts(
    snapshots,
    today,
    settings?.lowStockDays ?? 7,
    goalFoodDays,
    goalWaterDays,
  ).filter((alert) => alert.severity === 'CRITICAL')
  const printDate = formatDate(today, settings?.timeZone)
  const categories = data?.categories ?? []

  return (
    <>
      <div className="no-print sheet-toolbar">
        <button className="button" type="button" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />
          {messages.printSheet}
        </button>
      </div>
      <StatusPanel loading={loading} error={error}>
        {data && (
          <article className="emergency-sheet">
            <header className="print-heading">
              <h1>{messages.emergencyTitle}</h1>
              <p>
                {messages.printedOn}: {printDate}
              </p>
            </header>
            <section>
              <h2>{messages.emergencyAutonomy}</h2>
              <AutonomyList items={dashboard.autonomy} inventory={data.items} />
              {dashboard.goals.map((goal) => (
                <p
                  key={`${goal.item_kind}-${goal.dimension}-${goal.base_unit}`}
                >
                  {goal.item_kind === 'WATER'
                    ? messages.waterKind
                    : messages.foodKind}
                  :{' '}
                  {goal.status === 'MET'
                    ? messages.emergencyGoalMetLine.replace(
                        '{days}',
                        String(goal.goal_days),
                      )
                    : goal.status === 'BELOW'
                      ? messages.emergencyGoalBelowLine
                          .replace('{days}', String(goal.goal_days))
                          .replace(
                            '{missing}',
                            formatQuantity(goal.missing_base, goal.base_unit),
                          )
                      : messages.emergencyGoalNoDataLine}
                </p>
              ))}
            </section>
            <section>
              <h2>{messages.emergencyPeople}</h2>
              <p className="muted">{messages.peopleConsumptionNote}</p>
              {data.members.length === 0 ? (
                <p>{messages.noMembers}</p>
              ) : (
                <ul>
                  {data.members.map((member) => {
                    const Icon =
                      member.member_type === 'PERSON' ? UserRound : PawPrint
                    return (
                      <li key={member.id}>
                        <Icon size={16} aria-hidden="true" /> {member.name} —{' '}
                        {member.member_type === 'PERSON'
                          ? messages.person
                          : messages.animal}
                        {member.age !== null
                          ? `, ${formatAge(member.age)}`
                          : ''}
                        {member.notes ? ` · ${member.notes}` : ''}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
            <section>
              <h2>{messages.emergencyStock}</h2>
              {data.items.length === 0 && <p>{messages.noItems}</p>}
              {categories.map((category) => {
                const categoryItems = data.items.filter(
                  (item) => item.category_id === category.id,
                )
                if (categoryItems.length === 0) return null
                return (
                  <section className="print-category" key={category.id}>
                    <h3>{category.name}</h3>
                    {categoryItems.map((item) => {
                      const itemBatches = data.batches.filter(
                        (batch) => batch.inventory_item_id === item.id,
                      )
                      const itemSnapshot = snapshots.find(
                        (snapshot) => snapshot.id === item.id,
                      )
                      const available = calculateStockAvailability(
                        itemSnapshot?.batches ?? [],
                        today,
                      ).available
                      const nextBatch = itemBatches.find(
                        (batch) =>
                          batch.expiration_date !== null &&
                          new Decimal(batch.quantity).greaterThan(0) &&
                          !calculateExpiry(batch.expiration_date, today)
                            .expired,
                      )
                      const locations = Array.from(
                        new Set(
                          itemBatches
                            .map((batch) => batch.storage_location)
                            .filter((location): location is string =>
                              Boolean(location),
                            ),
                        ),
                      )
                      return (
                        <div className="print-item" key={item.id}>
                          <h4>
                            {item.name} — {formatQuantity(available, item.unit)}
                          </h4>
                          <p>
                            {messages.nextExpiration}:{' '}
                            {nextBatch?.expiration_date
                              ? `${formatDate(nextBatch.expiration_date, settings?.timeZone)} · ${formatRelativeExpiry(nextBatch.expiration_date, today)}`
                              : messages.expiryNone}
                            {locations.length
                              ? ` · ${messages.storedAtLabel}: ${locations.join(', ')}`
                              : ''}
                          </p>
                          <ul>
                            {itemBatches.map((batch) => (
                              <li key={batch.id}>
                                {formatQuantity(batch.quantity, item.unit)}
                                {' · '}
                                {batch.expiration_date
                                  ? formatDate(
                                      batch.expiration_date,
                                      settings?.timeZone,
                                    )
                                  : messages.noExpiration}
                                {batch.storage_location
                                  ? ` · ${batch.storage_location}`
                                  : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </section>
                )
              })}
            </section>
            {alerts.length > 0 && (
              <section>
                <h2>{messages.emergencyCriticalAlerts}</h2>
                <ul>
                  {alerts.map((alert, index) => {
                    const item = data.items.find(
                      (candidate) => candidate.id === alert.item_id,
                    )
                    return (
                      <li key={`${alert.type}-${alert.item_id}-${index}`}>
                        <AlertCircle size={16} aria-hidden="true" />{' '}
                        {item?.name ?? messages.notFound}:{' '}
                        {alertMessages[alert.type]}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </article>
        )}
      </StatusPanel>
    </>
  )
}
