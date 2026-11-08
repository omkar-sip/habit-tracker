import express, { type NextFunction, type Request, type Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { store } from './store'

const app: express.Express = express()
const port = Number(process.env.PORT || 3001)
const jwtSecret = process.env.MANUS_JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('MANUS_JWT_SECRET is required in production') })() : 'habitforge-local-development-secret')

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const getParam = (value: string | string[]) => Array.isArray(value) ? value[0] : value

const protectedRoute = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })
  try {
    const payload = jwt.verify(auth.slice(7), jwtSecret)
    res.locals.userId = typeof payload === 'object' && payload && 'sub' in payload ? payload.sub : store.user.id
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }
}

const ownedHabit = (req: Request, res: Response) => {
  const habitId = getParam(req.params.id)
  const habit = store.getHabit(habitId)
  if (!habit || habit.userId !== res.locals.userId) {
    res.status(404).json({ error: 'Habit not found' })
    return null
  }
  return habit
}

const habitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180).default(''),
  category: z.string().trim().min(1).max(40),
  frequency: z.enum(['daily', 'weekly']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().min(1).max(30),
  targetDays: z.number().int().min(1).max(7)
})

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'habitforge-api', collections: 7 }))
app.get('/api/auth/demo', (_req, res) => {
  const token = jwt.sign({ sub: store.user.id, email: store.user.email }, jwtSecret, { expiresIn: '7d' })
  res.json({ token, user: store.user })
})
app.get('/api/me', protectedRoute, (_req, res) => res.json(store.getUser()))
app.get('/api/habits', protectedRoute, (_req, res) => res.json(store.getHabits().filter((habit) => habit.userId === res.locals.userId)))
app.post('/api/habits', protectedRoute, (req, res) => {
  const parsed = habitSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid habit', details: parsed.error.flatten() })
  const habit = { ...parsed.data, id: `habit-${Date.now()}`, userId: res.locals.userId as string, completedDates: [], createdAt: new Date().toISOString() }
  store.addHabit(habit)
  res.status(201).json(habit)
})
app.patch('/api/habits/:id', protectedRoute, (req, res) => {
  const habit = ownedHabit(req, res)
  if (!habit) return
  const parsed = habitSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid habit', details: parsed.error.flatten() })
  res.json(store.updateHabit(habit.id, parsed.data))
})
app.delete('/api/habits/:id', protectedRoute, (req, res) => {
  const habit = ownedHabit(req, res)
  if (!habit) return
  store.deleteHabit(habit.id)
  res.status(204).end()
})
app.post('/api/habits/:id/complete', protectedRoute, (req, res) => {
  const schema = z.object({ periodKey: z.string().regex(/^(\d{4}-\d{2}-\d{2}|week:\d{4}-\d{2}-\d{2})$/) })
  const parsed = schema.safeParse(req.body)
  const habit = ownedHabit(req, res)
  if (!habit || !parsed.success) return res.status(400).json({ error: 'Invalid completion' })
  const alreadyCompleted = habit.completedDates.includes(parsed.data.periodKey)
  if (!alreadyCompleted) habit.completedDates.push(parsed.data.periodKey)
  res.json({ habit, xpAwarded: alreadyCompleted ? 0 : 25, duplicate: alreadyCompleted })
})
app.get('/api/analytics', protectedRoute, (_req, res) => res.json({ userId: res.locals.userId, habits: store.getHabits().filter((habit) => habit.userId === res.locals.userId), generatedAt: new Date().toISOString() }))
app.get('/api/export.csv', protectedRoute, (_req, res) => {
  if (store.user.plan !== 'premium') return res.status(403).json({ error: 'Premium plan required' })
  const rows = ['Habit,Category,Frequency,Date,XP earned']
  store.getHabits().filter((habit) => habit.userId === res.locals.userId).forEach((habit) => habit.completedDates.forEach((date) => rows.push([habit.name, habit.category, habit.frequency, date, '25'].map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))))
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=habitforge-export.csv')
  res.send(rows.join('\n'))
})
app.get('/api/subscription', protectedRoute, (_req, res) => res.json({ plan: store.user.plan, status: 'active', checkoutReady: Boolean(process.env.STRIPE_SECRET_KEY) }))

const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    return res.sendFile(path.join(distPath, 'index.html'))
  })
}

export default app

if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', () => console.log(`HabitForge API listening on ${port}`))
}
