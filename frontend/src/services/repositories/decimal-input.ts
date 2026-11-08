import Decimal from 'decimal.js'
import { messages } from '@/i18n/pt-BR'
import { RepositoryError } from './errors'

export function parseDecimalInput(value: string | number): Decimal {
  let decimal: Decimal
  try {
    decimal = new Decimal(String(value))
  } catch (error) {
    if (error instanceof Error) {
      throw new RepositoryError(messages.invalidDecimal)
    }
    throw error
  }
  if (
    !decimal.isFinite() ||
    decimal.decimalPlaces() > 3 ||
    decimal.abs().greaterThanOrEqualTo('100000000000')
  ) {
    throw new RepositoryError(messages.invalidDecimal)
  }
  return decimal
}
