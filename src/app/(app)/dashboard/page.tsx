import { getTransactions, getLatestPrices } from "@/actions/transactions";
import { getDeposits } from "@/actions/deposits";
import { getDisplayCurrency, getColorScheme } from "@/actions/settings";
import { getExchangeRates } from "@/lib/exchange-rates";
import {
  calculateHoldings,
  calculateDepositHoldings,
  calculatePortfolioSummary,
  calculateAllocationData,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { AllocationPieChart } from "@/components/PieChart";
import { HoldingsTable } from "@/components/HoldingsTable";
import { DepositTable } from "@/components/DepositTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, TrendingUp, Coins, BarChart3, PiggyBank } from "lucide-react";
import { getDisplayLanguage } from "@/actions/settings";
import { t } from "@/lib/i18n";
import { PencilText } from "@/components/PencilText";
import { PriceRefresher } from "@/components/PriceRefresher";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [transactions, currentPrices, deposits, currency, rates, locale, colorScheme] = await Promise.all([
    getTransactions(),
    getLatestPrices(),
    getDeposits(),
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
    getColorScheme(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices, rates);
  const depositHoldings = calculateDepositHoldings(deposits, rates);
  const summary = calculatePortfolioSummary(holdings, depositHoldings);
  const allocationData = calculateAllocationData(holdings, depositHoldings);

  return (
    <div className="space-y-8">
      <PriceRefresher />
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <PencilText as="h1" className="text-2xl md:text-3xl font-bold text-foreground">
            {t(locale, "dashboard.title")}
          </PencilText>
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

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings} summary={summary} currency={currency} rates={rates} colorScheme={colorScheme} />

      {/* Charts Row */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} currency={currency} rates={rates} />

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle>{t(locale, "dashboard.quickStats")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`grid grid-cols-2 gap-3 md:gap-4 ${depositHoldings.length > 0 ? "md:grid-cols-3" : ""}`}>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-foreground">{holdings.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t(locale, "dashboard.assets")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-foreground">{transactions.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t(locale, "dashboard.trades")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                  <Coins className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-foreground">
                    {holdings.filter((h) => h.assetType === "crypto").length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t(locale, "dashboard.crypto")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-num text-foreground">
                    {holdings.filter((h) => h.assetType === "stock").length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t(locale, "dashboard.stocks")}</p>
                </div>
              </div>
              {depositHoldings.length > 0 && (
                <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted">
                  <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                    <PiggyBank className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-bold font-num text-foreground">{depositHoldings.length}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{t(locale, "dashboard.deposits")}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposits Table */}
      <DepositTable holdings={depositHoldings} currency={currency} rates={rates} />
    </div>
  );
}
