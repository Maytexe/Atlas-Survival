import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import {
  formatAge,
  addCalendarMonths,
  formatPlural,
  formatQuantity,
  formatRelativeExpiry,
} from './format'

describe('formatação da interface', () => {
  it.each([
    [new Decimal('1250'), 'g', '1,25 kg'],
    [new Decimal('1500'), 'ml', '1,5 L'],
    [new Decimal('2.5'), 'garrafa', '2,5 garrafa'],
  ] as const)('mostra %s %s como %s', (quantity, unit, expected) => {
    expect(formatQuantity(quantity, unit)).toBe(expected)
  })

  it('usa plural correto para a contagem de itens', () => {
    expect(formatPlural(1, 'item ativo', 'itens ativos')).toBe('1 item ativo')
    expect(formatPlural(2, 'item ativo', 'itens ativos')).toBe('2 itens ativos')
  })

  it('formata idade em anos', () => {
    expect(formatAge(1)).toBe('1 ano')
    expect(formatAge(21)).toBe('21 anos')
  })

  it.each([
    ['2026-11-19', 'vence em 11 dias'],
    ['2026-11-08', 'vence hoje'],
    ['2026-11-06', 'venceu há 2 dias'],
  ])('mostra validade relativa para %s', (date, expected) => {
    expect(formatRelativeExpiry(date, '2026-11-08')).toBe(expected)
  })

  it('calcula atalhos de validade sem ultrapassar o último dia do mês', () => {
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addCalendarMonths('2026-11-08', 12)).toBe('2027-11-08')
  })
})
