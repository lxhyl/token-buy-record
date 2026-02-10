# TradeTracker

Personal trading portfolio tracker PWA for stocks, crypto, deposits, and bonds.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with React 18
- **Database**: Neon Postgres via `drizzle-orm`
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark)
- **Charts**: Recharts
- **Icons**: lucide-react
- **UI**: Custom components in `src/components/ui/` (shadcn-style)

## Directory Structure

```
src/
  app/            # Next.js App Router pages (dashboard, transactions, holdings, analysis, settings)
  components/     # React components (HoldingsTable, TransactionList, PieChart, etc.)
  components/ui/  # Primitive UI components (Button, Card, Table, Input, etc.)
  lib/            # Utilities (utils.ts, currency.ts, calculations.ts, schema.ts, db.ts)
  actions/        # Server actions (transactions.ts, settings.ts)
```

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
- Currency values stored in USD, converted at display time via `formatCurrency()`
- `createCurrencyFormatter(currency, rates)` returns a reusable formatter function
- Dark mode via `.dark` class on `<html>`, toggled by ThemeProvider with localStorage
- Toast notifications via ToastProvider context
- Server actions in `src/actions/` handle DB mutations with `revalidatePath`
