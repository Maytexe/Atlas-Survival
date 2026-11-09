import type Decimal from 'decimal.js'
import { messages } from '@/i18n/pt-BR'
import { formatDecimal } from '@/services/format'

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
        const label = `${kind === 'FOOD' ? messages.foodAvailability : messages.waterAvailability} · ${messages.availabilityDimension
          .replace('{dimension}', dimension ?? '')
          .replace('{unit}', unit ?? (dimension === 'MASS' ? 'g' : 'ml'))}`
        return (
          <li key={key}>
            <span>{label}</span>
            <strong>{formatDecimal(value.available)}</strong>
          </li>
        )
      })}
    </ul>
  )
}
