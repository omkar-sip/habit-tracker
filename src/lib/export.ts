import type { Habit } from '../types'

export const downloadHabitCsv = (habits: Habit[]) => {
  const rows = [['Habit', 'Category', 'Frequency', 'Date', 'XP earned']]
  habits.forEach((habit) => {
    habit.completedDates.forEach((date) => rows.push([habit.name, habit.category, habit.frequency, date, date.startsWith('week:') ? '25' : '25']))
  })
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `habitforge-export-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
