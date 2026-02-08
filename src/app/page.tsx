import { getTransactions, getLatestPrices } from "@/actions/transactions";
import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import {
  calculateHoldings,
  calculatePortfolioSummary,
  calculateAllocationData,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { AllocationPieChart } from "@/components/PieChart";
import { HoldingsTable } from "@/components/HoldingsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, TrendingUp, Coins, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [transactions, currentPrices, currency, rates] = await Promise.all([
    getTransactions(),
    getLatestPrices(),
    getDisplayCurrency(),
    getExchangeRates(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices);
  const summary = calculatePortfolioSummary(holdings);
  const allocationData = calculateAllocationData(holdings);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Overview of your trading portfolio
          </p>
        </div>
        <Link href="/transactions/new" className="shrink-0">
          <Button size="sm" className="md:h-11 md:px-6">
            <Plus className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
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
              <CardTitle>Quick Stats</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-blue-50">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-blue-700">{holdings.length}</p>
                  <p className="text-xs md:text-sm text-blue-600">Assets</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-purple-50">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500 text-white">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-purple-700">{transactions.length}</p>
                  <p className="text-xs md:text-sm text-purple-600">Trades</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-pink-50">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-pink-500 text-white">
                  <Coins className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-pink-700">
                    {holdings.filter((h) => h.assetType === "crypto").length}
                  </p>
                  <p className="text-xs md:text-sm text-pink-600">Crypto</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-cyan-50">
                <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-cyan-700">
                    {holdings.filter((h) => h.assetType === "stock").length}
                  </p>
                  <p className="text-xs md:text-sm text-cyan-600">Stocks</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings} currency={currency} rates={rates} />
    </div>
  );
}
