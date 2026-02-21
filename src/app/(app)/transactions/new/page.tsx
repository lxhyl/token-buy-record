import { getDisplayCurrency, getDisplayLanguage } from "@/actions/settings";
import { getExchangeRates } from "@/lib/exchange-rates";
import { TransactionForm } from "@/components/TransactionForm";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [currency, rates, locale, params] = await Promise.all([
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
    searchParams,
  ]);

  const initialAssetType = params.type === "deposit" ? "deposit" : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t(locale, "form.addTitle")}</h1>
        <p className="text-muted-foreground">
          {t(locale, "form.addSubtitle")}
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <TransactionForm
          currency={currency}
          rates={rates}
          initialAssetType={initialAssetType}
        />
      </div>
    </div>
  );
}
