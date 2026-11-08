import { readFileSync } from 'node:fs'
import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import {
  aggregateAutonomy,
  calculateAlerts,
  calculateAutonomy,
  calculateDashboard,
  calculateExpiry,
  calculateStockAvailability,
  calculateUnitBase,
} from './index'
import type { BatchSnapshot, ItemSnapshot, Unit } from './types'

interface FixtureBatch {
  id: string
  quantity: string
  expiration_date: string | null
}

interface FixtureItem {
  id: string
  name: string
  item_kind: ItemSnapshot['itemKind']
  unit: Unit
  daily_consumption: string | null
  consumption_basis: ItemSnapshot['consumptionBasis']
  person_count: number
  animal_count: number
  batches: FixtureBatch[]
}

function readFixture<T>(name: string): T {
  const url = new URL(`../../../shared/fixtures/${name}`, import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as T
}

function fromFixtureBatch(batch: FixtureBatch): BatchSnapshot {
  return {
    id: batch.id,
    quantity: new Decimal(batch.quantity),
    expirationDate: batch.expiration_date,
  }
}

function fromFixture(item: FixtureItem): ItemSnapshot {
  return {
    id: item.id,
    name: item.name,
    itemKind: item.item_kind,
    unit: item.unit,
    dailyConsumption:
      item.daily_consumption === null
        ? null
        : new Decimal(item.daily_consumption),
    consumptionBasis: item.consumption_basis,
    personCount: item.person_count,
    animalCount: item.animal_count,
    batches: item.batches.map(fromFixtureBatch),
  }
}

describe('paridade com fixtures compartilhados', () => {
  it('calcula validade', () => {
    const cases = readFixture<
      Array<{
        expiration_date: string | null
        today: string
        expected: ReturnType<typeof calculateExpiry>
      }>
    >('expiry-cases.json')
    for (const testCase of cases) {
      expect(calculateExpiry(testCase.expiration_date, testCase.today)).toEqual(
        testCase.expected,
      )
    }
  })

  it('converte unidades usando Decimal', () => {
    const cases = readFixture<
      Array<{
        unit: Unit
        quantity: string
        expected: {
          dimension: string
          base_unit: string
          base_quantity: string
        }
      }>
    >('units-cases.json')
    for (const testCase of cases) {
      const actual = calculateUnitBase(
        testCase.unit,
        new Decimal(testCase.quantity),
      )
      expect({
        ...actual,
        base_quantity: actual.base_quantity.toFixed(3),
      }).toEqual(testCase.expected)
    }
  })

  it('calcula disponibilidade', () => {
    const cases = readFixture<
      Array<{
        batches: FixtureBatch[]
        today: string
        expected: { available: string; expired_quantity: string }
      }>
    >('availability-cases.json')
    for (const testCase of cases) {
      const actual = calculateStockAvailability(
        testCase.batches.map(fromFixtureBatch),
        testCase.today,
      )
      expect({
        available: actual.available.toFixed(3),
        expired_quantity: actual.expired_quantity.toFixed(3),
      }).toEqual(testCase.expected)
    }
  })

  it('calcula autonomia individual e agregada', () => {
    const cases = readFixture<
      Array<{
        today: string
        items: FixtureItem[]
        expected: {
          item_days: Record<string, number | null>
          aggregates: ReturnType<typeof aggregateAutonomy>
        }
      }>
    >('autonomy-cases.json')
    for (const testCase of cases) {
      const items = testCase.items.map(fromFixture)
      expect(
        Object.fromEntries(
          items.map((item) => [
            item.id,
            calculateAutonomy(item, testCase.today),
          ]),
        ),
      ).toEqual(testCase.expected.item_days)
      expect(aggregateAutonomy(items, testCase.today)).toEqual(
        testCase.expected.aggregates,
      )
    }
  })

  it('calcula alertas', () => {
    const cases = readFixture<
      Array<{
        today: string
        low_stock_days: number
        items: FixtureItem[]
        expected: ReturnType<typeof calculateAlerts>
      }>
    >('alerts-cases.json')
    for (const testCase of cases) {
      expect(
        calculateAlerts(
          testCase.items.map(fromFixture),
          testCase.today,
          testCase.low_stock_days,
        ),
      ).toEqual(testCase.expected)
    }
  })

  it('calcula dashboard', () => {
    const cases = readFixture<
      Array<{
        today: string
        items: FixtureItem[]
        expected: {
          availability: Record<string, { available: string }>
          expired_batches: number
          expiring_soon_batches: number
          autonomy: ReturnType<typeof aggregateAutonomy>
        }
      }>
    >('dashboard-cases.json')
    for (const testCase of cases) {
      const actual = calculateDashboard(
        testCase.items.map(fromFixture),
        testCase.today,
      )
      expect(
        Object.fromEntries(
          Object.entries(actual.availability).map(([key, value]) => [
            key,
            { available: value.available.toFixed(3) },
          ]),
        ),
      ).toEqual(testCase.expected.availability)
      expect(actual.expired_batches).toBe(testCase.expected.expired_batches)
      expect(actual.expiring_soon_batches).toBe(
        testCase.expected.expiring_soon_batches,
      )
      expect(actual.autonomy).toEqual(testCase.expected.autonomy)
    }
  })
})
