import type { Table } from 'dexie'
import type { MetaRecord } from '@/db/schema'

export function getToday(
  now: Date = new Date(),
  timeZone: string = import.meta.env.VITE_TIMEZONE || 'America/Sao_Paulo',
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

export function nextClientTimestamp(
  now: Date = new Date(),
  lastTimestamp?: string,
): string {
  const nowMs = now.getTime()
  const lastMs =
    lastTimestamp === undefined
      ? Number.NEGATIVE_INFINITY
      : Date.parse(lastTimestamp)
  return new Date(Math.max(nowMs, lastMs + 1)).toISOString()
}

export async function persistNextClientTimestamp(
  meta: Table<MetaRecord, string>,
  now: Date = new Date(),
): Promise<string> {
  const previous = await meta.get('last_client_ts')
  const lastTimestamp =
    typeof previous?.value === 'string' ? previous.value : undefined
  const timestamp = nextClientTimestamp(now, lastTimestamp)
  await meta.put({ key: 'last_client_ts', value: timestamp })
  return timestamp
}
