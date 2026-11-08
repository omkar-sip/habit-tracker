# HABITFORGE TODO

## Foundation and runtime
- [x] The project uses React, TypeScript, Vite, Tailwind CSS, Express, Framer Motion, Recharts, and Lucide React with a clean, reusable folder structure.
- [x] Environment variables are documented in `.env.example`; the app exposes a static `GET /manus-routes.json` manifest for all page routes.
- [x] The app has light/dark themes, responsive layouts, smooth animations, and a premium dark-charcoal/electric-violet/lime visual system.

## Authentication and account boundary
- [ ] Connect the production Manus OAuth callback exchange and replace the local demo token endpoint before go-live.
- [x] Authenticated user context includes identity, timezone, plan, XP, level, and profile statistics.

## Habit management and integrity
- [x] Users can create, edit, delete, categorize, and track daily and weekly habits with color/icon metadata.
- [x] Completion records are duplicate-safe and scoped to the authenticated user and habit at the API boundary.
- [x] Streak calculations handle daily and weekly frequencies using timezone-aware calendar keys and reset after missed periods.

## Gamification
- [x] Habit completions award XP once per period in the client loop, recalculate level progress, and surface progress bars.
- [x] Achievement definitions unlock from concrete conditions such as first check-in, 7-day streak, 50 completions, 1,000 XP, and a perfect week.
- [x] Badge unlocks and level-ups have visible animated feedback surfaces.

## Dashboard
- [x] Dashboard shows daily progress, habit cards, completion rate, current streak, XP progress, recent achievements, and weekly activity.
- [x] Habit completion updates the dashboard immediately without a page refresh and mirrors the API call.
- [x] Seeded three-month demo data keeps the dashboard populated on first load.

## Analytics and freemium
- [x] Analytics includes a GitHub-style activity heatmap, weekly/monthly trend charts, habit performance, and XP trends.
- [x] Free and Premium tiers are visible, with advanced analytics and CSV export clearly gated behind Premium in the UI and export endpoint.
- [ ] Connect managed Stripe Checkout and entitlement fulfillment before treating an upgrade as a completed purchase.

## Profile and documentation
- [x] Profile shows user statistics, achievement collection, plan, and recent activity history.
- [x] README explains the architecture, streak algorithm, timezone handling, seed data, local development, and production configuration.
- [x] The app builds successfully and the preview server serves the main route and route manifest.

## Persistence follow-up
- [ ] Replace the deterministic in-memory repository with the selected durable database adapter and migrations for Users, Habits, HabitCompletions, Achievements, UserAchievements, XPTransactions, and Subscriptions before production release.
