
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

export const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export const formatDay = (iso: string) => dayFormat.format(new Date(iso))
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

export const formatTimeRange = (startIso: string, endIso: string) =>
  `${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`

export const minutesBetween = (startIso: string, endIso: string) =>
  Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000)

export function formatDuration(startIso: string, endIso: string): string {
  const minutes = minutesBetween(startIso, endIso)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h > 0 && `${h} h`, m > 0 && `${m} min`].filter(Boolean).join(' ')
}

const pad = (n: number) => String(n).padStart(2, '0')

export const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const toTimeInputValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

export function dateInputToIso(value: string, endOfDay = false): string {
  const date = new Date(`${value}T00:00:00`)
  if (endOfDay) date.setDate(date.getDate() + 1)
  return date.toISOString()
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export interface DateRange {
  from: string
  to: string
}

export const defaultDateRange = (): DateRange => ({
  from: toDateInputValue(new Date()),
  to: toDateInputValue(addDays(new Date(), 7)),
})

export function groupByDay<T extends { startAt: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const day = formatDay(item.startAt)
    groups.set(day, [...(groups.get(day) ?? []), item])
  }
  return [...groups]
}
