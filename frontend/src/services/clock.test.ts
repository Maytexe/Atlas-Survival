import { describe, expect, it } from 'vitest'
import { getToday, nextClientTimestamp } from './clock'

describe('relógio do cliente', () => {
  it('mantém timestamps estritamente crescentes mesmo com o relógio atrasado', () => {
    const previous = '2025-03-01T10:00:00.010Z'
    expect(
      nextClientTimestamp(new Date('2025-03-01T10:00:00.000Z'), previous),
    ).toBe('2025-03-01T10:00:00.011Z')
  })

  it('usa o horário atual quando ele é posterior ao último timestamp', () => {
    expect(
      nextClientTimestamp(
        new Date('2025-03-01T10:00:00.000Z'),
        '2025-03-01T09:59:59.999Z',
      ),
    ).toBe('2025-03-01T10:00:00.000Z')
  })

  it('calcula o dia civil no fuso configurado', () => {
    expect(getToday(new Date('2025-01-01T02:00:00.000Z'))).toBe('2024-12-31')
  })
})
