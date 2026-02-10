"use client";

import { signIn } from "next-auth/react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Shield,
  Smartphone,
  PieChart,
  ArrowRight,
  ChevronRight,
  Zap,
  Globe,
} from "lucide-react";

// ── Mock data ──────────────────────────────────────────────
const MOCK_HOLDINGS = [
  { symbol: "AAPL", name: "Apple Inc.", qty: 150, price: 198.11, cost: 172.5, change: +14.85 },
  { symbol: "BTC", name: "Bitcoin", qty: 2.5, price: 68420, cost: 42100, change: +62.52 },
  { symbol: "NVDA", name: "NVIDIA Corp.", qty: 80, price: 875.28, cost: 480.0, change: +82.35 },
  { symbol: "MSFT", name: "Microsoft Corp.", qty: 60, price: 425.52, cost: 310.0, change: +37.26 },
  { symbol: "ETH", name: "Ethereum", qty: 15, price: 3850, cost: 2200, change: +75.0 },
  { symbol: "TSLA", name: "Tesla Inc.", qty: 45, price: 248.42, cost: 295.0, change: -15.79 },
];

const MOCK_CHART_DATA = [
  12000, 14500, 13800, 16200, 18900, 17800, 21500, 24100, 22800, 26400, 29100, 31500,
  28900, 32600, 35800, 38200, 41500, 39800, 43200, 46800, 45100, 48500, 52100, 56800,
];

const FEATURES = [
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Track P&L, allocation, and trade patterns with live market data",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: PieChart,
    title: "Multi-Asset Support",
    desc: "Stocks, crypto, bonds, and deposits — all in one unified dashboard",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Globe,
    title: "Multi-Currency",
    desc: "View your portfolio in USD, CNY, or HKD with live exchange rates",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Smartphone,
    title: "PWA Ready",
    desc: "Install on any device. Works offline with a native app experience",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "Google OAuth login. Your data is yours — scoped per account",
    gradient: "from-red-500 to-rose-500",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Built on Next.js with edge-optimized Neon Postgres for instant loads",
    gradient: "from-yellow-500 to-orange-500",
  },
];

// ── Stat cards used in the hero ────────────────────────────
const STATS = [
  { label: "Portfolio Value", value: "$284,520", change: "+12.4%", up: true },
  { label: "Today's P&L", value: "+$3,842", change: "+1.37%", up: true },
  { label: "Total Return", value: "+$68,210", change: "+31.5%", up: true },
];

// ── Sparkline mini-chart (SVG) ─────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 60;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon fill={`url(#grad-${color})`} points={`0,${h} ${points} ${w},${h}`} />
    </svg>
  );
}

// ── Landing page ───────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Top nav bar */}
      <header className="sticky top-0 z-50 border-b bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TradeTracker
            </span>
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative py-20 md:py-28">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/50 dark:bg-gray-900/50 px-4 py-1.5 text-sm text-muted-foreground mb-6 backdrop-blur-sm animate-fade-in">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Multi-asset portfolio tracking made simple
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Track Every Trade.{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Maximize Returns.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              A unified dashboard for stocks, crypto, bonds, and deposits.
              Real-time prices, P&L analytics, multi-currency support — all in a
              beautiful PWA you can install anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" fillOpacity={0.9} />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" fillOpacity={0.8} />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" fillOpacity={0.7} />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" fillOpacity={0.9} />
                </svg>
                Sign in with Google
              </button>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-secondary/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                Learn more
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="relative rounded-2xl border bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm p-5 animate-fade-in"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
                <span className={`text-sm font-medium ${s.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {s.change}
                </span>
              </div>
            ))}
          </div>

          {/* Mock dashboard preview */}
          <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-2xl shadow-blue-500/5 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border px-4 py-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    tradetracker.app/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 md:p-6">
                {/* Chart area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="lg:col-span-2 rounded-xl border bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Portfolio Value</p>
                        <p className="text-2xl font-bold">$284,520.00</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        +31.5%
                      </span>
                    </div>
                    <div className="h-32 md:h-40">
                      <MiniChart data={MOCK_CHART_DATA} color="#3b82f6" />
                    </div>
                  </div>
                  <div className="rounded-xl border bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4">
                    <p className="text-sm text-muted-foreground mb-3">Allocation</p>
                    {/* Donut chart mock */}
                    <div className="flex items-center justify-center py-2">
                      <div className="relative w-28 h-28">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="30 70" strokeDashoffset="0" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-30" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="20 80" strokeDashoffset="-55" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-75" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="10 90" strokeDashoffset="-90" />
                        </svg>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                      {[
                        { label: "Stocks", color: "bg-blue-500", pct: "42%" },
                        { label: "Crypto", color: "bg-purple-500", pct: "28%" },
                        { label: "Bonds", color: "bg-amber-500", pct: "18%" },
                        { label: "Deposits", color: "bg-emerald-500", pct: "12%" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${item.color}`} />
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium ml-auto">{item.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Holdings table */}
                <div className="rounded-xl border overflow-hidden">
                  <div className="bg-gray-50/80 dark:bg-gray-800/80 px-4 py-2.5 border-b">
                    <p className="text-sm font-semibold">Holdings</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left px-4 py-2 font-medium">Asset</th>
                          <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Qty</th>
                          <th className="text-right px-4 py-2 font-medium">Price</th>
                          <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Avg Cost</th>
                          <th className="text-right px-4 py-2 font-medium">P&L %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_HOLDINGS.map((h) => (
                          <tr key={h.symbol} className="border-b last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div>
                                <span className="font-semibold">{h.symbol}</span>
                                <p className="text-xs text-muted-foreground hidden sm:block">{h.name}</p>
                              </div>
                            </td>
                            <td className="text-right px-4 py-2.5 hidden sm:table-cell">{h.qty.toLocaleString()}</td>
                            <td className="text-right px-4 py-2.5 font-medium">
                              ${h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-right px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                              ${h.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-right px-4 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  h.change >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {h.change >= 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5" />
                                ) : (
                                  <TrendingDown className="h-3.5 w-3.5" />
                                )}
                                {h.change >= 0 ? "+" : ""}
                                {h.change.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────── */}
      <section id="features" className="py-20 md:py-28 border-t bg-gray-50/50 dark:bg-gray-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                track smarter
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for traders and investors who want a clean, fast, and private way
              to monitor their entire portfolio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border bg-white dark:bg-gray-900 p-6 transition-all hover:shadow-lg hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white mb-4 shadow-lg transition-transform group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────── */}
      <section className="py-20 md:py-28 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Ready to take control of your portfolio?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join for free. Sign in with your Google account and start tracking in seconds.
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" fillOpacity={0.9} />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" fillOpacity={0.8} />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" fillOpacity={0.7} />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" fillOpacity={0.9} />
              </svg>
              Get Started with Google
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-foreground">TradeTracker</span>
          </div>
          <p>Personal portfolio tracking. Free and open source.</p>
        </div>
      </footer>
    </div>
  );
}
