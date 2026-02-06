import { getTransactions } from "@/actions/transactions";
import { TransactionList } from "@/components/TransactionList";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">
          View and manage your trading history
        </p>
      </div>

      <TransactionList transactions={transactions} />
    </div>
  );
}
