export type Frequency = 'daily' | 'weekly'
export type Plan = 'free' | 'premium'

export interface Habit {
  id: string
  name: string
  description: string
  category: string
  frequency: Frequency
  color: string
  icon: string
  targetDays: number
  createdAt: string
  completedDates: string[]
}

export interface User {
  id: string
  name: string
  email: string
  initials: string
  timezone: string
  plan: Plan
  xp: number
  level: number
  joinedAt: string
  avatarColor: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  color: string
  requirement: string
}

export interface ActivityPoint {
  date: string
  label: string
  completed: number
  xp: number
}

export interface HabitStats {
  habitId: string
  completions: number
  rate: number
  streak: number
}

export interface AppSnapshot {
  user: User
  habits: Habit[]
  achievements: Achievement[]
  unlockedAchievementIds: string[]
  activity: ActivityPoint[]
  lastCheckIn?: string
}

export interface HabitDraft {
  name: string
  description: string
  category: string
  frequency: Frequency
  color: string
  icon: string
  targetDays: number
}
