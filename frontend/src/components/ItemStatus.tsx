import { calculateExpiry } from '@/domain'
import { messages } from '@/i18n/pt-BR'
import type { StockBatch } from '@/db'
import Decimal from 'decimal.js'
import { AlertCircle, CalendarClock, CircleCheck } from 'lucide-react'
import type { BatchSnapshot } from '@/domain/types'

interface ItemStatusProps {
  batches: readonly (StockBatch | BatchSnapshot)[]
  today: string
}

export function ItemStatus({ batches, today }: ItemStatusProps) {
  const valid = batches.map((batch) => ({
    expirationDate:
      'expiration_date' in batch ? batch.expiration_date : batch.expirationDate,
    quantity: batch.quantity,
  }))
  const usable = valid.filter((batch) => {
    if (batch.expirationDate === null) return true
    return !calculateExpiry(batch.expirationDate, today).expired
  })
  const nonExpired = usable.some((batch) =>
    new Decimal(batch.quantity).greaterThan(0),
  )
  if (!nonExpired) {
    return (
      <span className="status-pill status-critical">
        <AlertCircle size={16} aria-hidden="true" />
        {messages.statusNoStock}
      </span>
    )
  }
  const expiring = usable.some(
    (batch) =>
      batch.expirationDate !== null &&
      calculateExpiry(batch.expirationDate, today).expiring_soon,
  )
  return (
    <span
      className={`status-pill ${expiring ? 'status-warning' : 'status-good'}`}
    >
      {expiring ? (
        <CalendarClock size={16} aria-hidden="true" />
      ) : (
        <CircleCheck size={16} aria-hidden="true" />
      )}
      {expiring ? messages.statusExpiringSoon : messages.statusValid}
    </span>
  )
}
