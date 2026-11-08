export const pad = (value: number) => String(value).padStart(2, '0')

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const partsInTimezone = (value: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone || browserTimezone(), year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(value)
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])) as Record<string, string>
}

const calendarDateInTimezone = (value: Date, timezone = browserTimezone()) => {
  const parts = partsInTimezone(value, timezone)
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
}

export const dateKey = (value = new Date(), timezone = browserTimezone()) => {
  const date = calendarDateInTimezone(new Date(value), timezone)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const addDays = (value: Date | string, amount: number) => {
  const next = typeof value === 'string' ? parseDateKey(value) : new Date(value)
  next.setDate(next.getDate() + amount)
  return next
}

export const formatShortDate = (key: string) => parseDateKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const formatLongDate = (value = new Date(), timezone = browserTimezone()) => calendarDateInTimezone(value, timezone).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export const startOfWeekKey = (value = new Date(), timezone = browserTimezone()) => {
  const date = calendarDateInTimezone(new Date(value), timezone)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return dateKey(date, browserTimezone())
}

export const weekPeriodKey = (value = new Date(), timezone = browserTimezone()) => `week:${startOfWeekKey(value, timezone)}`

export const periodKeyForHabit = (frequency: 'daily' | 'weekly', value = new Date(), timezone = browserTimezone()) => frequency === 'daily' ? dateKey(value, timezone) : weekPeriodKey(value, timezone)

export const currentPeriodKeys = (frequency: 'daily' | 'weekly', now = new Date(), timezone = browserTimezone()) => {
  if (frequency === 'daily') return [dateKey(now, timezone)]
  const start = parseDateKey(startOfWeekKey(now, timezone))
  return Array.from({ length: 7 }, (_, index) => dateKey(addDays(start, index), browserTimezone()))
}

export const getLastNDays = (count: number, end = new Date(), timezone = browserTimezone()) => Array.from({ length: count }, (_, index) => dateKey(addDays(calendarDateInTimezone(end, timezone), index - count + 1), browserTimezone()))

export const getHabitStreak = (completedDates: string[], frequency: 'daily' | 'weekly', now = new Date(), timezone = browserTimezone()) => {
  const completed = new Set(completedDates)
  if (frequency === 'daily') {
    let cursor = dateKey(now, timezone)
    if (!completed.has(cursor)) cursor = dateKey(addDays(cursor, -1), browserTimezone())
    let streak = 0
    while (completed.has(cursor)) {
      streak += 1
      cursor = dateKey(addDays(cursor, -1), browserTimezone())
    }
    return streak
  }

  let cursor = startOfWeekKey(now, timezone)
  if (!completed.has(`week:${cursor}`)) cursor = startOfWeekKey(addDays(cursor, -7), browserTimezone())
  let streak = 0
  while (completed.has(`week:${cursor}`)) {
    streak += 1
    cursor = startOfWeekKey(addDays(cursor, -7), browserTimezone())
  }
  return streak
}

export const isCompletedThisPeriod = (habit: { frequency: 'daily' | 'weekly'; completedDates: string[] }, now = new Date(), timezone = browserTimezone()) => {
  if (habit.frequency === 'daily') return habit.completedDates.includes(dateKey(now, timezone))
  return habit.completedDates.includes(`week:${startOfWeekKey(now, timezone)}`)
}
