import Decimal from 'decimal.js'
import { calculateStockAvailability } from './availability'
import { effectiveDaily, effectiveDailyInBase } from './consumption'
import { calculateUnitBase, unitDefinitions } from './units'
import type { AutonomyAggregate, ItemSnapshot } from './types'

export function calculateAutonomy(
  item: ItemSnapshot,
  today: string,
): number | null {
  const daily = effectiveDaily(item)
  if (!daily.greaterThan(0)) return null
  const available = calculateStockAvailability(item.batches, today).available
  return available
    .dividedBy(daily)
    .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
    .toNumber()
}

export function aggregateAutonomy(
  items: readonly ItemSnapshot[],
  today: string,
): AutonomyAggregate[] {
  const groups = new Map<string, ItemSnapshot[]>()
  for (const item of items) {
    if (item.itemKind !== 'FOOD' && item.itemKind !== 'WATER') continue
    const definition = unitDefinitions[item.unit]
    const baseUnit =
      definition.dimension === 'COUNT' ? definition.base_unit : ''
    const key = `${item.itemKind}:${definition.dimension}:${baseUnit}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  const aggregates: AutonomyAggregate[] = []
  for (const [key, groupItems] of groups) {
    const [itemKind, dimension, baseUnit] = key.split(':') as [
      'FOOD' | 'WATER',
      'MASS' | 'VOLUME' | 'COUNT',
      string,
    ]
    const consumingItems = groupItems.filter((item) =>
      effectiveDaily(item).greaterThan(0),
    )
    if (consumingItems.length === 0) continue
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
      dailyBase = dailyBase.plus(effectiveDailyInBase(item))
      itemAutonomies.push({
        days: available.dividedBy(effectiveDaily(item)),
        id: item.id,
      })
    }
    const limitingItem = itemAutonomies.reduce((limit, current) =>
      current.days.lessThan(limit.days) ||
      (current.days.equals(limit.days) && current.id < limit.id)
        ? current
        : limit,
    )
    const aggregate: AutonomyAggregate = {
      item_kind: itemKind,
      dimension,
      days: availableBase
        .dividedBy(dailyBase)
        .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
        .toNumber(),
      coverage_count: consumingItems.length,
      total_items: groupItems.length,
      coverage_label: `calculado com ${consumingItems.length} de ${groupItems.length} itens`,
      limiting_item: limitingItem.id,
    }
    if (dimension === 'COUNT') aggregate.base_unit = baseUnit
    aggregates.push(aggregate)
  }

  const dimensionOrder = { MASS: 0, VOLUME: 1, COUNT: 2 }
  const kindOrder = { FOOD: 0, WATER: 1 }
  return aggregates.sort(
    (first, second) =>
      kindOrder[first.item_kind] - kindOrder[second.item_kind] ||
      dimensionOrder[first.dimension] - dimensionOrder[second.dimension] ||
      (first.base_unit ?? '').localeCompare(second.base_unit ?? ''),
  )
}
