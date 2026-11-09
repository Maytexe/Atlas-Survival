import { AvailabilityList } from '@/components/AvailabilityList'
import { AutonomyList } from '@/components/AutonomyList'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { calculateDashboard } from '@/domain'
import { toItemSnapshots } from '@/domain/from-records'
import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'

export function DashboardPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const today = getToday(new Date(), settings?.timeZone)
  const snapshots = data
    ? toItemSnapshots(data.items, data.batches, data.members)
    : []
  const dashboard = calculateDashboard(snapshots, today)
  const peopleCount =
    data?.members.filter((member) => member.member_type === 'PERSON').length ??
    0
  const animalCount =
    data?.members.filter((member) => member.member_type === 'ANIMAL').length ??
    0

  return (
    <>
      <PageHeading
        title={messages.dashboardTitle}
        description={messages.dashboardIntro}
      />
      <StatusPanel loading={loading} error={error}>
        {data && (
          <div className="dashboard-content">
            <section
              className="summary-grid"
              aria-label={messages.dashboardTitle}
            >
              <article className="summary-card">
                <span>{messages.totalItems}</span>
                <strong>{data.items.length || messages.emptyData}</strong>
              </article>
              <article className="summary-card">
                <span>{messages.peopleCount}</span>
                <strong>{peopleCount || messages.emptyData}</strong>
              </article>
              <article className="summary-card">
                <span>{messages.animalCount}</span>
                <strong>{animalCount || messages.emptyData}</strong>
              </article>
              <article className="summary-card summary-card-warning">
                <span>{messages.expiredBatches}</span>
                <strong>
                  {data.items.length
                    ? dashboard.expired_batches
                    : messages.emptyData}
                </strong>
              </article>
              <article className="summary-card summary-card-warning">
                <span>{messages.expiringBatches}</span>
                <strong>
                  {data.items.length
                    ? dashboard.expiring_soon_batches
                    : messages.emptyData}
                </strong>
              </article>
            </section>
            <div className="dashboard-sections">
              <section className="panel">
                <h2>{messages.foodAvailability}</h2>
                <AvailabilityList
                  availability={Object.fromEntries(
                    Object.entries(dashboard.availability).filter(([key]) =>
                      key.startsWith('FOOD:'),
                    ),
                  )}
                />
              </section>
              <section className="panel">
                <h2>{messages.waterAvailability}</h2>
                <AvailabilityList
                  availability={Object.fromEntries(
                    Object.entries(dashboard.availability).filter(([key]) =>
                      key.startsWith('WATER:'),
                    ),
                  )}
                />
              </section>
              <section className="panel panel-wide">
                <h2>{messages.autonomy}</h2>
                <AutonomyList
                  items={dashboard.autonomy}
                  inventory={data.items}
                />
              </section>
            </div>
          </div>
        )}
      </StatusPanel>
    </>
  )
}
