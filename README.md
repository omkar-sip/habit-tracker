# HABITFORGE

HabitForge is a premium gamified habit-tracking SaaS interface built around a simple daily loop: choose a ritual, check in, earn proof, and see the pattern compound.

## Stack

The product uses React, TypeScript, Vite, Tailwind CSS, Express, Framer Motion, Recharts, Lucide React, and a small React Bits-inspired ambient spotlight effect. The client includes Overview, My habits, Analytics, Profile, Upgrade, and Login views. The Express boundary lives in `server/` and exposes health, identity, habit, analytics, export, and subscription endpoints.

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The Vite preview runs on port 3000 and the Express API runs on port 3001. The product is intentionally populated with the Sheetal Ingale demo workspace on first load. The UI keeps an optimistic local snapshot for an uninterrupted walkthrough and mirrors login, create/edit/delete, and completion calls to the Express API through Vite's `/api` proxy. Browser local storage preserves the walkthrough between refreshes.

## Streak algorithm

Habit completions are stored as local calendar keys in the user's IANA timezone. Daily habits use `YYYY-MM-DD`; weekly habits use `week:YYYY-MM-DD`, where the suffix is the Monday that starts the user's local week. A daily streak starts from today if today's key exists, otherwise it starts from yesterday. It increments while each previous calendar key is present and resets to zero after the first missing day. Weekly streaks use the same logic at seven-day period boundaries. Completion writes are duplicate-safe because the period key is checked before insertion; toggling a completed period removes only that exact key in the client, while the API returns `xpAwarded: 0` for duplicate writes.

## Data model

The domain types map to the requested collections/tables: Users, Habits, HabitCompletions, Achievements, UserAchievements, XPTransactions, and Subscriptions. The server uses a deterministic in-memory seed for the demo and exposes collection names in `server/domain.ts`. `DATABASE_URL` and `MONGODB_URI` are documented as integration points because this managed runtime provides a MySQL-compatible database by default, while the original brief requested MongoDB. No credentials are committed. Before go-live, replace `server/store.ts` with the chosen durable repository and run additive migrations against the managed database or a user-selected MongoDB deployment.

## Freemium behavior

Free users can use the daily loop, core streaks, XP, badges, and weekly momentum. The 90-day heatmap, advanced analytics framing, and CSV export are visibly gated behind Premium. The API also returns `403 Premium plan required` for CSV export when the authenticated demo user is on the Free tier. The Upgrade view is ready for a managed Stripe Checkout connection; the current CTA intentionally reports that billing is ready to connect rather than pretending a payment succeeded.

## Authentication

The server exposes JWT verification middleware and a demo token endpoint so the product can be exercised end to end locally. The client stores that demo token and mirrors API requests with a Bearer token. For production, connect the documented Manus OAuth callback exchange, keep `webdev_app_session` as the application session cookie, use `SameSite=None; Secure` in public HTTPS Preview, and disable the demo token endpoint.

## Production notes

The app builds with `pnpm build` and starts the Express runtime with `pnpm start` (the checked-in `tsx` runtime entrypoint). Before production release, connect the chosen persistent repository, wire Manus OAuth callback exchange, enable Stripe through the managed integration, and serve the built client from the configured static output or Express container. `MANUS_JWT_SECRET` is required when `NODE_ENV=production`.
