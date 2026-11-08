import type { ExpiryResult } from './types'

export const EXPIRY_WARNING_DAYS = 30

function daysBetween(first: string, second: string): number {
  const [firstYear, firstMonth, firstDay] = first.split('-').map(Number)
  const [secondYear, secondMonth, secondDay] = second.split('-').map(Number)
  const firstUtc = Date.UTC(firstYear!, firstMonth! - 1, firstDay!)
  const secondUtc = Date.UTC(secondYear!, secondMonth! - 1, secondDay!)
  return Math.trunc((firstUtc - secondUtc) / 86_400_000)
}

export function calculateExpiry(
  expirationDate: string | null,
  today: string,
): ExpiryResult {
  const daysUntilExpiration =
    expirationDate === null ? null : daysBetween(expirationDate, today)
  return {
    expired: daysUntilExpiration !== null && daysUntilExpiration < 0,
    days_until_expiration: daysUntilExpiration,
    expiring_soon:
      daysUntilExpiration !== null &&
      daysUntilExpiration >= 0 &&
      daysUntilExpiration <= EXPIRY_WARNING_DAYS,
  }
}
