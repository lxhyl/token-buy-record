import { getTransactions, getCurrentPrices } from "@/actions/transactions";
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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [transactions, currentPrices] = await Promise.all([
    getTransactions(),
    getCurrentPrices(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices);
  const summary = calculatePortfolioSummary(holdings);
  const allocationData = calculateAllocationData(holdings);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your trading portfolio
          </p>
        </div>
        <Link href="/transactions/new">
          <Button>Add Transaction</Button>
        </Link>
      </div>

      <StatsCards summary={summary} />

      <div className="grid gap-8 lg:grid-cols-2">
        <AllocationPieChart data={allocationData} />

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Assets</span>
                <span className="font-medium">{holdings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Transactions</span>
                <span className="font-medium">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Crypto Assets</span>
                <span className="font-medium">
                  {holdings.filter((h) => h.assetType === "crypto").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock Assets</span>
                <span className="font-medium">
                  {holdings.filter((h) => h.assetType === "stock").length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <HoldingsTable holdings={holdings} />
    </div>
  );
}
