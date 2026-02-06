import { notFound } from "next/navigation";
import { getTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/TransactionForm";

export const dynamic = "force-dynamic";

interface EditTransactionPageProps {
  params: { id: string };
}

export default async function EditTransactionPage({
  params,
}: EditTransactionPageProps) {
  const transaction = await getTransaction(parseInt(params.id));

  if (!transaction) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Edit Transaction</h1>
        <p className="text-muted-foreground">
          Update transaction details
        </p>
      </div>

      <div className="max-w-2xl">
        <TransactionForm transaction={transaction} mode="edit" />
      </div>
    </div>
  );
}
