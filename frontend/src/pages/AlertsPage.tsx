import { Link } from 'react-router-dom'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { calculateAlerts } from '@/domain'
import { toItemSnapshots } from '@/domain/from-records'
import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import { formatDate } from '@/services/format'

const alertMessages = {
  EXPIRED: messages.alertExpired,
  OUT_OF_STOCK: messages.alertOutOfStock,
  EXPIRING_SOON: messages.alertExpiringSoon,
  LOW_STOCK: messages.alertLowStock,
  NO_CONSUMPTION_DATA: messages.alertNoConsumption,
} as const

const severityMessages = {
  CRITICAL: messages.severityCritical,
  WARNING: messages.severityWarning,
  INFO: messages.severityInfo,
} as const

export function AlertsPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const today = getToday(new Date(), settings?.timeZone)
  const alerts = data
    ? calculateAlerts(
        toItemSnapshots(data.items, data.batches, data.members),
        today,
        settings?.lowStockDays ?? 7,
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
        <section className="alert-list" aria-label={messages.alerts}>
          {alerts.map((alert, index) => {
            const itemName =
              data?.items.find((item) => item.id === alert.item_id)?.name ??
              alert.item_id
            return (
              <article
                className={`panel alert-row severity-${alert.severity.toLowerCase()}`}
                key={`${alert.item_id}-${alert.batch_id ?? alert.type}-${index}`}
              >
                <span className="status-pill">
                  {severityMessages[alert.severity]}
                </span>
                <div className="alert-content">
                  <strong>{alertMessages[alert.type]}</strong>
                  <Link to={`/estoque/${alert.item_id}`}>{itemName}</Link>
                  {alert.date && (
                    <time dateTime={alert.date}>
                      {formatDate(alert.date, settings?.timeZone)}
                    </time>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      </StatusPanel>
    </>
  )
}
