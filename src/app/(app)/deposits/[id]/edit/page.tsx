import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { getDeposit } from "@/actions/deposits";
import { getDisplayCurrency, getDisplayLanguage } from "@/actions/settings";
import { getExchangeRates } from "@/lib/exchange-rates";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditDepositPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const depositId = parseInt(id, 10);
  if (isNaN(depositId)) notFound();

  const [deposit, currency, rates, locale] = await Promise.all([
    getDeposit(depositId),
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
  ]);

  if (!deposit) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t(locale, "deposit.editTitle")}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          {t(locale, "deposit.editSubtitle")}
        </p>
      </div>
      <div className="max-w-3xl mx-auto">
        <TransactionForm deposit={deposit} mode="edit" currency={currency} rates={rates} />
      </div>
    </div>
  );
}
