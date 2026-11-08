import Decimal from 'decimal.js'
import type { Unit, UnitBaseResult } from './types'

export const unitDefinitions: Record<
  Unit,
  Omit<UnitBaseResult, 'base_quantity'> & { factor: Decimal }
> = {
  kg: { dimension: 'MASS', base_unit: 'g', factor: new Decimal(1000) },
  g: { dimension: 'MASS', base_unit: 'g', factor: new Decimal(1) },
  L: { dimension: 'VOLUME', base_unit: 'ml', factor: new Decimal(1000) },
  ml: { dimension: 'VOLUME', base_unit: 'ml', factor: new Decimal(1) },
  unidade: { dimension: 'COUNT', base_unit: 'unidade', factor: new Decimal(1) },
  pacote: { dimension: 'COUNT', base_unit: 'pacote', factor: new Decimal(1) },
  lata: { dimension: 'COUNT', base_unit: 'lata', factor: new Decimal(1) },
  garrafa: { dimension: 'COUNT', base_unit: 'garrafa', factor: new Decimal(1) },
}

export function calculateUnitBase(
  unit: Unit,
  quantity: Decimal,
): UnitBaseResult {
  const definition = unitDefinitions[unit]
  return {
    dimension: definition.dimension,
    base_unit: definition.base_unit,
    base_quantity: quantity.mul(definition.factor),
  }
}
