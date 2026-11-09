import type Decimal from 'decimal.js'
import { messages } from '@/i18n/pt-BR'
import { formatQuantity } from '@/services/format'

interface AvailabilityListProps {
  availability: Record<string, { available: Decimal }>
}

export function AvailabilityList({ availability }: AvailabilityListProps) {
  const entries = Object.entries(availability)
  if (entries.length === 0) {
    return <p className="muted">{messages.dashboardAvailabilityEmpty}</p>
  }
  return (
    <ul className="availability-list">
      {entries.map(([key, value]) => {
        const [kind, dimension, unit] = key.split(':')
        const baseUnit =
          unit ??
          (dimension === 'MASS' ? 'g' : dimension === 'VOLUME' ? 'ml' : '')
        const label =
          kind === 'FOOD'
            ? messages.foodAvailability
            : messages.waterAvailability
        return (
          <li key={key}>
            <span>{label}</span>
            <strong>{formatQuantity(value.available, baseUnit)}</strong>
          </li>
        )
      })}
    </ul>
  )
}
