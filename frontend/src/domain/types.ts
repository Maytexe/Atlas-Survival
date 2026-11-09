import type Decimal from 'decimal.js'

export type MemberType = 'PERSON' | 'ANIMAL'
export type ItemKind = 'FOOD' | 'WATER' | 'OTHER'
export type Unit =
  'kg' | 'g' | 'L' | 'ml' | 'unidade' | 'pacote' | 'lata' | 'garrafa'
export type ConsumptionBasis = 'HOUSEHOLD' | 'PER_PERSON' | 'PER_ANIMAL'

export interface BatchSnapshot {
  id: string
  quantity: Decimal
  expirationDate: string | null
}

export interface ItemSnapshot {
  id: string
  name: string
  itemKind: ItemKind
  unit: Unit
  dailyConsumption: Decimal | null
  consumptionBasis: ConsumptionBasis
  personCount: number
  animalCount: number
  batches: readonly BatchSnapshot[]
}

export interface ExpiryResult {
  expired: boolean
  days_until_expiration: number | null
  expiring_soon: boolean
}

export interface AvailabilityResult {
  available: Decimal
  expired_quantity: Decimal
}

export interface UnitBaseResult {
  dimension: 'MASS' | 'VOLUME' | 'COUNT'
  base_unit: string
  base_quantity: Decimal
}

export interface AlertResult {
  type:
    | 'EXPIRED'
    | 'OUT_OF_STOCK'
    | 'EXPIRING_SOON'
    | 'LOW_STOCK'
    | 'NO_CONSUMPTION_DATA'
    | 'BELOW_GOAL'
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  item_id: string
  batch_id: string | null
  date: string | null
}

export interface AutonomyAggregate {
  item_kind: 'FOOD' | 'WATER'
  dimension: 'MASS' | 'VOLUME' | 'COUNT'
  days: number
  available_base: Decimal
  daily_base: Decimal
  coverage_count: number
  total_items: number
  coverage_label: string
  limiting_item: string
  base_unit?: string
}

export interface GoalResult {
  item_kind: 'FOOD' | 'WATER'
  dimension: 'MASS' | 'VOLUME' | 'COUNT'
  base_unit: string
  goal_days: number | null
  status: 'NO_GOAL' | 'NO_DATA' | 'MET' | 'BELOW'
  available_base: Decimal
  daily_base: Decimal
  needed_base: Decimal
  missing_base: Decimal
  partial_coverage: boolean
  coverage_count: number
  total_items: number
  limiting_item: string | null
}

export interface DashboardResult {
  availability: Record<string, { available: Decimal }>
  expired_batches: number
  expiring_soon_batches: number
  autonomy: AutonomyAggregate[]
  goals: GoalResult[]
}
