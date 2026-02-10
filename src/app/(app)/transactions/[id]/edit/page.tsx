import { notFound } from "next/navigation";
import { getTransaction } from "@/actions/transactions";
import { getDisplayCurrency, getDisplayLanguage } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import { TransactionForm } from "@/components/TransactionForm";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface EditTransactionPageProps {
  params: { id: string };
}

export default async function EditTransactionPage({
  params,
}: EditTransactionPageProps) {
  const [transaction, currency, rates, locale] = await Promise.all([
    getTransaction(parseInt(params.id)),
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t(locale, "form.editTitle")}</h1>
        <p className="text-muted-foreground">
          {t(locale, "form.editSubtitle")}
        </p>
      </div>

      <div className="max-w-2xl">
        <TransactionForm
          transaction={transaction}
          mode="edit"
          currency={currency}
          rates={rates}
        />
      </div>
    </div>
  );
}
