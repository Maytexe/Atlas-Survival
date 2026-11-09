import type { AutonomyAggregate } from '@/domain/types'
import { messages } from '@/i18n/pt-BR'
import type { InventoryItem } from '@/db'
import { formatQuantity } from '@/services/format'

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
        const label =
          item.item_kind === 'FOOD' ? messages.foodKind : messages.waterKind
        const unit =
          item.base_unit ??
          (item.dimension === 'MASS'
            ? 'g'
            : item.dimension === 'VOLUME'
              ? 'ml'
              : '')
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
                {messages.autonomyLabel.replace('{days}', String(item.days))}
              </span>
            </div>
            <div className="autonomy-detail">
              {formatQuantity(item.available_base, unit)}
              {' · '}
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
