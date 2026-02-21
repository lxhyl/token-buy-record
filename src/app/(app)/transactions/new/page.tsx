import { getDisplayCurrency, getDisplayLanguage } from "@/actions/settings";
import { getExchangeRates } from "@/lib/exchange-rates";
import { TransactionForm } from "@/components/TransactionForm";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { PiggyBank } from "lucide-react";

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

      <div className="max-w-3xl mx-auto space-y-6">
        <TransactionForm currency={currency} rates={rates} />

        {/* Link to deposit form */}
        <Link
          href="/deposits/new"
          className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-green-300 dark:border-green-700 hover:bg-green-50/50 dark:hover:bg-green-950/30 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t(locale, "deposit.addDeposit")}</p>
            <p className="text-xs text-muted-foreground">{t(locale, "deposit.addSubtitle")}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
