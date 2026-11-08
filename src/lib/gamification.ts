import type { Achievement, Habit, User } from '../types'
import { addDays, dateKey, getHabitStreak, getLastNDays, startOfWeekKey } from './date'

export const XP_PER_COMPLETION = 25
export const levelForXp = (xp: number) => Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1)
export const xpForLevel = (level: number) => Math.pow(Math.max(0, level - 1), 2) * 100
export const xpRangeForLevel = (level: number) => ({ min: xpForLevel(level), max: xpForLevel(level + 1) })
export const levelProgress = (xp: number) => {
  const level = levelForXp(xp)
  const range = xpRangeForLevel(level)
  return Math.max(0, Math.min(100, ((xp - range.min) / (range.max - range.min || 1)) * 100))
}

export const achievements: Achievement[] = [
  { id: 'first-spark', title: 'First Spark', description: 'Complete your first habit check-in.', icon: 'spark', color: 'violet', requirement: '1 completion' },
  { id: 'seven-day', title: 'Consistency King', description: 'Hold a seven-day streak on any habit.', icon: 'flame', color: 'orange', requirement: '7-day streak' },
  { id: 'century', title: 'Century Club', description: 'Stack up 50 total habit completions.', icon: 'trophy', color: 'lime', requirement: '50 completions' },
  { id: 'xp-thousand', title: 'Forge Level 4', description: 'Earn your first 1,000 XP.', icon: 'bolt', color: 'blue', requirement: '1,000 XP' },
  { id: 'perfect-week', title: 'Perfect Week', description: 'Complete every active daily habit for seven days.', icon: 'calendar', color: 'pink', requirement: '7 perfect days' }
]

export const totalCompletions = (habits: Habit[]) => habits.reduce((sum, habit) => sum + habit.completedDates.length, 0)

export const unlockedAchievementIds = (user: User, habits: Habit[]) => {
  const completions = totalCompletions(habits)
  const bestStreak = Math.max(0, ...habits.map((habit) => getHabitStreak(habit.completedDates, habit.frequency, new Date(), user.timezone)))
  const unlocked: string[] = []
  if (completions >= 1) unlocked.push('first-spark')
  if (bestStreak >= 7) unlocked.push('seven-day')
  if (completions >= 50) unlocked.push('century')
  if (user.xp >= 1000) unlocked.push('xp-thousand')
  const dailyHabits = habits.filter((habit) => habit.frequency === 'daily')
  const lastSevenDays = getLastNDays(7, new Date(), user.timezone)
  const perfectWeek = dailyHabits.length > 0 && lastSevenDays.every((day) => dailyHabits.every((habit) => habit.completedDates.includes(day)))
  if (perfectWeek) unlocked.push('perfect-week')
  return unlocked
}

export const buildActivity = (habits: Habit[], end = new Date(), count = 12, timezone?: string) => {
  const days = getLastNDays(count, end, timezone)
  return days.map((key) => {
    const date = new Date(`${key}T12:00:00`)
    const completed = habits.filter((habit) => habit.completedDates.includes(key) || (date.getDay() === 1 && habit.completedDates.includes(`week:${startOfWeekKey(date, timezone)}`))).length
    return { date: key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), completed, xp: completed * XP_PER_COMPLETION }
  })
}
