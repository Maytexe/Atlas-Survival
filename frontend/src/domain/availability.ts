import Decimal from 'decimal.js'
import { calculateExpiry } from './expiry'
import type { AvailabilityResult, BatchSnapshot } from './types'

export function calculateStockAvailability(
  batches: readonly BatchSnapshot[],
  today: string,
): AvailabilityResult {
  let available = new Decimal(0)
  let expiredQuantity = new Decimal(0)
  for (const batch of batches) {
    if (calculateExpiry(batch.expirationDate, today).expired) {
      expiredQuantity = expiredQuantity.plus(batch.quantity)
    } else {
      available = available.plus(batch.quantity)
    }
  }
  return { available, expired_quantity: expiredQuantity }
}
