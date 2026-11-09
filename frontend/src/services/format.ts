import type Decimal from 'decimal.js'
import DecimalValue from 'decimal.js'
import { messages } from '@/i18n/pt-BR'

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

export function formatQuantity(value: Decimal | string, unit: string): string {
  const quantity = new DecimalValue(value)
  if (unit === 'g' && quantity.absoluteValue().greaterThanOrEqualTo(1000)) {
    return `${formatDecimal(quantity.dividedBy(1000))} kg`
  }
  if (unit === 'ml' && quantity.absoluteValue().greaterThanOrEqualTo(1000)) {
    return `${formatDecimal(quantity.dividedBy(1000))} L`
  }
  return `${formatDecimal(quantity)} ${unit}`
}

export function formatPlural(
  count: number,
  singular: string,
  plural: string,
): string {
  const category = new Intl.PluralRules('pt-BR').select(count)
  return `${count} ${category === 'one' ? singular : plural}`
}

export function formatAge(age: number): string {
  return formatPlural(age, messages.year, messages.years)
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

export function formatDateTime(
  date: string,
  timeZone = 'America/Sao_Paulo',
): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(date))
}

export function formatRelativeExpiry(date: string, today: string): string {
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  )
  if (days === 0) return messages.expiresToday
  const relative = new Intl.RelativeTimeFormat('pt-BR', {
    numeric: 'always',
  }).format(days, 'day')
  return days > 0
    ? messages.expiresRelative.replace('{relative}', relative)
    : messages.expiredRelative.replace('{relative}', relative)
}

export function addCalendarMonths(date: string, months: number): string {
  const [year = '0', month = '1', day = '1'] = date.split('-')
  const sourceYear = Number(year)
  const sourceMonth = Number(month) - 1
  const sourceDay = Number(day)
  const target = new Date(Date.UTC(sourceYear, sourceMonth + months, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(sourceDay, lastDay))
  return [
    target.getUTCFullYear(),
    String(target.getUTCMonth() + 1).padStart(2, '0'),
    String(target.getUTCDate()).padStart(2, '0'),
  ].join('-')
}
