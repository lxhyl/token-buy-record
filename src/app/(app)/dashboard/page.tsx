import { getTransactions, getLatestPrices } from "@/actions/transactions";
import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import {
  calculateHoldings,
  calculateFixedIncomeHoldings,
  calculatePortfolioSummary,
  calculateAllocationData,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { AllocationPieChart } from "@/components/PieChart";
import { HoldingsTable } from "@/components/HoldingsTable";
import { FixedIncomeTable } from "@/components/FixedIncomeTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, TrendingUp, Coins, BarChart3, Landmark, PiggyBank } from "lucide-react";
import { getDisplayLanguage } from "@/actions/settings";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [transactions, currentPrices, currency, rates, locale] = await Promise.all([
    getTransactions(),
    getLatestPrices(),
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices, rates);
  const fixedIncomeHoldings = calculateFixedIncomeHoldings(transactions, rates);
  const summary = calculatePortfolioSummary(holdings, fixedIncomeHoldings);
  const allocationData = calculateAllocationData(holdings, fixedIncomeHoldings);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            {t(locale, "dashboard.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t(locale, "dashboard.subtitle")}
          </p>
        </div>
        <Link href="/transactions/new" className="shrink-0">
          <Button size="sm" className="md:h-11 md:px-6">
            <Plus className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
            <span className="hidden sm:inline">{t(locale, "dashboard.addTransaction")}</span>
            <span className="sm:hidden">{t(locale, "common.add")}</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <StatsCards summary={summary} currency={currency} rates={rates} />

      {/* Charts Row */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} currency={currency} rates={rates} />

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle>{t(locale, "dashboard.quickStats")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {(() => {
              const depositCount = fixedIncomeHoldings.filter((h) => h.assetType === "deposit").length;
              const bondCount = fixedIncomeHoldings.filter((h) => h.assetType === "bond").length;
              const hasExtra = depositCount > 0 || bondCount > 0;
              return (
                <div className={`grid grid-cols-2 gap-3 md:gap-4 ${hasExtra ? "md:grid-cols-3" : ""}`}>
                  <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                    <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                      <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold font-num text-blue-700 dark:text-blue-300">{holdings.length}</p>
                      <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400">{t(locale, "dashboard.assets")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40">
                    <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500 text-white">
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold font-num text-purple-700 dark:text-purple-300">{transactions.length}</p>
                      <p className="text-xs md:text-sm text-purple-600 dark:text-purple-400">{t(locale, "dashboard.trades")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-pink-50 dark:bg-pink-950/40">
                    <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-pink-500 text-white">
                      <Coins className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold font-num text-pink-700 dark:text-pink-300">
                        {holdings.filter((h) => h.assetType === "crypto").length}
                      </p>
                      <p className="text-xs md:text-sm text-pink-600 dark:text-pink-400">{t(locale, "dashboard.crypto")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40">
                    <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white">
                      <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold font-num text-cyan-700 dark:text-cyan-300">
                        {holdings.filter((h) => h.assetType === "stock").length}
                      </p>
                      <p className="text-xs md:text-sm text-cyan-600 dark:text-cyan-400">{t(locale, "dashboard.stocks")}</p>
                    </div>
                  </div>
                  {depositCount > 0 && (
                    <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-green-50 dark:bg-green-950/40">
                      <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
                        <PiggyBank className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div>
                        <p className="text-xl md:text-2xl font-bold font-num text-green-700 dark:text-green-300">{depositCount}</p>
                        <p className="text-xs md:text-sm text-green-600 dark:text-green-400">{t(locale, "dashboard.deposits")}</p>
                      </div>
                    </div>
                  )}
                  {bondCount > 0 && (
                    <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                      <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                        <Landmark className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div>
                        <p className="text-xl md:text-2xl font-bold font-num text-amber-700 dark:text-amber-300">{bondCount}</p>
                        <p className="text-xs md:text-sm text-amber-600 dark:text-amber-400">{t(locale, "dashboard.bonds")}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings} currency={currency} rates={rates} />

      {/* Fixed-Income Holdings */}
      {fixedIncomeHoldings.length > 0 && (
        <FixedIncomeTable holdings={fixedIncomeHoldings} currency={currency} rates={rates} />
      )}
    </div>
  );
}
