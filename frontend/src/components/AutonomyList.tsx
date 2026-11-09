import type { AutonomyAggregate } from '@/domain/types'
import { messages } from '@/i18n/pt-BR'
import type { InventoryItem } from '@/db'

interface AutonomyListProps {
  items: readonly AutonomyAggregate[]
  inventory: readonly InventoryItem[]
}

export function AutonomyList({ items, inventory }: AutonomyListProps) {
  if (items.length === 0) {
    return <p className="muted">{messages.autonomyNoData}</p>
  }
  return (
    <ul className="autonomy-list">
      {items.map((item) => {
        const label = `${item.item_kind === 'FOOD' ? messages.foodAvailability : messages.waterAvailability} · ${item.dimension}${item.base_unit ? ` (${item.base_unit})` : ''}`
        const limitingName =
          inventory.find((record) => record.id === item.limiting_item)?.name ??
          item.limiting_item
        return (
          <li
            key={`${item.item_kind}-${item.dimension}-${item.base_unit ?? ''}`}
          >
            <div className="autonomy-heading">
              <strong>{label}</strong>
              <span>
                {item.days} {messages.days}
              </span>
            </div>
            <div className="autonomy-detail">
              {messages.coverage
                .replace('{covered}', String(item.coverage_count))
                .replace('{total}', String(item.total_items))}
              {' · '}
              {messages.limitingItem.replace('{item}', limitingName)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
