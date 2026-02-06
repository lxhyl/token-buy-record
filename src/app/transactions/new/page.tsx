import { TransactionForm } from "@/components/TransactionForm";

export default function NewTransactionPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Add Transaction</h1>
        <p className="text-muted-foreground">
          Record a new buy or sell transaction
        </p>
      </div>

      <div className="max-w-2xl">
        <TransactionForm />
      </div>
    </div>
  );
}
