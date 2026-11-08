import { createSeedSnapshot } from '../src/data/seed'
import type { ApiHabit, ApiUser } from './domain'

const seed = createSeedSnapshot()
const user: ApiUser = { id: seed.user.id, name: seed.user.name, email: seed.user.email, timezone: seed.user.timezone, plan: seed.user.plan, xp: seed.user.xp, level: seed.user.level }
const habits: ApiHabit[] = seed.habits.map((habit) => ({ ...habit, userId: user.id }))

export const store = {
  user,
  habits,
  getUser: () => user,
  getHabits: () => habits,
  getHabit: (id: string) => habits.find((habit) => habit.id === id),
  addHabit: (habit: ApiHabit) => habits.push(habit),
  updateHabit: (id: string, patch: Partial<ApiHabit>) => {
    const habit = habits.find((item) => item.id === id)
    if (habit) Object.assign(habit, patch)
    return habit
  },
  deleteHabit: (id: string) => {
    const index = habits.findIndex((habit) => habit.id === id)
    if (index >= 0) habits.splice(index, 1)
  }
}
