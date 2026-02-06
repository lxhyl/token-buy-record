import { getTransactions, getLatestPrices } from "@/actions/transactions";
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
  const transactions = await getTransactions();
  const currentPrices = await getLatestPrices();

  const holdings = calculateHoldings(transactions, currentPrices);
  const summary = calculatePortfolioSummary(holdings);
  const allocationData = calculateAllocationData(holdings);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your trading portfolio
          </p>
        </div>
        <Link href="/transactions/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add Transaction
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <StatsCards summary={summary} />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} />

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
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{holdings.length}</p>
                    <p className="text-sm text-blue-600">Total Assets</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500 text-white">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-700">{transactions.length}</p>
                    <p className="text-sm text-purple-600">Transactions</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-pink-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500 text-white">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-pink-700">
                      {holdings.filter((h) => h.assetType === "crypto").length}
                    </p>
                    <p className="text-sm text-pink-600">Crypto</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-cyan-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-white">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cyan-700">
                      {holdings.filter((h) => h.assetType === "stock").length}
                    </p>
                    <p className="text-sm text-cyan-600">Stocks</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings} />
    </div>
  );
}
