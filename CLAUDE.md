# TradeTracker

Multi-user trading portfolio tracker PWA for stocks, crypto, deposits, and bonds.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with React 18
- **Auth**: NextAuth.js v5 (`next-auth@beta`) with Google OAuth, JWT sessions
- **Database**: Neon Postgres via `drizzle-orm` + `@auth/drizzle-adapter`
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark)
- **Charts**: Recharts
- **Icons**: lucide-react
- **UI**: Custom components in `src/components/ui/` (shadcn-style)

## Directory Structure

```
src/
  app/
    page.tsx            # Public landing page (redirects to /dashboard if authed)
    (app)/              # Route group: all authenticated pages
      layout.tsx        # SessionProvider + Navigation + <main> wrapper
      dashboard/        # Dashboard page (portfolio overview)
      transactions/     # Transaction CRUD pages
      holdings/         # Redirects to /dashboard
      analysis/         # Portfolio analysis page
      settings/         # Settings page
    api/auth/[...nextauth]/  # NextAuth API route handler
    api/prices/              # Price fetch API
  components/           # React components (HoldingsTable, TransactionList, PieChart, etc.)
  components/ui/        # Primitive UI components (Button, Card, Table, Input, etc.)
  lib/
    auth.ts             # NextAuth config (Google provider, JWT, DrizzleAdapter)
    auth-utils.ts       # getRequiredUser() / getOptionalUser() helpers
    schema.ts           # Drizzle schema (users, accounts, transactions, appSettings, currentPrices)
    db.ts               # Database connection
    utils.ts, currency.ts, calculations.ts  # Utilities
  actions/              # Server actions (transactions.ts, settings.ts)
  types/next-auth.d.ts  # Session/JWT type augmentations
middleware.ts           # Route protection via NextAuth authorized callback
```

## Authentication

- Google OAuth via NextAuth.js v5 with JWT session strategy
- Auth config in `src/lib/auth.ts`, middleware in `middleware.ts`
- `getRequiredUser()` in server actions returns userId or redirects to `/`
- All data (transactions, settings) is scoped by `userId` column
- First sign-in auto-claims legacy rows (`user_id = 'legacy'`)
- Env vars needed: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`

## Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Run migrations + build (node migrate.mjs && next build)
npm run lint      # ESLint
npm run db:push   # Push schema to database
npm run db:studio # Open Drizzle Studio
```

## Key Patterns

- All pages use `export const dynamic = "force-dynamic"` for fresh data
- Authenticated pages live under `src/app/(app)/`, public pages at `src/app/`
- Currency values stored in USD, converted at display time via `formatCurrency()`
- `createCurrencyFormatter(currency, rates)` returns a reusable formatter function
- Dark mode via `.dark` class on `<html>`, toggled by ThemeProvider with localStorage
- Toast notifications via ToastProvider context
- Server actions in `src/actions/` handle DB mutations with `revalidatePath`
- All server actions call `getRequiredUser()` to enforce auth and scope queries by userId

## Workflow

- After completing changes, always commit and push to GitHub directly — do not ask for confirmation
