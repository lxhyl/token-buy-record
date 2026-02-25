"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
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
  Mail,
  CheckCircle,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { LandingLanguageToggle } from "@/components/LandingLanguageToggle";
import { TranslationKey } from "@/lib/i18n";

// ── Email Magic Link Form ──────────────────────────────────
function MagicLinkForm() {
  const { t, tInterpolate } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status !== "idle") return;
    setStatus("sending");
    await signIn("resend", { email, callbackUrl: "/dashboard", redirect: false });
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-6 py-4 text-center">
        <CheckCircle className="h-6 w-6 text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("common.checkEmail")}</p>
        <p className="text-xs text-muted-foreground">{tInterpolate("common.magicLinkSent", { email })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("common.emailPlaceholder")}
          className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-60"
      >
        {status === "sending" ? t("common.sending") : t("common.sendMagicLink")}
      </button>
    </form>
  );
}

// ── Mock holdings (cost basis fixed, price/change updated from live API) ──
const BASE_HOLDINGS = [
  { symbol: "AAPL", name: "Apple Inc.",     qty: 150, cost: 172.5  },
  { symbol: "BTC",  name: "Bitcoin",        qty: 2.5,  cost: 42100  },
  { symbol: "NVDA", name: "NVIDIA Corp.",   qty: 80,   cost: 480.0  },
  { symbol: "MSFT", name: "Microsoft Corp.", qty: 60,  cost: 310.0  },
  { symbol: "ETH",  name: "Ethereum",       qty: 15,   cost: 2200   },
  { symbol: "TSLA", name: "Tesla Inc.",     qty: 45,   cost: 295.0  },
];

const MOCK_CHART_DATA = [
  12000, 14500, 13800, 16200, 18900, 17800, 21500, 24100, 22800, 26400, 29100, 31500,
  28900, 32600, 35800, 38200, 41500, 39800, 43200, 46800, 45100, 48500, 52100, 56800,
];

const FEATURE_ITEMS: { icon: typeof BarChart3; titleKey: TranslationKey; descKey: TranslationKey; gradient: string }[] = [
  { icon: BarChart3, titleKey: "landing.featureAnalyticsTitle", descKey: "landing.featureAnalyticsDesc", gradient: "from-blue-500 to-cyan-500" },
  { icon: PieChart, titleKey: "landing.featureMultiAssetTitle", descKey: "landing.featureMultiAssetDesc", gradient: "from-teal-500 to-emerald-500" },
  { icon: Globe, titleKey: "landing.featureMultiCurrencyTitle", descKey: "landing.featureMultiCurrencyDesc", gradient: "from-sky-500 to-blue-500" },
  { icon: Smartphone, titleKey: "landing.featurePWATitle", descKey: "landing.featurePWADesc", gradient: "from-orange-500 to-amber-500" },
  { icon: Shield, titleKey: "landing.featureSecureTitle", descKey: "landing.featureSecureDesc", gradient: "from-slate-600 to-slate-800" },
  { icon: Zap, titleKey: "landing.featureFastTitle", descKey: "landing.featureFastDesc", gradient: "from-amber-500 to-yellow-500" },
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
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
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
  const { t } = useI18n();
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/landing-prices")
      .then((r) => r.json())
      .then((data) => setPrices(data))
      .catch(() => {});
  }, []);

  const holdings = BASE_HOLDINGS.map((h) => {
    const price = prices[h.symbol] ?? null;
    const change = price !== null ? ((price - h.cost) / h.cost) * 100 : null;
    return { ...h, price, change };
  });

  const totalValue = holdings.reduce((sum, h) => {
    return sum + (h.price !== null ? h.price * h.qty : h.cost * h.qty);
  }, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.cost * h.qty, 0);
  const totalReturn = totalValue - totalCost;
  const totalReturnPct = (totalReturn / totalCost) * 100;
  const hasPrices = Object.keys(prices).length > 0;

  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const STATS: { labelKey: TranslationKey; value: string; change: string; up: boolean }[] = hasPrices
    ? [
        { labelKey: "landing.statPortfolioValue", value: `$${fmt(totalValue, 0)}`, change: `${totalReturnPct >= 0 ? "+" : ""}${fmt(totalReturnPct)}%`, up: totalReturnPct >= 0 },
        { labelKey: "landing.statTodayPnL", value: `${totalReturn >= 0 ? "+" : ""}$${fmt(Math.abs(totalReturn), 0)}`, change: `${totalReturnPct >= 0 ? "+" : ""}${fmt(totalReturnPct)}%`, up: totalReturn >= 0 },
        { labelKey: "landing.statTotalReturn", value: `${totalReturn >= 0 ? "+" : "-"}$${fmt(Math.abs(totalReturn), 0)}`, change: `${totalReturnPct >= 0 ? "+" : ""}${fmt(totalReturnPct)}%`, up: totalReturn >= 0 },
      ]
    : [
        { labelKey: "landing.statPortfolioValue", value: "$—", change: "—", up: true },
        { labelKey: "landing.statTodayPnL", value: "$—", change: "—", up: true },
        { labelKey: "landing.statTotalReturn", value: "$—", change: "—", up: true },
      ];

  const ALLOCATION_ITEMS: { labelKey: TranslationKey; color: string; pct: string }[] = [
    { labelKey: "landing.stocks", color: "bg-blue-500", pct: "42%" },
    { labelKey: "landing.crypto", color: "bg-teal-500", pct: "28%" },
    { labelKey: "landing.bonds", color: "bg-amber-500", pct: "18%" },
    { labelKey: "landing.deposits", color: "bg-emerald-500", pct: "12%" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Top nav bar */}
      <header className="sticky top-0 z-50 border-b bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-md shadow-blue-600/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-gradient">
              TradeTracker
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LandingLanguageToggle />
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              {t("common.getStarted")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative py-20 md:py-28">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/50 dark:bg-gray-900/50 px-4 py-1.5 text-sm text-muted-foreground mb-6 backdrop-blur-sm animate-fade-in">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              {t("landing.tagline")}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {t("landing.heroTitle1")}{" "}
              <span className="text-gradient">
                {t("landing.heroTitle2")}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {t("landing.heroDesc")}
            </p>
            <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" fillOpacity={0.9} />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" fillOpacity={0.8} />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" fillOpacity={0.7} />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" fillOpacity={0.9} />
                  </svg>
                  {t("common.signInWithGoogle")}
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-secondary/50 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {t("common.learnMore")}
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              {/* Email magic link */}
              <div className="flex items-center gap-3 w-full max-w-sm">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{t("common.orDivider")}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <MagicLinkForm />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
            {STATS.map((s, i) => (
              <div
                key={s.labelKey}
                className="relative rounded-xl border bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm p-5 animate-fade-in"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <p className="text-sm text-muted-foreground">{t(s.labelKey)}</p>
                <p className="text-2xl font-bold font-num mt-1">{s.value}</p>
                <span className={`text-sm font-medium font-num ${s.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {s.change}
                </span>
              </div>
            ))}
          </div>

          {/* Mock dashboard preview */}
          <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="rounded-xl border bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-2xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/80">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 rounded-md bg-white dark:bg-gray-900 border px-4 py-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    tradetracker.app/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 md:p-6">
                {/* Chart area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="lg:col-span-2 rounded-lg border bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("landing.portfolioValue")}</p>
                        <p className="text-2xl font-bold font-num">
                          {hasPrices ? `$${fmt(totalValue, 0)}` : "$—"}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold font-num ${totalReturn >= 0 ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"}`}>
                        {totalReturn >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {hasPrices ? `${totalReturnPct >= 0 ? "+" : ""}${fmt(totalReturnPct)}%` : "—"}
                      </span>
                    </div>
                    <div className="h-32 md:h-40">
                      <MiniChart data={MOCK_CHART_DATA} color="#2563eb" />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4">
                    <p className="text-sm text-muted-foreground mb-3">{t("landing.allocation")}</p>
                    {/* Donut chart mock */}
                    <div className="flex items-center justify-center py-2">
                      <div className="relative w-28 h-28">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="30 70" strokeDashoffset="0" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#14b8a6" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-30" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="20 80" strokeDashoffset="-55" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-75" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="10 90" strokeDashoffset="-90" />
                        </svg>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                      {ALLOCATION_ITEMS.map((item) => (
                        <div key={item.labelKey} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${item.color}`} />
                          <span className="text-muted-foreground">{t(item.labelKey)}</span>
                          <span className="font-medium font-num ml-auto">{item.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Holdings table */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-gray-50/80 dark:bg-gray-800/80 px-4 py-2.5 border-b">
                    <p className="text-sm font-semibold">{t("landing.holdings")}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left px-4 py-2 font-medium">{t("landing.asset")}</th>
                          <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">{t("landing.qty")}</th>
                          <th className="text-right px-4 py-2 font-medium">{t("landing.price")}</th>
                          <th className="text-right px-4 py-2 font-medium hidden md:table-cell">{t("landing.avgCost")}</th>
                          <th className="text-right px-4 py-2 font-medium">{t("landing.pnlPercent")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h) => (
                          <tr key={h.symbol} className="border-b last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div>
                                <span className="font-semibold">{h.symbol}</span>
                                <p className="text-xs text-muted-foreground hidden sm:block">{h.name}</p>
                              </div>
                            </td>
                            <td className="text-right px-4 py-2.5 font-num hidden sm:table-cell">{h.qty.toLocaleString()}</td>
                            <td className="text-right px-4 py-2.5 font-medium font-num">
                              {h.price !== null
                                ? h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })
                                : "—"}
                            </td>
                            <td className="text-right px-4 py-2.5 text-muted-foreground font-num hidden md:table-cell">
                              {h.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-right px-4 py-2.5">
                              {h.change !== null ? (
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold font-num ${
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
                              ) : (
                                <span className="text-muted-foreground font-num">—</span>
                              )}
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
      <section id="features" className="py-20 md:py-28 border-t bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {t("landing.featuresTitle1")}{" "}
              <span className="text-gradient">
                {t("landing.featuresTitle2")}
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.featuresSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {FEATURE_ITEMS.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.titleKey}
                  className="group rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${f.gradient} text-white mb-4 shadow-sm transition-transform group-hover:scale-105`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold mb-1.5">{t(f.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────── */}
      <section className="py-20 md:py-28 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-0">
              {t("landing.ctaTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("landing.ctaDesc")}
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-8 py-4 text-base font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" fillOpacity={0.9} />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" fillOpacity={0.8} />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" fillOpacity={0.7} />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" fillOpacity={0.9} />
              </svg>
              {t("common.getStartedWithGoogle")}
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t("common.orDivider")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <MagicLinkForm />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-teal-500 text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-foreground">TradeTracker</span>
          </div>
          <p>{t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
