import type Decimal from 'decimal.js'

export function formatDecimal(
  value: Decimal,
  maximumFractionDigits = 3,
): string {
  const formatted = value.toFixed(maximumFractionDigits).replace(/\.?0+$/, '')
  const [whole = '0', fraction] = formatted.split('.')
  const grouping = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(BigInt(whole))
  if (!fraction) return grouping
  const decimalSeparator =
    new Intl.NumberFormat('pt-BR')
      .formatToParts(1.1)
      .find((part) => part.type === 'decimal')?.value ?? ','
  return `${grouping}${decimalSeparator}${fraction}`
}

export function formatDate(date: string | null, timeZone = 'UTC'): string {
  if (!date) return ''
  const parsed = new Date(date.length === 10 ? `${date}T12:00:00Z` : date)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).format(parsed)
}
