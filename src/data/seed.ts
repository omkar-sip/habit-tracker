import type { Habit, User } from '../types'
import { addDays, dateKey, startOfWeekKey } from '../lib/date'

export const seedUser: User = {
  id: 'demo-alex-morgan',
  name: 'Alex Morgan',
  email: 'alex@habitforge.app',
  initials: 'AM',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
  plan: 'free',
  xp: 1280,
  level: 4,
  joinedAt: '2026-08-08',
  avatarColor: '#9b7dff'
}

const today = new Date()
const keyAt = (daysAgo: number) => dateKey(addDays(today, -daysAgo))
const dailyHistory = (days: number, skipEvery: number, startOffset = 0) => Array.from({ length: days }, (_, index) => {
  const age = index + startOffset
  return age % skipEvery === 0 && age > 0 ? null : keyAt(age)
}).filter(Boolean) as string[]

export const seedHabits: Habit[] = [
  {
    id: 'habit-move', name: 'Move for 20 minutes', description: 'Keep your body switched on before the day gets loud.', category: 'Body', frequency: 'daily', color: '#B7F36B', icon: 'dumbbell', targetDays: 7, createdAt: '2026-08-08', completedDates: dailyHistory(92, 8)
  },
  {
    id: 'habit-deep-work', name: 'One deep work block', description: 'Protect 60 minutes for the work that moves the needle.', category: 'Focus', frequency: 'daily', color: '#9B7DFF', icon: 'brain', targetDays: 7, createdAt: '2026-08-08', completedDates: dailyHistory(92, 6, 1)
  },
  {
    id: 'habit-read', name: 'Read 10 pages', description: 'Trade the scroll for one useful idea.', category: 'Mind', frequency: 'daily', color: '#FFB86B', icon: 'book', targetDays: 7, createdAt: '2026-08-08', completedDates: dailyHistory(92, 9, 2)
  },
  {
    id: 'habit-reset', name: 'Sunday reset', description: 'Clear the deck so Monday starts with less drag.', category: 'Systems', frequency: 'weekly', color: '#65D4FF', icon: 'calendar', targetDays: 1, createdAt: '2026-08-08', completedDates: Array.from({ length: 13 }, (_, index) => `week:${startOfWeekKey(addDays(today, -index * 7))}`)
  }
]

// Ensure the current loop is visible in the product demo.
seedHabits[0].completedDates = [...new Set([...seedHabits[0].completedDates, keyAt(0), keyAt(1), keyAt(2), keyAt(3), keyAt(4), keyAt(5), keyAt(6), keyAt(7)])]
seedHabits[1].completedDates = [...new Set([...seedHabits[1].completedDates, keyAt(0), keyAt(1), keyAt(2), keyAt(3), keyAt(4)])]

export const createSeedSnapshot = () => ({ user: { ...seedUser }, habits: seedHabits.map((habit) => ({ ...habit, completedDates: [...habit.completedDates] })) })
