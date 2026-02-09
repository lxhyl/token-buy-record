import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import { TransactionForm } from "@/components/TransactionForm";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const [currency, rates] = await Promise.all([
    getDisplayCurrency(),
    getExchangeRates(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Add Transaction</h1>
        <p className="text-muted-foreground">
          Record a new buy or sell transaction
        </p>
      </div>

      <div className="max-w-2xl">
        <TransactionForm currency={currency} rates={rates} />
      </div>
    </div>
  );
}
