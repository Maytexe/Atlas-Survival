import { Check } from 'lucide-react'
import { calculateExpiry } from '@/domain'
import { InfoTip, type InfoRow } from '@/components/InfoTip'
import type { StockBatch } from '@/db'
import { messages } from '@/i18n/pt-BR'
import {
  formatDate,
  formatQuantity,
  formatRelativeExpiry,
} from '@/services/format'
import { ConsumptionActions } from '@/components/ConsumptionActions'

interface BatchCardProps {
  batch: StockBatch
  itemUnit: string
  today: string
  timeZone: string
  isFirst: boolean
  onEdit: () => void
  onDelete: () => void
  onError: (message: string) => void
}

export function BatchCard({
  batch,
  itemUnit,
  today,
  timeZone,
  isFirst,
  onEdit,
  onDelete,
  onError,
}: BatchCardProps) {
  const expiry = calculateExpiry(batch.expiration_date, today)
  const situation = expiry.expired
    ? messages.statusExpired
    : expiry.expiring_soon
      ? messages.statusExpiringSoon
      : messages.statusValid
  const detailRows: InfoRow[] = [
    {
      label: messages.quantityLabel,
      value: formatQuantity(batch.quantity, itemUnit),
    },
    {
      label: messages.expirationLabel,
      value: batch.expiration_date
        ? `${formatDate(batch.expiration_date, timeZone)}, ${formatRelativeExpiry(batch.expiration_date, today)}`
        : messages.noExpiration,
    },
    ...(batch.batch_number
      ? [{ label: messages.batchCodeLabel, value: batch.batch_number }]
      : []),
    ...(batch.storage_location
      ? [{ label: messages.storedAtLabel, value: batch.storage_location }]
      : []),
    {
      label: messages.registeredAtLabel,
      value: formatDate(batch.created_at, timeZone),
    },
    { label: messages.situationLabel, value: situation },
    ...(isFirst
      ? [{ label: messages.firstToConsume, value: messages.firstToConsumeInfo }]
      : []),
  ]

  return (
    <article
      className={`panel batch-card${isFirst ? ' batch-first' : ''}`}
      key={batch.id}
    >
      <div className="batch-heading">
        <strong className="numeric">
          {formatQuantity(batch.quantity, itemUnit)}
        </strong>
        <div className="batch-indicators">
          {isFirst && (
            <span className="status-pill status-good">
              <Check size={15} aria-hidden="true" />
              {messages.firstToConsume}
            </span>
          )}
          {expiry.expired ? (
            <span className="status-pill status-critical">
              {messages.statusExpired}
            </span>
          ) : expiry.expiring_soon ? (
            <span className="status-pill status-warning">
              {messages.statusExpiringSoon}
            </span>
          ) : (
            <span className="status-pill status-good">
              {messages.statusValid}
            </span>
          )}
          <InfoTip label={messages.batchInfoTitle} content={detailRows} />
        </div>
      </div>
      <p className="batch-expiration">
        {batch.expiration_date
          ? `${formatDate(batch.expiration_date, timeZone)} · ${formatRelativeExpiry(batch.expiration_date, today)}`
          : messages.noExpiration}
      </p>
      <div className="row-actions">
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={onEdit}
        >
          {messages.edit}
        </button>
        <button
          className="button button-danger button-small"
          type="button"
          onClick={onDelete}
        >
          {messages.delete}
        </button>
      </div>
      <div id={isFirst ? 'consumo' : undefined}>
        <ConsumptionActions batch={batch} unit={itemUnit} onError={onError} />
      </div>
    </article>
  )
}
