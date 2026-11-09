import { calculateExpiry } from '@/domain'
import { messages } from '@/i18n/pt-BR'
import type { StockBatch } from '@/db'
import Decimal from 'decimal.js'

interface ItemStatusProps {
  batches: readonly StockBatch[]
  today: string
}

export function ItemStatus({ batches, today }: ItemStatusProps) {
  const valid = batches.filter((batch) => {
    if (batch.expiration_date === null) return true
    return !calculateExpiry(batch.expiration_date, today).expired
  })
  const nonExpired = valid.some((batch) =>
    new Decimal(batch.quantity).greaterThan(0),
  )
  if (!nonExpired) {
    return (
      <span className="status-pill status-critical">
        {messages.alertOutOfStock}
      </span>
    )
  }
  const expiring = valid.some(
    (batch) =>
      batch.expiration_date !== null &&
      calculateExpiry(batch.expiration_date, today).expiring_soon,
  )
  return (
    <span
      className={`status-pill ${expiring ? 'status-warning' : 'status-good'}`}
    >
      {expiring ? messages.alertExpiringSoon : messages.validStock}
    </span>
  )
}
