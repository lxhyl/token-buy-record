import { getDisplayCurrency, getDisplayLanguage } from "@/actions/settings";
import { getExchangeRates } from "@/lib/currency";
import { CurrencySettings } from "@/components/CurrencySettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountSection } from "@/components/AccountSection";
import { LanguageSettings } from "@/components/LanguageSettings";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [currency, rates, locale] = await Promise.all([
    getDisplayCurrency(),
    getExchangeRates(),
    getDisplayLanguage(),
  ]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t(locale, "settings.title")}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t(locale, "settings.subtitle")}
        </p>
      </div>

      <AccountSection />
      <ThemeToggle />
      <LanguageSettings locale={locale} />
      <CurrencySettings currency={currency} rates={rates} />
    </div>
  );
}
