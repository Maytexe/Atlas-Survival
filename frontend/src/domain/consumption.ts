import Decimal from 'decimal.js'
import { calculateUnitBase } from './units'
import type { ItemSnapshot } from './types'

export function effectiveDaily(item: ItemSnapshot): Decimal {
  if (item.dailyConsumption === null) return new Decimal(0)
  const multiplier =
    item.consumptionBasis === 'PER_PERSON'
      ? item.personCount
      : item.consumptionBasis === 'PER_ANIMAL'
        ? item.animalCount
        : 1
  return item.dailyConsumption.mul(multiplier)
}

export function effectiveDailyInBase(item: ItemSnapshot): Decimal {
  const daily = effectiveDaily(item)
  if (daily.isZero()) return daily
  const { base_quantity } = calculateUnitBase(item.unit, daily)
  return base_quantity
}
