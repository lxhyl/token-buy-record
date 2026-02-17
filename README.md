# TradeTracker

A self-hosted, multi-asset portfolio tracker for stocks, crypto, deposits, and bonds. Built as a Progressive Web App (PWA) with real-time prices, P&L analytics, and multi-currency support.

## Features

- **Multi-Asset Tracking** — Stocks, crypto, bonds, and fixed deposits in one dashboard
- **Real-Time Prices** — Live market data via Yahoo Finance
- **P&L Analytics** — Unrealized/realized P&L, daily P&L calendar heatmap, win rate, drawdown, profit factor
- **Portfolio Allocation** — Interactive pie chart with asset breakdown
- **Multi-Currency** — Display in USD, CNY, or HKD with live exchange rates
- **Color Scheme** — US style (green up / red down) or CN style (red up / green down)
- **Bilingual** — English and Chinese (中文) interface
- **Dark Mode** — Light, dark, and system-follow themes
- **PWA** — Installable on any device, works offline
- **Multi-User** — Google OAuth login, data scoped per account
- **Trade Patterns** — Per-asset analysis with buy/sell volume, avg price, realized P&L
- **Income Tracking** — Dividends, interest, staking rewards
- **CSV Export** — Export transaction history

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Auth | NextAuth.js v5 (Google OAuth, JWT) |
| Database | PostgreSQL (Neon) via Drizzle ORM |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Prices | yahoo-finance2 |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (or any Postgres)
- Google OAuth credentials ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/lxhyl/token-buy-record.git
cd token-buy-record
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_SECRET="your-random-secret-string"
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

4. **Push database schema**

```bash
npm run db:push
```

5. **Start development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/
    page.tsx              # Landing page
    (app)/                # Authenticated pages
      dashboard/          # Portfolio overview
      transactions/       # Transaction CRUD
      analysis/           # Charts & analytics
      settings/           # User preferences
    api/
      auth/[...nextauth]/ # Auth API
      prices/             # Price fetch API
      symbol-search/      # Stock symbol autocomplete
  components/             # React components
  components/ui/          # Primitive UI (shadcn-style)
  lib/                    # Utilities, schema, auth config
  actions/                # Server actions
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Run migrations + production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## Deploy

Works with any platform that supports Next.js:

- **Vercel** — Zero-config deployment. Set environment variables in project settings.
- **Docker / VPS** — `npm run build && npm start`, set env vars on the host.

## License

MIT
