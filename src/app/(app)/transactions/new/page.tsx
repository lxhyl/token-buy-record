import { getDisplayCurrency, getDisplayLanguage } from "@/actions/settings";
import { getExchangeRates } from "@/lib/exchange-rates";
import { TransactionForm } from "@/components/TransactionForm";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const [currency, rates, locale] = await Promise.all([
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t(locale, "form.addTitle")}</h1>
        <p className="text-muted-foreground">
          {t(locale, "form.addSubtitle")}
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <TransactionForm currency={currency} rates={rates} />
      </div>
    </div>
  );
}
