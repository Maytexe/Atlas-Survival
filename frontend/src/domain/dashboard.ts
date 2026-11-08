import Decimal from 'decimal.js'
import { aggregateAutonomy } from './autonomy'
import { calculateStockAvailability } from './availability'
import { calculateExpiry } from './expiry'
import { calculateUnitBase, unitDefinitions } from './units'
import type { DashboardResult, ItemSnapshot } from './types'

export function calculateDashboard(
  items: readonly ItemSnapshot[],
  today: string,
): DashboardResult {
  const availability: DashboardResult['availability'] = {}
  let expiredBatches = 0
  let expiringSoonBatches = 0
  for (const item of items) {
    const itemAvailability = calculateStockAvailability(item.batches, today)
    const { dimension, base_unit } = unitDefinitions[item.unit]
    if (item.itemKind === 'FOOD' || item.itemKind === 'WATER') {
      const suffix = dimension === 'COUNT' ? `:${base_unit}` : ''
      const key = `${item.itemKind}:${dimension}${suffix}`
      const available = calculateUnitBase(
        item.unit,
        itemAvailability.available,
      ).base_quantity
      availability[key] ??= { available: new Decimal(0) }
      availability[key].available = availability[key].available.plus(available)
    }
    for (const batch of item.batches) {
      const expiry = calculateExpiry(batch.expirationDate, today)
      expiredBatches += Number(expiry.expired)
      expiringSoonBatches += Number(expiry.expiring_soon)
    }
  }
  return {
    availability: Object.fromEntries(
      Object.entries(availability).sort(([first], [second]) =>
        first.localeCompare(second),
      ),
    ),
    expired_batches: expiredBatches,
    expiring_soon_batches: expiringSoonBatches,
    autonomy: aggregateAutonomy(items, today),
  }
}
