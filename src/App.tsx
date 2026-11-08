import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowUpRight, Award, BarChart3, Bell, BookOpen, Brain, CalendarDays, Check, ChevronRight,
  CircleHelp, Clock3, Download, Dumbbell, Flame, Gauge, GitBranch, Globe2, LayoutDashboard,
  LockKeyhole, LogOut, Menu, Moon, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Settings2, ShieldCheck,
  Sparkles, Sprout, Sun, Target, Trash2, TreePine, TrendingUp, Trophy, UserRound, WalletCards, X, Zap
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { seedUser, createSeedSnapshot } from './data/seed'
import { achievements, buildActivity, levelForXp, levelProgress, totalCompletions, xpRangeForLevel, XP_PER_COMPLETION, unlockedAchievementIds } from './lib/gamification'
import { addDays, currentPeriodKeys, dateKey, formatLongDate, formatShortDate, getHabitStreak, getLastNDays, isCompletedThisPeriod, startOfWeekKey, weekPeriodKey } from './lib/date'
import { downloadHabitCsv } from './lib/export'
import type { AppSnapshot, Challenge21, Habit, HabitDraft, Plan, User } from './types'
import GrowthTree from './components/GrowthTree'
import './styles.css'
import './reference-theme.css'

const iconMap: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  brain: Brain,
  book: BookOpen,
  calendar: CalendarDays,
  spark: Sparkles,
  flame: Flame,
  trophy: Trophy,
  bolt: Zap,
  target: Target,
  wallet: WalletCards
}

const colorOptions = ['#B7F36B', '#9B7DFF', '#FFB86B', '#65D4FF', '#FF7AD9', '#FF7A9D']
const iconOptions = ['dumbbell', 'brain', 'book', 'calendar', 'target', 'wallet']
const categoryOptions = ['Body', 'Focus', 'Mind', 'Systems', 'Money', 'Social']

const defaultDraft: HabitDraft = {
  name: '', description: '', category: 'Focus', frequency: 'daily', color: '#9B7DFF', icon: 'target', targetDays: 7
}

const apiRequest = async (path: string, init: RequestInit = {}) => {
  const token = window.localStorage.getItem('habitforge.token')
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(path, { ...init, headers })
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response
}

const loadSnapshot = (): AppSnapshot => {
  if (typeof window === 'undefined') return { ...createSeedSnapshot(), achievements, unlockedAchievementIds: [], activity: [] }
  try {
    const raw = window.localStorage.getItem('habitforge.snapshot')
    if (raw) {
      const parsed = JSON.parse(raw) as AppSnapshot
      const seeded = createSeedSnapshot()
      const migratedUser = parsed.user.name === 'Alex Morgan' ? seeded.user : { ...parsed.user, timezone: parsed.user.timezone === 'Asia/Calcutta' ? 'Asia/Kolkata' : parsed.user.timezone }
      return { ...parsed, user: migratedUser, challenge21: parsed.challenge21 ?? seeded.challenge21 }
    }
  } catch {
    // Seed state is the safe fallback for a corrupted local preview.
  }
  const base = createSeedSnapshot()
  return { ...base, achievements, unlockedAchievementIds: unlockedAchievementIds(base.user, base.habits), activity: buildActivity(base.habits) }
}

const challengeDayNumber = (challenge: Challenge21, today: string) => Math.max(1, Math.min(21, Math.floor((Date.parse(`${today}T12:00:00`) - Date.parse(`${challenge.startedAt}T12:00:00`)) / 86400000) + 1))

const challengeProgress = (challenge: Challenge21) => {
  const completed = challenge.tasks.reduce((sum, task) => sum + task.completedDays.length, 0)
  return Math.round((completed / Math.max(1, challenge.tasks.length * 21)) * 100)
}

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.closePath()
}

const downloadGrindStatus = (user: User, snapshot: AppSnapshot) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const context = canvas.getContext('2d')
  if (!context) return
  const gradient = context.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#f43f5e')
  gradient.addColorStop(.48, '#e11d48')
  gradient.addColorStop(1, '#be123c')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(183,243,107,.16)'
  context.beginPath(); context.arc(930, 170, 220, 0, Math.PI * 2); context.fill()
  context.fillStyle = 'rgba(255,255,255,.08)'
  context.beginPath(); context.arc(115, 1180, 300, 0, Math.PI * 2); context.fill()
  context.fillStyle = '#ffffff'
  context.font = '800 28px Inter, sans-serif'
  context.letterSpacing = '6px'
  context.fillText('HABITFORGE', 72, 92)
  context.font = '700 18px Inter, sans-serif'
  context.fillStyle = 'rgba(255,255,255,.68)'
  context.fillText('GRIND STATUS / 21-DAY GROWTH', 72, 132)
  const image = new Image()
  const drawContent = () => {
    const frameX = 150
    const frameY = 190
    const frameWidth = 780
    // Keep the export frame aligned with the live 250:300 portrait frame.
    const frameHeight = 936
    const frameRadius = 58
    if (user.grindPhoto) {
      const crop = user.grindPhotoCrop ?? { scale: 1, x: 0, y: 0 }
      context.save()
      roundedRect(context, frameX, frameY, frameWidth, frameHeight, frameRadius)
      context.clip()
      const scale = Math.max(frameWidth / image.width, frameHeight / image.height) * crop.scale
      const width = image.width * scale
      const height = image.height * scale
      context.drawImage(image, frameX + frameWidth / 2 - width / 2 + (crop.x / 100) * frameWidth, frameY + frameHeight / 2 - height / 2 + (crop.y / 100) * frameHeight, width, height)
      const overlay = context.createLinearGradient(0, frameY + frameHeight * .4, 0, frameY + frameHeight)
      overlay.addColorStop(0, 'rgba(8,11,37,0)')
      overlay.addColorStop(.58, 'rgba(8,11,37,.72)')
      overlay.addColorStop(1, 'rgba(8,11,37,.97)')
      context.fillStyle = overlay
      context.fillRect(frameX, frameY, frameWidth, frameHeight)
      context.restore()
    } else {
      context.fillStyle = '#b7f36b'
      roundedRect(context, frameX, frameY, frameWidth, frameHeight, frameRadius); context.fill()
      context.fillStyle = '#17202a'
      context.font = '900 86px Inter, sans-serif'
      context.textAlign = 'center'; context.fillText(user.initials, frameX + frameWidth / 2, frameY + frameHeight / 2 + 28); context.textAlign = 'left'
    }
    context.strokeStyle = 'rgba(255,255,255,.68)'
    context.lineWidth = 6
    roundedRect(context, frameX, frameY, frameWidth, frameHeight, frameRadius); context.stroke()
    context.fillStyle = '#ffffff'
    context.font = '900 54px Inter, sans-serif'
    context.textAlign = 'center'; context.shadowColor = 'rgba(0,0,0,.55)'; context.shadowBlur = 10; context.fillText(user.name, frameX + frameWidth / 2, frameY + frameHeight - 82)
    context.fillStyle = 'rgba(255,255,255,.72)'
    context.font = '600 25px Inter, sans-serif'
    context.fillText('SHOWING UP, ONE DAY AT A TIME.', frameX + frameWidth / 2, frameY + frameHeight - 40)
    context.shadowColor = 'transparent'; context.shadowBlur = 0; context.textAlign = 'left'
    const streak = Math.max(0, ...snapshot.habits.map((habit) => getHabitStreak(habit.completedDates, habit.frequency, new Date(), user.timezone)))
    const growth = snapshot.challenge21 ? challengeProgress(snapshot.challenge21) : 0
    context.fillStyle = 'rgba(13,18,48,.42)'
    roundedRect(context, 72, 1190, 936, 250, 34); context.fill()
    context.fillStyle = '#b7f36b'; context.font = '900 72px Inter, sans-serif'; context.fillText(`${streak}`, 112, 1300)
    context.fillStyle = '#ffffff'; context.font = '800 23px Inter, sans-serif'; context.fillText('DAY STREAK', 112, 1340)
    context.fillStyle = '#ffffff'; context.font = '900 72px Inter, sans-serif'; context.fillText(`${growth}%`, 430, 1300)
    context.font = '800 23px Inter, sans-serif'; context.fillText('TREE GROWN', 430, 1340)
    context.fillStyle = '#ffffff'; context.font = '900 72px Inter, sans-serif'; context.fillText(`${user.level}`, 760, 1300)
    context.font = '800 23px Inter, sans-serif'; context.fillText('FORGE LEVEL', 760, 1340)
    context.fillStyle = 'rgba(255,255,255,.18)'; roundedRect(context, 72, 1490, 936, 18, 9); context.fill()
    context.fillStyle = '#b7f36b'; roundedRect(context, 72, 1490, 936 * Math.max(.04, growth / 100), 18, 9); context.fill()
    context.fillStyle = '#ffffff'; context.font = '800 28px Inter, sans-serif'; context.fillText('KEEP THE PROMISE SMALL.', 72, 1580)
    context.fillStyle = 'rgba(255,255,255,.68)'; context.font = '600 22px Inter, sans-serif'; context.fillText('Consistency compounds.', 72, 1620)
    context.fillStyle = 'rgba(255,255,255,.5)'; context.font = '600 18px Inter, sans-serif'; context.fillText('habitforge.app', 72, 1760)
    canvas.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-grind-status.png`; link.click(); URL.revokeObjectURL(url) }, 'image/png')
  }
  if (user.grindPhoto) { image.onload = drawContent; image.src = user.grindPhoto } else drawContent()
}

const iconFor = (name: string) => iconMap[name] ?? Target

function AmbientSpotlight() {
  return <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <div className="aurora aurora-one" />
    <div className="aurora aurora-two" />
    <div className="grain" />
  </div>
}

function IconBubble({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = iconFor(name)
  return <span className={`icon-bubble icon-bubble-${size}`} style={{ color, backgroundColor: `${color}16`, borderColor: `${color}30` }}><Icon size={size === 'lg' ? 22 : size === 'sm' ? 15 : 18} strokeWidth={1.8} /></span>
}

function ProgressRing({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  return <div className="relative flex h-32 w-32 items-center justify-center">
    <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
      <circle className="progress-ring-track" cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
      <motion.circle className="progress-ring-value" initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - (circumference * value) / 100 }} transition={{ duration: 0.9, ease: 'easeOut' }} cx="50" cy="50" r={radius} fill="none" stroke="#B7F36B" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} />
    </svg>
    <div className="absolute text-center"><p className="progress-ring-text font-mono text-2xl font-black text-white">{label}</p><p className="progress-ring-sub mt-0.5 text-[10px] uppercase tracking-[.18em] text-white/80">{sublabel}</p></div>
  </div>
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <motion.div initial={{ opacity: 0, y: 15, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15 }} className="toast fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-2xl">
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime/15 text-lime"><Check size={15} /></span><span>{message}</span><button onClick={onClose} className="ml-2 text-slate-500 hover:text-white"><X size={15} /></button>
  </motion.div>
}

function SearchPalette({ query, onQuery, snapshot, onClose, onNavigate }: { query: string; onQuery: (value: string) => void; snapshot?: AppSnapshot; onClose: () => void; onNavigate: (path: string) => void }) {
  const navigation = [
    { label: 'Overview', description: 'Your daily proof and momentum', path: '/dashboard' },
    { label: 'My habits', description: 'Create and check in on habits', path: '/habits' },
    { label: '21-day growth', description: 'Build your tree through consistency', path: '/21-days' },
    { label: 'Analytics', description: 'See your patterns over time', path: '/analytics' },
    { label: 'Profile', description: 'Your identity and progress', path: '/profile' }
  ]
  const habitResults = (snapshot?.habits ?? []).map((habit) => ({ label: habit.name, description: `${habit.category} · ${habit.frequency} habit`, path: '/habits' }))
  const results = [...navigation, ...habitResults].filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
  return <div className="modal-backdrop search-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><div className="search-palette" role="dialog" aria-modal="true" aria-labelledby="search-title"><div className="flex items-center gap-3 border-b border-white/[.08] px-4 py-3"><Search size={17} className="text-slate-500" /><input autoFocus value={query} onChange={(event) => onQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }} placeholder="Search habits and pages..." aria-label="Search habits and pages" /><kbd>Esc</kbd></div><div className="p-2"><p id="search-title" className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">Search results</p>{results.length ? results.map((item) => <button key={`${item.path}-${item.label}`} onClick={() => { onNavigate(item.path); onClose() }} className="search-result"><span className="search-result-icon"><ArrowUpRight size={15} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>) : <p className="px-3 py-6 text-center text-sm text-slate-500">No matching habits or pages.</p>}</div></div></div>
}

function NotificationPanel({ snapshot, onClose, onRead }: { snapshot?: AppSnapshot; onClose: () => void; onRead: () => void }) {
  const challenge = snapshot?.challenge21
  const today = snapshot ? dateKey(new Date(), snapshot.user.timezone) : dateKey()
  const challengeDone = challenge ? challenge.tasks.filter((task) => task.completedDays.includes(today)).length : 0
  const notifications = [
    { title: challengeDone === challenge?.tasks.length ? 'All growth tasks complete' : 'Your tree is waiting for today’s roots', detail: challenge ? `${challengeDone}/${challenge.tasks.length} 21-day tasks checked today.` : 'Open the growth module to begin.' },
    { title: 'Keep the streak alive', detail: 'A small check-in today keeps your momentum visible.' }
  ]
  return <div className="notification-panel" role="dialog" aria-label="Notifications"><div className="flex items-center justify-between border-b border-white/[.08] px-4 py-3"><div><p className="eyebrow">Inbox</p><h2 className="mt-1 text-sm font-bold text-white">Notifications</h2></div><button onClick={onClose} className="icon-button" aria-label="Close notifications"><X size={15} /></button></div><div className="p-2">{notifications.map((item) => <div key={item.title} className="notification-item"><span className="notification-dot" /><div><p className="text-xs font-bold text-slate-200">{item.title}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.detail}</p></div></div>)}</div><button onClick={onRead} className="w-full border-t border-white/[.08] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[.14em] text-lime hover:bg-white/[.03]">Mark all as read</button></div>
}

function Sidebar({ activePath, onNavigate, onLogout, user, collapsed, onToggle }: { activePath: string; onNavigate: (path: string) => void; onLogout: () => void; user: AppSnapshot['user']; collapsed: boolean; onToggle: () => void }) {
  const primary = [
    { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/habits', label: 'My habits', icon: Target },
    { path: '/21-days', label: '21-day growth', icon: TreePine },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 }
  ]
  const secondary = [
    { path: '/profile', label: 'Profile', icon: UserRound },
    { path: '/upgrade', label: 'Upgrade', icon: Zap }
  ]
  return <aside className={`sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/[.07] bg-[#0b0c10]/85 px-3.5 py-4 backdrop-blur-xl lg:flex ${collapsed ? 'w-[82px] sidebar-collapsed' : 'w-[236px]'}`}>
    <div className="sidebar-brand mb-8 flex items-center gap-3 px-2.5"><div className="brand-mark brand-logo"><img src="/Gradient%20Habit%20Tracker%20H%20Icon.avif" alt="HabitForge logo" /></div><div className="brand-copy"><p className="text-[13px] font-extrabold tracking-[.22em] text-white">HABITFORGE</p><p className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-slate-500">Consistency engine</p></div></div>
    <div className="sidebar-section-label mb-3 px-2.5 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace</div>
    <nav className="sidebar-nav space-y-2">
      {primary.map((item) => <NavItem key={item.path} item={item} activePath={activePath} onNavigate={onNavigate} collapsed={collapsed} />)}
    </nav>
    <div className="sidebar-section-label mb-3 mt-7 px-2.5 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Account</div>
    <nav className="sidebar-nav space-y-2">
      {secondary.map((item) => <NavItem key={item.path} item={item} activePath={activePath} onNavigate={onNavigate} collapsed={collapsed} />)}
    </nav>
    <div className="sidebar-footer mt-auto pt-6">
      <div className="level-panel mb-3 rounded-2xl border border-violet/20 bg-violet/[.07] p-3">
        <div className="mb-3 flex items-center justify-between"><span className="eyebrow text-violet">Current level</span><span className="font-mono text-xs text-violet">LVL {user.level}</span></div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-violet" style={{ width: `${levelProgress(user.xp)}%` }} /></div>
        <p className="text-[11px] leading-relaxed text-slate-500">{Math.round(levelProgress(user.xp))}% to level {user.level + 1}. Keep the streak alive.</p>
      </div>
      <button onClick={() => onNavigate('/profile')} className="profile-link flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[.05]"><span className="avatar" style={{ background: `linear-gradient(135deg, ${user.avatarColor}, #4e3b9b)` }}>{user.initials}</span><span className="profile-copy min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-200">{user.name}</span><span className="block text-[11px] text-slate-500">{user.plan === 'premium' ? 'Premium member' : 'Free member'}</span></span><ChevronRight size={15} className="profile-arrow text-slate-600" /></button>
      <button onClick={onLogout} className="logout-link mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-500 transition hover:bg-white/[.04] hover:text-slate-200"><LogOut size={14} /><span className="logout-label">Sign out</span></button>
      <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="sidebar-toggle mt-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[.08] p-2 text-xs text-slate-500 transition hover:bg-white/[.06] hover:text-white">
        {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /><span className="sidebar-toggle-label">Collapse sidebar</span></>}
      </button>
    </div>
  </aside>
}

function NavItem({ item, activePath, onNavigate, collapsed = false }: { item: { path: string; label: string; icon: LucideIcon }; activePath: string; onNavigate: (path: string) => void; collapsed?: boolean }) {
  const active = activePath === item.path || (activePath === '/' && item.path === '/dashboard')
  const Icon = item.icon
  return <button onClick={() => onNavigate(item.path)} title={collapsed ? item.label : undefined} className={`nav-item sidebar-nav-item group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm transition ${active ? 'nav-item-active text-white' : 'text-slate-500 hover:bg-white/[.04] hover:text-slate-200'}`}><Icon size={17} strokeWidth={active ? 2.3 : 1.8} /><span className="nav-label min-w-0 flex-1 truncate text-left">{item.label}</span>{item.path === '/analytics' && <span className="nav-pro ml-auto rounded-md border border-violet/25 bg-violet/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet">Pro</span>}</button>
}

function LegacyTopbar({ title, onTheme, dark, onMenu, onNavigate, user, collapsed }: { title: string; onTheme: () => void; dark: boolean; onMenu: () => void; onNavigate: (path: string) => void; user: AppSnapshot['user']; collapsed: boolean }) {
  return <header className={`topbar sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-white/[.06] bg-[#0b0c10]/70 px-5 backdrop-blur-xl sm:px-8 lg:px-10 ${collapsed ? 'lg:ml-[82px]' : 'lg:ml-[236px]'}`}><div className="flex items-center gap-3"><button onClick={onMenu} className="rounded-lg p-2 text-slate-400 hover:bg-white/[.05] lg:hidden"><Menu size={19} /></button><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace / {title}</p><h1 className="mt-1 text-base font-semibold tracking-[-.02em] text-white sm:text-lg">{title}</h1></div></div><div className="flex items-center gap-2 sm:gap-4"><button className="hidden items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2 text-xs text-slate-500 transition hover:border-white/[.14] hover:text-slate-300 md:flex"><Search size={14} /> <span>Search</span><span className="ml-3 font-mono text-[10px] text-slate-600">⌘ K</span></button><button onClick={onTheme} aria-label="Toggle theme" className="rounded-lg border border-white/[.08] p-2 text-slate-400 transition hover:border-white/[.16] hover:bg-white/[.04] hover:text-white">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><button className="relative rounded-lg border border-white/[.08] p-2 text-slate-400 transition hover:bg-white/[.04] hover:text-white"><Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-lime" /></button><button onClick={() => onNavigate('/profile')} className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${user.avatarColor}, #4e3b9b)` }}>{user.initials}</button></div></header>
}

function StaticTopbar({ title, onTheme, dark, onMenu, onNavigate, onSearch, onNotifications, user, collapsed }: { title: string; onTheme: () => void; dark: boolean; onMenu: () => void; onNavigate: (path: string) => void; onSearch: () => void; onNotifications: () => void; user: AppSnapshot['user']; collapsed: boolean }) {
  return <header className={`topbar sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-white/[.06] bg-[#0b0c10]/70 px-5 backdrop-blur-xl sm:px-8 lg:px-10 ${collapsed ? 'lg:ml-[82px]' : 'lg:ml-[236px]'}`}><div className="flex items-center gap-3"><button onClick={onMenu} aria-label="Open navigation menu" className="rounded-lg p-2 text-slate-400 hover:bg-white/[.05] lg:hidden"><Menu size={19} /></button><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace / {title}</p><h1 className="mt-1 text-base font-semibold tracking-[-.02em] text-white sm:text-lg">{title}</h1></div></div><div className="flex items-center gap-2 sm:gap-4"><button onClick={onSearch} aria-label="Search habits and pages" className="hidden items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2 text-xs text-slate-500 transition hover:border-white/[.14] hover:text-slate-300 md:flex"><Search size={14} /><span>Search</span><span className="ml-3 font-mono text-[10px] text-slate-600">⌘ K</span></button><button onClick={onTheme} aria-label="Toggle theme" className="rounded-lg border border-white/[.08] p-2 text-slate-400 transition hover:border-white/[.16] hover:bg-white/[.04] hover:text-white">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><button onClick={onNotifications} aria-label="Open notifications" className="relative rounded-lg border border-white/[.08] p-2 text-slate-400 transition hover:bg-white/[.04] hover:text-white"><Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-lime" /></button><button onClick={() => onNavigate('/profile')} aria-label={`Open profile for ${user.name}`} className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${user.avatarColor}, #4e3b9b)` }}>{user.initials}</button></div></header>
}

function Topbar({ title, onTheme, dark, onMenu, onNavigate, user, collapsed }: { title: string; onTheme: () => void; dark: boolean; onMenu: () => void; onNavigate: (path: string) => void; user: AppSnapshot['user']; collapsed: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const searchSnapshot = loadSnapshot()
  return <>
    <header className={`topbar sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-white/[.06] bg-[#0b0c10]/70 px-5 backdrop-blur-xl sm:px-8 lg:px-10 ${collapsed ? 'lg:ml-[82px]' : 'lg:ml-[236px]'}`}>
      <div className="flex items-center gap-3"><button onClick={onMenu} aria-label="Open navigation menu" className="rounded-lg p-2 text-slate-400 hover:bg-white/[.05] lg:hidden"><Menu size={19} /></button><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace / {title}</p><h1 className="mt-1 text-base font-semibold tracking-[-.02em] text-white sm:text-lg">{title}</h1></div></div>
      <div className="flex items-center gap-2 sm:gap-4"><button onClick={() => { setSearchOpen(true); setNotificationsOpen(false) }} aria-label="Search habits and pages" className="hidden items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2 text-xs text-slate-500 transition hover:border-white/[.14] hover:text-slate-300 md:flex"><Search size={14} /><span>Search</span><span className="ml-3 font-mono text-[10px] text-slate-600">⌘ K</span></button><button onClick={onTheme} aria-label="Toggle theme" className="rounded-lg border border-white/[.08] p-2 text-slate-400 transition hover:border-white/[.16] hover:bg-white/[.04] hover:text-white">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><button onClick={() => { setNotificationsOpen((value) => !value); setSearchOpen(false) }} aria-label="Open notifications" aria-expanded={notificationsOpen} className="relative rounded-lg border border-white/[.08] p-2 text-slate-400 transition hover:bg-white/[.04] hover:text-white"><Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-lime" /></button><button onClick={() => onNavigate('/profile')} aria-label={`Open profile for ${user.name}`} className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${user.avatarColor}, #4e3b9b)` }}>{user.initials}</button></div>
    </header>
    {searchOpen && <SearchPalette query={query} onQuery={setQuery} snapshot={searchSnapshot} onClose={() => { setSearchOpen(false); setQuery('') }} onNavigate={onNavigate} />}
    {notificationsOpen && <NotificationPanel snapshot={searchSnapshot} onClose={() => setNotificationsOpen(false)} onRead={() => setNotificationsOpen(false)} />}
  </>
}

function DashboardView({ snapshot, onNavigate, onToggle, onOpenCreate }: { snapshot: AppSnapshot; onNavigate: (path: string) => void; onToggle: (id: string) => void; onOpenCreate: () => void }) {
  const completed = snapshot.habits.filter((habit) => isCompletedThisPeriod(habit, new Date(), snapshot.user.timezone)).length
  const completionRate = Math.round((completed / Math.max(1, snapshot.habits.length)) * 100)
  const maxStreak = Math.max(0, ...snapshot.habits.map((habit) => getHabitStreak(habit.completedDates, habit.frequency, new Date(), snapshot.user.timezone)))
  const activity = buildActivity(snapshot.habits, new Date(), 12, snapshot.user.timezone)
  const weekly = activity.slice(-7)
  const recent = snapshot.achievements.filter((item) => snapshot.unlockedAchievementIds.includes(item.id)).slice(0, 3)
  return <div className="page-wrap">
    <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" /> {formatLongDate(new Date(), snapshot.user.timezone)}
        </div>
        <h2 className="display-title">Make today <span className="text-gradient">count.</span></h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
          You’re not chasing perfection. You’re stacking proof that you can trust yourself.
        </p>
      </div>
      <button onClick={onOpenCreate} className="button button-primary self-start md:self-end shrink-0">
        <Plus size={16} strokeWidth={2.5} /> Add a habit
      </button>
    </section>
    <section className="mb-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr] items-stretch">
      <div className="card hero-card group relative flex flex-col justify-between overflow-hidden p-6 sm:p-7">
        <div className="watermark-icon hero-watermark pointer-events-none absolute -bottom-6 -right-6 select-none">
          <Target size={180} strokeWidth={1.2} />
        </div>
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="hero-badge flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wider uppercase shadow-sm">
                Today&apos;s focus
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-white">Progress is a practice.</h3>
            <p className="mt-2.5 max-w-md text-sm sm:text-base font-medium leading-relaxed text-white/95">
              One clean check-in at a time. You’ve got <span className="font-bold text-lime underline decoration-lime/50">{snapshot.habits.length - completed} move{snapshot.habits.length - completed === 1 ? '' : 's'}</span> left in your loop.
            </p>
            {snapshot.challenge21 && <button onClick={() => onNavigate('/21-days')} className="overview-growth-link mt-5 flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-black/10 p-3 text-left transition hover:bg-black/20">
              <span className="overview-growth-icon"><TreePine size={19} strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[10px] font-extrabold uppercase tracking-[.16em] text-lime/80">21-day growth</span><span className="mt-0.5 block text-xs font-semibold text-white/90">Your tree is {challengeProgress(snapshot.challenge21)}% grown</span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-lime transition-all" style={{ width: `${challengeProgress(snapshot.challenge21)}%` }} /></span></span>
              <ArrowUpRight size={15} className="shrink-0 text-lime" />
            </button>}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex -space-x-2">
                {snapshot.habits.slice(0, 4).map((habit) => (
                  <span key={habit.id} className="avatar avatar-xs border-2 border-white/30 shadow-sm" style={{ backgroundColor: `${habit.color}45`, color: '#ffffff' }}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                ))}
              </div>
              <span className="text-sm font-semibold text-white/90">
                <span className="font-mono font-bold text-white text-base">{completed}/{snapshot.habits.length}</span> habits checked in
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 sm:justify-end">
            <ProgressRing value={completionRate} label={`${completionRate}%`} sublabel="complete" />
            <div className="hidden min-w-[130px] sm:block">
              <p className="text-3xl font-black font-mono tracking-tight text-white">+{completed * XP_PER_COMPLETION}</p>
              <p className="eyebrow mt-1 text-xs font-bold uppercase tracking-wider text-emerald-100/90">XP earned today</p>
              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs sm:text-sm font-bold text-lime w-fit">
                <Zap size={14} fill="currentColor" /> Nice momentum
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card streak-card group relative flex flex-col justify-between overflow-hidden p-6 sm:p-7">
        <div className="watermark-icon streak-watermark pointer-events-none absolute -bottom-8 -right-6 select-none">
          <Flame size={170} strokeWidth={1.3} />
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <span className="streak-badge flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Flame size={14} className="animate-pulse" /> Current streak
          </span>
          <span className="metric-icon streak-icon-badge shadow-md">
            <Flame size={19} strokeWidth={2.4} />
          </span>
        </div>
        <div className="relative z-10 my-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight streak-number">
              {maxStreak}
            </span>
            <span className="text-xl sm:text-2xl font-black uppercase tracking-wider streak-unit">
              Days
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-bold uppercase tracking-widest streak-subtitle">
            Active Streak
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed streak-quote">
            Your longest active run<br />
            <span className="font-bold underline decoration-red-400/40">Keep the flame alive.</span>
          </p>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-red-500/15 pt-3.5 text-sm font-semibold streak-footer">
          <span className="streak-footer-label">Best this season</span>
          <div className="flex items-center gap-2"><button onClick={() => downloadGrindStatus(snapshot.user, snapshot)} aria-label="Download my Grind Status card" className="streak-share-button"><Download size={13} /> <span>Download card</span></button><span className="streak-best-badge font-mono font-bold text-sm px-2.5 py-0.5 rounded-md">21d</span></div>
        </div>
      </div>
    </section>

    <section className="mb-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr] items-stretch">
      <div className="card loop-card p-6 sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow text-xs font-bold uppercase tracking-widest">Your loop</p>
            <h3 className="mt-1 text-lg font-bold text-white">Today’s habits</h3>
          </div>
          <button onClick={() => onNavigate('/habits')} className="link-button text-sm font-semibold">View all <ArrowUpRight size={15} /></button>
        </div>
        <div className="space-y-2.5">
          {snapshot.habits.slice(0, 4).map((habit, index) => (
            <HabitRow key={habit.id} habit={habit} index={index} checked={isCompletedThisPeriod(habit, new Date(), snapshot.user.timezone)} timezone={snapshot.user.timezone} onToggle={onToggle} />
          ))}
        </div>
      </div>

      <div className="card momentum-card group relative flex flex-col justify-between overflow-hidden p-6 sm:p-7">
        <div className="watermark-icon momentum-watermark pointer-events-none absolute -bottom-8 -right-6 select-none">
          <TrendingUp size={170} strokeWidth={1.3} />
        </div>
        <div className="relative z-10 mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow text-xs font-bold uppercase tracking-widest">Momentum</p>
            <h3 className="mt-1 text-lg font-bold text-white">This week</h3>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-lime/10 px-3 py-1 text-xs font-bold text-lime border border-lime/20">
            <Activity size={14} /> +18% vs last week
          </span>
        </div>
        <div className="relative z-10 flex h-[170px] items-end gap-2 sm:gap-3">
          {weekly.map((point, index) => {
            const height = Math.max(12, Math.min(100, (point.completed / Math.max(1, snapshot.habits.length)) * 100))
            return (
              <div key={point.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <div className={`bar ${index === weekly.length - 1 ? 'bar-active' : ''}`} style={{ height: `${height}%` }}>
                    <span className="bar-tooltip">{point.completed} done</span>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold ${index === weekly.length - 1 ? 'text-white font-bold' : 'text-slate-500'}`}>{point.label}</span>
              </div>
            )
          })}
        </div>
        <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/[.08] pt-4">
          <div>
            <span className="font-mono text-2xl font-black text-white">{weekly.reduce((sum, item) => sum + item.completed, 0)}</span>
            <span className="ml-2 text-sm font-semibold text-slate-400">check-ins</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-black text-lime">+{weekly.reduce((sum, item) => sum + item.xp, 0)}</span>
            <span className="ml-2 text-sm font-semibold text-slate-400">XP</span>
          </div>
        </div>
      </div>
    </section>

    <section className="grid gap-5 grid-cols-1 md:grid-cols-3 items-stretch">
      <div className="card level-card group relative flex flex-col justify-between overflow-hidden p-6">
        <div className="watermark-icon level-watermark pointer-events-none absolute -bottom-6 -right-6 select-none">
          <Gauge size={150} strokeWidth={1.3} />
        </div>
        <div className="relative z-10 mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow text-xs font-bold uppercase tracking-widest text-violet">Forge level</p>
            <h3 className="mt-1 text-lg font-bold text-white">Level {snapshot.user.level}</h3>
          </div>
          <span className="metric-icon text-violet bg-violet/10 border border-violet/20">
            <Gauge size={19} />
          </span>
        </div>
        <div className="relative z-10 mb-3 flex items-end justify-between">
          <span className="font-mono text-3xl font-black text-white">{snapshot.user.xp.toLocaleString()} <span className="text-sm font-semibold text-slate-400">XP</span></span>
          <span className="font-mono text-xs font-bold text-slate-400">{xpRangeForLevel(snapshot.user.level).max.toLocaleString()} goal</span>
        </div>
        <div className="relative z-10 h-2.5 overflow-hidden rounded-full bg-white/[.08]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress(snapshot.user.xp)}%` }} className="h-full rounded-full bg-gradient-to-r from-violet to-[#c1aaff]" />
        </div>
        <p className="relative z-10 mt-3 text-xs sm:text-sm font-medium leading-relaxed text-slate-400">
          Every check-in adds <span className="font-bold text-lime">+{XP_PER_COMPLETION} XP</span>. Small actions, compounding returns.
        </p>
      </div>

      <div className="card unlocks-card group relative flex flex-col justify-between overflow-hidden p-6">
        <div className="watermark-icon unlocks-watermark pointer-events-none absolute -bottom-6 -right-6 select-none">
          <Award size={150} strokeWidth={1.3} />
        </div>
        <div className="relative z-10 mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow text-xs font-bold uppercase tracking-widest text-amber-500">Recent unlocks</p>
            <h3 className="mt-1 text-lg font-bold text-white">Proof collected</h3>
          </div>
          <button onClick={() => onNavigate('/profile')} aria-label="View all badges" className="text-slate-400 transition hover:text-white">
            <MoreHorizontal size={19} />
          </button>
        </div>
        <div className="relative z-10 space-y-3">
          {recent.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/[.03] p-2 transition hover:bg-white/[.06]">
              <IconBubble name={item.icon} color={item.color === 'lime' ? '#B7F36B' : item.color === 'orange' ? '#FFB86B' : '#9B7DFF'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs sm:text-sm font-bold text-slate-200">{item.title}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{item.requirement}</p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">Unlocked</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card milestone-card group relative flex flex-col justify-between overflow-hidden p-6">
        <div className="watermark-icon milestone-watermark pointer-events-none absolute -bottom-6 -right-6 select-none">
          <Trophy size={150} strokeWidth={1.3} />
        </div>
        <div className="relative z-10 mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow text-xs font-bold uppercase tracking-widest text-lime">Next milestone</p>
            <h3 className="mt-1 text-lg font-bold text-white">Century Club</h3>
          </div>
          <span className="metric-icon text-lime bg-lime/10 border border-lime/20">
            <Trophy size={19} />
          </span>
        </div>
        <p className="relative z-10 text-xs sm:text-sm font-medium leading-relaxed text-slate-400">
          You’re only <span className="font-mono text-base font-black text-white">{Math.max(0, 50 - totalCompletions(snapshot.habits))}</span> completions away from your next badge.
        </p>
        <div className="relative z-10 mt-5">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
            <span>Progress</span>
            <span className="font-mono text-lime">{Math.round(Math.min(100, (totalCompletions(snapshot.habits) / 50) * 100))}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[.08]">
            <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, (totalCompletions(snapshot.habits) / 50) * 100)}%` }} />
          </div>
        </div>
      </div>
    </section>
  </div>
}

function HabitRow({ habit, index, checked, timezone, onToggle }: { habit: Habit; index: number; checked: boolean; timezone: string; onToggle: (id: string) => void }) {
  return <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .045 }} className={`habit-row group flex items-center gap-3 rounded-xl border px-3 py-3 transition ${checked ? 'habit-row-done border-lime/20 bg-lime/[.045]' : 'border-white/[.055] bg-white/[.015] hover:border-white/[.12] hover:bg-white/[.03]'}`}><IconBubble name={habit.icon} color={habit.color} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className={`truncate text-sm font-medium ${checked ? 'text-slate-400 line-through decoration-lime/60' : 'text-slate-200'}`}>{habit.name}</p><span className="hidden rounded-md bg-white/[.05] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-600 sm:inline">{habit.category}</span></div><p className="mt-0.5 truncate text-[11px] text-slate-600">{habit.frequency === 'daily' ? 'Daily ritual' : 'Weekly reset'} · {getHabitStreak(habit.completedDates, habit.frequency, new Date(), timezone)} day streak</p></div><button onClick={() => onToggle(habit.id)} aria-label={`Mark ${habit.name} ${checked ? 'incomplete' : 'complete'}`} className={`check-button ${checked ? 'check-button-done' : ''}`}>{checked ? <Check size={15} strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-slate-700 transition group-hover:bg-slate-400" />}</button></motion.div>
}

function HabitsView({ snapshot, onToggle, onOpenCreate, onEdit, onDelete }: { snapshot: AppSnapshot; onToggle: (id: string) => void; onOpenCreate: () => void; onEdit: (habit: Habit) => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? snapshot.habits : snapshot.habits.filter((habit) => habit.category === filter)
  const categories = ['All', ...Array.from(new Set(snapshot.habits.map((habit) => habit.category)))]
  return (
    <div className="page-wrap">
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow text-violet">Your system</p>
          <h2 className="page-title">Habits that hold.</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">Build a small set of rituals you can return to, even on the messy days.</p>
        </div>
        <button onClick={onOpenCreate} className="button button-primary self-start md:self-auto"><Plus size={16} /> New habit</button>
      </section>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={`filter-pill ${filter === category ? 'filter-pill-active' : ''}`}>{category}</button>)}
        <span className="ml-auto hidden items-center gap-2 text-xs text-slate-600 sm:flex"><ShieldCheck size={14} className="text-lime" /> Protected by your daily loop</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((habit, index) => (
          <motion.div layout key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className="card habit-card group p-5">
            <div className="flex items-start gap-4">
              <IconBubble name={habit.icon} color={habit.color} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{habit.name}</h3>
                      <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.15em]" style={{ color: habit.color, backgroundColor: `${habit.color}14` }}>{habit.category}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">{habit.description}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => onEdit(habit)} className="icon-button"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(habit.id)} className="icon-button text-rose-300/60 hover:text-rose-300"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="mini-stat"><span>Cadence</span><strong>{habit.frequency}</strong></div>
                  <div className="mini-stat"><span>Streak</span><strong>{getHabitStreak(habit.completedDates, habit.frequency, new Date(), snapshot.user.timezone)}d</strong></div>
                  <div className="mini-stat"><span>Done</span><strong>{habit.completedDates.length}</strong></div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-white/[.06] pt-4">
                  <span className="flex items-center gap-2 text-[11px] text-slate-500"><Clock3 size={13} /> {habit.frequency === 'daily' ? 'Resets every day' : 'Resets every Monday'}</span>
                  <button onClick={() => onToggle(habit.id)} className={`button button-small ${isCompletedThisPeriod(habit, new Date(), snapshot.user.timezone) ? 'button-success' : 'button-ghost'}`}>
                    {isCompletedThisPeriod(habit, new Date(), snapshot.user.timezone) ? <><Check size={14} /> Checked in</> : <>Check in <ArrowUpRight size={13} /></>}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        <button onClick={onOpenCreate} className="empty-add card flex min-h-[230px] items-center justify-center border-dashed p-6 text-center">
          <div>
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-violet/40 text-violet"><Plus size={18} /></span>
            <p className="text-sm font-medium text-slate-300">Forge another habit</p>
            <p className="mt-1 text-xs text-slate-600">Make the next good choice easier.</p>
          </div>
        </button>
      </div>
    </div>
  )
}

function ChallengeView({ snapshot, onSave, onToggle, onRestart }: { snapshot: AppSnapshot; onSave: (challenge: Challenge21) => void; onToggle: (taskId: string, day: string) => void; onRestart: () => void }) {
  const challenge = snapshot.challenge21!
  const today = dateKey(new Date(), snapshot.user.timezone)
  const currentDay = challengeDayNumber(challenge, today)
  const progress = challengeProgress(challenge)
  const dayKeys = Array.from({ length: 21 }, (_, index) => dateKey(addDays(challenge.startedAt, index), snapshot.user.timezone))
  const todayDone = challenge.tasks.filter((task) => task.completedDays.includes(today)).length
  const [editing, setEditing] = useState(false)
  const [previewFull, setPreviewFull] = useState(false)
  const [draft, setDraft] = useState<Challenge21>(challenge)

  useEffect(() => setDraft(challenge), [challenge])

  const addTask = () => setDraft((value) => ({ ...value, tasks: [...value.tasks, { id: `challenge-task-${Date.now()}`, title: 'New daily task', description: 'Make it specific and easy to return to.', color: colorOptions[value.tasks.length % colorOptions.length], icon: 'target', completedDays: [] }] }))
  const updateTask = (id: string, key: 'title' | 'description', value: string) => setDraft((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, [key]: value } : task) }))
  const removeTask = (id: string) => setDraft((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }))
  const treeStage = progress >= 82 ? 4 : progress >= 58 ? 3 : progress >= 30 ? 2 : progress > 0 ? 1 : 0
  const displayedProgress = previewFull ? 100 : progress
  const displayedTreeStage = previewFull ? 4 : treeStage
  const treeLabels = ['A seed waiting for your first check-in.', 'The first roots are taking hold.', 'A young tree is finding its shape.', 'Your consistency is becoming visible.', 'A full canopy — you kept showing up.']

  return <div className="page-wrap">
    <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="eyebrow text-lime">21-day growth module</p>
        <h2 className="page-title">Grow what you repeat.</h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">Choose a few daily tasks, lock in for 21 days, and watch a living progress tree respond to your consistency.</p>
      </div>
      <div className="challenge-actions flex gap-2 self-start md:self-auto">
        <button onClick={() => setPreviewFull((value) => !value)} className="button button-ghost"><TreePine size={14} />{previewFull ? 'Show current tree' : 'Preview full tree'}</button>
        <button onClick={() => setEditing((value) => !value)} className="button button-ghost">{editing ? 'Close editor' : 'Edit plan'} <Pencil size={14} /></button>
        <button onClick={onRestart} className="button button-primary"><Sprout size={15} /> Start over</button>
      </div>
    </section>

    <section className="mb-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <div className={`card challenge-tree-card overflow-hidden p-6 sm:p-8 ${previewFull ? 'challenge-tree-preview' : ''}`}>
        <div className="relative z-10 flex items-start justify-between gap-4"><div><p className="eyebrow text-lime">Your living proof</p><h3 className="mt-1 text-2xl font-bold text-white">{challenge.title}</h3></div><span className="challenge-day-badge">Day {currentDay}<span>/21</span></span></div>
        <GrowthTree progress={displayedProgress} stage={displayedTreeStage} />
        <div className="relative z-10 mt-2"><div className="mb-2 flex items-center justify-between text-xs font-semibold"><span className="text-slate-400">{previewFull ? 'Full canopy preview — keep showing up to grow it for real.' : treeLabels[treeStage]}</span><span className="font-mono text-lime">{previewFull ? '100% preview' : `${progress}% grown`}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${displayedProgress}%` }} /></div><p className="mt-3 text-xs leading-relaxed text-slate-500">{todayDone} of {challenge.tasks.length} tasks checked today. Every completed day adds another ring to the tree.</p></div>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Today’s roots</p><h3 className="mt-1 text-xl font-bold text-white">Keep the promise small.</h3></div><span className="text-xs font-semibold text-slate-500">{todayDone}/{challenge.tasks.length} complete</span></div>
        <div className="space-y-3">{challenge.tasks.map((task) => { const checked = task.completedDays.includes(today); return <button key={task.id} onClick={() => onToggle(task.id, today)} className={`challenge-task ${checked ? 'challenge-task-done' : ''}`}><IconBubble name={task.icon} color={task.color} size="sm" /><span className="min-w-0 flex-1 text-left"><strong>{task.title}</strong><small>{task.description}</small></span><span className={`challenge-check ${checked ? 'challenge-check-done' : ''}`}>{checked ? <Check size={15} strokeWidth={3} /> : null}</span></button> })}</div>
        <div className="mt-6 grid grid-cols-7 gap-1.5">{dayKeys.map((day, index) => { const count = challenge.tasks.filter((task) => task.completedDays.includes(day)).length; const complete = count === challenge.tasks.length && challenge.tasks.length > 0; return <div key={day} title={`Day ${index + 1}: ${count}/${challenge.tasks.length}`} className={`challenge-day-cell ${complete ? 'challenge-day-complete' : count ? 'challenge-day-partial' : ''} ${index + 1 === currentDay ? 'challenge-day-current' : ''}`}><span>{index + 1}</span></div> })}</div>
        <p className="mt-3 text-[10px] uppercase tracking-[.14em] text-slate-600">Your 21-day map · finish by {formatShortDate(dayKeys[20])}</p>
      </div>
    </section>

    {editing && <section className="card mb-5 p-6 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow text-violet">Plan builder</p><h3 className="mt-1 text-xl font-bold text-white">Set the tasks you want to grow.</h3></div><button onClick={addTask} className="button button-ghost"><Plus size={14} /> Add task</button></div><label className="field mb-5"><span>Challenge name</span><input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} /></label><div className="grid gap-3 md:grid-cols-2">{draft.tasks.map((task) => <div key={task.id} className="challenge-editor-row"><div className="flex items-center gap-3"><IconBubble name={task.icon} color={task.color} size="sm" /><div className="min-w-0 flex-1"><input value={task.title} onChange={(event) => updateTask(task.id, 'title', event.target.value)} aria-label="Task name" /><input value={task.description} onChange={(event) => updateTask(task.id, 'description', event.target.value)} aria-label="Task description" /></div><button onClick={() => removeTask(task.id)} aria-label={`Remove ${task.title}`} className="icon-button"><Trash2 size={14} /></button></div></div>)}</div><div className="mt-6 flex justify-end"><button onClick={() => { onSave({ ...draft, title: draft.title.trim() || 'My 21-day growth plan', tasks: draft.tasks.filter((task) => task.title.trim()) }); setEditing(false) }} className="button button-primary"><Check size={14} /> Save plan</button></div></section>}
  </div>
}

function Heatmap({ habits, locked, onUpgrade }: { habits: Habit[]; locked: boolean; onUpgrade: () => void }) {
  const days = getLastNDays(91)
  const values = days.map((day) => ({ day, count: habits.filter((habit) => habit.completedDates.includes(day)).length }))
  const max = Math.max(1, ...values.map((item) => item.count))
  return <div className="card relative overflow-hidden p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Activity map</p><h3 className="mt-1 text-base font-semibold text-white">Your consistency field</h3></div><span className="text-xs text-slate-600">Last 13 weeks</span></div><div className={`${locked ? 'blur-[5px] opacity-55' : ''} grid grid-flow-col grid-rows-7 gap-1.5 overflow-hidden`}>{values.map(({ day, count }) => <div key={day} title={`${count} check-ins on ${day}`} className="heat-cell" style={{ backgroundColor: count === 0 ? 'rgba(255,255,255,.055)' : `rgba(183,243,107,${.18 + (count / max) * .82})` }} />)}</div><div className="mt-4 flex items-center justify-between text-[10px] text-slate-600"><span>Less</span><div className="flex gap-1.5"><i className="heat-cell" style={{ backgroundColor: 'rgba(255,255,255,.055)' }} /><i className="heat-cell" style={{ backgroundColor: 'rgba(183,243,107,.35)' }} /><i className="heat-cell" style={{ backgroundColor: 'rgba(183,243,107,.62)' }} /><i className="heat-cell" style={{ backgroundColor: 'rgba(183,243,107,1)' }} /></div><span>More</span></div>{locked && <div className="absolute inset-0 flex items-center justify-center"><div className="heatmap-lock mx-5 rounded-2xl border border-violet/25 bg-[#14151e]/95 p-5 text-center shadow-2xl"><span className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-violet/15 text-violet"><LockKeyhole size={16} /></span><p className="text-sm font-semibold text-white">Advanced analytics are Premium</p><p className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">See the full shape of your consistency across 90 days.</p><button onClick={onUpgrade} className="button button-small button-primary mt-4">Unlock your field <ArrowUpRight size={13} /></button></div></div>}</div>
}

function AnalyticsView({ snapshot, onNavigate, onExport }: { snapshot: AppSnapshot; onNavigate: (path: string) => void; onExport: () => void }) {
  const [range, setRange] = useState<'7D' | '30D' | '90D'>('30D')
  const rangeDays = range === '7D' ? 7 : range === '90D' ? 90 : 30
  const activity = buildActivity(snapshot.habits, new Date(), rangeDays, snapshot.user.timezone)
  const previousActivity = buildActivity(snapshot.habits, addDays(new Date(), -rangeDays), rangeDays, snapshot.user.timezone)
  const expectedPeriods = snapshot.habits.reduce((sum, habit) => sum + (habit.frequency === 'daily' ? rangeDays : Math.ceil(rangeDays / 7)), 0)
  const completionRate = Math.min(100, Math.round((activity.reduce((sum, item) => sum + item.completed, 0) / Math.max(1, expectedPeriods)) * 100))
  const previousRate = Math.min(100, Math.round((previousActivity.reduce((sum, item) => sum + item.completed, 0) / Math.max(1, expectedPeriods)) * 100))
  const delta = completionRate - previousRate
  const recentKeys = new Set(getLastNDays(rangeDays, new Date(), snapshot.user.timezone))
  const habitStats = snapshot.habits.map((habit) => {
    const completions = habit.completedDates.filter((value) => recentKeys.has(value)).length
    const denominator = habit.frequency === 'daily' ? rangeDays : Math.ceil(rangeDays / 7)
    return { ...habit, completions, streak: getHabitStreak(habit.completedDates, habit.frequency, new Date(), snapshot.user.timezone), rate: Math.min(100, Math.round((completions / Math.max(1, denominator)) * 100)) }
  })
  return <div className="page-wrap"><section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow text-violet">Signal over noise</p><h2 className="page-title">See your pattern.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">Consistency looks ordinary up close. Step back and the shape becomes undeniable.</p></div><div className="flex flex-wrap gap-2 self-start md:self-auto"><div className="segmented">{(['7D', '30D', '90D'] as const).map((item) => <button key={item} onClick={() => setRange(item)} className={range === item ? 'active' : ''}>{item}</button>)}</div><button onClick={onExport} className="button button-ghost"><Download size={15} /> Export CSV</button></div></section><div className="mb-5 grid gap-4 md:grid-cols-3"><div className="card p-5"><span className="eyebrow">Completion rate</span><div className="mt-4 flex items-end gap-2"><span className="stat-value">{completionRate}%</span><span className={`mb-1 text-xs ${delta >= 0 ? 'text-lime' : 'text-rose-300'}`}>{delta >= 0 ? '+' : ''}{delta}%</span></div><p className="mt-2 text-xs text-slate-600">vs previous {range.toLowerCase()} period</p></div><div className="card p-5"><span className="eyebrow">Total check-ins</span><div className="mt-4 flex items-end gap-2"><span className="stat-value">{totalCompletions(snapshot.habits)}</span><span className="mb-1 text-xs text-slate-500">all time</span></div><p className="mt-2 text-xs text-slate-600">Across {snapshot.habits.length} active habits</p></div><div className="card p-5"><span className="eyebrow">XP velocity</span><div className="mt-4 flex items-end gap-2"><span className="stat-value text-lime">+{activity.reduce((sum, item) => sum + item.xp, 0)}</span><span className="mb-1 text-xs text-slate-500">90d</span></div><p className="mt-2 text-xs text-slate-600">Your most valuable habit is consistency</p></div></div><div className="mb-5 grid gap-4 xl:grid-cols-[1.15fr_.85fr]"><Heatmap habits={snapshot.habits} locked={snapshot.user.plan === 'free'} onUpgrade={() => onNavigate('/upgrade')} /><div className="card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Habit performance</p><h3 className="mt-1 text-base font-semibold text-white">What’s carrying you</h3></div><span className="text-xs text-slate-600">Rate</span></div><div className="space-y-4">{habitStats.map((habit) => <div key={habit.id}><div className="mb-2 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: habit.color }} /><span className="truncate text-xs text-slate-300">{habit.name}</span></div><span className="font-mono text-xs text-slate-500">{Math.min(100, habit.rate)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, habit.rate)}%`, backgroundColor: habit.color }} /></div></div>)}</div></div></div><div className="card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Completion trend</p><h3 className="mt-1 text-base font-semibold text-white">The last {rangeDays} days</h3></div><span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-violet" /> completed</span></div><div className="h-[250px] w-full"><ResponsiveLineChart data={activity} /></div></div></div>
}

function ResponsiveLineChart({ data }: { data: ReturnType<typeof buildActivity> }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 2, left: -24, bottom: 0 }}><defs><linearGradient id="violetFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9B7DFF" stopOpacity={0.35} /><stop offset="100%" stopColor="#9B7DFF" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#5d6474', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#5d6474', fontSize: 10 }} allowDecimals={false} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="completed" stroke="#9B7DFF" strokeWidth={2.2} fill="url(#violetFill)" dot={{ r: 3, fill: '#9B7DFF', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#B7F36B', stroke: '#0b0c10', strokeWidth: 3 }} /></AreaChart></ResponsiveContainer>
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-white/[.1] bg-[#151720] px-3 py-2 shadow-xl"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 font-mono text-sm text-white">{payload[0].value} <span className="font-sans text-[10px] text-slate-500">check-ins</span></p></div>
}

function GrindStatusCard({ user, snapshot, onDownload }: { user: User; snapshot: AppSnapshot; onDownload: () => void }) {
  const streak = Math.max(0, ...snapshot.habits.map((habit) => getHabitStreak(habit.completedDates, habit.frequency, new Date(), user.timezone)))
  const growth = snapshot.challenge21 ? challengeProgress(snapshot.challenge21) : 0
  return <div className="grind-status-preview">
    <div className="grind-status-glow grind-status-glow-one" /><div className="grind-status-glow grind-status-glow-two" />
    <div className="relative z-10 flex items-center justify-between"><span className="grind-status-brand">HABITFORGE</span><span className="grind-status-kicker">GRIND STATUS</span></div>
    <div className="grind-status-photo-wrap">{user.grindPhoto ? <img src={user.grindPhoto} alt={`${user.name}'s uploaded grind status portrait`} style={{ objectPosition: `${50 + (user.grindPhotoCrop?.x ?? 0)}% ${50 + (user.grindPhotoCrop?.y ?? 0)}%`, transform: `scale(${user.grindPhotoCrop?.scale ?? 1})` }} /> : <span>{user.initials}</span>}<div className="grind-status-photo-overlay"><h3>{user.name}</h3><p className="grind-status-tagline">SHOWING UP, ONE DAY AT A TIME.</p></div></div>
    <div className="grind-status-stats"><div><strong>{streak}</strong><span>DAY STREAK</span></div><div><strong>{growth}%</strong><span>TREE GROWN</span></div><div><strong>{user.level}</strong><span>FORGE LEVEL</span></div></div>
    <div className="grind-status-progress"><span style={{ width: `${Math.max(4, growth)}%` }} /></div><p className="grind-status-quote">KEEP THE PROMISE SMALL.</p><p className="grind-status-footer">Consistency compounds.</p>
    <button onClick={onDownload} className="button button-primary grind-status-download"><Download size={15} /> Download share card</button>
  </div>
}

function ProfileView({ snapshot, onNavigate, onLogout }: { snapshot: AppSnapshot; onNavigate: (path: string) => void; onLogout: () => void }) {
  const unlocked = achievements.filter((achievement) => snapshot.unlockedAchievementIds.includes(achievement.id))
  const locked = achievements.filter((achievement) => !snapshot.unlockedAchievementIds.includes(achievement.id))
  const history = buildActivity(snapshot.habits, new Date(), 8, snapshot.user.timezone).slice().reverse()
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<User>(snapshot.user)
  const [photoError, setPhotoError] = useState('')
  useEffect(() => setProfileDraft(snapshot.user), [snapshot.user])
  const handleGrindPhoto = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('Please choose an image file.'); return }
    if (file.size > 1024 * 1024) { setPhotoError('Please choose an image below 1 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { const nextUser = { ...profileDraft, grindPhoto: String(reader.result) }; setProfileDraft(nextUser); window.dispatchEvent(new CustomEvent('habitforge:profile-save', { detail: nextUser })); setPhotoError('') }
    reader.readAsDataURL(file)
  }
  const updateGrindCrop = (key: 'scale' | 'x' | 'y', value: number) => {
    const nextUser = { ...profileDraft, grindPhotoCrop: { scale: profileDraft.grindPhotoCrop?.scale ?? 1, x: profileDraft.grindPhotoCrop?.x ?? 0, y: profileDraft.grindPhotoCrop?.y ?? 0, [key]: value } }
    setProfileDraft(nextUser)
    window.dispatchEvent(new CustomEvent('habitforge:profile-save', { detail: nextUser }))
  }
  return (
    <div className="page-wrap">
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="eyebrow text-violet">Your forge</p><h2 className="page-title">Profile & progress.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">A record of the promises you’ve kept — and the next ones worth making.</p></div>
        <div className="flex flex-wrap gap-2 self-start md:self-auto"><button onClick={() => setEditingProfile((value) => !value)} className="button button-ghost"><Pencil size={14} /> {editingProfile ? 'Close editor' : 'Edit profile'}</button><button onClick={onLogout} className="button button-ghost"><LogOut size={15} /> Sign out</button></div>
      </section>
      {editingProfile && <section className="card mb-5 p-6"><div className="mb-5"><p className="eyebrow text-violet">Identity settings</p><h3 className="mt-1 text-xl font-bold text-white">Keep your profile current.</h3></div><div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Name</span><input value={profileDraft.name} onChange={(event) => setProfileDraft((value) => ({ ...value, name: event.target.value }))} /></label><label className="field"><span>Email</span><input type="email" value={profileDraft.email} onChange={(event) => setProfileDraft((value) => ({ ...value, email: event.target.value }))} /></label><label className="field"><span>Timezone</span><input value={profileDraft.timezone} onChange={(event) => setProfileDraft((value) => ({ ...value, timezone: event.target.value }))} /></label><label className="field"><span>Avatar color</span><input type="color" value={profileDraft.avatarColor} onChange={(event) => setProfileDraft((value) => ({ ...value, avatarColor: event.target.value }))} /></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => { setProfileDraft(snapshot.user); setEditingProfile(false) }} className="button button-ghost">Cancel</button><button onClick={() => { const name = profileDraft.name.trim() || snapshot.user.name; window.dispatchEvent(new CustomEvent('habitforge:profile-save', { detail: { ...profileDraft, name, initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() } })); setEditingProfile(false) }} className="button button-primary"><Check size={14} /> Save profile</button></div></section>}
      <div className="mb-5 grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <div className="card overflow-hidden p-6">
          <div className="flex items-center gap-4"><div className="avatar avatar-xl" style={{ background: `linear-gradient(135deg, ${snapshot.user.avatarColor}, #4e3b9b)` }}>{snapshot.user.initials}</div><div><h3 className="text-xl font-semibold text-white">{snapshot.user.name}</h3><p className="mt-1 text-sm text-slate-500">{snapshot.user.email}</p><p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600"><Globe2 size={12} /> {snapshot.user.timezone}</p></div></div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/[.07] pt-5"><div><p className="font-mono text-xl text-white">{snapshot.user.level}</p><p className="eyebrow mt-1">Level</p></div><div><p className="font-mono text-xl text-lime">{snapshot.user.xp.toLocaleString()}</p><p className="eyebrow mt-1">Total XP</p></div><div><p className="font-mono text-xl text-white">{totalCompletions(snapshot.habits)}</p><p className="eyebrow mt-1">Check-ins</p></div></div>
        </div>
        <div className="card p-6"><div className="mb-5 flex items-start justify-between"><div><p className="eyebrow">Identity arc</p><h3 className="mt-1 text-base font-semibold text-white">Your consistency, in milestones.</h3></div><Target size={18} className="text-violet" /></div><div className="space-y-5"><Milestone label="Joined the forge" detail="Aug 08, 2026" progress={100} color="#9B7DFF" /><Milestone label="First 50 check-ins" detail={`${Math.min(100, Math.round((totalCompletions(snapshot.habits) / 50) * 100))}% complete`} progress={Math.min(100, Math.round((totalCompletions(snapshot.habits) / 50) * 100))} color="#B7F36B" /><Milestone label="Reach level 5" detail={`${Math.round(levelProgress(snapshot.user.xp))}% of the way there`} progress={levelProgress(snapshot.user.xp)} color="#65D4FF" /></div></div>
      </div>
      <section className="card grind-status-section mb-5 p-6 sm:p-8"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow text-violet">Share your momentum</p><h3 className="mt-1 text-2xl font-bold text-white">Your Grind Status.</h3><p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">Add a photo, make your progress visible, and share the proof you are building.</p></div><label className="button button-ghost cursor-pointer"><Plus size={14} /> {profileDraft.grindPhoto ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" className="sr-only" onChange={(event) => handleGrindPhoto(event.target.files?.[0])} /></label></div><div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,390px)_1fr]"><GrindStatusCard user={profileDraft} snapshot={snapshot} onDownload={() => downloadGrindStatus(profileDraft, snapshot)} /><div className="grind-status-help"><div className="grind-status-upload-note"><div className="grind-status-upload-icon"><UserRound size={19} /></div><div><h4>Add your image</h4><p>Use a portrait, workout photo, or anything that feels like your current chapter. The image stays in your local profile data and is used only for this share card.</p></div></div>{profileDraft.grindPhoto && <div className="grind-crop-controls"><div className="grind-crop-heading"><h4>Adjust your crop</h4><button onClick={() => { const nextUser = { ...profileDraft, grindPhotoCrop: { scale: 1, x: 0, y: 0 } }; setProfileDraft(nextUser); window.dispatchEvent(new CustomEvent('habitforge:profile-save', { detail: nextUser })) }} className="link-button">Reset crop</button></div><label><span>Zoom</span><input type="range" min="1" max="2.2" step=".05" value={profileDraft.grindPhotoCrop?.scale ?? 1} onChange={(event) => updateGrindCrop('scale', Number(event.target.value))} /></label><label><span>Horizontal position</span><input type="range" min="-25" max="25" step="1" value={profileDraft.grindPhotoCrop?.x ?? 0} onChange={(event) => updateGrindCrop('x', Number(event.target.value))} /></label><label><span>Vertical position</span><input type="range" min="-25" max="25" step="1" value={profileDraft.grindPhotoCrop?.y ?? 0} onChange={(event) => updateGrindCrop('y', Number(event.target.value))} /></label></div>}<p className="mt-4 text-xs font-semibold text-slate-500">Image requirements: JPG, PNG, WebP, or AVIF · maximum 1 MB.</p>{photoError && <p role="alert" className="mt-3 text-xs font-bold text-rose-400">{photoError}</p>}</div></div></section>
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Badge collection</p><h3 className="mt-1 text-base font-semibold text-white">Proof you can see</h3></div><span className="font-mono text-xs text-slate-500">{unlocked.length}/{achievements.length}</span></div><div className="grid gap-3 sm:grid-cols-2">{[...unlocked, ...locked].map((achievement) => { const isUnlocked = snapshot.unlockedAchievementIds.includes(achievement.id); const color = achievement.color === 'lime' ? '#B7F36B' : achievement.color === 'orange' ? '#FFB86B' : achievement.color === 'blue' ? '#65D4FF' : '#9B7DFF'; return <div key={achievement.id} className={`flex items-center gap-3 rounded-xl border p-3 ${isUnlocked ? 'border-white/[.08] bg-white/[.025]' : 'border-white/[.05] bg-white/[.012] opacity-45'}`}><IconBubble name={achievement.icon} color={color} size="sm" /><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-200">{achievement.title}</p><p className="mt-0.5 truncate text-[10px] text-slate-600">{isUnlocked ? achievement.description : achievement.requirement}</p></div>{isUnlocked && <Check size={14} className="text-lime" />}</div> })}</div></div>
        <div className="card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Plan</p><h3 className="mt-1 text-base font-semibold text-white">{snapshot.user.plan === 'premium' ? 'Premium' : 'Free tier'}</h3></div><WalletCards size={18} className={snapshot.user.plan === 'premium' ? 'text-lime' : 'text-violet'} /></div><p className="text-sm leading-relaxed text-slate-500">{snapshot.user.plan === 'premium' ? 'You’ve unlocked the full consistency field.' : 'The essentials are yours. Go deeper when you’re ready.'}</p><button onClick={() => onNavigate('/upgrade')} className="button button-ghost mt-5 w-full justify-center">Manage plan <ArrowUpRight size={14} /></button></div>
      </div>
      <div className="card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Activity history</p><h3 className="mt-1 text-base font-semibold text-white">Recent proof</h3></div><button onClick={() => onNavigate('/analytics')} className="link-button">Open analytics <ArrowUpRight size={14} /></button></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{history.map((point) => <div key={point.date} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.15em] text-slate-600">{formatShortDate(point.date)}</span><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: point.completed ? '#B7F36B' : '#4a505e' }} /></div><p className="mt-3 font-mono text-lg text-white">{point.completed}<span className="ml-1 font-sans text-[10px] text-slate-600">check-ins</span></p><p className="mt-1 text-[10px] text-slate-600">+{point.xp} XP earned</p></div>)}</div></div>
    </div>
  )
}

function Milestone({ label, detail, progress, color }: { label: string; detail: string; progress: number; color: string }) {
  return <div><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-300">{label}</span><span className="font-mono text-[10px] text-slate-600">{detail}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: color }} /></div></div>
}

function UpgradeView({ onBack, onToast }: { onBack: () => void; onToast: (message: string) => void }) {
  return <div className="page-wrap"><button onClick={onBack} className="mb-8 flex items-center gap-2 text-xs text-slate-500 transition hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to overview</button><div className="mx-auto max-w-4xl"><div className="mb-10 text-center"><span className="eyebrow text-lime">The full field</span><h2 className="display-title mt-3">More signal.<br /><span className="text-gradient">Less guessing.</span></h2><p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-500">Premium turns your habit history into a map you can actually use.</p></div><div className="grid gap-4 md:grid-cols-2"><div className="card p-6"><p className="eyebrow">Free</p><div className="mt-3 flex items-end gap-2"><span className="text-4xl font-semibold tracking-[-.06em] text-white">$0</span><span className="mb-1 text-xs text-slate-600">forever</span></div><p className="mt-3 text-sm text-slate-500">A strong daily loop, without the noise.</p><ul className="mt-7 space-y-3 text-sm text-slate-300">{['Unlimited daily check-ins', 'Core streaks & XP', 'Basic weekly momentum', '5 achievement badges'].map((item) => <li key={item} className="flex items-center gap-2"><Check size={15} className="text-lime" /> {item}</li>)}</ul><button className="button button-ghost mt-8 w-full justify-center" disabled>Current plan</button></div><div className="upgrade-card relative overflow-hidden p-6"><div className="absolute right-5 top-5 rounded-md bg-lime px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#151b0d]">Recommended</div><p className="eyebrow text-lime">Premium</p><div className="mt-3 flex items-end gap-2"><span className="text-4xl font-semibold tracking-[-.06em] text-white">$8</span><span className="mb-1 text-xs text-slate-500">/ month</span></div><p className="mt-3 text-sm text-slate-400">For people ready to see the compounding effect.</p><ul className="mt-7 space-y-3 text-sm text-slate-200">{['Everything in Free', '90-day activity heatmap', 'Habit performance insights', 'CSV exports & data ownership', 'Unlimited habit history'].map((item) => <li key={item} className="flex items-center gap-2"><Check size={15} className="text-lime" /> {item}</li>)}</ul><button onClick={() => onToast('Checkout is ready to connect — Stripe sandbox is the next step.')} className="button button-primary mt-8 w-full justify-center">Continue to checkout <ArrowUpRight size={14} /></button><p className="mt-3 text-center text-[10px] text-slate-600">Secure billing · Cancel anytime</p></div></div><div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-600"><ShieldCheck size={14} className="text-lime" /> Your habit data stays yours. Export it whenever you want.</div></div></div>
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  return <div className="login-page"><div className="login-orbit login-orbit-one" /><div className="login-orbit login-orbit-two" /><div className="relative z-10 w-full max-w-md px-5"><div className="mb-10 flex items-center justify-center gap-3"><div className="brand-mark brand-logo brand-logo-login"><img src="/Gradient%20Habit%20Tracker%20H%20Icon.avif" alt="HabitForge logo" /></div><p className="text-sm font-extrabold tracking-[.22em] text-white">HABITFORGE</p></div><div className="card p-7 sm:p-9"><div className="mb-8"><p className="eyebrow text-violet">Your next chapter</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-white">Build proof<br /><span className="text-gradient">you can trust.</span></h1><p className="mt-4 text-sm leading-relaxed text-slate-500">A quieter, more rewarding way to stay consistent.</p></div><button onClick={onLogin} className="button button-primary w-full justify-center py-3.5">Continue with demo <ArrowUpRight size={15} /></button><div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-white/[.07]" /><span className="text-[10px] uppercase tracking-[.18em] text-slate-700">Demo workspace</span><div className="h-px flex-1 bg-white/[.07]" /></div><button onClick={onLogin} className="button button-ghost w-full justify-center py-3.5">Enter as Sheetal Ingale</button><p className="mt-6 text-center text-[10px] leading-relaxed text-slate-600">By continuing, you agree to keep showing up for yourself. That’s the whole thing.</p></div><p className="mt-6 text-center text-xs text-slate-600">Private by default · Timezone aware · Built for momentum</p></div></div>
}

function HabitModal({ editing, onClose, onSave }: { editing: Habit | null; onClose: () => void; onSave: (draft: HabitDraft) => void }) {
  const [draft, setDraft] = useState<HabitDraft>(editing ? { name: editing.name, description: editing.description, category: editing.category, frequency: editing.frequency, color: editing.color, icon: editing.icon, targetDays: editing.targetDays } : defaultDraft)
  const update = (key: keyof HabitDraft, value: string | number) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => { event.preventDefault(); if (!draft.name.trim()) return; onSave(draft) }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><motion.div initial={{ opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="modal card w-full max-w-lg p-6 sm:p-7"><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow text-violet">{editing ? 'Edit ritual' : 'New ritual'}</p><h3 className="mt-1 text-xl font-semibold text-white">Make the next good choice easier.</h3></div><button onClick={onClose} className="icon-button"><X size={17} /></button></div><form onSubmit={submit} className="space-y-5"><label className="field"><span>Name</span><input autoFocus value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Drink water" /></label><label className="field"><span>Why it matters <em>optional</em></span><textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Give this habit a little gravity." rows={3} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Category</span><select value={draft.category} onChange={(event) => update('category', event.target.value)}>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="field"><span>Cadence</span><select value={draft.frequency} onChange={(event) => update('frequency', event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label></div><div><span className="mb-2 block text-xs font-medium text-slate-400">Choose a color</span><div className="flex gap-2">{colorOptions.map((color) => <button type="button" key={color} onClick={() => update('color', color)} className={`color-swatch ${draft.color === color ? 'color-swatch-active' : ''}`} style={{ backgroundColor: color }} aria-label={`Use ${color}`} />)}</div></div><div><span className="mb-2 block text-xs font-medium text-slate-400">Choose an icon</span><div className="flex gap-2">{iconOptions.map((option) => { const Icon = iconFor(option); return <button type="button" key={option} onClick={() => update('icon', option)} className={`icon-picker ${draft.icon === option ? 'icon-picker-active' : ''}`}><Icon size={17} /></button> })}</div></div><div className="flex items-center justify-end gap-3 border-t border-white/[.07] pt-5"><button type="button" onClick={onClose} className="button button-ghost">Cancel</button><button type="submit" className="button button-primary">{editing ? 'Save changes' : 'Forge habit'} <ArrowUpRight size={14} /></button></div></form></motion.div></div>
}

export default function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => loadSnapshot())
  const [activePath, setActivePath] = useState(() => window.location.pathname === '/' ? '/dashboard' : window.location.pathname)
  const [dark, setDark] = useState(() => window.localStorage.getItem('habitforge.theme.v2') === 'dark')
  const [session, setSession] = useState(() => window.localStorage.getItem('habitforge.session') !== 'signed-out')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem('habitforge.sidebar') === 'collapsed')

  useEffect(() => { document.documentElement.classList.toggle('light', !dark); window.localStorage.setItem('habitforge.theme.v2', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { window.localStorage.setItem('habitforge.snapshot', JSON.stringify(snapshot)) }, [snapshot])
  useEffect(() => { const onProfileSave = (event: Event) => { const user = (event as CustomEvent<User>).detail; setSnapshot((current) => ({ ...current, user })) ; setToast('Profile updated') }; window.addEventListener('habitforge:profile-save', onProfileSave); return () => window.removeEventListener('habitforge:profile-save', onProfileSave) }, [])
  useEffect(() => { if (session && !window.localStorage.getItem('habitforge.token')) { fetch('/api/auth/demo').then((response) => response.json()).then((data: { token: string }) => window.localStorage.setItem('habitforge.token', data.token)).catch(() => undefined) } }, [session])
  useEffect(() => { const onPop = () => setActivePath(window.location.pathname === '/' ? '/dashboard' : window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop) }, [])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => { window.localStorage.setItem('habitforge.sidebar', sidebarCollapsed ? 'collapsed' : 'expanded') }, [sidebarCollapsed])

  const navigate = (path: string) => { window.history.pushState({}, '', path); setActivePath(path); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const logout = () => { window.localStorage.setItem('habitforge.session', 'signed-out'); window.localStorage.removeItem('habitforge.token'); setSession(false); navigate('/login') }
  const login = async () => { try { const response = await fetch('/api/auth/demo'); const data = await response.json() as { token: string }; window.localStorage.setItem('habitforge.token', data.token) } catch { /* local preview remains usable when the API is unavailable */ } window.localStorage.setItem('habitforge.session', 'signed-in'); setSession(true); navigate('/dashboard') }

  const toggleHabit = (habitId: string) => {
    const target = snapshot.habits.find((habit) => habit.id === habitId)
    const now = new Date()
    const periodValue = target?.frequency === 'weekly' ? `week:${startOfWeekKey(now, snapshot.user.timezone)}` : dateKey(now, snapshot.user.timezone)
    if (target && !target.completedDates.includes(periodValue)) void apiRequest(`/api/habits/${habitId}/complete`, { method: 'POST', body: JSON.stringify({ periodKey: periodValue }) }).catch(() => undefined)
    setSnapshot((current) => {
      const habits = current.habits.map((habit) => {
        if (habit.id !== habitId) return habit
        const complete = habit.completedDates.includes(periodValue)
        return { ...habit, completedDates: complete ? habit.completedDates.filter((value) => value !== periodValue) : [...habit.completedDates, periodValue] }
      })
      const changedHabit = habits.find((habit) => habit.id === habitId)
      const completedNow = changedHabit ? isCompletedThisPeriod(changedHabit) : false
      const xp = Math.max(0, current.user.xp + (completedNow ? XP_PER_COMPLETION : -XP_PER_COMPLETION))
      const user = { ...current.user, xp, level: levelForXp(xp) }
      const unlocked = unlockedAchievementIds(user, habits)
      if (completedNow) setToast(`+${XP_PER_COMPLETION} XP · ${changedHabit?.name} checked in`)
      return { ...current, user, habits, unlockedAchievementIds: unlocked, activity: buildActivity(habits, now, 12, current.user.timezone), lastCheckIn: dateKey(now, current.user.timezone) }
    })
  }

  const saveHabit = (draft: HabitDraft) => {
    if (editing) void apiRequest(`/api/habits/${editing.id}`, { method: 'PATCH', body: JSON.stringify(draft) }).catch(() => undefined)
    else void apiRequest('/api/habits', { method: 'POST', body: JSON.stringify(draft) }).catch(() => undefined)
    setSnapshot((current) => {
      const habits = editing ? current.habits.map((habit) => habit.id === editing.id ? { ...habit, ...draft } : habit) : [...current.habits, { ...draft, id: `habit-${Date.now()}`, createdAt: dateKey(new Date(), current.user.timezone), completedDates: [] }]
      return { ...current, habits, activity: buildActivity(habits, new Date(), 12, current.user.timezone) }
    })
    setModalOpen(false); setEditing(null); setToast(editing ? 'Habit updated' : 'Habit forged · make it easy to return tomorrow')
  }

  const deleteHabit = (id: string) => { void apiRequest(`/api/habits/${id}`, { method: 'DELETE' }).catch(() => undefined); setSnapshot((current) => { const habits = current.habits.filter((habit) => habit.id !== id); return { ...current, habits, activity: buildActivity(habits, new Date(), 12, current.user.timezone) } }); setToast('Habit removed from your loop') }
  const saveChallenge = (challenge: Challenge21) => { setSnapshot((current) => ({ ...current, challenge21: challenge })); setToast('21-day plan saved') }
  const toggleChallengeTask = (taskId: string, day: string) => setSnapshot((current) => {
    if (!current.challenge21) return current
    const challenge21 = { ...current.challenge21, tasks: current.challenge21.tasks.map((task) => task.id === taskId ? { ...task, completedDays: task.completedDays.includes(day) ? task.completedDays.filter((value) => value !== day) : [...task.completedDays, day] } : task) }
    return { ...current, challenge21 }
  })
  const restartChallenge = () => setSnapshot((current) => current.challenge21 ? { ...current, challenge21: { ...current.challenge21, startedAt: dateKey(new Date(), current.user.timezone), tasks: current.challenge21.tasks.map((task) => ({ ...task, completedDays: [] })) } } : current)
  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (habit: Habit) => { setEditing(habit); setModalOpen(true) }
  const currentTitle = activePath === '/habits' ? 'My habits' : activePath === '/21-days' ? '21-day growth' : activePath === '/analytics' ? 'Analytics' : activePath === '/profile' ? 'Profile' : activePath === '/upgrade' ? 'Upgrade' : 'Overview'

  if (!session || activePath === '/login') return <><LoginView onLogin={login} /><AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast('')} />}</AnimatePresence></>

  return <div className="min-h-screen"><AmbientSpotlight /><Sidebar activePath={activePath} onNavigate={navigate} onLogout={logout} user={snapshot.user} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} /><Topbar title={currentTitle} onTheme={() => setDark((value) => !value)} dark={dark} onMenu={() => setMobileNav((value) => !value)} onNavigate={navigate} user={snapshot.user} collapsed={sidebarCollapsed} />{mobileNav && <div className="mobile-nav fixed inset-x-4 top-[82px] z-30 rounded-2xl border border-white/[.1] bg-[#12141b]/95 p-3 shadow-2xl backdrop-blur-xl lg:hidden"><NavItem item={{ path: '/dashboard', label: 'Overview', icon: LayoutDashboard }} activePath={activePath} onNavigate={navigate} /><NavItem item={{ path: '/habits', label: 'My habits', icon: Target }} activePath={activePath} onNavigate={navigate} /><NavItem item={{ path: '/21-days', label: '21-day growth', icon: TreePine }} activePath={activePath} onNavigate={navigate} /><NavItem item={{ path: '/analytics', label: 'Analytics', icon: BarChart3 }} activePath={activePath} onNavigate={navigate} /><NavItem item={{ path: '/profile', label: 'Profile', icon: UserRound }} activePath={activePath} onNavigate={navigate} /></div>}<main className={sidebarCollapsed ? 'lg:ml-[82px]' : 'lg:ml-[236px]'}>{activePath === '/habits' && <HabitsView snapshot={snapshot} onToggle={toggleHabit} onOpenCreate={openCreate} onEdit={openEdit} onDelete={deleteHabit} />}{activePath === '/21-days' && <ChallengeView snapshot={snapshot} onSave={saveChallenge} onToggle={toggleChallengeTask} onRestart={restartChallenge} />}{activePath === '/analytics' && <AnalyticsView snapshot={snapshot} onNavigate={navigate} onExport={() => snapshot.user.plan === 'premium' ? downloadHabitCsv(snapshot.habits) : (setToast('CSV export is a Premium feature'), navigate('/upgrade'))} />}{activePath === '/profile' && <ProfileView snapshot={snapshot} onNavigate={navigate} onLogout={logout} />}{activePath === '/upgrade' && <UpgradeView onBack={() => navigate('/dashboard')} onToast={setToast} />}{(activePath === '/dashboard' || activePath === '/') && <DashboardView snapshot={snapshot} onNavigate={navigate} onToggle={toggleHabit} onOpenCreate={openCreate} />}</main><AnimatePresence>{modalOpen && <HabitModal editing={editing} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={saveHabit} />}{toast && <Toast message={toast} onClose={() => setToast('')} />}</AnimatePresence></div>
}
