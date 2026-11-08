export const collections = ['Users', 'Habits', 'HabitCompletions', 'Achievements', 'UserAchievements', 'XPTransactions', 'Subscriptions'] as const

export interface ApiUser { id: string; name: string; email: string; timezone: string; plan: 'free' | 'premium'; xp: number; level: number }
export interface ApiHabit { id: string; userId: string; name: string; description: string; category: string; frequency: 'daily' | 'weekly'; color: string; icon: string; completedDates: string[] }
