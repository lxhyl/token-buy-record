import { getTransactions, getLatestPrices } from "@/actions/transactions";
import {
  calculateHoldings,
  calculatePortfolioSummary,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { HoldingsTable } from "@/components/HoldingsTable";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const transactions = await getTransactions();
  const currentPrices = await getLatestPrices();

  const holdings = calculateHoldings(transactions, currentPrices);
  const summary = calculatePortfolioSummary(holdings);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Holdings</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Current portfolio positions and performance
        </p>
      </div>

      <StatsCards summary={summary} />
      <HoldingsTable holdings={holdings} />
    </div>
  );
}
