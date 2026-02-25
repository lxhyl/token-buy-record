"use client";

import { useState, useEffect } from "react";
import { StatsCards } from "@/components/StatsCards";
import { AllocationPieChart } from "@/components/PieChart";
import { HoldingsTable } from "@/components/HoldingsTable";
import { DepositTable } from "@/components/DepositTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Holding, DepositHolding, calculatePortfolioSummary, calculateAllocationData } from "@/lib/calculations";
import { Plus, Sparkles, TrendingUp, Coins, BarChart3, PiggyBank } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

// ── Fixed mock data ─────────────────────────────────────────

interface BaseHolding {
  symbol: string;
  name: string;
  assetType: "crypto" | "stock";
  qty: number;
  avgCost: number;
  totalCost: number;
  realizedPnL: number;
}

const BASE_HOLDINGS: BaseHolding[] = [
  { symbol: "BTC",  name: "Bitcoin",         assetType: "crypto", qty: 2.5,  avgCost: 42100, totalCost: 105250, realizedPnL: 3200  },
  { symbol: "ETH",  name: "Ethereum",         assetType: "crypto", qty: 15,   avgCost: 2200,  totalCost: 33000,  realizedPnL: 0     },
  { symbol: "AAPL", name: "Apple Inc.",       assetType: "stock",  qty: 150,  avgCost: 172.5, totalCost: 25875,  realizedPnL: 520   },
  { symbol: "NVDA", name: "NVIDIA Corp.",     assetType: "stock",  qty: 80,   avgCost: 480.0, totalCost: 38400,  realizedPnL: 0     },
  { symbol: "MSFT", name: "Microsoft Corp.",  assetType: "stock",  qty: 60,   avgCost: 310.0, totalCost: 18600,  realizedPnL: 1100  },
  { symbol: "TSLA", name: "Tesla Inc.",       assetType: "stock",  qty: 45,   avgCost: 295.0, totalCost: 13275,  realizedPnL: -800  },
];

// Compute deposit accrued interest on the fly so days are always current
function buildDepositHoldings(): DepositHolding[] {
  const now = new Date();
  const calcInterest = (principal: number, rate: number, startDate: Date) => {
    const days = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return principal * (rate / 100) * (days / 365);
  };

  const raw = [
    { id: 1, symbol: "SAVINGS", name: "High Yield Savings", principal: 50000, withdrawnAmount: 0, interestRate: 4.5,  startDate: new Date("2024-01-01"), maturityDate: null },
    { id: 2, symbol: "CD-1Y",   name: "1-Year CD",          principal: 30000, withdrawnAmount: 0, interestRate: 5.25, startDate: new Date("2024-06-01"), maturityDate: new Date("2025-06-01") },
  ];

  return raw.map((d) => {
    const remaining = d.principal - d.withdrawnAmount;
    const interest  = calcInterest(remaining, d.interestRate, d.startDate);
    return {
      id: d.id,
      symbol: d.symbol,
      name: d.name,
      principal: d.principal,
      withdrawnAmount: d.withdrawnAmount,
      remainingPrincipal: remaining,
      interestRate: d.interestRate,
      currency: "USD",
      startDate: d.startDate,
      maturityDate: d.maturityDate,
      accruedInterest: interest,
      currentValue: remaining + interest,
    };
  });
}

const RATES = { USD: 1, CNY: 7.25, HKD: 7.78 };

// ── Component ───────────────────────────────────────────────

interface LandingDashboardProps {
  onLogin: () => void;
}

export function LandingDashboard({ onLogin }: LandingDashboardProps) {
  const { t } = useI18n();
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/landing-prices")
      .then((r) => r.json())
      .then((data) => setPrices(data))
      .catch(() => {});
  }, []);

  const holdings: Holding[] = BASE_HOLDINGS.map((h) => {
    const currentPrice = prices[h.symbol] ?? h.avgCost;
    const currentValue = h.qty * currentPrice;
    const unrealizedPnL = currentValue - h.totalCost;
    const unrealizedPnLPercent = h.totalCost > 0 ? (unrealizedPnL / h.totalCost) * 100 : 0;
    return {
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      quantity: h.qty,
      avgCost: h.avgCost,
      totalCost: h.totalCost,
      currentPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL: h.realizedPnL,
      firstBuyDate: new Date("2023-01-01"),
    };
  }).sort((a, b) => b.currentValue - a.currentValue);

  const depositHoldings = buildDepositHoldings();
  const summary = calculatePortfolioSummary(holdings, depositHoldings);
  const allocationData = calculateAllocationData(holdings, depositHoldings);

  const cryptoCount  = holdings.filter((h) => h.assetType === "crypto").length;
  const stockCount   = holdings.filter((h) => h.assetType === "stock").length;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Dashboard header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            {t("dashboard.title")}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Button size="sm" className="md:h-11 md:px-6 shrink-0" onClick={onLogin}>
          <Plus className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
          <span className="hidden sm:inline">{t("dashboard.addTransaction")}</span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards summary={summary} currency="USD" rates={RATES} />

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings} currency="USD" rates={RATES} readOnly />

      {/* Charts Row */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} currency="USD" rates={RATES} />

        {/* Quick Stats */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle>{t("dashboard.quickStats")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-blue-700 dark:text-blue-300">{holdings.length}</p>
                  <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400">{t("dashboard.assets")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-indigo-700 dark:text-indigo-300">24</p>
                  <p className="text-xs md:text-sm text-indigo-600 dark:text-indigo-400">{t("dashboard.trades")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-pink-50 dark:bg-pink-950/40">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-pink-500 text-white">
                  <Coins className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-pink-700 dark:text-pink-300">{cryptoCount}</p>
                  <p className="text-xs md:text-sm text-pink-600 dark:text-pink-400">{t("dashboard.crypto")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-cyan-700 dark:text-cyan-300">{stockCount}</p>
                  <p className="text-xs md:text-sm text-cyan-600 dark:text-cyan-400">{t("dashboard.stocks")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-green-50 dark:bg-green-950/40">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
                  <PiggyBank className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-green-700 dark:text-green-300">{depositHoldings.length}</p>
                  <p className="text-xs md:text-sm text-green-600 dark:text-green-400">{t("dashboard.deposits")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposits Table */}
      <DepositTable holdings={depositHoldings} currency="USD" rates={RATES} readOnly />
    </div>
  );
}
