import { getTransactions, getLatestPrices } from "@/actions/transactions";
import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import {
  calculateHoldings,
  calculateFixedIncomeHoldings,
  calculatePortfolioSummary,
} from "@/lib/calculations";
import { StatsCards } from "@/components/StatsCards";
import { HoldingsTable } from "@/components/HoldingsTable";
import { FixedIncomeTable } from "@/components/FixedIncomeTable";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const [transactions, currentPrices, currency, rates] = await Promise.all([
    getTransactions(),
    getLatestPrices(),
    getDisplayCurrency(),
    getExchangeRates(),
  ]);

  const holdings = calculateHoldings(transactions, currentPrices, rates);
  const fixedIncomeHoldings = calculateFixedIncomeHoldings(transactions, rates);
  const summary = calculatePortfolioSummary(holdings, fixedIncomeHoldings);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Holdings</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Current portfolio positions and performance
        </p>
      </div>

      <StatsCards summary={summary} currency={currency} rates={rates} />
      <HoldingsTable holdings={holdings} currency={currency} rates={rates} />
      {fixedIncomeHoldings.length > 0 && (
        <FixedIncomeTable holdings={fixedIncomeHoldings} currency={currency} rates={rates} />
      )}
    </div>
  );
}
