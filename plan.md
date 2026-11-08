# HABITFORGE — Implementation Plan

## Product approach

HabitForge is a gamified habit operating system, not a checklist. The first production slice prioritizes the daily loop: see today's focus, check in, feel progress immediately, and understand the longer-term pattern. The UI is backed by a reusable domain model so the same surfaces can later swap local persistence for the managed database without a redesign.

The client is a Vite + React + TypeScript application with a small Express server boundary. The client owns the responsive application shell, dashboard, habits CRUD experience, analytics visualizations, profile, subscription upgrade, theme state, and demo seed state. A thin API layer exposes health, authenticated-user, habit CRUD, completion, analytics, CSV export, and subscription endpoints. Repository types and services isolate persistence logic. Demo mode is deterministic and seeded with three months of realistic activity so the app is never empty.

The requested stack is reflected in the codebase: Tailwind CSS for tokens and layout utilities, Framer Motion for page and unlock transitions, Recharts for analytics, Lucide React for iconography, and a lightweight React Bits-inspired interactive spotlight/aurora effect built as a reusable component. Authentication is designed around the platform's Manus OAuth session contract with a demo-user fallback in the client for local product walkthroughs; the app session cookie name and secure cross-site behavior are documented for the eventual server integration.

## Build sequence

1. Establish Vite, TypeScript, Tailwind, Express, environment variables, route manifest, and design tokens.
2. Build the responsive application shell with navigation, theme toggle, profile switcher, focus mode, and command-style visual language.
3. Model demo user, habits, completions, achievements, XP transactions, and subscription state; implement timezone-safe date keys, duplicate-safe completion, streak calculation, XP rewards, levels, and badge unlock rules.
4. Ship dashboard with daily progress, habit cards, completion ring, streaks, XP progress, recent achievements, and weekly chart.
5. Ship habits CRUD with add/edit/delete, category, frequency, color, icon, and completion actions.
6. Ship analytics with 3-month activity heatmap, weekly/monthly trend charts, habit performance, and XP trend; gate advanced views and CSV export behind Premium.
7. Ship profile and upgrade surfaces with stats, badge collection, activity history, tier comparison, and a clear Premium CTA.
8. Add secure API route boundaries, validation, authorization middleware, seed script, README, .env.example, and build checks.

## Project structure

- `src/` — React UI, route views, reusable components, domain logic, demo state, and styles.
- `src/lib/` — date, streak, XP, export, and formatting utilities.
- `src/data/` — deterministic seed data and achievement definitions.
- `server/` — Express app, auth boundary, validation, API route modules, and persistence adapter seams.
- `public/` — route manifest and static metadata.
- `plan.md` / `TODO.md` — source-of-truth implementation decisions and outcome criteria.

## Design direction

### Style probabilities

- Linear Nightshift Console — 0.07
- Raycast Ritual Dashboard — 0.05
- Vercel Forge Utility — 0.08

### Chosen movement: Linear Nightshift Console

**Design Movement:** Linear's compressed information density and Vercel's restraint, warmed by a little Raycast ritual and game-like reward signaling.

**Core Principles:** Make the next action obvious; use contrast to create hierarchy rather than decoration; reward consistency with motion and color; keep every surface calm, legible, and keyboard-friendly.

**Color Philosophy:** Charcoal is the quiet workspace. Electric violet is the signature energy field around intent and navigation. Acid lime is reserved for earned progress, completions, and “you did it” moments. Cool slate text keeps the interface readable without flattening the mood.

**Layout Paradigm:** A persistent left rail anchors the product while the content plane uses wide, asymmetric dashboard bands rather than a centered marketing grid. Insight cards align to a strong vertical rhythm and expand into spacious full-width analytics panels.

**Signature Elements:** A tiny violet “forge spark” mark in the wordmark; lime micro-bars and checkmarks for earned progress; soft aurora spotlight gradients that follow the active surface without becoming a background image.

**Interaction Philosophy:** Every mutation has immediate feedback. Habit completion is a satisfying state change rather than a checkbox tick. Premium locks explain the value of the locked feature. Empty states are invitations, not dead ends.

**Animation:** Use 160–260ms transitions for routine state changes, springy scale on completion, subtle stagger on dashboard entry, and a short glow burst for level-up or badge unlock. Avoid continuous motion except for the ambient spotlight and progress shimmer.

**Typography System:** Inter or Geist Sans for all UI, with tight, bold display headings and relaxed slate subtext. Use tabular numerals for XP, streaks, and percentages. Labels are uppercase, letter-spaced, and small; primary copy is sentence case and direct.

**Brand Essence:** A calm RPG for people who want their consistency to compound. Personality: precise, motivating, quietly intense.

**Brand Voice:** Clear, grounded, and slightly ceremonial. Example lines: “Make today count.” “You’re not starting over — you’re building on proof.”

**Wordmark & Logo:** `HABITFORGE` in a compact uppercase wordmark with the `O` replaced by a small four-point forge spark. The spark appears as the app mark in the rail.

**Signature Brand Color:** Electric violet `#9B7DFF`, paired with earned lime `#B7F36B`.

## Product assumptions

- The local walkthrough uses the seeded Alex Morgan profile so evaluators can exercise the complete product loop immediately.
- Real persistence is isolated behind server APIs and a repository seam; when a managed MySQL-compatible database is connected, the same domain model can be backed by normalized Users, Habits, HabitCompletions, Achievements, UserAchievements, XPTransactions, and Subscriptions tables.
- Premium is represented as an entitlement with locked analytics/export behavior and a demonstrable upgrade CTA. Stripe integration can be connected through the platform's managed integration without coupling the UI to raw credentials.
- Timezone-safe date keys use the user's IANA timezone and local calendar boundaries, not server UTC day boundaries.
