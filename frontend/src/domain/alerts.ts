import { calculateAutonomy } from './autonomy'
import { calculateStockAvailability } from './availability'
import { effectiveDaily } from './consumption'
import { calculateExpiry } from './expiry'
import { calculateGoals } from './goals'
import type { AlertResult, ItemSnapshot } from './types'

const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 }

export function calculateAlerts(
  items: readonly ItemSnapshot[],
  today: string,
  lowStockDays: number,
  goalFoodDays: number | null = null,
  goalWaterDays: number | null = null,
): AlertResult[] {
  const alerts: AlertResult[] = []
  for (const item of items) {
    const availability = calculateStockAvailability(item.batches, today)
    for (const batch of item.batches) {
      const expiry = calculateExpiry(batch.expirationDate, today)
      if (expiry.expired) {
        alerts.push({
          type: 'EXPIRED',
          severity: 'CRITICAL',
          item_id: item.id,
          batch_id: batch.id,
          date: batch.expirationDate,
        })
      } else if (expiry.expiring_soon) {
        alerts.push({
          type: 'EXPIRING_SOON',
          severity: 'WARNING',
          item_id: item.id,
          batch_id: batch.id,
          date: batch.expirationDate,
        })
      }
    }
    if (availability.available.equals(0)) {
      alerts.push({
        type: 'OUT_OF_STOCK',
        severity: 'CRITICAL',
        item_id: item.id,
        batch_id: null,
        date: null,
      })
    }
    const daily = effectiveDaily(item)
    if (daily.equals(0)) {
      alerts.push({
        type: 'NO_CONSUMPTION_DATA',
        severity: 'INFO',
        item_id: item.id,
        batch_id: null,
        date: null,
      })
    } else {
      const autonomy = calculateAutonomy(item, today)
      if (autonomy !== null && autonomy < lowStockDays) {
        alerts.push({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          item_id: item.id,
          batch_id: null,
          date: null,
        })
      }
    }
  }
  for (const goal of calculateGoals(
    items,
    today,
    goalFoodDays,
    goalWaterDays,
  )) {
    if (goal.status === 'BELOW' && goal.limiting_item !== null) {
      alerts.push({
        type: 'BELOW_GOAL',
        severity: 'WARNING',
        item_id: goal.limiting_item,
        batch_id: null,
        date: null,
      })
    }
  }
  return alerts.sort(
    (first, second) =>
      severityOrder[first.severity] - severityOrder[second.severity] ||
      (first.date ?? '9999-12-31').localeCompare(second.date ?? '9999-12-31') ||
      first.item_id.localeCompare(second.item_id) ||
      (first.batch_id ?? '').localeCompare(second.batch_id ?? '') ||
      first.type.localeCompare(second.type),
  )
}
