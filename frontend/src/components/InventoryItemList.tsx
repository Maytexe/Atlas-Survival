import { Link } from 'react-router-dom'
import Decimal from 'decimal.js'
import { ItemStatus } from '@/components/ItemStatus'
import {
  calculateAutonomy,
  calculateExpiry,
  calculateStockAvailability,
} from '@/domain'
import { effectiveDaily } from '@/domain/consumption'
import type { ItemSnapshot } from '@/domain/types'
import type { Category, InventoryItem } from '@/db'
import { messages } from '@/i18n/pt-BR'
import {
  formatDate,
  formatQuantity,
  formatRelativeExpiry,
} from '@/services/format'

interface InventoryItemListProps {
  items: readonly InventoryItem[]
  categories: readonly Category[]
  snapshots: ReadonlyMap<string, ItemSnapshot>
  today: string
  timeZone: string
}

function InventoryTableRow({
  item,
  categoryName,
  snapshot,
  today,
  timeZone,
}: {
  item: InventoryItem
  categoryName: string
  snapshot?: ItemSnapshot
  today: string
  timeZone: string
}) {
  const available = snapshot
    ? calculateStockAvailability(snapshot.batches, today).available
    : new Decimal(0)
  const daily = snapshot ? effectiveDaily(snapshot) : new Decimal(0)
  const autonomy = snapshot ? calculateAutonomy(snapshot, today) : null
  const nextExpiry = snapshot?.batches.find(
    (batch) =>
      batch.expirationDate !== null &&
      !calculateExpiry(batch.expirationDate, today).expired &&
      batch.quantity.greaterThan(0),
  )

  return (
    <tr>
      <td>
        <Link className="inventory-item-name" to={`/estoque/${item.id}`}>
          {item.name}
        </Link>
      </td>
      <td>{categoryName}</td>
      <td>{formatQuantity(available, item.unit)}</td>
      <td>
        {daily.greaterThan(0)
          ? `${formatQuantity(daily, item.unit)} / dia`
          : messages.emptyData}
      </td>
      <td>
        {autonomy === null
          ? messages.emptyData
          : messages.autonomyLabel.replace('{days}', String(autonomy))}
      </td>
      <td>
        {nextExpiry?.expirationDate
          ? `${formatDate(nextExpiry.expirationDate, timeZone)} · ${formatRelativeExpiry(nextExpiry.expirationDate, today)}`
          : messages.expiryNone}
      </td>
      <td>
        <ItemStatus batches={snapshot?.batches ?? []} today={today} />
      </td>
      <td>
        <div className="row-actions">
          <Link
            className="button button-secondary button-small"
            to={`/estoque/${item.id}#consumo`}
          >
            {messages.recordConsumption}
          </Link>
          <Link
            className="button button-small"
            to={`/estoque/${item.id}?adicionar=estoque`}
          >
            {messages.addStock}
          </Link>
        </div>
      </td>
    </tr>
  )
}

export function InventoryItemList({
  items,
  categories,
  snapshots,
  today,
  timeZone,
}: InventoryItemListProps) {
  const categoryName = (item: InventoryItem) =>
    categories.find((category) => category.id === item.category_id)?.name ?? ''

  return (
    <section aria-label={messages.inventoryTitle}>
      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>{messages.itemName}</th>
              <th>{messages.category}</th>
              <th>{messages.available}</th>
              <th>{messages.inventoryDailyConsumption}</th>
              <th>{messages.inventoryDuration}</th>
              <th>{messages.nextExpiration}</th>
              <th>{messages.status}</th>
              <th>{messages.actions}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const snapshot = snapshots.get(item.id)
              return (
                <InventoryTableRow
                  key={item.id}
                  item={item}
                  categoryName={categoryName(item)}
                  {...(snapshot ? { snapshot } : {})}
                  today={today}
                  timeZone={timeZone}
                />
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="inventory-mobile-list">
        {items.map((item) => {
          const itemBatches = snapshots.get(item.id)?.batches ?? []
          const available = calculateStockAvailability(
            itemBatches,
            today,
          ).available
          return (
            <article className="panel inventory-row" key={item.id}>
              <div className="inventory-row-main">
                <Link
                  className="inventory-item-name"
                  to={`/estoque/${item.id}`}
                >
                  {item.name}
                </Link>
                <span className="muted">{categoryName(item)}</span>
                <span>
                  {messages.available}: {formatQuantity(available, item.unit)}
                </span>
                <ItemStatus batches={itemBatches} today={today} />
              </div>
              <div className="row-actions">
                <Link
                  className="button button-secondary button-small"
                  to={`/estoque/${item.id}#consumo`}
                >
                  {messages.recordConsumption}
                </Link>
                <Link
                  className="button button-small"
                  to={`/estoque/${item.id}?adicionar=estoque`}
                >
                  {messages.addStock}
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
