import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import { formatDate, formatDecimal } from '@/services/format'
import { toItemSnapshots } from '@/domain/from-records'
import { calculateDashboard, calculateStockAvailability } from '@/domain'
import Decimal from 'decimal.js'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { AutonomyList } from '@/components/AutonomyList'

export function EmergencySheetPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const today = getToday(new Date(), settings?.timeZone)
  const snapshots = data
    ? toItemSnapshots(data.items, data.batches, data.members)
    : []
  const dashboard = calculateDashboard(snapshots, today)
  const printDate = formatDate(today, settings?.timeZone)

  return (
    <>
      <div className="no-print">
        <PageHeading
          title={messages.emergencyTitle}
          action={
            <button
              className="button"
              type="button"
              onClick={() => window.print()}
            >
              {messages.printSheet}
            </button>
          }
        />
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
              <h2>{messages.emergencyPeople}</h2>
              {data.members.length === 0 ? (
                <p>{messages.noMembers}</p>
              ) : (
                <ul>
                  {data.members.map((member) => (
                    <li key={member.id}>
                      {member.name} —{' '}
                      {member.member_type === 'PERSON'
                        ? messages.person
                        : messages.animal}
                      {member.age !== null ? `, ${member.age}` : ''}
                      {member.notes ? ` · ${member.notes}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2>{messages.emergencyStock}</h2>
              {data.items.length === 0 && <p>{messages.noItems}</p>}
              {data.items.map((item) => {
                const batches = data.batches.filter(
                  (batch) => batch.inventory_item_id === item.id,
                )
                const snapshotsForItem = snapshots.filter(
                  (snapshot) => snapshot.id === item.id,
                )
                const available = calculateStockAvailability(
                  snapshotsForItem[0]?.batches ?? [],
                  today,
                ).available
                return (
                  <div className="print-item" key={item.id}>
                    <h3>
                      {item.name} — {formatDecimal(available)} {item.unit}
                    </h3>
                    <ul>
                      {batches.map((batch) => (
                        <li key={batch.id}>
                          {formatDecimal(new Decimal(batch.quantity))}{' '}
                          {item.unit}
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
            <section>
              <h2>{messages.emergencyAutonomy}</h2>
              <AutonomyList items={dashboard.autonomy} inventory={data.items} />
            </section>
          </article>
        )}
      </StatusPanel>
    </>
  )
}
