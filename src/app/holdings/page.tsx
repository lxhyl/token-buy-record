import { getTransactions, getCurrentPrices } from "@/actions/transactions";
import {
  calculateHoldings,
  calculatePortfolioSummary,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { HoldingsTable } from "@/components/HoldingsTable";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const [transactions, currentPrices] = await Promise.all([
    getTransactions(),
    getCurrentPrices(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices);
  const summary = calculatePortfolioSummary(holdings);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Holdings</h1>
        <p className="text-muted-foreground">
          Current portfolio positions and performance
        </p>
      </div>

      <StatsCards summary={summary} />
      <HoldingsTable holdings={holdings} />
    </div>
  );
}
