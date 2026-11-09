import Decimal from 'decimal.js'
import { calculateStockAvailability } from './availability'
import { effectiveDaily, effectiveDailyInBase } from './consumption'
import { calculateUnitBase, unitDefinitions } from './units'
import type { GoalResult, ItemSnapshot } from './types'

type GoalGroup = {
  itemKind: 'FOOD' | 'WATER'
  dimension: GoalResult['dimension']
  baseUnit: string
  items: ItemSnapshot[]
}

export function calculateGoals(
  items: readonly ItemSnapshot[],
  today: string,
  goalFoodDays: number | null,
  goalWaterDays: number | null,
): GoalResult[] {
  if (goalFoodDays === null && goalWaterDays === null) return []

  const goalsByKind = { FOOD: goalFoodDays, WATER: goalWaterDays }
  const groups = new Map<string, GoalGroup>()
  for (const item of items) {
    if (item.itemKind !== 'FOOD' && item.itemKind !== 'WATER') continue
    const definition = unitDefinitions[item.unit]
    const group = {
      itemKind: item.itemKind,
      dimension: definition.dimension,
      baseUnit: definition.base_unit,
      items: [],
    } satisfies GoalGroup
    const key = `${group.itemKind}:${group.dimension}:${group.baseUnit}`
    const existing = groups.get(key)
    if (existing) existing.items.push(item)
    else groups.set(key, { ...group, items: [item] })
  }

  const results: GoalResult[] = []
  for (const group of groups.values()) {
    const goalDays = goalsByKind[group.itemKind]
    const consumingItems = group.items.filter((item) =>
      effectiveDaily(item).greaterThan(0),
    )
    let availableBase = new Decimal(0)
    let dailyBase = new Decimal(0)
    const itemAutonomies: Array<{ days: Decimal; id: string }> = []
    for (const item of consumingItems) {
      const available = calculateStockAvailability(
        item.batches,
        today,
      ).available
      availableBase = availableBase.plus(
        calculateUnitBase(item.unit, available).base_quantity,
      )
      const daily = effectiveDaily(item)
      dailyBase = dailyBase.plus(effectiveDailyInBase(item))
      itemAutonomies.push({ days: available.dividedBy(daily), id: item.id })
    }

    const neededBase =
      goalDays === null ? new Decimal(0) : dailyBase.times(goalDays)
    const deficit = Decimal.max(0, neededBase.minus(availableBase))
    const missingBase = deficit.toDecimalPlaces(0, Decimal.ROUND_CEIL)
    const status: GoalResult['status'] =
      goalDays === null
        ? 'NO_GOAL'
        : consumingItems.length === 0
          ? 'NO_DATA'
          : availableBase.greaterThanOrEqualTo(neededBase)
            ? 'MET'
            : 'BELOW'
    const limitingItem = itemAutonomies.sort(
      (first, second) =>
        first.days.comparedTo(second.days) || first.id.localeCompare(second.id),
    )[0]?.id

    results.push({
      item_kind: group.itemKind,
      dimension: group.dimension,
      base_unit: group.baseUnit,
      goal_days: goalDays,
      status,
      available_base: availableBase,
      daily_base: dailyBase,
      needed_base: neededBase,
      missing_base: missingBase,
      partial_coverage: consumingItems.length < group.items.length,
      coverage_count: consumingItems.length,
      total_items: group.items.length,
      limiting_item: limitingItem ?? null,
    })
  }

  const dimensionOrder = { MASS: 0, VOLUME: 1, COUNT: 2 }
  const kindOrder = { FOOD: 0, WATER: 1 }
  return results.sort(
    (first, second) =>
      kindOrder[first.item_kind] - kindOrder[second.item_kind] ||
      dimensionOrder[first.dimension] - dimensionOrder[second.dimension] ||
      first.base_unit.localeCompare(second.base_unit),
  )
}
