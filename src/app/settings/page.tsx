import { getDisplayCurrency } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import { CurrencySettings } from "@/components/CurrencySettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [currency, rates] = await Promise.all([
    getDisplayCurrency(),
    getExchangeRates(),
  ]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your application preferences
        </p>
      </div>

      <CurrencySettings currency={currency} rates={rates} />
    </div>
  );
}
